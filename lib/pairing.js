/**
 * SENZO MD — Paired Number System (8-digit code)
 *
 * Flow:
 * 1. User Telegram mein /pair <number> likhta hai (ya admin panel se)
 * 2. Bot 8-digit code generate karta hai (e.g. SENZ-0268)
 * 3. User WhatsApp > Linked Devices > Link with Phone Number > apna number dalta hai
 * 4. Bot us number ka Baileys pairing code request karta hai aur code WhatsApp par bhejta hai
 *
 * NOTE: pending pairs bot.json mein persist hote hain — Railway redeploy se
 * /pair → /code flow nahi toot-ta. 10 minute ki TTL bhi persisted hai.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STORE_PATH = path.join(__dirname, "..", "database", "bot.json");

function loadStore() {
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    raw.pairTokens = raw.pairTokens || {};
    return raw;
  } catch {
    return { pairTokens: {} };
  }
}
function saveStore(raw) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(raw, null, 2));
}
function prune(raw) {
  const now = Date.now();
  for (const [t, p] of Object.entries(raw.pairTokens || {})) {
    if (now - p.at > 10 * 60 * 1000) delete raw.pairTokens[t];
  }
  saveStore(raw);
}

function generatePairToken() {
  // 8-char token: 4 letters + 4 digits, e.g. "SENZ-0268"
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)];
  out += "-";
  out += String(Math.floor(1000 + Math.random() * 9000));
  return out;
}

function createPairRequest(number, chatId) {
  const raw = loadStore();
  prune(raw);
  const token = generatePairToken();
  raw.pairTokens[token] = { number: String(number), chatId, at: Date.now() };
  saveStore(raw);
  return token;
}

function consumePairRequest(token) {
  const raw = loadStore();
  const p = raw.pairTokens?.[token];
  if (!p) return null;
  if (Date.now() - p.at > 10 * 60 * 1000) { delete raw.pairTokens[token]; saveStore(raw); return null; }
  delete raw.pairTokens[token];
  saveStore(raw);
  return p;
}

function listPendingPairs() {
  const raw = loadStore();
  prune(raw);
  return Object.entries(raw.pairTokens || {}).map(([t, p]) => ({ token: t, ...p }));
}

// number ke hisaab se pending token delete karo — duplicate pairing code request
// rokne ke liye (single-source-of-truth pairing design)
function removePendingByNumber(number) {
  const raw = loadStore();
  const num = String(number || "").replace(/[^0-9]/g, "");
  if (!num) return;
  for (const [t, p] of Object.entries(raw.pairTokens || {})) {
    if (String(p.number || "").replace(/[^0-9]/g, "") === num) delete raw.pairTokens[t];
  }
  saveStore(raw);
}

module.exports = { createPairRequest, consumePairRequest, listPendingPairs, removePendingByNumber };
