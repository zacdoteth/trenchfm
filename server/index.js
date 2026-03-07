import express from "express";
import cors from "cors";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import tradeRoutes from "./routes/trade.js";
import walletRoutes from "./routes/wallets.js";
import heliusRoutes from "./routes/helius.js";
import coingeckoRoutes from "./routes/coingecko.js";
import { requireAuth } from "./middleware.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const isVercel = !!process.env.VERCEL;

const app = express();

app.use(
  cors({
    origin: isProduction
      ? ["https://trench.fm", "https://www.trench.fm"]
      : true,
  })
);
app.use(express.json());

initDB();

// API routes
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/helius", requireAuth, heliusRoutes);
app.use("/api/coingecko", requireAuth, coingeckoRoutes);

// Local dev/preview: serve built frontend + SPA catch-all
if (!isVercel) {
  const distPath = join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

// Local: start listening. Vercel: export for serverless.
if (!isVercel) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
}

export default app;
