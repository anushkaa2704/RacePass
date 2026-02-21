# RacePass Backend

This is the API server built with Node.js + Express.

## What's in here?

```
backend/
├── routes/           # API endpoints
│   └── kyc.js        # KYC-related routes
├── services/         # Core business logic
│   ├── credential.js # Create digital credentials
│   ├── hash.js       # Generate fingerprints
│   └── blockchain.js # Talk to smart contract
├── config/           # Configuration
│   └── chains.js     # Blockchain network settings
├── server.js         # Main server file
├── package.json      # Dependencies
└── .env              # Secret keys (DO NOT SHARE!)
```

## How to Run

```bash
cd backend
npm install
npm run dev
```

Server runs on http://localhost:3001
