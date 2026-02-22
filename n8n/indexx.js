import express from "express";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// =======================
// CONFIGURATION
// =======================

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log("BACKEND SIGNER ADDRESS:", signer.address);

const balance = await provider.getBalance(signer.address);
console.log("BACKEND SIGNER BALANCE (ETH):", ethers.formatEther(balance));

// Replace with your actual contract ABI
const contractABI = [
  "function issueEligibility(address user) public"
];

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractABI,
  signer
);

// =======================
// ROUTES
// =======================

app.get("/api/eligibility/issue", async (req, res) => {
 

   
 res.send(200).json({ success: true, message: "hello world" });
});


const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});