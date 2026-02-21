/**
 * hash.js - Fingerprint/Hash Service
 * 
 * What is a Hash (Fingerprint)?
 * - A hash is like a digital fingerprint
 * - It takes ANY data and produces a fixed-size string
 * - Example: "Hello" → "185f8db32271fe25f561a6fc938b2e26..."
 * 
 * Key properties:
 * 1. ONE-WAY: You can't reverse it (can't get "Hello" from the hash)
 * 2. UNIQUE: Different data = different hash
 * 3. CONSISTENT: Same data always = same hash
 * 
 * Why use hashing?
 * - We store the HASH on blockchain, not personal data
 * - Anyone can verify the hash matches, but can't see the data
 * - This protects privacy!
 */

import { createHash } from 'crypto'
import { keccak256, toUtf8Bytes } from 'ethers'

/**
 * Create a SHA-256 hash of data
 * Used for credential signing
 * 
 * @param {string|Object} data - Data to hash
 * @returns {string} Hex hash string
 */
export function sha256Hash(data) {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data)
  
  return createHash('sha256')
    .update(dataString)
    .digest('hex')
}

/**
 * Create a Keccak-256 hash (Ethereum's hash function)
 * This is what we store on the blockchain
 * 
 * @param {string|Object} data - Data to hash
 * @returns {string} Bytes32 hex string (with 0x prefix)
 */
export function createFingerprint(data) {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data)
  
  // Use Ethereum's keccak256 hash
  const hash = keccak256(toUtf8Bytes(dataString))
  
  return hash // This is already bytes32 format
}

/**
 * Create a fingerprint from a credential
 * This is what gets stored on blockchain
 * 
 * @param {Object} credential - The signed credential
 * @returns {string} Bytes32 fingerprint
 */
export function createCredentialFingerprint(credential) {
  // We only hash specific fields, not the entire credential
  // This ensures the fingerprint is consistent
  const fingerprintData = {
    id: credential.id,
    walletAddress: credential.credentialSubject.walletAddress,
    issuanceDate: credential.issuanceDate,
    proof: credential.proof?.proofValue
  }
  
  return createFingerprint(fingerprintData)
}

/**
 * Verify a fingerprint matches a credential
 * 
 * @param {Object} credential - The credential
 * @param {string} fingerprint - The fingerprint to check
 * @returns {boolean} True if match
 */
export function verifyFingerprint(credential, fingerprint) {
  const expectedFingerprint = createCredentialFingerprint(credential)
  return expectedFingerprint === fingerprint
}
