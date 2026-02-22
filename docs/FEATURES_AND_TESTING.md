# RacePass — Complete Feature List & Testing Guide

> **Privacy-Preserving Identity Verification for Events**
> A B2B platform replacing Luma with cryptographic identity proofs — organizers verify eligibility without ever seeing personal data.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                      │
│   Port 5173 │ LandingPage → SignupPage → Dashboard → Marketplace    │
│              │ OrganizerDashboard → ConcertPage (3rd Party Demo)    │
├──────────────┼──────────────────────────────────────────────────────┤
│              │                                                       │
│  MetaMask    │   REST API (JSON)                                     │
│  (Wallet)    │                                                       │
│              ▼                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                     BACKEND (Node.js + Express)                      │
│   Port 3001 │ /api/kyc │ /api/verify │ /api/events │ /api/third-party│
│              │                                                       │
│   Services:  │ crypto.js (ECDSA, Commitments, Merkle, Tickets)      │
│              │ blockchain.js (Ethers.js → On-chain calls)            │
├──────────────┼──────────────────────────────────────────────────────┤
│              ▼                                                       │
│  ┌──────────────────┐    ┌──────────────────────┐                   │
│  │ Ethereum Sepolia  │    │   Polygon Amoy       │                   │
│  │ RacePassV2.sol    │    │   RacePassV2.sol     │                   │
│  │ (Chain 11155111)  │    │   (Chain 80002)      │                   │
│  └──────────────────┘    └──────────────────────┘                   │
├─────────────────────────────────────────────────────────────────────┤
│              CHROME EXTENSION (Manifest V3)                          │
│  Injects verification badge on BookMyShow / third-party sites       │
│  Reads on-chain status + attestation proofs + reputation            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Complete Implemented Feature List

### Module 1: Organizer Dashboard (`/organizer`)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **Event Creation** | ✅ Done | Name, description, emoji, category (7 types), date, time, venue, price, capacity |
| 2 | **Eligibility Rule Builder** | ✅ Done | `minAge` slider (0–100), `requireIdentity` checkbox, `requireAge` checkbox, `requireCountry` checkbox |
| 3 | **My Events View** | ✅ Done | Lists all events by organizer, shows registration count, requirement badges |
| 4 | **Registrant List** | ✅ Done | Shows registered wallets + disclosure verification icons per event |
| 5 | **Real-time Notification Bell** | ✅ Done | Polls every 5 seconds, unread badge count, shows registration details with attestation result badges |
| 6 | **QR Ticket Scanner** | ✅ Done | Text-input for QR token (format `RP-XXXX...`), validates via `/api/events/ticket/scan`, marks ticket used, updates reputation |
| 7 | **Event Deletion** | ✅ Done | Delete event via `DELETE /api/events/:eventId` |
| 8 | **Gradient Card Preview** | ✅ Done | Live preview of event card with selected gradient + emoji |

### Module 2: Automated Shortlisting Engine (Backend Crypto)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **ECDSA Signed Attestations** | ✅ Done | Issuer signs `keccak256(wallet, claimHash, nonce)` — claims: `identityVerified`, `countryResident:IN`, `ageAbove:18`, `ageAbove:21` |
| 2 | **Commitment Scheme** | ✅ Done | `keccak256(value + secret)` for age & identity — hides actual data, verifiable without revealing |
| 3 | **Eligibility Proof Generation** | ✅ Done | `generateEligibilityProofs(wallet, requirements, credential)` returns boolean pass/fail per requirement with crypto proof |
| 4 | **Revocation Enforcement** | ✅ Done | Revoked credentials immediately fail all verification checks |
| 5 | **On-chain Attestation Verification** | ✅ Done | Smart contract `verifyAttestation()` recovers signer via `ecrecover`, confirms authorized issuer |
| 6 | **Age-Gate Without Age Disclosure** | ✅ Done | Third-party sees only `hasAgeAttestation: true/false`, never the actual age |

### Module 3: Event Pass System (Tickets)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **ECDSA-Signed Tickets** | ✅ Done | `ticketHash = keccak256(wallet, eventId, timestamp, nonce)`, issuer signs with private key |
| 2 | **QR Token Generation** | ✅ Done | Format: `RP-{shortHash}-{timestamp}`, stored in `qrTokens` map |
| 3 | **Visual QR Code** | ✅ Done | SVG QR-like pattern generated from ticket hash (no external dependency) |
| 4 | **My Tickets View** | ✅ Done | User sees all tickets at `/marketplace` → "My Tickets" tab |
| 5 | **Ticket Tied to Wallet** | ✅ Done | Each ticket bound to registrant's wallet address |
| 6 | **Anti-Reuse (Scan-Once)** | ✅ Done | Ticket marked `used: true` after first scan, rejected on second scan |
| 7 | **On-chain Ticket Validation** | ✅ Done | `isValidTicketSignature()` in smart contract verifies ECDSA signature + checks `usedTickets[]` |

### Module 4: Scanner System

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **QR Token Input Scanner** | ✅ Done | Text-based input in Organizer Dashboard "Scan Ticket" tab |
| 2 | **Real-time Verification** | ✅ Done | Calls `POST /api/events/ticket/scan`, checks token validity + wallet + event match |
| 3 | **Success/Failure UI** | ✅ Done | Green ✅ with event name + wallet on success, Red ❌ with error on failure |
| 4 | **Attendance Tracking** | ✅ Done | On scan: increments `credential.reputation.attendance`, adds Merkle leaf, rebuilds tree |
| 5 | **Reputation Score Update** | ✅ Done | Base +10 per attendance, +5 bonus for 3+ events, capped at 100 |
| 6 | **Merkle Tree Rebuild** | ✅ Done | `buildMerkleTree()` called on each scan with updated attendance leaves |

### Module 5: Business Model Enforcement (Zero PII Disclosure)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **Organizer Sees Only Booleans** | ✅ Done | Registration response shows `eligible: true/false`, attestation types, but never name/DOB/aadhaar |
| 2 | **Third-Party Age Gate** | ✅ Done | `/api/third-party/verify` returns `verified: true` + `hasAgeAttestation` — no age value |
| 3 | **Credential Fingerprint Only On-Chain** | ✅ Done | Only `keccak256(credential)` stored on blockchain, not personal data |
| 4 | **Self-Sovereign Revocation** | ✅ Done | User can revoke own credential from Dashboard, immediately invalidates everywhere |
| 5 | **Activity Logging** | ✅ Done | All verification/access events logged with timestamps (KYC_SUBMITTED, THIRD_PARTY_VERIFIED, AGE_GATE_BLOCKED, CREDENTIAL_REVOKED) |
| 6 | **Privacy Score** | ✅ Done | Dashboard shows computed privacy protection level (%) with privacy feature checklist |

### Module 6: KYC & Identity (`/signup`)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **Aadhaar Card OCR** | ✅ Done | Tesseract.js in-browser, extracts name, DOB, aadhaar number, gender |
| 2 | **Aadhaar Validation** | ✅ Done | Checks if uploaded image is actually an Aadhaar card |
| 3 | **Drag-and-Drop Upload** | ✅ Done | Drop zone with progress bar, 5MB limit, image preview |
| 4 | **Live Age Calculation** | ✅ Done | Real-time age from DOB, minor warning if <18 |
| 5 | **MetaMask Fallback** | ✅ Done | Detects if MetaMask not installed, shows install link |
| 6 | **Duplicate Detection** | ✅ Done | 409 handling for already-registered wallets |
| 7 | **4 ECDSA Attestations Generated** | ✅ Done | On KYC: `identityVerified`, `countryResident:IN`, `ageAbove:18`, `ageAbove:21` auto-created |
| 8 | **Commitments Generated** | ✅ Done | `ageCommitment` + `identityCommitment` computed at KYC time |

### Module 7: User Dashboard (`/dashboard`)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **Verification Status Card** | ✅ Done | Active / Expired / Not Active badges, credential details (age, expiry, ID, fingerprint) |
| 2 | **On-Chain Verification Grid** | ✅ Done | Shows Ethereum Sepolia ✅/⬜ and Polygon Amoy ✅/⬜ status |
| 3 | **Reputation & Attendance Card** | ✅ Done | Trust score, events attended, tier (Newcomer→Regular→Trusted→Elite→Legend), progress bar, Merkle proof indicator |
| 4 | **Cryptographic Proofs Card** | ✅ Done | Lists all ECDSA attestations (type + method), keccak256 commitment hashes, issuer address |
| 5 | **Privacy Score** | ✅ Done | Data Protection Level % with privacy feature checklist |
| 6 | **Activity Log** | ✅ Done | Reverse-chronological log of all actions with emoji icons |
| 7 | **Revoke Credential** | ✅ Done | Two-step confirmation (click → "Are you sure?" → confirm) |
| 8 | **Refresh Data** | ✅ Done | Manual reload button for on-chain status |

### Module 8: Event Marketplace (`/marketplace`)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **Browse Events** | ✅ Done | Grid of event cards with gradient, emoji, category, requirements, registration count |
| 2 | **Eligibility Check (ZKP)** | ✅ Done | Before registration: calls `checkZKPDisclosures`, shows what data will be verified (not shared) |
| 3 | **Register for Event** | ✅ Done | Calls `/api/events/register` with wallet, receives eligibility result + signed ticket |
| 4 | **Registration Success Details** | ✅ Done | Shows ECDSA attestation list with signatures, ticket hash, ticket signature, issuer address |
| 5 | **QR Ticket Display** | ✅ Done | SVG QR code + ticket token for entry |
| 6 | **My Tickets Tab** | ✅ Done | Lists all user's tickets with event details and QR |

### Module 9: Third-Party Verification Demo (`/concert`)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **3 Demo Venues** | ✅ Done | Concert (18+), Sports Bar (21+), Art Gallery (all ages) |
| 2 | **Age-Gated Access** | ✅ Done | Each venue checks RacePass credential without seeing DOB |
| 3 | **Verified/Blocked/Expired States** | ✅ Done | Green pass, red block (with reason), expired warning |
| 4 | **How It Works Explainer** | ✅ Done | 3-step inline guide |

### Module 10: Landing Page & Auth (`/landing`)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **Role Selection** | ✅ Done | Organizer vs Attendee cards with feature lists |
| 2 | **Profile Registration** | ✅ Done | Display name + optional email, linked to wallet |
| 3 | **Wallet Auto-Connect** | ✅ Done | MetaMask connection on role pick |
| 4 | **Trust Bar** | ✅ Done | Zero-Knowledge Proofs, Blockchain Verified, No Data Shared, Self-Sovereign badges |

### Module 11: Smart Contract — RacePassV2.sol (368 lines)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **Credential Fingerprints** | ✅ Done | `storeFingerprint()`, `storeFingerprintFor()`, `isVerified()`, `getFingerprint()` |
| 2 | **Revocation Registry** | ✅ Done | `revokeCredential()`, `restoreCredential()`, `isRevoked()` |
| 3 | **Signed Attestation Verification** | ✅ Done | `verifyAttestation()` with `ecrecover` — privacy-preserving eligibility |
| 4 | **Reputation System** | ✅ Done | `recordAttendance()`, `updateReputation()`, `getReputation()` |
| 5 | **Merkle Root & Proof** | ✅ Done | `updateMerkleRoot()`, `verifyAttendanceProof()`, `meetsAttendanceThreshold()` |
| 6 | **Ticket Validation** | ✅ Done | `isValidTicketSignature()`, `markTicketUsed()`, `usedTickets[]` anti-reuse |
| 7 | **Full Verify** | ✅ Done | `fullVerify(wallet, minReputation, minAttendance)` — single-call combined check |
| 8 | **Issuer Management** | ✅ Done | `authorizeIssuer()`, `revokeIssuer()`, owner-only admin |

### Module 12: Chrome Extension (Manifest V3)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **BookMyShow Integration** | ✅ Done | Content script injects verification badge on event pages |
| 2 | **Background Service Worker** | ✅ Done | Queries backend for on-chain status, attestations, reputation |
| 3 | **Popup UI** | ✅ Done | Shows verification status + credential summary |
| 4 | **Demo Sites** | ✅ Done | `demo-bookmyshow/` and `demo-concert-site/` pages for testing |

---

## 📊 Why This Beats Luma

| Aspect | Luma | RacePass |
|--------|------|----------|
| **Identity Check** | Email/phone (fakeable) | Aadhaar OCR + blockchain fingerprint |
| **Age Verification** | Honor system | ECDSA attestation — cryptographically unforgeable |
| **Data Exposure** | Full name, email shared with organizer | Zero PII — only boolean proofs |
| **Ticket Fraud** | QR codes can be screenshotted | ECDSA-signed tickets + on-chain anti-reuse |
| **Reputation** | None | Merkle-tree attendance proofs, 0–100 score, tier system |
| **Revocation** | Manual ban | Instant on-chain revocation, propagates everywhere |
| **Shortlisting** | Manual review | Automated via attestation proofs (age, identity, country) |
| **Multi-chain** | N/A | Ethereum Sepolia + Polygon Amoy (dual-chain) |
| **Privacy Score** | N/A | User sees exactly what data is protected |
| **Self-Sovereign** | Platform owns data | User controls + can revoke own credential |

---

## 🧪 Step-by-Step Testing Guide

### Prerequisites

- **Node.js** v18+ installed
- **MetaMask** browser extension installed
- **Two terminal windows** (one for backend, one for frontend)

---

### Step 0: Install Dependencies (First Time Only)

```powershell
# Terminal 1 — Backend
cd d:\Hackathon\SPIT\RacePass\backend
npm install

# Terminal 2 — Frontend
cd d:\Hackathon\SPIT\RacePass\frontend
npm install
```

---

### Step 1: Start the Backend

```powershell
cd d:\Hackathon\SPIT\RacePass\backend
node server.js
```

**Expected output:**
```
🚀 RacePass backend running on http://localhost:3001
📋 Routes loaded: /api/kyc, /api/verify, /api/events, /api/third-party
```

**Verify:** Open `http://localhost:3001/health` in browser → should return `{ "status": "ok" }`

---

### Step 2: Start the Frontend

```powershell
cd d:\Hackathon\SPIT\RacePass\frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

**Verify:** Open `http://localhost:5173` → should see RacePass home page

---

### Step 3: Connect MetaMask Wallet

1. Open `http://localhost:5173`
2. Click **"Connect Wallet"** in the top-right navbar
3. MetaMask popup appears → click **Approve** / **Connect**
4. ✅ **Check:** Navbar shows your wallet address (truncated `0x1234...5678`)

---

### Step 4: Role Selection (Landing Page)

1. Navigate to `http://localhost:5173/landing`
2. You'll see two cards: **Event Organizer** 🎪 and **Event Attendee** 🎫
3. Click **"Event Attendee"** → enter a display name → click **"Enter as Attendee"**
4. ✅ **Check:** Redirects to `/marketplace`

*(For organizer flow, click "Event Organizer" → enter org name → redirects to `/organizer`)*

---

### Step 5: Complete KYC (Signup Page)

1. Navigate to `http://localhost:5173/signup`
2. **Step 1:** Wallet should auto-connect (green checkmark)
3. **Step 2:** Upload an Aadhaar card image
   - Drag & drop or click to select
   - OCR runs in-browser (Tesseract.js) — progress bar shows %
   - Auto-fills: Full Name, Date of Birth, Aadhaar Number
4. **Step 3:** Review extracted data, edit if needed
5. Click **"Submit KYC"**
6. ✅ **Check:** Success screen with credential ID, then auto-redirects to `/dashboard`

**What happens in the backend:**
- Creates W3C-style Verifiable Credential
- Generates `keccak256` fingerprint
- Creates 4 ECDSA attestations: `identityVerified`, `countryResident:IN`, `ageAbove:18`, `ageAbove:21`
- Creates 2 commitments: `ageCommitment`, `identityCommitment`
- Stores fingerprint on-chain (Sepolia + Polygon, if configured)

---

### Step 6: Verify Dashboard (`/dashboard`)

1. Navigate to `http://localhost:5173/dashboard`
2. ✅ **Check each card:**

| Card | What to verify |
|------|---------------|
| **Status** | Shows "Active" with green badge, your age, expiry date, credential ID, fingerprint hash |
| **On-Chain Verification** | Ethereum Sepolia ✅ or ⬜, Polygon Amoy ✅ or ⬜ (depends on .env config) |
| **Reputation & Attendance** | Trust Score: 50, Events Attended: 0, Tier: Newcomer, progress bar at 50% |
| **Cryptographic Proofs** | Lists 4 attestations (identityVerified, countryResident:IN, ageAbove:18, ageAbove:21) each marked "ECDSA" |
| **Privacy Score** | Shows ~95% with checklist items |
| **Activity Log** | Shows "KYC SUBMITTED" entry |

---

### Step 7: Create an Event (Organizer Dashboard)

1. Navigate to `http://localhost:5173/organizer`
2. Click **"Create Event"** tab
3. Fill in:
   - Name: `Crypto Meetup 2025`
   - Description: `Blockchain networking event`
   - Category: Technology
   - Date & Time: any future date
   - Venue: `Convention Center`
   - Price: `0` (free)
   - Capacity: `100`
4. **Set Eligibility Rules:**
   - Toggle ON **"Require Age Verification"**
   - Set **Min Age** slider to `18`
   - Toggle ON **"Require Identity Verification"**
5. Click **"Create Event"**
6. ✅ **Check:** Event appears in "My Events" tab with badges showing "18+" and "ID Required"

---

### Step 8: Register for the Event (Marketplace)

1. Navigate to `http://localhost:5173/marketplace`
2. ✅ **Check:** Your event "Crypto Meetup 2025" appears in the grid
3. Click on the event card
4. ✅ **Check:** Eligibility check screen shows what will be verified:
   - "Age ≥ 18" — verifying (not sharing your DOB)
   - "Identity Verified" — verifying (not sharing your name)
5. Click **"Register"**
6. ✅ **Check Success Screen:**
   - "Registration Successful" message
   - ECDSA Attestation list (each with truncated signature)
   - Ticket Hash (hex string)
   - Ticket Signature (hex string)
   - Issuer Address
   - QR Code (SVG visual)
   - QR Token (format: `RP-XXXXXXXX-XXXXX`)

**Copy the QR Token** (e.g., `RP-a1b2c3d4-12345`) — you'll need it for scanning.

---

### Step 9: Verify Notification (Organizer Side)

1. Go back to `http://localhost:5173/organizer`
2. ✅ **Check:** Notification bell 🔔 shows a red badge with "1"
3. Click **"Notifications"** tab
4. ✅ **Check:** Shows a notification:
   - Wallet address of the registrant
   - Event name
   - Attestation badges (✅ Identity, ✅ Age 18+, etc.)
   - Timestamp

---

### Step 10: Scan Ticket at Entry

1. On the Organizer Dashboard, click **"Scan Ticket"** tab
2. Paste the QR Token from Step 8 (e.g., `RP-a1b2c3d4-12345`)
3. Click **"Verify Ticket"**
4. ✅ **Check Success:**
   - Green ✅ "Valid Ticket!"
   - Shows event name + attendee wallet
5. Try scanning the **same token again**
6. ✅ **Check Failure:** Red ❌ "Ticket already used"

**What happens in the backend:**
- Validates QR token → finds ticket
- Marks ticket as `used: true`
- Increments `credential.reputation.attendance` (+1)
- Updates reputation score (+10 points)
- Creates Merkle attendance leaf
- Rebuilds Merkle tree

---

### Step 11: Verify Reputation Updated

1. Navigate to `http://localhost:5173/dashboard`
2. Click **"🔄 Refresh"**
3. ✅ **Check Reputation Card:**
   - Trust Score: **60** (was 50, +10 for attendance)
   - Events Attended: **1** (was 0)
   - Tier: Newcomer (or Regular if you attend more)
   - Merkle proof indicator should show ✅

---

### Step 12: Test Third-Party Age Gate

1. Navigate to `http://localhost:5173/concert`
2. Three demo venues appear: Concert (18+), Sports Bar (21+), Art Gallery (all ages)
3. Click **"Verify & Enter"** on the Concert (18+)
4. ✅ **Check:** Green "ACCESS GRANTED" with fingerprint hash
5. Click **"Verify & Enter"** on the Art Gallery (all ages)
6. ✅ **Check:** Green "ACCESS GRANTED" (no age check needed)
7. If your KYC age is <21: Click Sports Bar (21+)
8. ✅ **Check:** Red "ACCESS DENIED" with age restriction message

---

### Step 13: Test Credential Revocation

1. Navigate to `http://localhost:5173/dashboard`
2. Scroll to bottom → Click **"🗑️ Revoke My RacePass"**
3. Confirmation dialog appears → Click **"Yes, Revoke"**
4. ✅ **Check:** Status changes to "Not Active" / revoked state
5. Navigate to `http://localhost:5173/concert` → try any venue
6. ✅ **Check:** Verification fails for all venues (credential revoked)
7. Navigate to `http://localhost:5173/marketplace` → try to register for an event
8. ✅ **Check:** Registration fails (revoked credential blocked)

---

### Step 14: Test API Directly (PowerShell)

```powershell
# Health check
Invoke-RestMethod http://localhost:3001/health

# Submit KYC (note: kycData is nested)
$body = @{ walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"; kycData=@{ fullName="Test User"; dateOfBirth="2000-01-15"; aadhaarNumber="123456789012" } } | ConvertTo-Json -Depth 3
Invoke-RestMethod -Uri http://localhost:3001/api/kyc/submit -Method POST -Body $body -ContentType "application/json"

# Check verification
Invoke-RestMethod "http://localhost:3001/api/verify/check?walletAddress=0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18&network=ethereum"

# Get reputation
Invoke-RestMethod "http://localhost:3001/api/events/reputation/0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"

# Register as organizer
$body = @{ walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"; role="organizer"; name="Test Org"; email="" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/api/events/auth/register -Method POST -Body $body -ContentType "application/json"

# Create event (fields are flat, not nested under "requirements")
$event = @{ walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"; name="API Test Event"; description="Testing"; category="technology"; date="2025-12-01"; time="18:00"; venue="Online"; price=0; capacity=50; minAge=18; requireIdentity=$true; requireAge=$true } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/api/events/create -Method POST -Body $event -ContentType "application/json"

# Third-party verify (age gate)
$verify = @{ walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"; network="ethereum"; minAge=18; eventType="concert" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/api/third-party/verify -Method POST -Body $verify -ContentType "application/json"
```

---

### Step 15: Test Chrome Extension (Optional)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"** → select `d:\Hackathon\SPIT\RacePass\extension`
4. Open the demo BookMyShow page at `extension/demo-bookmyshow/index.html`
5. ✅ **Check:** Green verification badge injected on the page
6. Click the RacePass extension popup icon
7. ✅ **Check:** Shows verification status, attestation info, reputation

---

## 🔐 Cryptographic Proof Flow (What Makes This Special)

### At KYC Time:
```
User uploads Aadhaar → OCR extracts (name, DOB, aadhaar#)
                     ↓
Backend creates:
  1. ageCommitment    = keccak256(age || random_secret)
  2. identityCommitment = keccak256(aadhaar || random_secret)
  3. 4x ECDSA Attestations:
     ├── sign(keccak256(wallet, "identityVerified", nonce), ISSUER_KEY)
     ├── sign(keccak256(wallet, "countryResident:IN", nonce), ISSUER_KEY)
     ├── sign(keccak256(wallet, "ageAbove:18", nonce), ISSUER_KEY)
     └── sign(keccak256(wallet, "ageAbove:21", nonce), ISSUER_KEY)
  4. fingerprint = keccak256(full_credential_JSON)
                     ↓
On-chain: storeFingerprint(fingerprint) on Sepolia + Polygon
```

### At Event Registration:
```
User clicks "Register" on event with requirements {minAge: 18, requireIdentity: true}
                     ↓
Backend calls generateEligibilityProofs(wallet, requirements, credential):
  ├── Checks attestation "ageAbove:18" exists → eligible: true
  ├── Checks attestation "identityVerified" exists → eligible: true
  └── Returns boolean results + attestation metadata (NOT the age or name)
                     ↓
Backend calls signTicket(wallet, eventId):
  └── ticketSig = sign(keccak256(wallet, eventId, timestamp, nonce), ISSUER_KEY)
                     ↓
Organizer receives: { eligible: true, proofs: [...], ticketToken: "RP-xxx" }
                   (NEVER receives: name, DOB, aadhaar number)
```

### At Ticket Scan:
```
Organizer pastes QR token "RP-a1b2c3d4-12345"
                     ↓
Backend:
  1. Looks up token → finds { wallet, eventId, ticketHash, ticketSig }
  2. Checks ticket.used === false
  3. Marks ticket.used = true
  4. Increments attendance (+1)
  5. Updates reputation score (+10)
  6. Creates Merkle leaf: keccak256(wallet, eventId)
  7. Rebuilds Merkle tree with all attendance leaves
                     ↓
Response: { valid: true, eventName: "...", wallet: "0x..." }
```

---

## 📁 File Structure Reference

```
RacePass/
├── backend/
│   ├── server.js              # Express entry, CORS, route mounting
│   ├── routes/
│   │   ├── kyc.js             # KYC submission, attestation generation (413 lines)
│   │   ├── verify.js          # On-chain verification, dual-chain (115 lines)
│   │   ├── events.js          # Event CRUD, registration, tickets, reputation (700+ lines)
│   │   └── thirdParty.js      # Third-party age-gate verification (200 lines)
│   ├── services/
│   │   ├── crypto.js          # ECDSA, commitments, Merkle, ticket signing (333 lines)
│   │   └── blockchain.js      # Ethers.js on-chain calls
│   └── config/
│       └── chains.js          # V2 ABI, chain configs
├── frontend/
│   └── src/
│       ├── App.jsx            # Router, nav, wallet connection (271 lines)
│       ├── pages/
│       │   ├── LandingPage.jsx      # Role selection (231 lines)
│       │   ├── SignupPage.jsx       # Aadhaar OCR + KYC (469 lines)
│       │   ├── DashboardPage.jsx    # V2 dashboard with crypto cards (603 lines)
│       │   ├── OrganizerDashboard.jsx # Event management (514 lines)
│       │   ├── MarketplacePage.jsx  # Browse & register (644 lines)
│       │   └── ConcertPage.jsx      # Third-party demo (299 lines)
│       └── utils/
│           ├── api.js         # All API functions (230 lines)
│           ├── constants.js   # V2 ABI
│           ├── wallet.js      # MetaMask helpers
│           └── aadhaarOCR.js  # Tesseract.js OCR
├── contracts/
│   └── RacePassV2.sol         # Full V2 smart contract (368 lines)
├── extension/
│   ├── manifest.json          # Manifest V3
│   ├── background/background.js
│   ├── content/content.js
│   ├── popup/popup.html
│   └── demo-bookmyshow/       # Demo integration site
└── n8n/                       # Workflow automation configs
```

---

## 🏆 Total Feature Count

| Category | Count |
|----------|-------|
| Organizer Dashboard | 8 features |
| Automated Shortlisting | 6 features |
| Event Pass System | 7 features |
| Scanner System | 6 features |
| Business Model (Privacy) | 6 features |
| KYC & Identity | 8 features |
| User Dashboard | 8 features |
| Event Marketplace | 6 features |
| Third-Party Demo | 4 features |
| Landing & Auth | 4 features |
| Smart Contract | 8 features |
| Chrome Extension | 4 features |
| **TOTAL** | **75 features** |

