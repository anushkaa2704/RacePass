/**
 * wallet.js - MetaMask Wallet Utilities
 * 
 * What is MetaMask?
 * - It's a browser extension that acts as your "blockchain wallet"
 * - Think of it like a digital keychain for your crypto identity
 * - It lets websites interact with blockchain on your behalf
 * 
 * What is ethers.js?
 * - A library to talk to Ethereum blockchain
 * - We use it to connect wallets, read data, send transactions
 */

import { BrowserProvider } from 'ethers'

/**
 * Check if MetaMask is installed
 * MetaMask injects 'ethereum' object into the browser window
 */
export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && window.ethereum !== undefined
}

/**
 * Connect to MetaMask wallet
 * This opens MetaMask popup asking user to connect
 * 
 * @returns {string} The wallet address
 */
export async function connectWallet() {
  // Check if MetaMask is installed
  if (!isMetaMaskInstalled()) {
    throw new Error('Please install MetaMask! Go to metamask.io')
  }

  try {
    // Request account access
    // This shows the MetaMask popup
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })

    // Return the first account
    return accounts[0]
  } catch (error) {
    if (error.code === 4001) {
      // User rejected the connection
      throw new Error('Please connect your wallet to continue')
    }
    throw new Error('Failed to connect wallet: ' + error.message)
  }
}

/**
 * Get the current wallet address (if already connected)
 * 
 * @returns {string|null} The wallet address or null
 */
export async function getWalletAddress() {
  if (!isMetaMaskInstalled()) return null

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    })
    return accounts[0] || null
  } catch (error) {
    console.error('Error getting wallet address:', error)
    return null
  }
}

/**
 * Check if wallet is already connected
 * 
 * @returns {boolean}
 */
export async function checkIfWalletConnected() {
  const address = await getWalletAddress()
  return address !== null
}

/**
 * Get ethers provider
 * A "provider" is our connection to the blockchain
 * 
 * @returns {BrowserProvider}
 */
export function getProvider() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed')
  }
  return new BrowserProvider(window.ethereum)
}

/**
 * Get the current network/chain ID
 * Different blockchains have different IDs:
 * - Ethereum Mainnet: 1
 * - Sepolia Testnet: 11155111
 * - Polygon Mainnet: 137
 * - Polygon Mumbai: 80001
 * 
 * @returns {number} The chain ID
 */
export async function getChainId() {
  if (!isMetaMaskInstalled()) return null

  try {
    const chainIdHex = await window.ethereum.request({
      method: 'eth_chainId'
    })
    // Convert hex to decimal
    return parseInt(chainIdHex, 16)
  } catch (error) {
    console.error('Error getting chain ID:', error)
    return null
  }
}

/**
 * Switch to a different network
 * 
 * @param {string} chainId - The chain ID in hex format (like '0xaa36a7' for Sepolia)
 */
export async function switchNetwork(chainId) {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }]
    })
  } catch (error) {
    // If network not added yet, add it
    if (error.code === 4902) {
      throw new Error('Please add this network to MetaMask first')
    }
    throw error
  }
}

/**
 * Add a new network to MetaMask
 * 
 * @param {Object} networkConfig - Network parameters
 */
export async function addNetwork(networkConfig) {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkConfig]
    })
  } catch (error) {
    throw new Error('Failed to add network: ' + error.message)
  }
}

/**
 * Listen for account changes
 * Called when user switches accounts in MetaMask
 * 
 * @param {Function} callback - Function to call with new account
 */
export function onAccountChange(callback) {
  if (!isMetaMaskInstalled()) return

  window.ethereum.on('accountsChanged', (accounts) => {
    callback(accounts[0] || null)
  })
}

/**
 * Listen for network changes
 * Called when user switches networks in MetaMask
 * 
 * @param {Function} callback - Function to call with new chain ID
 */
export function onNetworkChange(callback) {
  if (!isMetaMaskInstalled()) return

  window.ethereum.on('chainChanged', (chainIdHex) => {
    callback(parseInt(chainIdHex, 16))
  })
}
