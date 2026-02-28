# 📜 RacePass Smart Contracts

The core of the RacePass ecosystem—providing immutable, soulbound identity and reputation proofs.

## 🏗️ Contracts

### 1. `RacePassV2.sol`
The primary contract implementing the Identity and Reputation layer.
- **Soulbound Fingerprints**: Stores Keccak256 hashes of verifiable credentials (W3C standard).
- **Revocation Registry**: Allows users and issuers to revoke credentials.
- **Signed Attestations**: Verification of off-chain signatures for selective disclosure (e.g., age checks).
- **Reputation System**: Merkle-root based attendance tracking and reputation scores (0-100).
- **Ticket Validation**: Securely verifies ECDSA-signed tickets to prevent forgery.

## 🛠️ Key Functions

- `storeFingerprint(bytes32)`: Store your own identity fingerprint.
- `isVerified(address)`: View function to check if a wallet is verified and not revoked.
- `verifyAttestation(...)`: Verify a signed claim (off-chain signature).
- `recordAttendance(address, bytes32)`: Record event attendance (Issuer only).
- `isValidTicketSignature(...)`: Validate if a ticket signature is authentic.

## 🚀 Deployment

The contracts are designed for EVM-compatible chains (Ethereum, Sepolia, Polygon Amoy).

1.  **Using Remix**:
    - Upload `RacePassV2.sol` to Remix IDE.
    - Compile with Solidity 0.8.19+.
    - Deploy to your chosen network via Injected Provider (MetaMask).

2.  **Using Hardhat/Foundry**:
    - Add the contract to your `contracts/` directory.
    - Run deployment scripts.
