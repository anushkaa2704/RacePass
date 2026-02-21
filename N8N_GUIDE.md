# n8n Integration Guide for RacePass

## What is n8n?

n8n is an open-source workflow automation tool. In RacePass, it acts as a **middleware** between the frontend and backend — validating KYC data, enriching it (computing age), and then forwarding the approved request to the backend.

```
Frontend  →  n8n Webhook  →  Validate  →  Enrich  →  Backend  →  Response
```

---

## 1. Quick Start

### Prerequisites
```bash
# Install n8n globally (already done)
npm install -g n8n
```

### Start n8n
```bash
n8n start
```
This opens the n8n editor at **http://localhost:5678**.

### Import the RacePass Workflow
1. Open http://localhost:5678 in your browser
2. Click the **☰ menu** (top-left) → **Import from File**
3. Select `n8n/racepass-workflow.json` from this project
4. Click **Save**
5. **Toggle the workflow to ACTIVE** (top-right switch)

The webhook is now live at: `POST http://localhost:5678/webhook/kyc`

---

## 2. How the RacePass Workflow Works

```
┌──────────────────┐
│  Webhook (POST)  │  ← Receives KYC data from frontend
│  /webhook/kyc    │
└────────┬─────────┘
         │
    ┌────▼────────────┐
    │  IF - Validate   │  ← Checks: Aadhaar=12 digits, wallet=0x, name+DOB present
    └──┬──────────┬────┘
       │ TRUE     │ FALSE
  ┌────▼────┐  ┌──▼──────────────────┐
  │  Code   │  │ Respond - Fail (400)│
  │ Enrich  │  └─────────────────────┘
  └────┬────┘
       │
  ┌────▼──────────────┐
  │  HTTP Request      │  ← Calls backend POST /api/kyc/process
  │  → localhost:3001  │
  └────────┬───────────┘
           │
  ┌────────▼───────────┐
  │  Respond - Success │  ← Returns result to frontend
  └────────────────────┘
```

### Node Details

| # | Node | Type | What it does |
|---|------|------|-------------|
| 1 | **Webhook - Receive KYC** | `webhook` | Listens on `POST /webhook/kyc`. Receives `{ walletAddress, kycData: { fullName, dateOfBirth, aadhaarNumber } }` |
| 2 | **IF - Validate KYC** | `if` | Checks 4 conditions: Aadhaar length=12, wallet starts with 0x, name length>0, DOB length>0 |
| 3 | **Code - Enrich Data** | `code` | JavaScript: calculates age from DOB, determines `isAdult`, `ageCategory` (21+/18+/under-18) |
| 4 | **HTTP - Call Backend** | `httpRequest` | POST to `localhost:3001/api/kyc/process` with enriched data + `kycStatus: "approved"` |
| 5 | **Respond - Success** | `respondToWebhook` | Returns `{ success: true, data, processedVia: "n8n" }` |
| 6 | **Respond - Validation Failed** | `respondToWebhook` | Returns `{ success: false, errors: [...] }` with HTTP 400 |

---

## 3. How to Create / Add Nodes in n8n

### Adding a Node
1. In the workflow editor, click the **+** button (or drag from a node's output)
2. Search for a node type (e.g., "HTTP Request", "IF", "Code", "Email")
3. Click to add it to the canvas
4. Connect it by dragging from the output dot of one node to the input dot of the next

### Common Node Types

| Node | Use Case | Example |
|------|----------|---------|
| **Webhook** | Receive HTTP requests | API endpoint triggers |
| **HTTP Request** | Call external APIs | Call your backend |
| **IF** | Conditional branching | Validate data |
| **Code** | Custom JavaScript/Python | Transform data, calculate age |
| **Set** | Set/modify data fields | Add fields to payload |
| **Switch** | Multi-way branching | Route by event type |
| **Respond to Webhook** | Return HTTP response | Send result to caller |
| **Email (SMTP)** | Send emails | Notification on KYC |
| **Slack** | Send Slack messages | Alert on KYC approval |
| **Wait** | Delay execution | Rate limiting |

### Creating a Code Node
1. Add a **Code** node
2. Select language: JavaScript or Python
3. Write your logic:
```javascript
// Access input data
const input = $input.first().json;

// Transform
const result = {
  ...input,
  myNewField: 'computed value',
  timestamp: new Date().toISOString()
};

// Return (must be array of objects with json property)
return [{ json: result }];
```

### Creating an IF Node
1. Add an **IF** node
2. Add conditions:
   - Left value: `{{ $json.fieldName }}` (expression)
   - Operator: equals, greater than, contains, etc.
   - Right value: your expected value
3. TRUE output goes one way, FALSE goes another

---

## 4. Example: Adding an Email Notification Node

Want to get notified when someone completes KYC? Add an email node:

1. Click **+** after the "HTTP - Call Backend" node
2. Search for **"Send Email"** (or use Gmail / Outlook node)
3. Configure:
   - **To**: your-email@example.com
   - **Subject**: `New RacePass KYC: {{ $json.walletAddress }}`
   - **Body**: `User {{ $json.kycData.fullName }} just registered!`
4. Connect it in parallel with the "Respond - Success" node

### Adding a Slack Alert

1. Add a **Slack** node
2. Set up OAuth credentials for your Slack workspace
3. Configure:
   - **Channel**: `#kyc-alerts`
   - **Message**: `:white_check_mark: New KYC: {{ $json.walletAddress }} — Age: {{ $json.computedAge }}`

---

## 5. Example: Adding More Validation

Want to add a blacklist check?

1. Add another **Code** node between "IF - Validate" and "Code - Enrich":
```javascript
const input = $input.first().json;
const BLACKLISTED = ['0xBAD...', '0xSPAM...'];

if (BLACKLISTED.includes(input.walletAddress)) {
  throw new Error('Wallet is blacklisted');
}

return [{ json: input }];
```

2. Connect the error path to a "Respond - Blocked" node

---

## 6. Frontend Integration

The frontend (`api.js`) is already wired to call n8n:

```javascript
// api.js — submitKYC() tries n8n first, falls back to direct backend
const USE_N8N = true;

// KYC flow:
// 1. Frontend calls → POST http://localhost:5678/webhook/kyc
// 2. n8n validates, enriches, calls backend
// 3. Returns response to frontend
// 4. If n8n is down → falls back to POST http://localhost:3001/api/kyc/submit
```

### Testing Without n8n
Set `USE_N8N = false` in `frontend/src/utils/api.js` to bypass n8n entirely.

---

## 7. Testing the Webhook

### With curl:
```bash
curl -X POST http://localhost:5678/webhook/kyc \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "kycData": {
      "fullName": "Test User",
      "dateOfBirth": "2000-01-15",
      "aadhaarNumber": "123456789012"
    }
  }'
```

### Expected Response (success):
```json
{
  "success": true,
  "message": "KYC verified and credential created via n8n",
  "processedVia": "n8n"
}
```

### Expected Response (validation failure):
```json
{
  "success": false,
  "message": "KYC validation failed. Please check your data.",
  "errors": ["Aadhaar must be exactly 12 digits", "..."]
}
```

---

## 8. Running Everything Together

```bash
# Terminal 1: Backend
cd backend
npm run dev
# → Running on port 3001

# Terminal 2: n8n
n8n start
# → Running on port 5678

# Terminal 3: Frontend
cd frontend
npm run dev
# → Running on port 5173
```

Then:
1. Open http://localhost:5173
2. Connect MetaMask
3. Go to Signup → Upload Aadhaar → Submit
4. It routes through n8n → validates → enriches → backend → credential created
5. Check n8n execution log at http://localhost:5678 → Executions tab

---

## 9. Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook returns 404 | Workflow is not **activated** — toggle it ON |
| CORS error | The workflow has CORS headers set. If still failing, run Chrome with `--disable-web-security` for local dev |
| n8n not found | Run `npm install -g n8n` |
| Backend unreachable from n8n | Make sure backend is running on port 3001 |
| Frontend falls back to direct | n8n is down — start it with `n8n start` |

---

## 10. Advanced: Creating Custom n8n Nodes

For production, you can build custom n8n nodes:

```bash
# Scaffold a new node
npx n8n-node-dev new

# Structure:
# nodes/
#   MyNode/
#     MyNode.node.ts    ← Node logic
#     MyNode.node.json  ← Node metadata
#     myNode.svg        ← Icon
```

See: https://docs.n8n.io/integrations/creating-nodes/
