/**
 * verify.js - Verification API Routes (V2 — On-Chain Verification)
 *
 * UPGRADE: Now queries BOTH blockchains to verify credential fingerprint.
 * The backend is no longer the single trust anchor — on-chain data is authoritative.
 *
 * Verification hierarchy:
 *   1. Check on-chain (Sepolia + Polygon Amoy) — authoritative
 *   2. Fall back to local credential store — for demo/offline mode
 *   3. Check revocation status (on-chain if available, else local)
 */

import { Router } from 'express'
import { getCredentialStore, getActivityLog } from './kyc.js'
import { checkVerification, getFingerprint } from '../services/blockchain.js'

const router = Router()

/**
 * Helper: query both chains in parallel
 * Returns { ethereum: { verified, fingerprint }, polygon: { ... }, anyChainVerified }
 */
async function checkOnChain(address) {
  const results = { ethereum: null, polygon: null, anyChainVerified: false }

  try {
    const [ethVerified, polyVerified, ethFP, polyFP] = await Promise.allSettled([
      checkVerification(address, 'ethereum'),
      checkVerification(address, 'polygon'),
      getFingerprint(address, 'ethereum'),
      getFingerprint(address, 'polygon')
    ])

    results.ethereum = {
      verified: ethVerified.status === 'fulfilled' ? ethVerified.value : false,
      fingerprint: ethFP.status === 'fulfilled' ? ethFP.value : null
    }
    results.polygon = {
      verified: polyVerified.status === 'fulfilled' ? polyVerified.value : false,
      fingerprint: polyFP.status === 'fulfilled' ? polyFP.value : null
    }
    results.anyChainVerified = results.ethereum.verified || results.polygon.verified
  } catch (err) {
    console.log('   ⚠️ On-chain check failed (demo mode):', err.message)
  }

  return results
}

router.get('/:address', async (req, res) => {
  const address = req.params.address.toLowerCase()
  console.log(`🔍 Checking verification for ${address.slice(0, 8)}...`)

  try {
    // Step 1: Query both blockchains
    const onChain = await checkOnChain(address)

    // Step 2: Check local credential store
    const store = getCredentialStore()
    const data = store.get(address)

    // Step 3: Determine verification source
    const verifiedOnChain = onChain.anyChainVerified
    const verifiedLocally = !!data
    const isVerifiedOnAny = verifiedOnChain || verifiedLocally

    if (!isVerifiedOnAny) {
      console.log('   ❌ Not verified (checked both chains + local)')
      return res.json({ success: true, walletAddress: address, isVerifiedOnAny: false })
    }

    // Check expiry (local only — on-chain doesn't expire)
    if (data?.expiresAt && new Date(data.expiresAt) < new Date()) {
      console.log('   ⚠️ Credential expired')
      return res.json({
        success: true,
        walletAddress: address,
        isVerifiedOnAny: false,
        expired: true,
        message: 'Your RacePass has expired. Please renew.'
      })
    }

    // Check revocation (local flag)
    if (data?.revoked) {
      console.log('   ⚠️ Credential revoked')
      return res.json({
        success: true,
        walletAddress: address,
        isVerifiedOnAny: false,
        revoked: true,
        message: 'Your RacePass has been revoked.'
      })
    }

    const source = verifiedOnChain ? 'blockchain' : 'local'
    console.log(`   ✅ Verified (${source})`)

    // Build reputation data from local store
    const reputation = data?.reputation || { score: 50, attendance: 0 }

    return res.json({
      success: true,
      walletAddress: address,
      isVerifiedOnAny: true,
      verifiedOnChain,
      onChainDetails: {
        ethereum: onChain.ethereum,
        polygon: onChain.polygon
      },
      fingerprint: data?.fingerprint || onChain.ethereum?.fingerprint || onChain.polygon?.fingerprint,
      credentialId: data?.credential?.id,
      issuedAt: data?.createdAt,
      expiresAt: data?.expiresAt,
      isAdult: data?.isAdult,
      ageCategory: data?.ageCategory,
      age: data?.age,
      reputation,
      source
    })

  } catch (error) {
    console.error('❌ Verification error:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
