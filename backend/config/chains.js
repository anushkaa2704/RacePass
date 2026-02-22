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

// Smart contract ABI — RacePassV2 (superset of V1)
// V2 adds: revocation, attestation verification, reputation, ticket validation
export const CONTRACT_ABI = [
  // ── V1 functions (unchanged) ──
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
  },

  // ── V2: Revocation ──
  {
    name: 'revokeCredential',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'restoreCredential',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
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

  // ── V2: Signed Attestation Verification ──
  {
    name: 'verifyAttestation',
    type: 'function',
    inputs: [
      { name: '_wallet', type: 'address' },
      { name: '_claimHash', type: 'bytes32' },
      { name: '_nonce', type: 'uint256' },
      { name: '_v', type: 'uint8' },
      { name: '_r', type: 'bytes32' },
      { name: '_s', type: 'bytes32' }
    ],
    outputs: [{ name: 'valid', type: 'bool' }],
    stateMutability: 'view'
  },

  // ── V2: Reputation ──
  {
    name: 'recordAttendance',
    type: 'function',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_eventHash', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'updateReputation',
    type: 'function',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_score', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'updateMerkleRoot',
    type: 'function',
    inputs: [{ name: '_root', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getReputation',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'attendance', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'isRevokedStatus', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'meetsAttendanceThreshold',
    type: 'function',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_minAttendance', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'verifyAttendanceProof',
    type: 'function',
    inputs: [
      { name: '_proof', type: 'bytes32[]' },
      { name: '_leaf', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },

  // ── V2: Ticket Validation ──
  {
    name: 'isValidTicketSignature',
    type: 'function',
    inputs: [
      { name: '_ticketHash', type: 'bytes32' },
      { name: '_v', type: 'uint8' },
      { name: '_r', type: 'bytes32' },
      { name: '_s', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'markTicketUsed',
    type: 'function',
    inputs: [{ name: '_ticketHash', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // ── V2: Full Verify ──
  {
    name: 'fullVerify',
    type: 'function',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_minReputation', type: 'uint256' },
      { name: '_minAttendance', type: 'uint256' }
    ],
    outputs: [{ name: 'verified', type: 'bool' }],
    stateMutability: 'view'
  },

  // ── V2: Events ──
  {
    name: 'FingerprintStored',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'fingerprint', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    name: 'CredentialRevoked',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'revokedBy', type: 'address' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    name: 'AttendanceRecorded',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'eventHash', type: 'bytes32' },
      { name: 'newCount', type: 'uint256' }
    ]
  },
  {
    name: 'TicketUsed',
    type: 'event',
    inputs: [
      { name: 'ticketHash', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256' }
    ]
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
