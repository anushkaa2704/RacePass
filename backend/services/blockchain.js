/**
 * blockchain.js - Blockchain Interaction Service
 * 
 * This service handles all blockchain operations:
 * 1. Connecting to networks (Ethereum, Polygon)
 * 2. Calling smart contract functions
 * 3. Storing fingerprints on-chain
 * 4. Reading verification status
 * 
 * Key concepts:
 * - Provider: Read-only connection to blockchain
 * - Wallet: Can sign transactions (needs private key)
 * - Contract: Smart contract we interact with
 */

import { JsonRpcProvider, Wallet, Contract } from 'ethers'
import { CHAINS, CONTRACT_ABI, getChainConfig } from '../config/chains.js'

// Cache for providers and contracts
const providers = {}
const wallets = {}
const contracts = {}

/**
 * Get a provider for a specific chain
 * Provider = connection to blockchain (read-only)
 * 
 * @param {string} chainName - 'ethereum' or 'polygon'
 * @returns {JsonRpcProvider}
 */
export function getProvider(chainName) {
  if (!providers[chainName]) {
    const config = getChainConfig(chainName)
    providers[chainName] = new JsonRpcProvider(config.rpcUrl)
  }
  return providers[chainName]
}

/**
 * Get a wallet for signing transactions
 * Wallet = provider + private key
 * 
 * @param {string} chainName - 'ethereum' or 'polygon'
 * @returns {Wallet}
 */
export function getWallet(chainName) {
  if (!wallets[chainName]) {
    const privateKey = process.env.PRIVATE_KEY
    
    if (!privateKey || privateKey === 'your_private_key_here_without_0x_prefix') {
      throw new Error('Private key not configured! Please set PRIVATE_KEY in .env file')
    }
    
    const provider = getProvider(chainName)
    wallets[chainName] = new Wallet(privateKey, provider)
  }
  return wallets[chainName]
}

/**
 * Get a contract instance for a chain
 * 
 * @param {string} chainName - 'ethereum' or 'polygon'
 * @param {boolean} writeable - If true, uses wallet (can write). If false, uses provider (read-only)
 * @returns {Contract}
 */
export function getContract(chainName, writeable = false) {
  const key = `${chainName}-${writeable}`
  
  if (!contracts[key]) {
    const config = getChainConfig(chainName)
    
    if (!config.contractAddress || config.contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Contract not deployed on ${chainName}! Please deploy and update .env`)
    }
    
    const signerOrProvider = writeable ? getWallet(chainName) : getProvider(chainName)
    contracts[key] = new Contract(config.contractAddress, CONTRACT_ABI, signerOrProvider)
  }
  
  return contracts[key]
}

/**
 * Store a fingerprint on the blockchain
 * 
 * @param {string} userAddress - The user's wallet address
 * @param {string} fingerprint - The bytes32 fingerprint
 * @param {string} chainName - 'ethereum' or 'polygon'
 * @returns {Object} Transaction receipt
 */
export async function storeFingerprint(userAddress, fingerprint, chainName) {
  console.log(`📝 Storing fingerprint on ${chainName}...`)
  console.log(`   User: ${userAddress}`)
  console.log(`   Fingerprint: ${fingerprint.slice(0, 20)}...`)
  
  try {
    const contract = getContract(chainName, true) // writeable = true
    
    // Call the smart contract function
    const tx = await contract.storeFingerprintFor(userAddress, fingerprint)
    console.log(`   Transaction sent: ${tx.hash}`)
    
    // Wait for transaction to be mined
    const receipt = await tx.wait()
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`)
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      chain: chainName
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message)
    throw error
  }
}

/**
 * Check if a user is verified on a specific chain
 * 
 * @param {string} userAddress - The user's wallet address
 * @param {string} chainName - 'ethereum' or 'polygon'
 * @returns {boolean}
 */
export async function checkVerification(userAddress, chainName) {
  try {
    const contract = getContract(chainName, false) // read-only
    const isVerified = await contract.isVerified(userAddress)
    return isVerified
  } catch (error) {
    console.error(`Error checking verification on ${chainName}:`, error.message)
    return false
  }
}

/**
 * Get the stored fingerprint for a user
 * 
 * @param {string} userAddress - The user's wallet address
 * @param {string} chainName - 'ethereum' or 'polygon'
 * @returns {string|null} The fingerprint or null
 */
export async function getFingerprint(userAddress, chainName) {
  try {
    const contract = getContract(chainName, false) // read-only
    const fingerprint = await contract.getFingerprint(userAddress)
    
    // Check if it's the zero hash (not set)
    if (fingerprint === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null
    }
    
    return fingerprint
  } catch (error) {
    console.error(`Error getting fingerprint on ${chainName}:`, error.message)
    return null
  }
}

/**
 * Store fingerprint on both chains
 * 
 * @param {string} userAddress - The user's wallet address
 * @param {string} fingerprint - The bytes32 fingerprint
 * @returns {Object} Results from both chains
 */
export async function storeOnBothChains(userAddress, fingerprint) {
  console.log('📝 Storing fingerprint on both chains...')
  
  const results = {
    ethereum: null,
    polygon: null
  }
  
  // Try Ethereum
  try {
    results.ethereum = await storeFingerprint(userAddress, fingerprint, 'ethereum')
  } catch (error) {
    results.ethereum = { success: false, error: error.message }
    console.log('   ⚠️ Ethereum storage failed:', error.message)
  }
  
  // Try Polygon
  try {
    results.polygon = await storeFingerprint(userAddress, fingerprint, 'polygon')
  } catch (error) {
    results.polygon = { success: false, error: error.message }
    console.log('   ⚠️ Polygon storage failed:', error.message)
  }
  
  return results
}
