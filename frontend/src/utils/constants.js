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
 * RacePass V2 contract features:
 * 1. storeFingerprint(hash) - Save a fingerprint
 * 2. isVerified(address) - Check if someone is verified (respects revocation)
 * 3. getFingerprint(address) - Get the stored fingerprint
 * 4. revokeCredential() / restoreCredential() - Credential revocation
 * 5. isRevoked(address) - Check revocation status
 * 6. verifyAttestation() - On-chain ECDSA attestation verification
 * 7. getReputation(address) - Reputation score + attendance
 * 8. fullVerify() - Combined verification check
 * 9. isValidTicketSignature() - On-chain ticket validation
 */
export const CONTRACT_ABI = [
  // Store a fingerprint (hash) for a wallet address
  {
    name: 'storeFingerprint',
    type: 'function',
    inputs: [{ name: '_fingerprint', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  // Check if an address has a verified fingerprint (respects revocation)
  {
    name: 'isVerified',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  // Get the fingerprint for an address
  {
    name: 'getFingerprint',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view'
  },
  // Revocation
  {
    name: 'revokeCredential',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'restoreCredential',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'isRevoked',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  // Attestation verification
  {
    name: 'verifyAttestation',
    type: 'function',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'claimHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  // Reputation
  {
    name: 'getReputation',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'attendance', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'isUserRevoked', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  // Full combined verification
  {
    name: 'fullVerify',
    type: 'function',
    inputs: [
      { name: '_user', type: 'address' },
      { name: 'minReputation', type: 'uint256' },
      { name: 'minAttendance', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  // Ticket validation
  {
    name: 'isValidTicketSignature',
    type: 'function',
    inputs: [
      { name: 'ticketHash', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  // Events
  {
    name: 'FingerprintStored',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'fingerprint', type: 'bytes32' }
    ]
  },
  {
    name: 'CredentialRevoked',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'revokedBy', type: 'address' }
    ]
  },
  {
    name: 'CredentialRestored',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true }
    ]
  }
]

// ============================================
// API ENDPOINTS
// ============================================

// Dynamic backend URL: use same hostname as frontend (for LAN/mobile access)
const getBackendUrl = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  return `http://${host}:3001`
}

const getN8nUrl = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  return `http://${host}:5678/webhook/kyc`
}

export const API = {
  // Our backend server (auto-detects hostname for LAN/mobile)
  get BACKEND_URL() { return getBackendUrl() },
  
  // n8n webhook URL (for KYC submission)
  get N8N_WEBHOOK_URL() { return getN8nUrl() }
}

// ============================================
// KYC FORM FIELDS
// ============================================

export const KYC_FIELDS = [
  { name: 'fullName', label: 'Full Name', type: 'text', required: true },
  { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
  { name: 'aadhaarNumber', label: 'Aadhaar Number (Demo)', type: 'text', required: true },
]
