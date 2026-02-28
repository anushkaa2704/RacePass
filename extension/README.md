# 🧩 RacePass Chrome Extension

The RacePass extension brings your verified identity directly to the websites you visit. Seamlessly prove your age or identity without revealing personal data.

## 🌟 Features

- **Auto-Fill Identity**: Detects identity fields on supported partner sites.
- **Selective Disclosure**: Share only what is necessary (e.g., "I am over 21") via cryptographic proofs.
- **Site Compatibility**: Pre-configured for sites like BookMyShow and Paytm.
- **Secure Communication**: Securely fetches your verified status from the RacePass backend.

## 🛠️ Components

- **Background Script**: Handles communication with the backend and storage.
- **Content Scripts**: Injected into target websites to provide the "Verify with RacePass" button.
- **Popup UI**: Minimal interface to view your verification status and recent proofs.

## 🛠️ Development & Installation

1.  Open Chrome or any Chromium-based browser (Brave, Edge).
2.  Navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `extension` folder from this repository.
6.  The RacePass logo should appear in your toolbar.

## 🔒 Security

- The extension only interacts with domains specified in `manifest.json`.
- It uses strictly defined API endpoints for verification status.
