import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || "";

export function validateTelegramAuth(initData) {
  if (!TG_BOT_TOKEN) throw new Error("TG_BOT_TOKEN not configured");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  // Sort alphabetically and join with \n
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(TG_BOT_TOKEN)
    .digest();

  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computed !== hash) throw new Error("Invalid Telegram auth");

  const user = JSON.parse(params.get("user"));
  return user;
}

export function issueToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
