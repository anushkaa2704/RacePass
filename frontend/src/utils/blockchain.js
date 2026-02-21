/**
 * blockchain.js - Smart Contract Interaction Utilities
 * 
 * This file handles all communication with our smart contract.
 * 
 * Key concepts:
 * 1. Provider - Connection to blockchain (read-only)
 * 2. Signer - Your wallet, can sign transactions (read/write)
 * 3. Contract - The smart contract object we interact with
 */

import { Contract } from 'ethers'
import { getProvider } from './wallet'
import { NETWORKS, CONTRACT_ABI } from './constants'

/**
 * Get a contract instance for reading data
 * 
 * @param {string} network - 'ethereum' or 'polygon'
 * @returns {Contract}
 */
export async function getReadOnlyContract(network) {
  const provider = getProvider()
  const networkConfig = NETWORKS[network]
  
  if (!networkConfig) {
    throw new Error(`Unknown network: ${network}`)
  }
  
  if (networkConfig.contractAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract not deployed on ${network} yet. Please deploy first!`)
  }
  
  return new Contract(
    networkConfig.contractAddress,
    CONTRACT_ABI,
    provider
  )
}

/**
 * Get a contract instance for writing data
 * Needs a signer (wallet) to send transactions
 * 
 * @param {string} network - 'ethereum' or 'polygon'
 * @returns {Contract}
 */
export async function getWriteContract(network) {
  const provider = getProvider()
  const signer = await provider.getSigner()
  const networkConfig = NETWORKS[network]
  
  if (!networkConfig) {
    throw new Error(`Unknown network: ${network}`)
  }
  
  if (networkConfig.contractAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract not deployed on ${network} yet. Please deploy first!`)
  }
  
  return new Contract(
    networkConfig.contractAddress,
    CONTRACT_ABI,
    signer
  )
}

/**
 * Check if a wallet address is verified on a specific network
 * 
 * @param {string} walletAddress - The address to check
 * @param {string} network - 'ethereum' or 'polygon'
 * @returns {boolean}
 */
export async function checkVerification(walletAddress, network) {
  try {
    const contract = await getReadOnlyContract(network)
    const isVerified = await contract.isVerified(walletAddress)
    return isVerified
  } catch (error) {
    console.error('Error checking verification:', error)
    return false
  }
}

/**
 * Get the stored fingerprint for a wallet address
 * 
 * @param {string} walletAddress - The address to check
 * @param {string} network - 'ethereum' or 'polygon'
 * @returns {string} The fingerprint (bytes32 hex string)
 */
export async function getFingerprint(walletAddress, network) {
  try {
    const contract = await getReadOnlyContract(network)
    const fingerprint = await contract.getFingerprint(walletAddress)
    return fingerprint
  } catch (error) {
    console.error('Error getting fingerprint:', error)
    return null
  }
}

/**
 * Store a fingerprint on the blockchain
 * This is called by the backend, but can also be used for testing
 * 
 * @param {string} fingerprint - The fingerprint (bytes32 hex string)
 * @param {string} network - 'ethereum' or 'polygon'
 * @returns {Object} Transaction receipt
 */
export async function storeFingerprint(fingerprint, network) {
  try {
    const contract = await getWriteContract(network)
    
    // Send the transaction
    const tx = await contract.storeFingerprint(fingerprint)
    
    // Wait for transaction to be mined
    const receipt = await tx.wait()
    
    return receipt
  } catch (error) {
    console.error('Error storing fingerprint:', error)
    throw error
  }
}

/**
 * Check verification status on both networks
 * 
 * @param {string} walletAddress - The address to check
 * @returns {Object} { ethereum: boolean, polygon: boolean }
 */
export async function checkAllNetworks(walletAddress) {
  const results = {
    ethereum: false,
    polygon: false
  }
  
  try {
    // Check both in parallel for speed
    const [ethResult, polyResult] = await Promise.allSettled([
      checkVerification(walletAddress, 'ethereum'),
      checkVerification(walletAddress, 'polygon')
    ])
    
    results.ethereum = ethResult.status === 'fulfilled' ? ethResult.value : false
    results.polygon = polyResult.status === 'fulfilled' ? polyResult.value : false
  } catch (error) {
    console.error('Error checking all networks:', error)
  }
  
  return results
}
