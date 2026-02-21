/**
 * kyc.js - KYC API Routes
 * 
 * These endpoints handle KYC verification:
 * 1. POST /api/kyc/process - Called by n8n after KYC verification
 * 
 * Flow:
 * 1. n8n verifies user's KYC data
 * 2. n8n calls this endpoint
 * 3. We create a credential
 * 4. We generate a fingerprint
 * 5. We store fingerprint on blockchain
 * 6. We return success
 */

import { Router } from 'express'
import { createCredential, signCredential } from '../services/credential.js'
import { createCredentialFingerprint } from '../services/hash.js'
import { storeOnBothChains } from '../services/blockchain.js'

// ── In-memory stores ──
const credentialStore = new Map()   // wallet → credential data
const activityLog = new Map()       // wallet → [{action, timestamp, details}]
const rateLimit = new Map()         // wallet → { count, windowStart }

const RATE_LIMIT_WINDOW = 60_000    // 1 minute
const RATE_LIMIT_MAX = 5            // max 5 submissions per minute

/** Export getters so verify.js and thirdParty.js can read stores */
export function getCredentialStore() { return credentialStore }
export function getActivityLog() { return activityLog }

/** Helper: push an event to the activity log */
function logActivity(wallet, action, details = {}) {
  const key = wallet.toLowerCase()
  if (!activityLog.has(key)) activityLog.set(key, [])
  activityLog.get(key).push({
    action,
    timestamp: new Date().toISOString(),
    ...details
  })
}

/** Helper: calculate age from DOB string */
function calculateAge(dob) {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

/** Helper: check rate limit */
function isRateLimited(wallet) {
  const key = wallet.toLowerCase()
  const now = Date.now()
  const entry = rateLimit.get(key)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimit.set(key, { count: 1, windowStart: now })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

const router = Router()

/**
 * POST /api/kyc/submit
 *
 * Direct endpoint called by the frontend.
 * Handles the full KYC flow in one place:
 * validate → create credential → hash → store on blockchain
 */
router.post('/submit', async (req, res) => {
  console.log('')
  console.log('🔐 ================================')
  console.log('   New KYC Submission')
  console.log('================================')

  try {
    const { walletAddress, kycData } = req.body

    // ── Validate required fields ──
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address is required' })
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address format' })
    }
    if (!kycData?.fullName || kycData.fullName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Full name is required' })
    }
    if (!kycData?.dateOfBirth) {
      return res.status(400).json({ success: false, message: 'Date of birth is required' })
    }
    if (!kycData?.aadhaarNumber || kycData.aadhaarNumber.length !== 12) {
      return res.status(400).json({ success: false, message: 'Aadhaar must be exactly 12 digits' })
    }
    if (!/^\d{12}$/.test(kycData.aadhaarNumber)) {
      return res.status(400).json({ success: false, message: 'Aadhaar must contain only digits' })
    }

    // ── Rate limiting ──
    if (isRateLimited(walletAddress)) {
      console.log(`⚠️ Rate limited: ${walletAddress}`)
      return res.status(429).json({ success: false, message: 'Too many requests. Please wait a minute and try again.' })
    }

    // ── Duplicate check ──
    if (credentialStore.has(walletAddress.toLowerCase())) {
      console.log(`⚠️ Duplicate submission for: ${walletAddress}`)
      return res.status(409).json({
        success: false,
        message: 'This wallet already has an active RacePass. Go to Dashboard to view it or revoke it first.'
      })
    }

    // ── Age verification ──
    const age = calculateAge(kycData.dateOfBirth)
    if (age < 0 || age > 150) {
      return res.status(400).json({ success: false, message: 'Invalid date of birth' })
    }
    const isAdult = age >= 18

    console.log(`📧 Wallet: ${walletAddress}`)
    console.log(`🎂 Age: ${age} | Adult: ${isAdult}`)

    // Step 1: Create credential
    console.log('📝 Creating credential...')
    const credential = createCredential(walletAddress, kycData)

    // Step 2: Sign credential
    console.log('✍️  Signing credential...')
    const signedCredential = signCredential(credential)

    // Step 3: Generate fingerprint
    console.log('🔑 Generating fingerprint...')
    const fingerprint = createCredentialFingerprint(signedCredential)
    console.log(`   Fingerprint: ${fingerprint.slice(0, 20)}...`)

    // Step 4: Try to store on blockchain (graceful fallback if not deployed)
    let blockchainResults = { ethereum: { success: false }, polygon: { success: false } }
    let blockchainNote = ''

    try {
      blockchainResults = await storeOnBothChains(walletAddress, fingerprint)
    } catch (blockchainError) {
      console.log('   ⚠️ Blockchain storage skipped:', blockchainError.message)
      blockchainNote = 'Blockchain not configured — running in demo mode.'
    }

    // Step 5: Save locally (NO personal data — only flags and hashes)
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    credentialStore.set(walletAddress.toLowerCase(), {
      credential: signedCredential,
      fingerprint,
      isAdult,
      ageCategory: age >= 21 ? '21+' : age >= 18 ? '18+' : 'minor',
      blockchainResults,
      createdAt: new Date().toISOString(),
      expiresAt
    })

    // Log the activity
    logActivity(walletAddress, 'KYC_SUBMITTED', { credentialId: signedCredential.id })

    console.log('')
    console.log('✅ KYC Processing Complete!')
    console.log('================================')

    res.json({
      success: true,
      message: isAdult
        ? 'KYC verified successfully! You have full access.'
        : 'KYC verified, but you are under 18. Some age-restricted events will not be accessible.',
      data: {
        walletAddress,
        credentialId: signedCredential.id,
        fingerprint,
        isAdult,
        blockchainResults,
        note: blockchainNote || undefined,
        issuedAt: signedCredential.issuanceDate,
        expiresAt
      }
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * POST /api/kyc/process
 * 
 * Called by n8n after KYC verification is complete.
 * Creates credential and stores fingerprint on blockchain.
 * 
 * Request body:
 * {
 *   walletAddress: "0x...",
 *   kycData: { ... },  // Only used for credential creation, then discarded
 *   kycStatus: "approved"
 * }
 */
router.post('/process', async (req, res) => {
  console.log('')
  console.log('🔐 ================================')
  console.log('   Processing KYC Request')
  console.log('================================')
  
  try {
    const { walletAddress, kycData, kycStatus } = req.body
    
    // Validate request
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Wallet address is required' 
      })
    }
    
    if (kycStatus !== 'approved') {
      return res.status(400).json({ 
        success: false, 
        error: 'KYC not approved' 
      })
    }
    
    console.log(`📧 Wallet: ${walletAddress}`)
    console.log(`📋 KYC Status: ${kycStatus}`)
    
    // Step 1: Create credential
    console.log('📝 Creating credential...')
    const credential = createCredential(walletAddress, kycData)
    
    // Step 2: Sign credential
    console.log('✍️  Signing credential...')
    const signedCredential = signCredential(credential)
    
    // Step 3: Generate fingerprint
    console.log('🔑 Generating fingerprint...')
    const fingerprint = createCredentialFingerprint(signedCredential)
    console.log(`   Fingerprint: ${fingerprint.slice(0, 20)}...`)
    
    // Step 4: Store on blockchain
    console.log('⛓️  Storing on blockchain...')
    const blockchainResults = await storeOnBothChains(walletAddress, fingerprint)
    
    // Step 5: Store credential locally (for reference)
    credentialStore.set(walletAddress.toLowerCase(), {
      credential: signedCredential,
      fingerprint,
      blockchainResults,
      createdAt: new Date().toISOString()
    })
    
    // Success!
    console.log('')
    console.log('✅ KYC Processing Complete!')
    console.log('================================')
    console.log('')
    
    res.json({
      success: true,
      message: 'KYC processed successfully',
      data: {
        walletAddress,
        credentialId: signedCredential.id,
        fingerprint,
        blockchainResults,
        issuedAt: signedCredential.issuanceDate
      }
    })
    
  } catch (error) {
    console.error('❌ Error processing KYC:', error.message)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

/**
 * GET /api/kyc/credential/:address
 * 
 * Get the stored credential for an address
 * Note: In production, this should require authentication
 */
router.get('/credential/:address', (req, res) => {
  const address = req.params.address.toLowerCase()
  const data = credentialStore.get(address)
  
  if (!data) {
    return res.status(404).json({ 
      success: false, 
      error: 'Credential not found' 
    })
  }
  
  // Return credential (without sensitive proof data)
  res.json({
    success: true,
    data: {
      credentialId: data.credential.id,
      issuanceDate: data.credential.issuanceDate,
      expirationDate: data.credential.expirationDate,
      fingerprint: data.fingerprint,
      isAdult: data.isAdult,
      ageCategory: data.ageCategory,
      walletAddress: address,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
      blockchainResults: data.blockchainResults
    }
  })
})

/**
 * POST /api/kyc/revoke
 * User revokes their own RacePass (self-sovereign identity)
 */
router.post('/revoke', (req, res) => {
  const { walletAddress } = req.body
  if (!walletAddress) {
    return res.status(400).json({ success: false, error: 'Wallet address is required' })
  }

  const key = walletAddress.toLowerCase()
  const data = credentialStore.get(key)
  if (!data) {
    return res.status(404).json({ success: false, error: 'No active RacePass found for this wallet' })
  }

  credentialStore.delete(key)
  logActivity(walletAddress, 'CREDENTIAL_REVOKED', { credentialId: data.credential?.id })

  console.log(`🗑️ RacePass revoked for ${walletAddress.slice(0, 10)}...`)
  res.json({ success: true, message: 'RacePass revoked successfully. You can re-register at any time.' })
})

/**
 * GET /api/kyc/activity/:address
 * Get the activity/audit log for a wallet
 */
router.get('/activity/:address', (req, res) => {
  const key = req.params.address.toLowerCase()
  const log = activityLog.get(key) || []
  res.json({ success: true, activities: log })
})

export default router
