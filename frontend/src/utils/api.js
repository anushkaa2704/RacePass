/**
 * api.js - API Call Utilities
 *
 * All HTTP requests to the backend + n8n webhook.
 * Includes: retry logic, timeout, offline detection, n8n routing toggle.
 *
 * KYC flow:
 *   submitKYC() → n8n webhook (localhost:5678/webhook/kyc)
 *     → n8n validates → n8n calls backend → response
 *   Falls back to direct backend call if n8n is unreachable.
 */

import { API } from './constants'

const REQUEST_TIMEOUT = 12000 // 12 seconds

/** Toggle: route KYC submission through n8n. Set false to skip n8n. */
const USE_N8N = true

/**
 * Wrapper around fetch with timeout + retry + offline detection
 */
async function safeFetch(url, options = {}, retries = 2) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please check your internet connection.')
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)

      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a minute and try again.')
      }
      if (response.status === 409) {
        const err = await response.json()
        throw new Error(err.message || 'Conflict: Resource already exists')
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || err.error || `Request failed (${response.status})`)
      }
      return await response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        if (attempt < retries) continue
        throw new Error('Request timed out. The backend may be overloaded — please try again.')
      }
      if (error.message === 'Failed to fetch') {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        throw new Error('Cannot connect to backend. Make sure it is running: cd backend && npm run dev')
      }
      throw error
    }
  }
}

// ─── KYC (routed through n8n when available) ──

export async function submitKYC(kycData, walletAddress) {
  const payload = {
    walletAddress,
    kycData,
    timestamp: new Date().toISOString()
  }

  if (USE_N8N) {
    try {
      // Try n8n webhook first
      const result = await safeFetch(API.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 0) // no retry — fail fast so we can fallback
      return result
    } catch (n8nError) {
      console.warn('[api] n8n unreachable, falling back to direct backend call:', n8nError.message)
      // Fallback: call backend directly
    }
  }

  // Direct backend call (fallback or when USE_N8N=false)
  return safeFetch(`${API.BACKEND_URL}/api/kyc/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, 1)
}

// ─── Verification ──────────────────────────────

export async function checkVerificationStatus(walletAddress) {
  return safeFetch(`${API.BACKEND_URL}/api/verify/${walletAddress}`)
}

// ─── Credential ────────────────────────────────

export async function getCredential(walletAddress) {
  return safeFetch(`${API.BACKEND_URL}/api/kyc/credential/${walletAddress}`)
}

// ─── Third-party (concert / events) ───────────

export async function verifyForThirdParty(walletAddress, network = 'ethereum', minAge = 0, eventType = 'general') {
  return safeFetch(`${API.BACKEND_URL}/api/third-party/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, network, minAge, eventType })
  })
}

// ─── Revocation ────────────────────────────────

export async function revokeCredential(walletAddress) {
  return safeFetch(`${API.BACKEND_URL}/api/kyc/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress })
  }, 0)
}

// ─── Activity Log ──────────────────────────────

export async function getActivityLog(walletAddress) {
  return safeFetch(`${API.BACKEND_URL}/api/kyc/activity/${walletAddress}`)
}

