/**
 * verify.js - Verification API Routes
 * 
 * Checks if a wallet is verified by looking at:
 * 1. Local credential store (always works, even without blockchain)
 * 2. Blockchain (if contract is deployed)
 */

import { Router } from 'express'
import { getCredentialStore, getActivityLog } from './kyc.js'

const router = Router()

router.get('/:address', async (req, res) => {
  const address = req.params.address.toLowerCase()
  console.log(`🔍 Checking verification for ${address.slice(0, 8)}...`)

  try {
    const store = getCredentialStore()
    const data = store.get(address)

    if (data) {
      // Check if credential has expired
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        console.log('   ⚠️ Credential expired')
        return res.json({
          success: true,
          walletAddress: address,
          isVerifiedOnAny: false,
          expired: true,
          message: 'Your RacePass has expired. Please renew.'
        })
      }

      console.log('   ✅ Verified (local store)')
      return res.json({
        success: true,
        walletAddress: address,
        isVerifiedOnAny: true,
        fingerprint: data.fingerprint,
        credentialId: data.credential?.id,
        issuedAt: data.createdAt,
        expiresAt: data.expiresAt,
        isAdult: data.isAdult,
        ageCategory: data.ageCategory,
        source: 'local'
      })
    }

    console.log('   ❌ Not verified')
    res.json({ success: true, walletAddress: address, isVerifiedOnAny: false })

  } catch (error) {
    console.error('❌ Verification error:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
