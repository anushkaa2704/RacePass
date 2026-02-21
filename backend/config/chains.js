/**
 * chains.js - Blockchain Network Configuration
 * 
 * This file contains all the network settings for
 * Ethereum and Polygon testnets.
 */

// Network configurations
export const CHAINS = {
  ethereum: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY',
    contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  
  polygon: {
    name: 'Polygon Amoy Testnet',
    chainId: 80002,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contractAddress: process.env.POLYGON_CONTRACT_ADDRESS,
    blockExplorer: 'https://www.oklink.com/amoy'
  }
}

// Smart contract ABI (same for both chains)
export const CONTRACT_ABI = [
  {
    name: 'storeFingerprint',
    type: 'function',
    inputs: [{ name: '_fingerprint', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'storeFingerprintFor',
    type: 'function',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_fingerprint', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'isVerified',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'getFingerprint',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view'
  }
]

/**
 * Get chain configuration by name
 * @param {string} chainName - 'ethereum' or 'polygon'
 * @returns {Object} Chain configuration
 */
export function getChainConfig(chainName) {
  const chain = CHAINS[chainName]
  if (!chain) {
    throw new Error(`Unknown chain: ${chainName}`)
  }
  return chain
}
