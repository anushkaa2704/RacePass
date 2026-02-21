# RacePass - Privacy-Preserving Identity Verification

## What is RacePass?

RacePass is a digital identity system that:
1. Verifies your identity once (KYC)
2. Issues a digital credential
3. Stores ONLY a fingerprint (hash) on blockchain
4. Lets third-party websites verify you WITHOUT seeing your personal data

## How It Works (Simple Explanation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RacePass Flow                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. USER                    2. KYC CHECK              3. BLOCKCHAIN │
│  ┌─────────┐               ┌─────────────┐           ┌────────────┐ │
│  │ Submit  │ ──────────▶  │   n8n       │ ────────▶ │  Store     │ │
│  │ Aadhaar │               │ (Verifies)  │           │  Hash      │ │
│  └─────────┘               └─────────────┘           └────────────┘ │
│                                                                      │
│  4. CONCERT WEBSITE                                                  │
│  ┌─────────────────────────────────────────────────┐                │
│  │ "Continue with RacePass" → Check Hash → ✓ Entry │                │
│  │ (No personal data shared!)                       │                │
│  └─────────────────────────────────────────────────┘                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
RacePass/
├── frontend/          # React website (User Interface)
│   ├── src/
│   │   ├── components/    # Reusable UI pieces
│   │   ├── pages/         # Different screens
│   │   ├── utils/         # Helper functions
│   │   └── App.jsx        # Main app file
│   └── package.json
│
├── backend/           # Node.js server (Business Logic)
│   ├── routes/        # API endpoints
│   ├── services/      # Core logic (hashing, signing)
│   ├── config/        # Configuration files
│   └── server.js      # Main server file
│
├── contracts/         # Solidity (Blockchain Code)
│   └── RacePass.sol   # Smart contract
│
└── README.md          # This file
```

## Tech Stack

| Part       | Technology        | Purpose                    |
|------------|-------------------|----------------------------|
| Frontend   | React + Vite      | User interface             |
| Backend    | Node.js + Express | API and business logic     |
| Blockchain | Solidity          | Store fingerprints         |
| Web3       | ethers.js         | Talk to blockchain         |
| Wallet     | MetaMask          | User's blockchain wallet   |
| Automation | n8n               | Verify KYC automatically   |

## Ports

| Service    | Port  | URL                        |
|------------|-------|----------------------------|
| Frontend   | 5173  | http://localhost:5173      |
| Backend    | 3001  | http://localhost:3001      |
| n8n        | 5678  | http://localhost:5678      |

## Getting Started

See the setup instructions in each folder's README.
