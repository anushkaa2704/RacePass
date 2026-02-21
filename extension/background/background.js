/**
 * background.js — RacePass Background Service Worker
 *
 * What is a Service Worker?
 * - Runs silently in the background (no visible UI)
 * - Listens for messages from popup and content scripts
 * - Handles API calls to our backend
 * - Persists across page navigations
 *
 * Think of it as the "brain" of the extension.
 *
 * Message Types:
 *   VERIFY_FOR_SITE   → Called by popup or content script to verify user
 *   CHECK_STATUS      → Check if wallet is verified
 *   GRANT_ACCESS      → Tell the content script to unlock the website
 */

const BACKEND_URL = 'http://localhost:3001'

// ── Listen for messages from popup & content scripts ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // We must return true to indicate we'll respond asynchronously
  handleMessage(message, sender).then(sendResponse).catch(err => {
    sendResponse({ success: false, error: err.message })
  })
  return true // keeps the message channel open for async response
})

/**
 * Route messages to the right handler
 */
async function handleMessage(message, sender) {
  switch (message.type) {

    case 'VERIFY_FOR_SITE':
      return handleVerifyForSite(message)

    case 'CHECK_STATUS':
      return handleCheckStatus(message)

    case 'CONNECT_WALLET':
      return handleConnectWallet(message)

    case 'GET_WALLET':
      return handleGetWallet()

    default:
      return { success: false, error: `Unknown message type: ${message.type}` }
  }
}

/**
 * Verify the user for the current website
 * Called when user clicks "Continue with RacePass" on a site
 * or "Verify on Current Site" in the popup
 */
async function handleVerifyForSite(message) {
  const { walletAddress, minAge = 0, eventType = 'general' } = message

  if (!walletAddress) {
    // Try to get from storage
    const stored = await chrome.storage.local.get('walletAddress')
    if (!stored.walletAddress) {
      return { success: false, verified: false, error: 'No wallet connected' }
    }
    message.walletAddress = stored.walletAddress
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/third-party/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: message.walletAddress,
        network: 'ethereum',
        minAge,
        eventType
      })
    })

    const data = await res.json()

    // If verified, also tell the content script on the active tab
    if (data.verified) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'VERIFICATION_RESULT',
          verified: true,
          walletAddress: message.walletAddress
        }).catch(() => {}) // ignore if content script not ready
      }
    }

    return {
      success: true,
      verified: data.verified,
      reason: data.reason,
      message: data.message,
      fingerprint: data.fingerprint,
      isAdult: data.isAdult,
      eventType: data.eventType
    }
  } catch (err) {
    return { success: false, verified: false, error: err.message }
  }
}

/**
 * Check verification status for a wallet
 */
async function handleCheckStatus(message) {
  const addr = message.walletAddress
  if (!addr) return { success: false, error: 'No wallet address provided' }

  try {
    const res = await fetch(`${BACKEND_URL}/api/verify/${addr}`)
    const data = await res.json()
    return { success: true, ...data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Save wallet address to extension storage
 */
async function handleConnectWallet(message) {
  const { walletAddress } = message
  if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
    return { success: false, error: 'Invalid wallet address' }
  }

  await chrome.storage.local.set({ walletAddress })
  return { success: true, walletAddress }
}

/**
 * Get saved wallet address
 */
async function handleGetWallet() {
  const { walletAddress } = await chrome.storage.local.get('walletAddress')
  return { success: true, walletAddress: walletAddress || null }
}

// ── Listen for extension install ──
chrome.runtime.onInstalled.addListener(() => {
  console.log('[RacePass] Extension installed!')
})
