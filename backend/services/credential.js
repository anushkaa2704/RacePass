/**
 * credential.js - Digital Credential Service
 * 
 * What is a Verifiable Credential?
 * - A digital document that proves something about you
 * - Like a driver's license, but digital
 * - Can be verified using cryptography
 * 
 * Our credential structure:
 * {
 *   id: "unique-id",
 *   type: "RacePassCredential",
 *   issuer: "RacePass",
 *   issuanceDate: "2024-01-01",
 *   subject: {
 *     walletAddress: "0x...",
 *     verified: true
 *   },
 *   proof: {
 *     type: "sha256",
 *     hash: "0x..."
 *   }
 * }
 */

import { v4 as uuidv4 } from 'uuid'
import { createHash } from 'crypto'

/**
 * Create a digital credential for a verified user
 * 
 * @param {string} walletAddress - User's wallet address
 * @param {Object} kycData - The KYC data (NOT stored, just used to create credential)
 * @returns {Object} The credential object
 */
export function createCredential(walletAddress, kycData) {
  // Create credential
  const credential = {
    // Unique identifier
    id: `racepass:${uuidv4()}`,
    
    // Type of credential
    type: ['VerifiableCredential', 'RacePassCredential'],
    
    // Who issued it
    issuer: {
      id: 'did:racepass:issuer',
      name: 'RacePass Identity Service'
    },
    
    // When it was issued
    issuanceDate: new Date().toISOString(),
    
    // When it expires (1 year from now)
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    
    // The subject (what the credential is about)
    credentialSubject: {
      // The wallet this credential belongs to
      id: `did:ethr:${walletAddress}`,
      walletAddress: walletAddress,
      
      // What we're attesting
      verification: {
        type: 'KYC',
        status: 'verified',
        verifiedAt: new Date().toISOString()
      }
    }
  }
  
  // Note: We DON'T include personal data (name, Aadhaar) in the credential!
  // The KYC data is only used to verify, then discarded
  
  return credential
}

/**
 * Sign a credential
 * This proves the credential was issued by us
 * 
 * @param {Object} credential - The credential to sign
 * @returns {Object} Credential with proof
 */
export function signCredential(credential) {
  const secret = process.env.CREDENTIAL_SECRET || 'default-secret'
  
  // Create a hash of the credential + secret
  const credentialString = JSON.stringify(credential)
  const signature = createHash('sha256')
    .update(credentialString + secret)
    .digest('hex')
  
  // Add proof to credential
  return {
    ...credential,
    proof: {
      type: 'Sha256Signature',
      created: new Date().toISOString(),
      proofValue: signature
    }
  }
}

/**
 * Verify a credential's signature
 * 
 * @param {Object} credential - The credential to verify
 * @returns {boolean} True if valid
 */
export function verifyCredential(credential) {
  const secret = process.env.CREDENTIAL_SECRET || 'default-secret'
  
  // Get the proof
  const proof = credential.proof
  if (!proof) return false
  
  // Recreate the credential without proof
  const { proof: _, ...credentialWithoutProof } = credential
  
  // Create hash
  const credentialString = JSON.stringify(credentialWithoutProof)
  const expectedSignature = createHash('sha256')
    .update(credentialString + secret)
    .digest('hex')
  
  // Compare
  return proof.proofValue === expectedSignature
}
