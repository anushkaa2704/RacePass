# 🖼️ RacePass Frontend

The frontend for RacePass is a modern, high-performance React application built with Vite and styled for a premium 3D experience.

## ✨ Features

- **Decentralized KYC**: Secure ID upload & biometrics processed in-browser.
- **3D Dashboard**: Manage your personal and organizer profiles in an immersive interface.
- **SBT Minting**: Interactive minting process for Soulbound Tokens.
- **Event Marketplace**: Responsive marketplace for browsing and purchasing verified tickets.
- **Real-time Face Match**: Automated comparison of live selfie vs. ID card photo.
- **OCR Integration**: Automatic extraction of Aadhaar details using Tesseract.js.

## 🛠️ Tech Stack

- **React 18**: Component-based UI library.
- **Vite**: Ultra-fast build tool and dev server.
- **Framer Motion**: State-of-the-art animations.
- **face-api.js**: Browser-based face detection and recognition.
- **Tesseract.js**: OCR for ID card data extraction.
- **Ethers.js (v6)**: Interaction with the Ethereum blockchain.
- **Spline**: Premium 3D assets and interactions.

## 🚀 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start development server**:
    ```bash
    npm run dev
    ```

3.  **Build for production**:
    ```bash
    npm run build
    ```

## 🏗️ Folder Structure

- `/src/pages`: Main application views (Home, Dashboard, Signup, etc.).
- `/src/components`: Reusable UI elements.
- `/src/utils`: Helper functions for API calls, face matching, and blockchain interaction.
- `/src/assets`: Images and 3D models.
