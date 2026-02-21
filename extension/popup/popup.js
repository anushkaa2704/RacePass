/**
 * popup.js — RacePass Extension Popup Logic
 *
 * This runs when the user clicks the RacePass icon in the browser toolbar.
 *
 * Flow:
 * 1. Check if wallet address is saved in chrome.storage
 * 2. If yes → check verification status with backend
 * 3. If not → show "Connect MetaMask" button
 * 4. "Verify on Current Site" → sends message to background → background calls API
 */

// ── Backend URL (same as the existing backend) ──
const BACKEND_URL = 'http://localhost:3001'
const RACEPASS_SITE = 'http://localhost:5173'

// ── DOM Elements ──
const views = {
  loading: document.getElementById('loading-view'),
  connect: document.getElementById('connect-view'),
  notVerified: document.getElementById('not-verified-view'),
  verified: document.getElementById('verified-view'),
  result: document.getElementById('result-view'),
  error: document.getElementById('error-view')
}

// ── Show a specific view, hide all others ──
function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name)
  })
}

// ── Shorten a wallet address for display ──
function shorten(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ── Initialize popup ──
async function init() {
  showView('loading')

  try {
    // Check if we have a saved wallet address
    const { walletAddress } = await chrome.storage.local.get('walletAddress')

    if (!walletAddress) {
      showView('connect')
      return
    }

    // We have an address — check verification status
    await checkStatus(walletAddress)
  } catch (err) {
    showError(err.message)
  }
}

// ── Check verification status with backend ──
async function checkStatus(walletAddress) {
  showView('loading')

  try {
    const res = await fetch(`${BACKEND_URL}/api/verify/${walletAddress}`)
    const data = await res.json()

    if (data.isVerifiedOnAny) {
      // User is verified — show verified view
      document.getElementById('wallet-address-v').textContent = shorten(walletAddress)
      document.getElementById('age-category').textContent = data.ageCategory || (data.isAdult ? '18+' : 'Under 18')
      document.getElementById('age-status').textContent = 'Verified'
      document.getElementById('age-status').className = 'badge badge-green'

      if (data.expiresAt) {
        const exp = new Date(data.expiresAt)
        document.getElementById('expires-at').textContent = exp.toLocaleDateString()
      }

      if (data.credentialId) {
        document.getElementById('credential-id').textContent = data.credentialId.slice(0, 20) + '...'
      }

      showView('verified')
    } else if (data.expired) {
      // Expired
      document.getElementById('wallet-address-nv').textContent = shorten(walletAddress)
      document.querySelector('#not-verified-view h2').textContent = 'RacePass Expired'
      document.querySelector('#not-verified-view .subtitle').textContent = 'Your credential has expired. Please renew.'
      showView('notVerified')
    } else {
      // Not verified
      document.getElementById('wallet-address-nv').textContent = shorten(walletAddress)
      showView('notVerified')
    }
  } catch (err) {
    showError('Cannot connect to RacePass backend. Make sure it is running on port 3001.')
  }
}

// ── Show error view ──
function showError(message) {
  document.getElementById('error-message').textContent = message
  showView('error')
}

// ── Show result view ──
function showResult(icon, title, message) {
  document.getElementById('result-icon').textContent = icon
  document.getElementById('result-title').textContent = title
  document.getElementById('result-message').textContent = message
  showView('result')
}

// ── Connect Wallet ──
// Since Chrome extensions can't access MetaMask directly,
// we open the RacePass site to connect and save the address.
document.getElementById('connect-btn').addEventListener('click', async () => {
  // Open the RacePass frontend so user can connect MetaMask there.
  // After connecting, they can come back to extension.
  // For the demo, we'll prompt for address or use message passing.

  // Option 1: Open RacePass site
  chrome.tabs.create({ url: `${RACEPASS_SITE}/signup` })

  // Show a prompt asking for wallet address (simple approach for demo)
  const address = prompt(
    'Enter your MetaMask wallet address:\n\n' +
    'You can find it in MetaMask → click your account name → copy address'
  )

  if (address && address.startsWith('0x') && address.length === 42) {
    await chrome.storage.local.set({ walletAddress: address })
    await checkStatus(address)
  } else if (address) {
    showError('Invalid wallet address. It should start with 0x and be 42 characters long.')
  }
})

// ── Complete KYC button ──
document.getElementById('kyc-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: `${RACEPASS_SITE}/signup` })
})

// ── Refresh buttons ──
document.getElementById('refresh-btn-nv').addEventListener('click', async () => {
  const { walletAddress } = await chrome.storage.local.get('walletAddress')
  if (walletAddress) await checkStatus(walletAddress)
})

document.getElementById('refresh-btn-v').addEventListener('click', async () => {
  const { walletAddress } = await chrome.storage.local.get('walletAddress')
  if (walletAddress) await checkStatus(walletAddress)
})

// ── Verify on Current Site ──
// Sends a message to the background script which talks to the content script
document.getElementById('verify-site-btn').addEventListener('click', async () => {
  const { walletAddress } = await chrome.storage.local.get('walletAddress')
  if (!walletAddress) return showError('No wallet connected')

  showView('loading')

  try {
    // Send message to background script to verify
    const response = await chrome.runtime.sendMessage({
      type: 'VERIFY_FOR_SITE',
      walletAddress
    })

    if (response.verified) {
      showResult('🎉', 'Access Granted!', 'Verification sent to the website.')
    } else if (response.reason === 'age_restricted') {
      showResult('🚫', 'Age Restricted', response.message || 'You do not meet the age requirement.')
    } else {
      showResult('❌', 'Not Verified', response.message || 'Verification failed.')
    }
  } catch (err) {
    showError(err.message || 'Verification failed')
  }
})

// ── Back button ──
document.getElementById('back-btn').addEventListener('click', async () => {
  const { walletAddress } = await chrome.storage.local.get('walletAddress')
  if (walletAddress) await checkStatus(walletAddress)
  else showView('connect')
})

// ── Retry button ──
document.getElementById('retry-btn').addEventListener('click', init)

// ── Start ──
init()
