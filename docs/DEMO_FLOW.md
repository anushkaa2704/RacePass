# RacePass Demo Flow

This document walks you through a complete demo of RacePass, explaining what happens at each step.

---

## Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      RACEPASS DEMO FLOW                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  PART 1: GET VERIFIED                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Connect │→ │  Fill   │→ │  n8n    │→ │ Backend │→ │ Stored  │    │
│  │ Wallet  │  │   KYC   │  │ Verify  │  │ Process │  │ On-Chain│    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
│                                                                       │
│  PART 2: USE AT CONCERT                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                               │
│  │ Connect │→ │  Check  │→ │ Access  │                               │
│  │ Wallet  │  │  Chain  │  │ Granted │                               │
│  └─────────┘  └─────────┘  └─────────┘                               │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## PART 1: Getting Verified with RacePass

### Step 1: Open RacePass Website

**What you do:**
- Open http://localhost:5173 in your browser

**What you see:**
- RacePass landing page with "Get Started" button
- Explanation of how RacePass works

**What happens behind the scenes:**
- React app loads in browser
- App checks if MetaMask is installed
- App checks if wallet is already connected

---

### Step 2: Connect Your Wallet

**What you do:**
- Click "Connect Wallet" button in the header

**What you see:**
- MetaMask popup asking to connect
- Your wallet address appears in the header after connecting

**What happens behind the scenes:**
```
Frontend                          MetaMask
    │                                 │
    │─── eth_requestAccounts ────────▶│
    │                                 │ (User approves)
    │◀── ["0x1234..."] ──────────────│
    │                                 │
```

**Why this matters:**
- Your wallet is your identity in Web3
- No username/password needed
- You control your identity

---

### Step 3: Fill the KYC Form

**What you do:**
- Click "Get Started" or go to /signup
- Fill in:
  - Full Name: `John Doe`
  - Date of Birth: `1990-01-01`
  - Aadhaar Number: `123456789012` (any 12 digits for demo)
- Click "Submit KYC"

**What you see:**
- Loading spinner while processing
- Success message when complete

**What happens behind the scenes:**
```
Frontend                   n8n                    Backend                Blockchain
    │                        │                        │                       │
    │── POST /webhook/kyc ──▶│                        │                       │
    │   {                    │                        │                       │
    │     walletAddress,     │                        │                       │
    │     kycData: {         │                        │                       │
    │       fullName,        │                        │                       │
    │       aadhaarNumber    │                        │                       │
    │     }                  │                        │                       │
    │   }                    │                        │                       │
    │                        │── Validate ────────────│                       │
    │                        │   aadhaar.length==12   │                       │
    │                        │   wallet starts 0x     │                       │
    │                        │                        │                       │
    │                        │── POST /api/kyc/process──▶                     │
    │                        │                        │                       │
    │                        │                        │── Create Credential ──│
    │                        │                        │   (JSON document)     │
    │                        │                        │                       │
    │                        │                        │── Sign Credential ───│
    │                        │                        │                       │
    │                        │                        │── Generate Hash ─────│
    │                        │                        │   (fingerprint)       │
    │                        │                        │                       │
    │                        │                        │── Store on Chain ────▶│
    │                        │                        │   storeFingerprintFor │
    │                        │                        │   (address, hash)     │
    │                        │                        │                       │
    │                        │◀── Success ───────────│◀── TX Confirmed ─────│
    │                        │                        │                       │
    │◀── { success: true } ──│                        │                       │
    │                        │                        │                       │
```

**Key privacy point:**
- Aadhaar is ONLY used to create the credential
- Aadhaar is NEVER stored on blockchain
- Only the hash (fingerprint) is stored
- You can't reverse a hash to get the original data!

---

### Step 4: View Dashboard

**What you do:**
- You're redirected to /dashboard automatically
- Or click "Dashboard" in navigation

**What you see:**
- Green checkmark icon
- "RacePass Active" message
- Your fingerprint displayed
- Verification status on both networks

**What happens behind the scenes:**
```
Frontend                                    Blockchain
    │                                            │
    │── isVerified(walletAddress) ──────────────▶│
    │◀── true ──────────────────────────────────│
    │                                            │
    │── getFingerprint(walletAddress) ──────────▶│
    │◀── 0xabc123... ───────────────────────────│
    │                                            │
```

**What's stored on blockchain:**
```solidity
// In the smart contract:
fingerprints[0xYourWallet] = 0xabc123...  // Just a hash!
```

---

## PART 2: Using RacePass at a Concert

Now you'll see how a third-party website can verify you WITHOUT seeing your personal data.

### Step 5: Visit Concert Website

**What you do:**
- Click "Concert Demo" in navigation
- Or go to http://localhost:5173/concert

**What you see:**
- A fake concert website
- "Continue with RacePass" button
- Explanation of how it works

---

### Step 6: Click "Continue with RacePass"

**What you do:**
- Select network (Ethereum or Polygon)
- Click "Continue with RacePass" button

**What you see:**
- Loading spinner while checking
- Either "Access Granted" + ticket, or "Not Verified"

**What happens behind the scenes:**
```
Concert Website                               Blockchain
    │                                              │
    │── Connect wallet (MetaMask) ─────────────────│
    │                                              │
    │── isVerified(walletAddress) ────────────────▶│
    │◀── true ────────────────────────────────────│
    │                                              │
    │── getFingerprint(walletAddress) ────────────▶│
    │◀── 0xabc123... ─────────────────────────────│
    │                                              │
    │                                              │
    │   ✅ Show ticket!                            │
    │   (No personal data needed!)                 │
    │                                              │
```

**IMPORTANT - What the concert website KNOWS:**
- ✅ Wallet address is verified
- ✅ There's a valid fingerprint

**What the concert website DOES NOT KNOW:**
- ❌ User's name
- ❌ User's Aadhaar number
- ❌ User's date of birth
- ❌ Any personal information

**This is the magic of RacePass!**

---

## Demo Script for Presentation

Here's a script you can follow when presenting:

### Part 1: Show the Problem (30 seconds)

"Currently, when you buy a concert ticket, you have to share your ID with the venue. They see your name, photo, address... But do they really need all that? No! They just need to know: Is this person verified?"

### Part 2: Show the Solution (2 minutes)

"RacePass solves this. Let me show you."

1. "First, I connect my wallet. This is like my digital identity."
2. "Then I complete KYC once - entering my Aadhaar details."
3. "The system verifies me and creates a digital credential."
4. "But here's the key: only a FINGERPRINT of this credential goes on blockchain."
5. "My personal data never leaves the RacePass system."

### Part 3: Show Third-Party Verification (1 minute)

1. "Now let's say I want to buy a concert ticket."
2. "I click 'Continue with RacePass'."
3. "The concert website checks the blockchain."
4. "It sees my wallet is verified - that's it!"
5. "I get my ticket without sharing ANY personal data."

### Part 4: Explain the Tech (1 minute)

"Behind the scenes:
- n8n automates the verification workflow
- Our backend creates a signed credential
- A hash of this credential goes on Ethereum and Polygon
- The same fingerprint works on both chains - that's cross-chain verification!"

---

## Quick Reference

### URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- n8n: http://localhost:5678

### Demo Credentials
- Name: Any name (e.g., "John Doe")
- DOB: Any date (e.g., "1990-01-01")
- Aadhaar: Any 12 digits (e.g., "123456789012")

### What Gets Stored Where?

| Data | Frontend | n8n | Backend | Blockchain |
|------|----------|-----|---------|------------|
| Wallet Address | ✅ | ✅ | ✅ | ✅ |
| Full Name | ✅ | ✅ | ❌ | ❌ |
| Aadhaar | ✅ | ✅ | ❌ | ❌ |
| Credential | ❌ | ❌ | ✅ (memory) | ❌ |
| Fingerprint | ✅ | ❌ | ✅ | ✅ |

---

## Common Demo Questions

**Q: How is this different from just showing my ID?**
A: With RacePass, you prove you're verified without revealing WHO you are. It's like proving you're over 18 without showing your birthdate.

**Q: What if I lose my wallet?**
A: You can complete KYC again with a new wallet. The old verification remains on-chain but you can get a new one.

**Q: Can someone fake a fingerprint?**
A: No. To create a valid fingerprint, you need our backend to sign the credential. The hash is cryptographically secure.

**Q: Why two blockchains?**
A: Some services prefer Ethereum, others prefer Polygon. By storing on both, users have flexibility.

**Q: What happens if the backend goes down?**
A: Existing verifications still work! They're on the blockchain permanently. Only new verifications would need the backend.
