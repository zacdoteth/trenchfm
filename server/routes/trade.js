import { Router } from "express";
import { requireAuth } from "../middleware.js";
import { getUserWallets } from "../db.js";
import { executeFrontrunTrade } from "../frontrun.js";

const router = Router();

function validateTradePayload(body) {
  const {
    tokenMint,
    side,
    uiInputAmount,
    sellPercent,
    slippageBasisPoint = 500,
    confirmationMode = "ASYNC",
    commitment,
  } = body;

  if (!tokenMint || typeof tokenMint !== "string") {
    return "tokenMint is required";
  }

  if (side !== "BUY" && side !== "SELL") {
    return "side must be BUY or SELL";
  }

  if (!Number.isInteger(slippageBasisPoint) || slippageBasisPoint < 0 || slippageBasisPoint > 10_000) {
    return "slippageBasisPoint must be an integer between 0 and 10000";
  }

  if (confirmationMode !== "ASYNC" && confirmationMode !== "SYNC") {
    return "confirmationMode must be ASYNC or SYNC";
  }

  if (commitment && !["processed", "confirmed"].includes(commitment)) {
    return "commitment must be processed or confirmed";
  }

  if (side === "BUY") {
    const amount = Number.parseFloat(uiInputAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "BUY trades require a positive uiInputAmount";
    }
  }

  if (side === "SELL" && sellPercent == null) {
    const amount = Number.parseFloat(uiInputAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "SELL trades require sellPercent or a positive uiInputAmount";
    }
  }

  if (sellPercent != null) {
    const percent = Number(sellPercent);
    if (!Number.isFinite(percent) || percent < 0.01 || percent > 100) {
      return "sellPercent must be between 0.01 and 100";
    }
  }

  return null;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const validationError = validateTradePayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const {
      tokenMint,
      side,
      uiInputAmount,
      sellPercent,
      slippageBasisPoint = 500,
      confirmationMode = "ASYNC",
      commitment,
    } = req.body;
    const wallets = await getUserWallets(req.user.id);
    const wallet = wallets.find((w) => w.is_default) || wallets[0];
    if (!wallet) return res.status(400).json({ error: "No wallet found" });

    const params = {
      tokenMint,
      side,
      slippageBasisPoint,
      walletAddress: wallet.address,
      confirmationMode,
    };
    if (commitment) params.commitment = commitment;
    if (side === "SELL" && sellPercent != null) {
      params.sellPercent = sellPercent;
    } else {
      params.uiInputAmount = uiInputAmount;
    }

    const result = await executeFrontrunTrade(params);
    res.json({ status: true, data: result });
  } catch (e) {
    console.error("[trade]", e.message);
    res.status(e.code && e.code < 600 ? e.code : 500).json({ error: e.message });
  }
});

export default router;
