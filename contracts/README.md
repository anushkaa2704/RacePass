# RacePass Smart Contracts

This folder contains the Solidity smart contracts for RacePass.

## What's a Smart Contract?

Think of it like a vending machine:
- You put in something (a fingerprint/hash)
- It stores it permanently
- Anyone can check if something exists
- Nobody can change or delete it
- It runs exactly as programmed (no cheating)

## What's in here?

```
contracts/
├── RacePass.sol      # Main contract - stores fingerprints
└── README.md         # This file
```

## How to Deploy

We'll use Remix (online Solidity IDE) + MetaMask:
1. Go to https://remix.ethereum.org
2. Copy the RacePass.sol code
3. Compile it
4. Connect MetaMask
5. Deploy to testnet

## Networks

| Network          | Chain ID | Purpose          |
|------------------|----------|------------------|
| Sepolia          | 11155111 | Ethereum testnet |
| Polygon Mumbai   | 80001    | Polygon testnet  |
