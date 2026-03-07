import { Router } from "express";

const router = Router();
const API_KEY = process.env.HELIUS_API_KEY || "";

// Simple in-memory cache
const cache = new Map();

// GET /api/helius/token/:mint
router.get("/token/:mint", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "Helius API key not configured" });
  const { mint } = req.params;
  try {
    const cacheKey = `helius:${mint}`;
    const entry = cache.get(cacheKey);
    if (entry && Date.now() - entry.ts < 60_000) {
      return res.json(entry.data);
    }

    const r = await fetch(`https://api.helius.dev/v0/token-metadata?api-key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mintAccounts: [mint] }),
    });
    if (!r.ok) throw new Error(`Helius token-metadata ${r.status}`);
    const data = await r.json();
    cache.set(cacheKey, { ts: Date.now(), data });
    res.json(data);
  } catch (e) {
    console.error("[helius/token]", e.message);
    res.status(502).json({ error: e.message });
  }
});

export default router;
