# RacePass Chrome Extension

## What Is This?

RacePass is a **privacy-preserving identity verification** Chrome Extension.  
Think of it like **"Continue with Google"** — but for blockchain-based identity.

When you visit a website (like a concert site), you can click **"Continue with RacePass"** to verify your identity without sharing any personal data.

---

## How It Works (Simple Explanation)

```
┌──────────────────────────────────────────────────────┐
│                  CHROME EXTENSION                     │
│                                                      │
│  ┌──────────┐   ┌────────────┐   ┌──────────────┐   │
│  │  Popup   │   │ Background │   │Content Script│   │
│  │ (UI you  │   │  (Brain -  │   │ (Injected    │   │
│  │  see)    │◄──┤  handles   │◄──┤  into any    │   │
│  │          │   │  API calls)│   │  website)    │   │
│  └──────────┘   └──────┬─────┘   └──────────────┘   │
│                        │                             │
└────────────────────────┼─────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  RacePass Backend │
              │  (localhost:3001) │
              │                  │
              │  Checks wallet   │
              │  verification    │
              │  status          │
              └──────────────────┘
```

### The 3 Parts of the Extension

| Part | File | What It Does |
|------|------|-------------|
| **Popup** | `popup/popup.html` + `popup.js` | The small window when you click the extension icon. Shows wallet status, verify button. |
| **Background** | `background/background.js` | Runs silently. Handles API calls to backend. Routes messages between popup and content script. |
| **Content Script** | `content/content.js` | Injected into every webpage. Finds `data-racepass="true"` elements and adds the "Continue with RacePass" button. |

---

## Setup Instructions

### Step 1: Make Sure Backend Is Running

```bash
cd backend
npm run dev
```
Backend should be on http://localhost:3001

### Step 2: Generate Extension Icons (One Time)

```bash
cd extension
node generate-icons.js
```

### Step 3: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right)
4. Click **"Load unpacked"**
5. Select the `extension/` folder (the one with `manifest.json`)
6. You should see "RacePass" in your extensions list!

### Step 4: Complete KYC (One Time)

1. Open http://localhost:5173/signup
2. Connect MetaMask
3. Upload Aadhaar card, fill form, submit
4. This creates your RacePass credential

### Step 5: Connect Wallet in Extension

1. Click the RacePass icon in Chrome toolbar
2. Click "Connect MetaMask"
3. Paste your MetaMask wallet address
4. The extension checks your verification status

---

## Demo: Testing with Concert Site

### Start the Demo Concert Site

```bash
cd extension/demo-concert-site
# Open index.html in Chrome (or use a local server)
npx serve .
```

Or simply open `extension/demo-concert-site/index.html` in Chrome.

### What You'll See

1. A concert website with a login form
2. Below the login form: **"Continue with RacePass"** button (injected by extension!)
3. Click it → Extension verifies your identity
4. If verified → Website shows "Access Granted!" with a ticket
5. If not → Shows "Not Verified"

---

## How Websites Integrate RacePass

A website only needs **2 things** to support RacePass:

### 1. Add the HTML trigger

```html
<div
  data-racepass="true"
  data-min-age="18"
  data-event-type="concert"
></div>
```

### 2. Listen for the result

```javascript
window.addEventListener('racepass:verified', function(e) {
  if (e.detail.verified) {
    // User is verified! Grant access
    console.log('Wallet:', e.detail.walletAddress)
  }
})
```

That's it! The extension handles everything else.

---

## Message Flow (How the pieces talk)

```
1. User clicks "Continue with RacePass" on concert site
        │
        ▼
2. Content Script catches the click
        │
        ▼
3. Content Script → Background Script (chrome.runtime.sendMessage)
   Message: { type: 'VERIFY_FOR_SITE', minAge: 18, eventType: 'concert' }
        │
        ▼
4. Background Script → Backend API (fetch)
   POST http://localhost:3001/api/third-party/verify
        │
        ▼
5. Backend checks credentialStore → returns { verified: true/false }
        │
        ▼
6. Background Script → Content Script (chrome.tabs.sendMessage)
        │
        ▼
7. Content Script → Website (window.postMessage + CustomEvent)
        │
        ▼
8. Website receives result → shows ticket / blocks access
```

---

## Cross-Chain Verification

- Works on **Ethereum Sepolia** testnet
- Works on **Polygon Amoy** testnet
- Same wallet address, same fingerprint, both chains
- Network switching handled by MetaMask

---

## Files Overview

```
extension/
├── manifest.json            ← Chrome Extension config (Manifest V3)
├── background/
│   └── background.js        ← Service worker (API calls, message routing)
├── popup/
│   ├── popup.html           ← Extension popup UI
│   ├── popup.css            ← Popup styles
│   └── popup.js             ← Popup logic
├── content/
│   ├── content.js           ← Injected into websites
│   └── content.css          ← Styles for injected button
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
├── demo-concert-site/
│   └── index.html           ← Demo website to test the extension
├── generate-icons.js        ← Script to generate PNG icons
└── README.md                ← This file
```

---

## Demo Script for Judges

### What to Show

1. **"This is RacePass"** — Open http://localhost:5173, show the main site
2. **"One-time KYC"** — Go to Signup, connect MetaMask, upload Aadhaar, get verified
3. **"Now the Chrome Extension"** — Click RacePass icon → shows "RacePass Active ✅"
4. **"Visit any concert site"** — Open the demo concert site
5. **"See the button?"** — Point to "Continue with RacePass" (injected by extension!)
6. **"Click it"** — Extension verifies → "Access Granted!" → ticket appears
7. **"What happened?"** — The concert site NEVER saw your name, DOB, or Aadhaar. It only got: `verified: true`
8. **"Website integration is 2 lines"** — Show the `data-racepass` div and the event listener

### Key Talking Points

- "It's like Continue with Google, but for blockchain identity"
- "Verify once, use everywhere"
- "The website never sees your personal data"
- "Any website can integrate with just 2 lines of HTML"
- "Works on Ethereum and Polygon"
- "User owns their identity — can revoke anytime"

---

## Debugging

- **Extension popup not loading?** → Check `chrome://extensions/` for errors
- **Button not appearing?** → Make sure the page has `data-racepass="true"`
- **"Cannot connect to backend"?** → Make sure backend is running on port 3001
- **Verification fails?** → Complete KYC first at http://localhost:5173/signup
- **View extension logs:** Right-click extension icon → "Inspect popup" or check background script in chrome://extensions
