# ⚙️ RacePass Backend

The RacePass backend acts as the secure coordinator for identity verification, transaction management, and credential processing.

## 🔥 Key Roles

- **Credential Manager**: Validates incoming KYC data and generates secure proofs.
- **On-Chain Oracle**: Interacts with smart contracts to store and verify SBT fingerprints.
- **Event Coordinator**: Manages organizers, events, and ticket minting logic.
- **Privacy Layer**: Ensures minimal data storage—mostly working with cryptographic hashes.

## 🛠️ Tech Stack

- **Node.js**: JavaScript runtime.
- **Express**: Fast, unopinionated web framework.
- **Ethers.js**: For signing and broadcasting transactions to the blockchain.
- **Dotenv**: Environment variable management.
- **CORS**: Secure cross-origin resource sharing for frontend and extension.

## 📡 API Endpoints

- `POST /api/kyc/submit`: Main endpoint for submitting verified KYC data.
- `GET /api/verify/:address`: Check verification status of a specific wallet.
- `POST /api/events/create`: Create a new event linked to a verified organizer.
- `POST /api/events/mint-ticket`: Securely mint a ticket for a verified user.

## 🚀 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file based on your environment:
    ```env
    PORT=3001
    RPC_URL=...
    PRIVATE_KEY=...
    CONTRACT_ADDRESS=...
    ```

3.  **Run server**:
    ```bash
    npm start
    ```
    Or for development with auto-reload:
    ```bash
    npm run dev
    ```
