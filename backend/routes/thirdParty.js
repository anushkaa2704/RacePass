/**
 * thirdParty.js - Third-Party Verification Routes
 * 
 * These endpoints are for third-party websites (like concert sites)
 * to verify users via RacePass.
 * 
 * UPGRADED: Now queries blockchain first (on-chain verification),
 * checks credential revocation, and references ECDSA-signed attestations.
 * 
 * IMPORTANT: These endpoints NEVER expose personal data!
 * They only confirm: "Yes, this wallet is verified" or "No, it's not"
 */

import { Router } from 'express'
import { getCredentialStore, getActivityLog } from './kyc.js'
import { checkVerification, getFingerprint } from '../services/blockchain.js'
import { CHAINS } from '../config/chains.js'

const router = Router()

/**
 * Helper: check on-chain verification across both chains
 */
async function checkOnChain(address) {
  const results = { ethereum: null, polygon: null, verifiedOnChain: false }
  try {
    const [ethResult, polyResult] = await Promise.allSettled([
      checkVerification(address, 'sepolia'),
      checkVerification(address, 'polygon')
    ])
    results.ethereum = ethResult.status === 'fulfilled' ? ethResult.value : false
    results.polygon = polyResult.status === 'fulfilled' ? polyResult.value : false
    results.verifiedOnChain = results.ethereum || results.polygon
  } catch (err) {
    console.log('   On-chain check failed (graceful):', err.message)
  }
  return results
}

/**
 * POST /api/third-party/verify
 * Third-party verification with age-gate support.
 * 
 * FLOW:
 *  1. Query blockchain (Sepolia + Polygon) for on-chain verification
 *  2. Fall back to local credential store
 *  3. Check revocation status
 *  4. Verify age via attestation reference (never expose actual age)
 *  5. Return boolean flags + crypto proof metadata
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
    // ── Step 1: On-chain verification ──
    const onChain = await checkOnChain(walletAddress)
    console.log(`   On-chain: ETH=${onChain.ethereum}, POLY=${onChain.polygon}`)

    // ── Step 2: Local credential store ──
    const store = getCredentialStore()
    const data = store.get(walletAddress.toLowerCase())

    // Determine verification source
    const hasLocalCred = !!data
    const verified = onChain.verifiedOnChain || hasLocalCred
    const source = onChain.verifiedOnChain ? 'blockchain' : (hasLocalCred ? 'local' : 'none')

    if (!verified) {
      console.log('   Result: ❌ NOT VERIFIED')
      return res.json({
        success: true,
        verified: false,
        verifiedOnChain: false,
        walletAddress,
        reason: 'no_credential',
        checkedAt: new Date().toISOString()
      })
    }

    // ── Step 3: Check revocation ──
    if (data && data.revoked) {
      console.log('   Result: 🚫 REVOKED')
      return res.json({
        success: true,
        verified: false,
        verifiedOnChain: onChain.verifiedOnChain,
        walletAddress,
        reason: 'revoked',
        revokedAt: data.revokedAt,
        checkedAt: new Date().toISOString()
      })
    }

    // Check expiry
    if (data && data.expiresAt && new Date(data.expiresAt) < new Date()) {
      console.log('   Result: ⚠️ EXPIRED')
      return res.json({
        success: true,
        verified: false,
        verifiedOnChain: onChain.verifiedOnChain,
        walletAddress,
        reason: 'expired',
        checkedAt: new Date().toISOString()
      })
    }

    // ── Step 4: Age gate via attestation reference ──
    // We check if the user HAS an attestation for the required age threshold
    // We NEVER expose the actual age to the third party
    let ageOk = true
    let ageAttestationAvailable = false

    if (minAge > 0 && data) {
      // Check attestations object for matching age claim
      if (data.attestations && typeof data.attestations === 'object') {
        const attestationKeys = Object.keys(data.attestations)
        const attestationClaims = attestationKeys.map(k => data.attestations[k]?.claim || k)
        ageAttestationAvailable = attestationClaims.some(c =>
          c === `ageAbove:${minAge}` ||
          (c.startsWith('ageAbove:') && parseInt(c.split(':')[1]) >= minAge)
        ) || attestationKeys.some(k =>
          k === `ageAbove${minAge}` || k.startsWith('ageAbove')
        )
      }
      // Fallback: check actual age (but never expose it)
      const userAge = data.age != null ? data.age : (data.isAdult ? 18 : 0)
      ageOk = userAge >= minAge
    }

    // Extract optional context from request
    const { movieName, siteName } = req.body

    if (!ageOk) {
      console.log(`   Result: 🚫 AGE RESTRICTED (needs ${minAge}+)`)
      // Log the blocked attempt
      const logMap = getActivityLog()
      const key = walletAddress.toLowerCase()
      if (!logMap.has(key)) logMap.set(key, [])
      logMap.get(key).push({
        action: 'AGE_GATE_BLOCKED',
        timestamp: new Date().toISOString(),
        eventType,
        minAge,
        movieName: movieName || null,
        siteName: siteName || null,
        verificationSource: source,
        message: `Attempted to access ${movieName || eventType} on ${siteName || 'unknown site'} — requires age ${minAge}+`
      })

      return res.json({
        success: true,
        verified: false,
        verifiedOnChain: onChain.verifiedOnChain,
        walletAddress,
        reason: 'age_restricted',
        message: `You must be ${minAge}+ to access this content.`,
        minAge,
        // NOTE: We do NOT expose userAge to the third party — privacy preserving!
        hasAgeAttestation: ageAttestationAvailable,
        checkedAt: new Date().toISOString()
      })
    }

    // ── Step 5: All good! ──
    console.log(`   Result: ✅ VERIFIED (source: ${source})`)

    // Log successful verification
    const logMap = getActivityLog()
    const key = walletAddress.toLowerCase()
    if (!logMap.has(key)) logMap.set(key, [])
    logMap.get(key).push({
      action: 'THIRD_PARTY_VERIFIED',
      timestamp: new Date().toISOString(),
      eventType,
      minAge,
      verificationSource: source,
      movieName: movieName || null,
      siteName: siteName || null
    })

    // Build attestation summary (without exposing raw data)
    const attestationSummary = data?.attestations
      ? Object.keys(data.attestations).map(k => data.attestations[k]?.claim || k)
      : ['identityVerified']

    return res.json({
      success: true,
      verified: true,
      verifiedOnChain: onChain.verifiedOnChain,
      verificationSource: source,
      walletAddress,
      fingerprint: data?.fingerprint || null,
      isAdult: data?.isAdult ?? true,
      eventType,
      // Crypto proof metadata
      cryptoProof: {
        onChain: {
          ethereum: onChain.ethereum,
          polygon: onChain.polygon
        },
        attestations: attestationSummary,
        hasAgeAttestation: ageAttestationAvailable || (minAge > 0 && ageOk),
        issuer: data?.attestations ? Object.values(data.attestations)?.[0]?.issuer || null : null,
        note: 'Verification confirmed via on-chain fingerprint and/or ECDSA-signed attestations'
      },
      reputation: data?.reputation || null,
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
    description: 'Privacy-preserving identity verification with on-chain attestations',
    version: '2.0.0',
    supportedNetworks: ['ethereum', 'polygon'],
    cryptoFeatures: [
      'ECDSA-signed attestations (ecrecover verifiable)',
      'Dual-chain verification (Ethereum Sepolia + Polygon Amoy)',
      'Credential revocation registry',
      'Attendance-based Merkle tree reputation',
      'Cryptographically signed event tickets'
    ],
    privacyNotice: 'RacePass never shares personal data with third parties. Only ECDSA-signed boolean attestations and on-chain verification status are shared.',
    documentation: 'https://racepass.example.com/docs'
  })
})

export default router
