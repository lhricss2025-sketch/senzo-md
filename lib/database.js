/**
 * SENZO MD — JSON Database
 * Stores users, premium, banned, group settings, bot settings, admin media
 */
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");

const DB_DIR = path.join(__dirname, "..", "database");
const FILES = {
  users: "users.json",
  premium: "premium.json",
  banned: "banned.json",
  groups: "groups.json",
  bot: "bot.json",
  media: "media.json", // admin-controlled start/menu media
};

for (const f of Object.values(FILES)) {
  const p = path.join(DB_DIR, f);
  if (!fs.existsSync(p)) fs.writeFileSync(p, "{}", "utf8");
}

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DB_DIR, FILES[name]), "utf8"));
  } catch {
    return {};
  }
}

function write(name, data) {
  fs.writeFileSync(path.join(DB_DIR, FILES[name]), JSON.stringify(data, null, 2), "utf8");
}

// Users (basic stats)
// ── Coins (economy) ──
function addCoins(jid, amount) {
  const users = read("users");
  users[jid] = users[jid] || { coins: 0 };
  users[jid].coins = Math.max(0, (users[jid].coins || 0) + amount);
  write("users", users);
}

function getCoins(jid) {
  const users = read("users");
  return (users[jid] && users[jid].coins) || 0;
}

function saveUser(jid, data) {
  const users = read("users");
  users[jid] = { ...users[jid], ...data };
  write("users", users);
}

function getUser(jid) {
  const db = read("users");
  db[jid] = db[jid] || { jid, coins: 0, commandsUsed: 0, joinedAt: Date.now() };
  db[jid].commandsUsed++;
  write("users", db);
  return db[jid];
}

// Premium
function addPremium(id, days = 30, reason = "") {
  const db = read("premium");
  db[id] = { premium: true, addedAt: Date.now(), expiresAt: Date.now() + days * 86400000, reason };
  write("premium", db);
}

function removePremium(id) {
  const db = read("premium");
  delete db[id];
  write("premium", db);
}

function isPremium(id) {
  const db = read("premium");
  const u = db[id];
  if (!u || !u.premium) return false;
  if (u.expiresAt && u.expiresAt < Date.now()) {
    removePremium(id);
    return false;
  }
  return true;
}

function premiumLeft(id) {
  const db = read("premium");
  const u = db[id];
  if (!u) return 0;
  const ms = u.expiresAt - Date.now();
  return ms > 0 ? ms : 0;
}

// Banned
function addBan(id) {
  const db = read("banned");
  db[id] = { banned: true, at: Date.now() };
  write("banned", db);
}

function removeBan(id) {
  const db = read("banned");
  delete db[id];
  write("banned", db);
}

function isBanned(id) {
  const db = read("banned");
  return !!db[id];
}

// Group settings
function getGroupSetting(groupId, key, def = false) {
  const db = read("groups");
  db[groupId] = db[groupId] || {};
  return db[groupId][key] !== undefined ? db[groupId][key] : def;
}

function setGroupSetting(groupId, key, value) {
  const db = read("groups");
  db[groupId] = db[groupId] || {};
  db[groupId][key] = value;
  write("groups", db);
}

// Bot global settings
function getBotSetting(key, def) {
  const db = read("bot");
  return db[key] !== undefined ? db[key] : def;
}

function setBotSetting(key, value) {
  const db = read("bot");
  db[key] = value;
  write("bot", db);
}

// Admin media (start menu pic/video, whatsapp menu pic)
function getMedia(key) {
  const db = read("media");
  const m = db[key];
  if (!m) return null;
  // Decode base64-encoded buffers back to Buffer
  if (m && m._isB64 && typeof m.buffer === "string") {
    return { ...m, buffer: Buffer.from(m.buffer, "base64") };
  }
  return m;
}

function setMedia(key, data) {
  const db = read("media");
  // Buffers do NOT survive JSON.stringify (become plain objects) — encode to base64
  if (data && Buffer.isBuffer(data.buffer)) {
    data = { ...data, buffer: data.buffer.toString("base64"), _isB64: true };
  }
  db[key] = data;
  write("media", db);
}

function deleteMedia(key) {
  const db = read("media");
  delete db[key];
  write("media", db);
}

function listMedia() {
  return read("media");
}

// ── Access mode (free/paid) & auto-connect channels ──
function getAccessMode() {
  const db = read("bot");
  return db.accessMode || "free"; // "free" | "paid"
}

function setAccessMode(mode) {
  const db = read("bot");
  db.accessMode = mode === "paid" ? "paid" : "free";
  write("bot", db);
}

function addAutoChannel(jid) {
  const db = read("bot");
  db.autoChannels = db.autoChannels || [];
  if (!db.autoChannels.includes(jid)) db.autoChannels.push(jid);
  write("bot", db);
}

function removeAutoChannel(jid) {
  const db = read("bot");
  db.autoChannels = (db.autoChannels || []).filter((j) => j !== jid);
  write("bot", db);
}

function listAutoChannels() {
  const db = read("bot");
  return db.autoChannels || [];
}

// ── Force join channel gate ──
function getForceJoin() {
  const db = read("bot");
  return db.forceJoin === false ? false : true; // default ON
}

function setForceJoin(on) {
  const db = read("bot");
  db.forceJoin = on === false ? false : true;
  write("bot", db);
}

function isSubscribed(sock, channelJid) {
  // Returns true if the connected account is subscribed to the channel
  if (!sock || !channelJid) return false;
  const lid = channelJid.split("@")[0] + "@lid";
  return sock.newsletterSubscribers
    ? sock.newsletterSubscribers(lid).catch(() => null).then((r) => {
        if (!r || !r.subscribers) return false;
        const me = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
        return (r.subscribers || []).some((s) => s.id === me);
      })
    : Promise.resolve(false);
}

// ── Per-user scope (public/private mode) ──
function getUserScope(jid) {
  const db = read("bot");
  const scopes = db.scopes || {};
  return scopes[jid] || "public"; // default public
}

function setUserScope(jid, mode) {
  const db = read("bot");
  if (!db.scopes) db.scopes = {};
  db.scopes[jid] = mode === "private" ? "private" : "public";
  write("bot", db);
  return db.scopes[jid];
}

// ── Referral system (boost commands unlock) ──
function getReferrals(userId) {
  const db = read("bot");
  const refs = db.referrals || {};
  const r = refs[userId] || {};
  return {
    link: r.link || null,
    joined: (r.joined || []).filter(Boolean),
    unlocked: r.unlocked || false,
  };
}

function createReferralLink(userId) {
  const db = read("bot");
  if (!db.referrals) db.referrals = {};
  if (!db.referrals[userId]) db.referrals[userId] = {};
  // unique referral code = first 8 chars of sha-like hash of userId + timestamp
  let code = db.referrals[userId].code;
  if (!code) {
    code = ("SENZO" + userId + Date.now()).split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36).toUpperCase();
    code = ("R" + code + "00000").slice(0, 8);
    db.referrals[userId].code = code;
  }
  db.referrals[userId].link = code;
  write("bot", db);
  return code;
}

function joinReferral(joinedBy, referralCode) {
  const db = read("bot");
  if (!db.referrals) db.referrals = {};
  for (const uid of Object.keys(db.referrals)) {
    if (db.referrals[uid].code === referralCode) {
      if (!db.referrals[uid].joined) db.referrals[uid].joined = [];
      if (!db.referrals[uid].joined.includes(joinedBy)) {
        db.referrals[uid].joined.push(joinedBy);
      }
      write("bot", db);
      return db.referrals[uid].joined.length;
    }
  }
  return -1; // code not found
}

function isBoostUnlocked(userId) {
  const r = getReferrals(userId);
  return r.unlocked || r.joined.length >= 5;
}

// ── Pairing codes (Telegram → WhatsApp pairing code flow) ──
function addPairCode(number, code) {
  const db = read("bot");
  db.pairCodes = db.pairCodes || {};
  db.pairCodes[number] = { code, at: Date.now() };
  write("bot", db);
}

function getPairCode(number) {
  const db = read("bot");
  const p = (db.pairCodes || {})[number];
  if (!p) return null;
  if (Date.now() - p.at > 300000) { delete db.pairCodes[number]; write("bot", db); return null; }
  return p.code;
}

function removePairCode(number) {
  const db = read("bot");
  db.pairCodes = db.pairCodes || {};
  delete db.pairCodes[number];
  write("bot", db);
}

// ── Welcome / goodbye templates ──
function addWelcomeTemplate(groupId, name, text) {
  const db = read("groups");
  db[groupId] = db[groupId] || {};
  db[groupId].welcomeTemplates = db[groupId].welcomeTemplates || [];
  db[groupId].welcomeTemplates.push({ name, text, at: Date.now() });
  write("groups", db);
}

function listWelcomeTemplates(groupId) {
  const db = read("groups");
  return (db[groupId] || {}).welcomeTemplates || [];
}

function setWelcomeTemplate(groupId, idx) {
  const db = read("groups");
  db[groupId] = db[groupId] || {};
  const tpls = db[groupId].welcomeTemplates || [];
  if (tpls[idx]) db[groupId].welcomeActiveIdx = idx;
  write("groups", db);
}

function getWelcomeTemplate(groupId) {
  const db = read("groups");
  const g = db[groupId] || {};
  const idx = g.welcomeActiveIdx || 0;
  return (g.welcomeTemplates || [])[idx] || null;
}

function getActiveWelcomeTemplate(groupId) {
  const db = read("groups");
  const g = db[groupId] || {};
  return (g.welcomeTemplates || []).length ? (g.welcomeActiveIdx ?? 0) : -1;
}

module.exports = {
  getUser,
  addPremium, removePremium, isPremium, premiumLeft,
  // (all exports kept explicit for clarity)
  addBan, removeBan, isBanned,
  getGroupSetting, setGroupSetting,
  getBotSetting, setBotSetting,
  getMedia, setMedia, deleteMedia, listMedia,
  getAccessMode, setAccessMode,
  addAutoChannel, removeAutoChannel, listAutoChannels,
  addCoins, getCoins, saveUser,
  getForceJoin, setForceJoin, isSubscribed,
  getReferrals, createReferralLink, joinReferral, isBoostUnlocked,
  getUserScope, setUserScope,
  addPairCode, getPairCode, removePairCode,
  addWelcomeTemplate, listWelcomeTemplates, setWelcomeTemplate, getWelcomeTemplate, getActiveWelcomeTemplate,
};
