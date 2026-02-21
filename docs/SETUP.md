# Complete Setup Guide

This guide will help you run the entire RacePass project locally.

## Prerequisites

Before you start, make sure you have:

1. **Node.js** (version 18 or higher)
   - Download: https://nodejs.org
   - Check: `node --version`

2. **MetaMask** browser extension
   - Download: https://metamask.io
   - Create a wallet if you don't have one

3. **Test ETH** on Sepolia testnet
   - Get free test ETH from: https://sepoliafaucet.com
   - Or: https://www.alchemy.com/faucets/ethereum-sepolia

4. **Git** (optional, for version control)
   - Download: https://git-scm.com

## Project Structure

```
RacePass/
├── frontend/      → React website (port 5173)
├── backend/       → Node.js API (port 3001)
├── contracts/     → Solidity smart contract
├── n8n/           → Workflow automation (port 5678)
└── docs/          → Documentation
```

---

## Step 1: Deploy Smart Contract

The smart contract must be deployed FIRST because the backend needs its address.

### Using Remix (Easy, Recommended)

1. **Open Remix IDE**
   - Go to https://remix.ethereum.org

2. **Create a new file**
   - Click the "+" button in the file explorer
   - Name it `RacePass.sol`

3. **Copy the contract code**
   - Open `contracts/RacePass.sol` from this project
   - Copy ALL the code
   - Paste it into Remix

4. **Compile the contract**
   - Click the "Solidity Compiler" tab (left sidebar)
   - Select compiler version `0.8.19`
   - Click "Compile RacePass.sol"
   - You should see a green checkmark

5. **Connect MetaMask**
   - Make sure MetaMask is set to **Sepolia** testnet
   - Get some test ETH if you don't have any

6. **Deploy the contract**
   - Click the "Deploy & Run Transactions" tab
   - Set "Environment" to **Injected Provider - MetaMask**
   - MetaMask will ask you to connect - approve it
   - Click "Deploy"
   - MetaMask will ask to confirm the transaction - approve it
   - Wait for deployment (about 15-30 seconds)

7. **Copy the contract address**
   - After deployment, you'll see the contract under "Deployed Contracts"
   - Click the copy icon next to the contract name
   - Save this address! You'll need it for the backend.

8. **Repeat for Polygon Amoy** (optional)
   - Switch MetaMask to Polygon Amoy testnet
   - Get test MATIC from: https://faucet.polygon.technology/
   - Deploy again and save the address

### Update Backend Configuration

After deploying, update `backend/.env`:

```env
ETHEREUM_CONTRACT_ADDRESS=0xYOUR_SEPOLIA_CONTRACT_ADDRESS
POLYGON_CONTRACT_ADDRESS=0xYOUR_POLYGON_CONTRACT_ADDRESS
```

---

## Step 2: Configure Backend

1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Edit `backend/.env`:

   ```env
   # Server port
   PORT=3001

   # Your MetaMask private key (for signing transactions)
   # WARNING: Use a TEST wallet only! Never use a wallet with real funds!
   PRIVATE_KEY=your_private_key_here_without_0x

   # Contract addresses (from Step 1)
   ETHEREUM_CONTRACT_ADDRESS=0xYOUR_ADDRESS_HERE
   POLYGON_CONTRACT_ADDRESS=0xYOUR_ADDRESS_HERE

   # RPC URLs
   ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/demo
   POLYGON_RPC_URL=https://rpc-amoy.polygon.technology

   # Secret for signing credentials
   CREDENTIAL_SECRET=my-super-secret-key-change-this
   ```

   **How to get your Private Key:**
   - Open MetaMask
   - Click the three dots (⋮) next to your account
   - Click "Account Details"
   - Click "Show Private Key"
   - Enter your password
   - Copy the key (don't include "0x" prefix)

   ⚠️ **SECURITY WARNING**: Never share your private key! Only use a test wallet with test funds!

4. **Start the backend**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   🚀 ================================
      RacePass Backend Started!
   ================================
   📍 Server: http://localhost:3001
   ❤️  Health: http://localhost:3001/health
   ================================
   ```

---

## Step 3: Setup n8n Workflow

1. **Install n8n globally**
   ```bash
   npm install -g n8n
   ```

2. **Start n8n**
   ```bash
   n8n start
   ```
   
   n8n will open at http://localhost:5678

3. **Setup n8n**
   - Create an account (local only, just for demo)
   - Click "Workflows" → "Import from File"
   - Select `n8n/racepass-workflow.json`
   - Click "Save"
   - Click the toggle in top-right to **Activate** the workflow

4. **Verify webhook is active**
   - The webhook URL should be: `http://localhost:5678/webhook/kyc`

---

## Step 4: Start Frontend

1. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Update contract addresses** (if needed)
   
   Edit `frontend/src/utils/constants.js`:
   ```javascript
   export const NETWORKS = {
     ethereum: {
       // ... other settings
       contractAddress: '0xYOUR_SEPOLIA_ADDRESS'
     },
     polygon: {
       // ... other settings
       contractAddress: '0xYOUR_POLYGON_ADDRESS'
     }
   }
   ```

4. **Start the frontend**
   ```bash
   npm run dev
   ```

   Frontend will open at http://localhost:5173

---

## Quick Start (All Commands)

Open 3 terminal windows and run:

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - n8n:**
```bash
n8n start
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Port Summary

| Service  | Port | URL                         |
|----------|------|------------------------------|
| Frontend | 5173 | http://localhost:5173        |
| Backend  | 3001 | http://localhost:3001        |
| n8n      | 5678 | http://localhost:5678        |

---

## Adding Testnets to MetaMask

### Sepolia (Ethereum Testnet)

MetaMask should have this by default. If not:
- Network Name: Sepolia
- RPC URL: https://eth-sepolia.g.alchemy.com/v2/demo
- Chain ID: 11155111
- Currency: ETH
- Explorer: https://sepolia.etherscan.io

### Polygon Amoy (Polygon Testnet)

- Network Name: Polygon Amoy
- RPC URL: https://rpc-amoy.polygon.technology
- Chain ID: 80002
- Currency: MATIC
- Explorer: https://www.oklink.com/amoy

---

## Troubleshooting

### "Contract not deployed" error
- Make sure you've deployed the contract (Step 1)
- Check that contract addresses are correct in `.env` and `constants.js`

### MetaMask not connecting
- Make sure MetaMask is installed
- Make sure you're on the correct network (Sepolia)
- Try refreshing the page

### n8n webhook not working
- Make sure the workflow is **activated** (toggle in top-right)
- Check the webhook URL is correct
- Make sure n8n is running

### Backend errors
- Check that `.env` file exists and has correct values
- Make sure private key is valid (no "0x" prefix)
- Check that you have test ETH for gas fees

### Transaction failing
- Make sure you have enough test ETH/MATIC for gas
- Check that the contract address is correct
- Verify the private key in `.env` is for an authorized address

---

## Need Help?

1. Check the README files in each folder
2. Look at error messages in the terminal
3. Check MetaMask for transaction errors
4. Make sure all services are running
