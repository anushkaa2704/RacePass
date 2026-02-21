/**
 * constants.js - Configuration Constants
 * 
 * This file contains all the "magic numbers" and configurations
 * for our app. Keeping them here makes it easy to change later.
 */

// ============================================
// BLOCKCHAIN NETWORKS
// ============================================

/**
 * Network configurations
 * 
 * What is a testnet?
 * - It's a practice version of the real blockchain
 * - Uses fake money (test ETH/MATIC)
 * - Perfect for learning and testing
 * 
 * We use two testnets:
 * 1. Sepolia - Ethereum's testnet
 * 2. Mumbai - Polygon's testnet (Note: Mumbai is deprecated, using Amoy instead)
 */
export const NETWORKS = {
  // Ethereum Sepolia Testnet
  ethereum: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    currency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    // Contract address - UPDATE THIS after deploying!
    contractAddress: '0x0000000000000000000000000000000000000000'
  },
  
  // Polygon Amoy Testnet (Mumbai replacement)
  polygon: {
    name: 'Polygon Amoy Testnet',
    chainId: 80002,
    chainIdHex: '0x13882',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://www.oklink.com/amoy',
    currency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    // Contract address - UPDATE THIS after deploying!
    contractAddress: '0x0000000000000000000000000000000000000000'
  }
}

// ============================================
// SMART CONTRACT ABI
// ============================================

/**
 * What is an ABI?
 * - "Application Binary Interface"
 * - It's like a menu for the smart contract
 * - Tells us what functions exist and how to call them
 * 
 * Our RacePass contract has:
 * 1. storeFingerprint(hash) - Save a fingerprint
 * 2. verifyFingerprint(address) - Check if someone is verified
 * 3. getFingerprint(address) - Get the stored fingerprint
 */
export const CONTRACT_ABI = [
  // Store a fingerprint (hash) for a wallet address
  {
    name: 'storeFingerprint',
    type: 'function',
    inputs: [
      { name: '_fingerprint', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // Check if an address has a verified fingerprint
  {
    name: 'isVerified',
    type: 'function',
    inputs: [
      { name: '_user', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  
  // Get the fingerprint for an address
  {
    name: 'getFingerprint',
    type: 'function',
    inputs: [
      { name: '_user', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'bytes32' }
    ],
    stateMutability: 'view'
  },
  
  // Event emitted when fingerprint is stored
  {
    name: 'FingerprintStored',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'fingerprint', type: 'bytes32' }
    ]
  }
]

// ============================================
// API ENDPOINTS
// ============================================

export const API = {
  // Our backend server
  BACKEND_URL: 'http://localhost:3001',
  
  // n8n webhook URL (for KYC submission)
  N8N_WEBHOOK_URL: 'http://localhost:5678/webhook/kyc'
}

// ============================================
// KYC FORM FIELDS
// ============================================

export const KYC_FIELDS = [
  { name: 'fullName', label: 'Full Name', type: 'text', required: true },
  { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
  { name: 'aadhaarNumber', label: 'Aadhaar Number (Demo)', type: 'text', required: true },
]
