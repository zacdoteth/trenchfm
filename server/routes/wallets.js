import { Router } from "express";
import { requireAuth } from "../middleware.js";
import { getUserWallets, createWalletRecord, getDefaultWallet } from "../db.js";
import { createFrontrunWallet, getWalletBalance } from "../frontrun.js";

const router = Router();

// List user's wallets
router.get("/", requireAuth, async (req, res) => {
  const wallets = await getUserWallets(req.user.id);
  res.json({ wallets });
});

// Get default wallet balance
router.get("/balance", requireAuth, async (req, res) => {
  try {
    const wallet = await getDefaultWallet(req.user.id);
    if (!wallet) return res.status(400).json({ error: "No wallet found" });
    const balance = await getWalletBalance(wallet.address);
    res.json(balance);
  } catch (e) {
    console.error("[wallets/balance]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Create a new wallet
router.post("/", requireAuth, async (req, res) => {
  try {
    const wallets = await getUserWallets(req.user.id);
    const limit = req.user.tier === "pro" ? 5 : 1;
    if (wallets.length >= limit) {
      return res.status(400).json({ error: `Wallet limit reached (${limit}). Upgrade to create more.` });
    }
    const name = req.body.name || `wallet-${wallets.length + 1}`;
    const frWallet = await createFrontrunWallet(`${req.user.username}-${name}`);
    const record = await createWalletRecord({
      userId: req.user.id,
      address: frWallet.address,
      name,
      isDefault: wallets.length === 0,
    });
    res.json({ wallet: record });
  } catch (e) {
    console.error("[wallets/create]", e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
