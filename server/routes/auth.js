import { Router } from "express";
import { validateTelegramAuth, issueToken } from "../auth.js";
import { findUserByTgId, createUser, getUserWallets, createWalletRecord } from "../db.js";
import { createFrontrunWallet } from "../frontrun.js";

const router = Router();

// Telegram Mini App auth
router.post("/telegram", async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: "Missing initData" });

    const tgUser = validateTelegramAuth(initData);
    let user = await findUserByTgId(tgUser.id);
    let isNew = false;

    if (!user) {
      user = await createUser({
        tgId: tgUser.id,
        username: tgUser.username || `user${tgUser.id}`,
        firstName: tgUser.first_name,
        photoUrl: tgUser.photo_url,
      });
      isNew = true;
    }

    // Create wallet for new users
    let wallets = await getUserWallets(user.id);
    if (wallets.length === 0) {
      const frWallet = await createFrontrunWallet(`tg-${user.username}`);
      await createWalletRecord({
        userId: user.id,
        address: frWallet.address,
        name: frWallet.name,
        isDefault: true,
      });
      wallets = await getUserWallets(user.id);
    }

    const token = issueToken({ tgId: user.tg_id, userId: user.id });
    res.json({ token, user, wallets, isNew });
  } catch (e) {
    console.error("[auth/telegram]", e.message);
    res.status(401).json({ error: e.message });
  }
});

// Dev fallback — no Telegram required
router.post("/dev", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Dev auth disabled in production" });
  }
  try {
    const DEFAULT_WALLET = process.env.DEFAULT_WALLET;
    let user = await findUserByTgId("dev-zac");

    if (!user) {
      user = await createUser({
        tgId: "dev-zac",
        username: "zac",
        firstName: "Zac",
        photoUrl: null,
      });
      if (DEFAULT_WALLET) {
        await createWalletRecord({
          userId: user.id,
          address: DEFAULT_WALLET,
          name: "dev-wallet",
          isDefault: true,
        });
      }
    }

    const wallets = await getUserWallets(user.id);
    const token = issueToken({ tgId: user.tg_id, userId: user.id });
    res.json({ token, user, wallets });
  } catch (e) {
    console.error("[auth/dev]", e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
