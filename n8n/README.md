# n8n Workflow Setup Guide

## What is n8n?

n8n (pronounced "n-eight-n") is a workflow automation tool. It lets you:
- Receive data via webhooks
- Process and validate data
- Make API calls
- Return responses

Think of it like a visual programming tool where you connect "blocks" together.

## How to Install n8n Locally

### Option 1: Using npm (Recommended for this project)

```bash
# Install n8n globally
npm install -g n8n

# Run n8n
n8n start
```

### Option 2: Using Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

After starting, open http://localhost:5678 in your browser.

## Importing the Workflow

1. Go to http://localhost:5678
2. Create an account (local only, just for demo)
3. Click **"Workflows"** in the sidebar
4. Click **"Import from File"**
5. Select the `racepass-workflow.json` file from this folder
6. Click **"Save"**
7. Click **"Activate"** (toggle in top right)

## Understanding the Workflow

Our workflow has 4 nodes:

```
┌─────────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────────┐
│  Webhook    │ ──▶ │  Validate  │ ──▶ │  Process    │ ──▶ │  Respond     │
│  (Receive)  │     │  (Check)   │     │  (Backend)  │     │  (Return)    │
└─────────────┘     └────────────┘     └─────────────┘     └──────────────┘
```

### Node 1: Webhook (Receive Data)

**What it does:** Listens for incoming HTTP requests from our frontend.

**Settings:**
- HTTP Method: POST
- Path: `/kyc`
- Response Mode: Respond with "Respond to Webhook" node

**URL:** `http://localhost:5678/webhook/kyc`

### Node 2: IF (Validate Data)

**What it does:** Checks if the KYC data is valid.

**Rules:**
- Aadhaar number must be 12 digits
- Wallet address must start with "0x"
- All required fields must be present

**Demo Logic:**
```
IF aadhaar.length == 12 AND wallet starts with "0x"
  → Continue to Process
ELSE
  → Return Error
```

### Node 3: HTTP Request (Call Backend)

**What it does:** Calls our backend API to process the KYC.

**Settings:**
- Method: POST
- URL: `http://localhost:3001/api/kyc/process`
- Body: 
  ```json
  {
    "walletAddress": "{{ from webhook }}",
    "kycData": "{{ from webhook }}",
    "kycStatus": "approved"
  }
  ```

### Node 4: Respond to Webhook

**What it does:** Sends the response back to the frontend.

**On Success:**
```json
{
  "success": true,
  "message": "KYC verified successfully"
}
```

**On Failure:**
```json
{
  "success": false,
  "message": "KYC verification failed"
}
```

## Testing the Webhook

You can test the webhook using curl or Postman:

```bash
curl -X POST http://localhost:5678/webhook/kyc \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "kycData": {
      "fullName": "John Doe",
      "dateOfBirth": "1990-01-01",
      "aadhaarNumber": "123456789012"
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }'
```

## Troubleshooting

### Webhook not working?
1. Make sure n8n is running (`n8n start`)
2. Make sure the workflow is **activated** (toggle in top right)
3. Check the URL is correct: `http://localhost:5678/webhook/kyc`

### Backend not responding?
1. Make sure backend is running (`npm run dev` in backend folder)
2. Check backend logs for errors
3. Verify URL in HTTP Request node: `http://localhost:3001/api/kyc/process`

### CORS errors?
The backend should allow requests from localhost:5678 (n8n).
Check the CORS settings in backend/server.js.
