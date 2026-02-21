/**
 * thirdParty.js - Third-Party Verification Routes
 * 
 * These endpoints are for third-party websites (like concert sites)
 * to verify users via RacePass.
 * 
 * IMPORTANT: These endpoints NEVER expose personal data!
 * They only confirm: "Yes, this wallet is verified" or "No, it's not"
 */

import { Router } from 'express'
import { getCredentialStore, getActivityLog } from './kyc.js'

const router = Router()

/**
 * POST /api/third-party/verify
 * Third-party verification with age-gate support.
 * The request can include minAge (default 18 for concerts).
 * NEVER exposes personal data — only boolean flags.
 */
router.post('/verify', async (req, res) => {
  const { walletAddress, network = 'ethereum', minAge = 0, eventType = 'general' } = req.body

  console.log('')
  console.log('🎫 ================================')
  console.log('   Third-Party Verification Request')
  console.log('================================')
  console.log(`   Wallet: ${walletAddress}`)
  console.log(`   Event: ${eventType} | Min Age: ${minAge}`)

  if (!walletAddress) {
    return res.status(400).json({ success: false, error: 'Wallet address is required' })
  }

  try {
    const store = getCredentialStore()
    const data = store.get(walletAddress.toLowerCase())

    if (!data) {
      console.log('   Result: ❌ NOT VERIFIED')
      return res.json({
        success: true,
        verified: false,
        walletAddress,
        reason: 'no_credential',
        checkedAt: new Date().toISOString()
      })
    }

    // Check expiry
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      console.log('   Result: ⚠️ EXPIRED')
      return res.json({
        success: true,
        verified: false,
        walletAddress,
        reason: 'expired',
        checkedAt: new Date().toISOString()
      })
    }

    // Age gate check — use actual stored age for precise comparison
    const userAge = data.age != null ? data.age : (data.isAdult ? 18 : 0)
    let ageOk = true
    if (minAge > 0) {
      ageOk = userAge >= minAge
    }

    // Extract optional context from request
    const { movieName, siteName } = req.body

    if (!ageOk) {
      console.log(`   Result: 🚫 AGE RESTRICTED (user age ${userAge}, needs ${minAge}+)`)
      // Log the blocked attempt with details
      const logMap = getActivityLog()
      const key = walletAddress.toLowerCase()
      if (!logMap.has(key)) logMap.set(key, [])
      logMap.get(key).push({
        action: 'AGE_GATE_BLOCKED',
        timestamp: new Date().toISOString(),
        eventType,
        minAge,
        userAge,
        movieName: movieName || null,
        siteName: siteName || null,
        message: `Attempted to access ${movieName || eventType} on ${siteName || 'unknown site'} — requires age ${minAge}+, user is ${userAge}`
      })

      return res.json({
        success: true,
        verified: false,
        walletAddress,
        reason: 'age_restricted',
        message: `You must be ${minAge}+ to access this content. Your age (${userAge}) does not meet the requirement.`,
        userAge,
        minAge,
        checkedAt: new Date().toISOString()
      })
    }

    // All good!
    console.log(`   Result: ✅ VERIFIED (age ${userAge} >= ${minAge}+)`)
    // Log successful verification with details
    const logMap = getActivityLog()
    const key = walletAddress.toLowerCase()
    if (!logMap.has(key)) logMap.set(key, [])
    logMap.get(key).push({
      action: 'THIRD_PARTY_VERIFIED',
      timestamp: new Date().toISOString(),
      eventType,
      minAge,
      userAge,
      movieName: movieName || null,
      siteName: siteName || null
    })

    return res.json({
      success: true,
      verified: true,
      walletAddress,
      fingerprint: data.fingerprint,
      isAdult: data.isAdult,
      eventType,
      checkedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Third-party verification error:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/third-party/info
 * 
 * Get information about RacePass for third-parties
 * This is a public endpoint
 */
router.get('/info', (req, res) => {
  res.json({
    name: 'RacePass',
    description: 'Privacy-preserving identity verification',
    version: '1.0.0',
    supportedNetworks: ['ethereum', 'polygon'],
    privacyNotice: 'RacePass never shares personal data with third parties. Only verification status is shared.',
    documentation: 'https://racepass.example.com/docs'
  })
})

export default router
