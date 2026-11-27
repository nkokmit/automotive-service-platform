// Mint access token cho một user cụ thể (dùng để test endpoint cần quyền
// cụ thể mà không cần biết mật khẩu).
//
// Chạy: node scripts/mint-user-token.mjs <userId> <authorities-csv> [path]
import crypto from "node:crypto";
import fs from "node:fs";

const BASE = "http://localhost:8000";

const env = fs.readFileSync(".env", "utf8");
const secret = env
  .split(/\r?\n/)
  .find((l) => l.startsWith("JWT_SECRET="))
  .slice("JWT_SECRET=".length)
  .trim();
const key = Buffer.from(secret, "base64");

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const userId = process.argv[2];
const authorities = (process.argv[3] ?? "").split(",").filter(Boolean);
const target = process.argv[4];

const now = Math.floor(Date.now() / 1000);
const header = { alg: "HS256", typ: "JWT" };
const payload = { sub: userId, userId, iat: now, exp: now + 3600, authorities };

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
const sig = crypto
  .createHmac("sha256", key)
  .update(signingInput)
  .digest("base64url");
const token = `${signingInput}.${sig}`;

if (!target) {
  console.log(token);
  process.exit(0);
}

const url = target.startsWith("http") ? target : `${BASE}${target}`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});
const text = await res.text();
console.log(url, "->", res.status, text.slice(0, 2000));
