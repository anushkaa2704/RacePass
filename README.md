# 🏎️ RacePass: Privacy-Preserving Identity & Reputation Layer

RacePass is a next-generation identity verification system designed for the Web3 era. It combines **in-browser OCR**, **live biometrics**, and **Soulbound Tokens (SBTs)** to provide a seamless, privacy-preserving identity layer that works across the web.

## 🌟 Key Features

### 1. 🛡️ Privacy-First Verification (KYC)
- **Local Processing**: Aadhaar OCR (Tesseract.js) and Face Matching (face-api.js) run **entirely in your browser**. Your sensitive documents never leave your device.
- **Biometric Binding**: Links your wallet to your physical identity through a 1:1 live photo match against your ID document.
- **Anti-Fraud**: Built-in lockout mechanisms for failed verification attempts (24h cooldown).

### 2. ⛓️ Soulbound Identity Proofs (SBT)
- **Immutable Proof**: Once verified, a cryptographic "fingerprint" is stored on-chain as a Soulbound Token (RacePass SBT).
- **Universal Portability**: Use your verified status across any dApp or website supported by the RacePass network.
- **Revocation Registry**: Users can self-revoke their credentials, or issuers can invalidate them in case of security breaches.

### 3. 🧩 Universal Browser Extension
- **Verify Once, Access Everywhere**: A Chrome/Brave extension that auto-detects RacePass-supported sites (e.g., BookMyShow, Paytm).
- **One-Click Proofs**: Share "Over 18" or "Identity Verified" proofs without revealing your actual date of birth or name (Selective Disclosure).

### 4. 📊 Reputation & Attendance Tracking
- **On-Chain Reputation**: Earn scores (0-100) based on verified activities and attendance.
- **Merkle-Based Attendance**: Privacy-preserving attendance tracking using Merkle proofs—prove you attended an event without revealing a full history.

### 5. 🎟️ Secure Event Marketplace
- **Sybil Resistance**: Ensures only real, unique humans can purchase or trade tickets.
- **Cryptographic Tickets**: On-chain validation of signed ticket payloads to prevent forgery and double-entry.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Framer Motion, Spline (3D), Tailwind CSS
- **AI/ML**: Tesseract.js (OCR), face-api.js (Biometrics)
- **Blockchain**: Solidity, Ethers.js, Sepolia/Polygon Amoy
- **Backend**: Node.js, Express, UUID
- **Automation**: n8n Workflows
- **Wallet**: MetaMask integration

---

## 📂 Project Structure

```bash
RacePass/
├── frontend/        # React + Vite application
├── backend/         # Express API for credential management
├── contracts/       # Solidity Smart Contracts (SBT & Reputation)
├── extension/       # Chrome/Brave Extension source
├── n8n/             # Workflow automation JSON files
└── docs/            # Documentation and architecture diagrams
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MetaMask Browser Extension
- A code editor (VS Code recommended)

### 2. Backend Setup
```bash
cd backend
npm install
# Create a .env file with:
# PORT=3001
# RPC_URL=your_rpc_url
# PRIVATE_KEY=your_wallet_private_key
# CONTRACT_ADDRESS=deployed_contract_address
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### 4. Browser Extension
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `/extension` folder.

### 5. Smart Contracts
1. Compile and deploy `RacePassV2.sol` using Remix or Hardhat.
2. Update the contract address in your backend `.env` and frontend config.

---

## 🔧 Workflow Automation (n8n)
Import the `racepass-workflow.json` into your n8n instance to enable automated identity verification alerts and background processing logic.

---

## 📝 License
Built with ❤️ for the SPIT Hackathon. Refer to individual files for licensing details (MIT).
