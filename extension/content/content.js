/**
 * content.js — RacePass Content Script
 *
 * What is a Content Script?
 * - JavaScript that Chrome INJECTS into every webpage the user visits
 * - It can read and modify the webpage's DOM (HTML)
 * - It CANNOT access the webpage's JavaScript variables
 * - It CAN talk to the background script via chrome.runtime.sendMessage
 *
 * What this script does:
 * 1. Looks for a special attribute on login forms: data-racepass="true"
 *    OR looks for any login/signup form on the page
 * 2. Injects a "Continue with RacePass" button
 * 3. When clicked, sends a message to background script to verify
 * 4. Shows success/failure on the page
 *
 * Websites opt-in by adding: <div data-racepass="true" data-min-age="18"></div>
 */

(function () {
  'use strict'

  // Avoid injecting twice
  if (window.__racepassInjected) return
  window.__racepassInjected = true

  // ── Find RacePass integration points on the page ──
  function findRacePassTargets() {
    // Method 1: Explicit data-racepass attribute (preferred)
    const explicit = document.querySelectorAll('[data-racepass]')
    if (explicit.length > 0) return Array.from(explicit)

    // Method 2: Look for common login/signup containers
    // Only inject on pages that seem to have login forms
    const selectors = [
      '.racepass-login',
      '#racepass-login',
      '[data-login="racepass"]'
    ]

    for (const sel of selectors) {
      const el = document.querySelectorAll(sel)
      if (el.length > 0) return Array.from(el)
    }

    return []
  }

  // ── Create the "Continue with RacePass" button ──
  function createRacePassButton(target) {
    // Don't inject if button already exists
    if (target.querySelector('.racepass-btn-injected')) return

    const minAge = parseInt(target.dataset.minAge) || 0
    const eventType = target.dataset.eventType || 'general'

    // Create button container
    const container = document.createElement('div')
    container.className = 'racepass-container-injected'

    // Create divider
    const divider = document.createElement('div')
    divider.className = 'racepass-divider-injected'
    divider.innerHTML = '<span>or</span>'

    // Create button
    const btn = document.createElement('button')
    btn.className = 'racepass-btn-injected'
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0">
        <rect width="20" height="20" rx="4" fill="#00d9ff"/>
        <path d="M6 10l3 3 5-6" stroke="#0a0a14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Continue with RacePass</span>
    `

    // Onclick: verify via extension
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()

      btn.disabled = true
      btn.innerHTML = `
        <div class="racepass-spinner-injected"></div>
        <span>Verifying...</span>
      `

      try {
        // Send message to background script
        const response = await chrome.runtime.sendMessage({
          type: 'VERIFY_FOR_SITE',
          minAge,
          eventType
        })

        if (response.verified) {
          btn.innerHTML = `
            <span style="font-size:18px">✅</span>
            <span>Verified! Access Granted</span>
          `
          btn.classList.add('racepass-btn-success')

          // Dispatch a custom event so the website can listen for it
          window.dispatchEvent(new CustomEvent('racepass:verified', {
            detail: {
              verified: true,
              walletAddress: response.walletAddress,
              eventType: response.eventType
            }
          }))

          // Also post a message for websites using window.addEventListener('message')
          window.postMessage({
            source: 'racepass-extension',
            type: 'VERIFICATION_RESULT',
            verified: true,
            walletAddress: response.walletAddress
          }, '*')

        } else if (response.reason === 'age_restricted') {
          btn.innerHTML = `
            <span style="font-size:18px">🚫</span>
            <span>Age Restricted</span>
          `
          btn.classList.add('racepass-btn-error')
        } else if (response.error === 'No wallet connected') {
          // Prompt the user for their wallet address right here
          btn.disabled = false
          btn.innerHTML = `
            <span style="font-size:18px">🔗</span>
            <span>Enter your wallet address...</span>
          `

          const address = prompt(
            'Connect your MetaMask wallet to RacePass\n\n' +
            'Paste your wallet address (from MetaMask → click account name → copy):'
          )

          if (address && address.startsWith('0x') && address.length === 42) {
            // Save to extension storage and retry verification
            await chrome.runtime.sendMessage({ type: 'CONNECT_WALLET', walletAddress: address })

            btn.innerHTML = `
              <div class="racepass-spinner-injected"></div>
              <span>Verifying...</span>
            `
            btn.disabled = true

            const retryResponse = await chrome.runtime.sendMessage({
              type: 'VERIFY_FOR_SITE',
              walletAddress: address,
              minAge,
              eventType
            })

            if (retryResponse.verified) {
              btn.innerHTML = `
                <span style="font-size:18px">✅</span>
                <span>Verified! Access Granted</span>
              `
              btn.classList.add('racepass-btn-success')

              window.dispatchEvent(new CustomEvent('racepass:verified', {
                detail: { verified: true, walletAddress: address, eventType }
              }))
              window.postMessage({
                source: 'racepass-extension',
                type: 'VERIFICATION_RESULT',
                verified: true,
                walletAddress: address
              }, '*')
            } else {
              btn.innerHTML = `
                <span style="font-size:18px">❌</span>
                <span>${retryResponse.reason === 'age_restricted' ? 'Age Restricted' : 'Not Verified — Complete KYC first'}</span>
              `
              btn.classList.add('racepass-btn-error')
            }
          } else if (address) {
            btn.innerHTML = `
              <span style="font-size:18px">⚠️</span>
              <span>Invalid address — must start with 0x</span>
            `
            btn.classList.add('racepass-btn-error')
          } else {
            // User cancelled prompt
            btn.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0">
                <rect width="20" height="20" rx="4" fill="#00d9ff"/>
                <path d="M6 10l3 3 5-6" stroke="#0a0a14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Continue with RacePass</span>
            `
            return // don't trigger the 3-second reset
          }
        } else {
          btn.innerHTML = `
            <span style="font-size:18px">❌</span>
            <span>Not Verified — Complete KYC first</span>
          `
          btn.classList.add('racepass-btn-error')
        }
      } catch (err) {
        btn.innerHTML = `
          <span style="font-size:18px">⚠️</span>
          <span>RacePass extension not found</span>
        `
        btn.classList.add('racepass-btn-error')
      }

      // Re-enable after 3 seconds
      setTimeout(() => {
        btn.disabled = false
        btn.classList.remove('racepass-btn-success', 'racepass-btn-error')
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0">
            <rect width="20" height="20" rx="4" fill="#00d9ff"/>
            <path d="M6 10l3 3 5-6" stroke="#0a0a14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Continue with RacePass</span>
        `
      }, 3000)
    })

    container.appendChild(divider)
    container.appendChild(btn)
    target.appendChild(container)
  }

  // ── Listen for messages from background script ──
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'VERIFICATION_RESULT') {
      // Background script confirmed verification
      window.postMessage({
        source: 'racepass-extension',
        type: 'VERIFICATION_RESULT',
        verified: message.verified,
        walletAddress: message.walletAddress
      }, '*')

      window.dispatchEvent(new CustomEvent('racepass:verified', {
        detail: { verified: message.verified, walletAddress: message.walletAddress }
      }))
    }
    sendResponse({ received: true })
  })

  // ── Initialize: find targets and inject buttons ──
  function injectButtons() {
    const targets = findRacePassTargets()
    targets.forEach(createRacePassButton)
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButtons)
  } else {
    injectButtons()
  }

  // Also watch for dynamically added elements (SPA support)
  const observer = new MutationObserver(() => {
    injectButtons()
  })
  observer.observe(document.body, { childList: true, subtree: true })

})()
