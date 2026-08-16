/**
 * SENZO MD — WhatsApp Core (Baileys)
 */
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode");
const chalk = require("chalk");
const { PREFIX, OWNER_NUMBER } = require("./config");
const db = require("./database");
const { fancyName } = require("../utils/styling");

const AUTH_DIR = path.join(__dirname, "..", "database", "auth");
const cmds = {};
let currentSock = null;

// ── Latest QR cache (fresh QR har request pr bhejne ke liye) ──
// WhatsApp QR ka payload ek binary blob hota hai (3 parts: refId + binary + timestamp).
// `qrcode` library string ko utf8 byte-mode mein encode karti hai — yeh WhatsApp ke liye correct hai.
// Lekin QR kaafi dense hota hai, isliye margin + error correction M set karte hain aur
// har baar FRESH data URL bhejte hain (purani file se stale QR nahi bhejte — stale QR
// WhatsApp server par expired hota hai aur scan pr "Could not link" aata hai).
let latestQRDataUrl = null; // data:image/png;base64,...
const QR_OPTS = { margin: 1, scale: 8, errorCorrectionLevel: "M" };

// ═══════════════════════════════════════════════════════════════════
// PAIRING — SINGLE-SOURCE-OF-TRUTH design (developer-grade rewrite)
// Rules (strict, no exceptions):
//  1. Har NUMBER ke liye zindagi bhar mein SIRF EK code request — guard number-keyed
//     hai aur bot.json mein persist hota hai (reconnect par bhi survive).
//  2. Code request ka EK hi entry point: runPairingOnDemand (Telegram /pair se call).
//     connection.open, creds.update, QR handler — koi bhi doosra path code request
//     NAHI karta. Isliye kabhi 2-2 codes nahi aayenge.
//  3. Ephemeral one-shot socket: fresh auth → requestPairingCode → code store → end
//     (zinda bot socket par requestPairingCode galat identity se "fake" code deta tha)
// ═══════════════════════════════════════════════════════════════════
const PAIR_DIR = path.join(__dirname, "..", "database", "auth_pair");
const PAIR_GUARD = {}; // number -> true | process lifetime
// reconnect par bhi guard survive kare — ALAG file pair_guard.json mein save
// (bot.json database module ka hai — wahan merge karne se race condition aati thi
//  jisme db module ka write "pair_done" key ko mita deta tha → double code requests)
const PAIR_GUARD_PATH = path.join(__dirname, "..", "database", "pair_guard.json");
// PAIR_SENT marker — code DELIVERY suppression (duplicate Telegram messages ka khatma):
// Jab bhi kisi number ka code Telegram par BHEJ diya jaye, marker file mein timestamp
// save hota hai. Agli 15 minute mein wahi number dobara code request kare bhi
// (Railway redeploy / process restart ke baad pending-list fallback se),
// code Telegram par dobara NAHI bheja jata — user ko kabhi 2-2 codes nahi milte.
const PAIR_SENT_PATH = path.join(__dirname, "..", "database", "pair_sent.json");
const PAIR_SENT_TTL_MS = 15 * 60 * 1000; // 15 minutes
const PAIR_SENT = {};
function loadPairSent() {
  try {
    const j = JSON.parse(fs.readFileSync(PAIR_SENT_PATH, "utf8"));
    if (j && typeof j === "object") Object.assign(PAIR_SENT, j);
  } catch {}
}
function savePairSent() {
  try { fs.writeFileSync(PAIR_SENT_PATH, JSON.stringify(PAIR_SENT, null, 2)); } catch {}
}
function markPairSent(number) {
  PAIR_SENT[number] = Date.now();
  savePairSent();
}
function wasPairCodeDelivered(number) {
  const t = PAIR_SENT[number];
  if (!t) return false;
  if (Date.now() - t > PAIR_SENT_TTL_MS) { delete PAIR_SENT[number]; savePairSent(); return false; }
  return true;
}
function clearPairSent(number) {
  const num = String(number || "").replace(/[^0-9]/g, "");
  if (num && PAIR_SENT[num]) { delete PAIR_SENT[num]; savePairSent(); }
}
loadPairSent();
function loadPairGuard() {
  try {
    const j = JSON.parse(fs.readFileSync(PAIR_GUARD_PATH, "utf8"));
    if (j && typeof j === "object") Object.assign(PAIR_GUARD, j);
  } catch {}
}
function savePairGuard() {
  try {
    try { fs.writeFileSync(PAIR_GUARD_PATH, JSON.stringify(PAIR_GUARD, null, 2)); } catch(e) { console.log("[SAVEG ERR]", e.message); }
  } catch {}
}
loadPairGuard();

// Guard RESET — zaroori hai taake user dobara pair kar sake:
// (1) Jab WhatsApp session logged-out ho jaye (phone se remove / expire)
// (2) Jab admin /unpair kare
// Bina iske purana number kabhi dobara /pair NAHI kar sakta tha —
// yeh ek REAL bug tha jo audit mein mila (guard permanent hota tha)
function clearPairGuard(number) {
  const num = String(number || "").replace(/[^0-9]/g, "");
  if (num && PAIR_GUARD[num]) {
    delete PAIR_GUARD[num];
    savePairGuard();
    clearPairSent(num);
    console.log(chalk.yellow(`[PAIR GUARD RESET] ${num}`));
    return true;
  }
  return false;
}

// runPairingOnDemand — the ONLY entry point for pairing code requests.
// /pair handler telegram.js se call karta hai. Baaki koi path (connection.open etc.)
// isko call NAHI karta — double codes ka khatma.
async function runPairingOnDemand(number, token, chatId, eventBus) {
  const num = String(number || "").replace(/[^0-9]/g, "");
  if (!num || num.length < 10) {
    console.log(chalk.red(`[PAIR] invalid number: ${number}`));
    return;
  }
  if (PAIR_GUARD[num]) {
    // is number ka code pehle se request ho chuka — duplicate request ignore
    console.log(chalk.yellow(`[PAIR] duplicate ignored for ${num} (already requested)`));
    return;
  }
  PAIR_GUARD[num] = true;
  savePairGuard();
  // pending list se bhi remove karo — taake connection.open fallback path
  // (handlePendingPairs) isko dobara process na kare
  try {
    const pairing = require("./pairing");
    pairing.removePendingByNumber(num);
  } catch {}
  try {
    await requestPairCodeOneshot(num, token, chatId, eventBus);
  } catch (e) {
    console.log(chalk.red(`[PAIR ERR] ${num}: ${e.message}`));
  }
}

// Ephemeral one-shot socket — fresh auth session + fresh identity, code milte hi band.
// Baileys pattern: socket banana ke baad requestPairingCode(seed) call karo —
// baileys khud registration complete hone par code request WhatsApp server ko bhejta hai.
// 'open' event ka intezar NAHI — yehi working reference (MALVRYX) ka proven pattern hai.
async function requestPairCodeOneshot(number, token, chatId, eventBus) {
  const num = String(number).replace(/[^0-9]/g, "");
  if (!num) return;
  const { fetchLatestBaileysVersion, Browsers } = require("@whiskeysockets/baileys");
  const sessionPath = path.join(PAIR_DIR, `${num}_${Date.now()}`);
  let resolved = false;
  const cleanup = () => {
    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
  };
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();
    const pairSock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: Browsers.windows("Chrome"),
      markOnlineOnConnect: false,
      // Baileys validateConnection handshake ke liye time chahiye — 10s kam tha
      // (pairing handshake slow hosts par 10s se zyada leta hai, socket prematurely close hota tha)
      connectTimeoutMs: 30000,
      // companion_hello roundtrip + ack ka waqt — handshake settle hone tak
      defaultQueryTimeoutMs: 30000,
      qrTimeout: 60000,
      // VIOLET reference pattern: keepalive + init queries keep the one-shot socket
      // stable long enough for the pairing handshake to complete on slow hosts
      keepAliveIntervalMs: 30000,
      emitOwnEvents: true,
      fireInitQueries: true,
    });
    let code = null;
    // done() — SINGLE emission point. Guard ki wajah se yeh function zindagi mein
    // sirf EK baar chalega (resolved=true ke baad return).
    const done = (why) => {
      if (resolved) return;
      resolved = true;
      try { pairSock.end(new Error("pair-done")); } catch {}
      setTimeout(cleanup, 2000);
      if (code && eventBus) {
        // DELIVERY SUPPRESSION: agar yeh code pehle se bhej chuke hain (last 15 min)
        // to Telegram par dobara mat bhejo — 2-2 codes ka khatma (Railway redeploy
        // ke baad pending-list fallback bhi yahan se rukta hai)
        if (wasPairCodeDelivered(num)) {
          console.log(chalk.yellow(`[PAIR SENT-SKIP] ${num}: code pehle se deliver ho chuka hai`));
          return;
        }
        markPairSent(num);
        db.addPairCode(num, code);
        console.log(chalk.green(`[PAIR CODE] ${num}: ${code} (${why})`));
        eventBus.emit("pair_ready", { number: num, token, chatId });
      } else if (!code) {
        console.log(chalk.red(`[PAIR NOCODE] ${num}: code nahi mila (${why})`));
      }
    };
    // Code request — exactly once. requestPairingCode seed number leta hai
    // aur baileys internally WhatsApp server se 8-digit code generate karwata hai.
    // Baileys isko registration ke baad queue mein bhej deta hai — isliye
    // seedha call kar sakte hain, socket khulne ka intezar zaroori nahi.
    (async () => {
      // VIOLET/QADEER reference bots wait 3000ms before requesting the code —
      // WhatsApp needs time to finish registration + companion_hello handshake.
      // 500ms thaa jo slow hosts (Railway) par WhatsApp-side rejection deta tha.
      await new Promise((r) => setTimeout(r, 3000));
      // Registered guard (VIOLET/TechX pattern): code sirf tab request karo jab
      // session registered nahi hai — ephemeral dir hamesha unregistered hai, yeh
      // defensive check hai taake kabhi registered session par code request na ho.
      if (state.creds?.registered) {
        done("already-registered");
        return;
      }
      try {
        const raw = await pairSock.requestPairingCode(num);
        const clean = String(raw || "").replace(/[^A-Za-z0-9]/g, "");
        code = clean ? clean.match(/.{1,4}/g)?.join("-") : null;
        done(code ? "code" : "no-code");
      } catch (e) {
        done(`req-error: ${e.message}`);
      }
    })();
    pairSock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close" && !resolved) {
        // close reason log karo — debugging ke liye (user Railway logs mein dekh sakta hai)
        const reason = lastDisconnect?.error?.output?.statusCode || "unknown";
        console.log(chalk.red(`[PAIR CLOSE] ${num}: reason=${reason}`));
        done(`close:${reason}`);
      }
    });
    pairSock.ev.on("creds.update", saveCreds);
    setTimeout(() => done("timeout"), 60000);
  } catch (e) {
    cleanup();
    console.log(chalk.red(`[PAIR BOOT ERR] ${num}: ${e.message}`));
  }
}

// Fallback (sirf tab kaam aayega jab /pair aane se PEHLE pending entry exist ho):
// connection.open par pending list check, lekin guard (number-keyed) wajah se
// wahi number dobara process NAHI hoga — double code impossible.
async function handlePendingPairs(sock, eventBus) {
  try {
    const pairing = require("./pairing");
    const pending = pairing.listPendingPairs();
    for (const p of pending) {
      try {
        const pn = p.number?.replace(/[^0-9]/g, "") || "";
        if (PAIR_GUARD[pn] || wasPairCodeDelivered(pn)) {
          // pehle se requested ya code deliver ho chuka — pending se saaf karo,
          // dobara request/emit nahi (2-2 codes ka khatma)
          pairing.removePendingByNumber(p.number);
          continue;
        }
        pairing.removePendingByNumber(p.number);
        await runPairingOnDemand(p.number, p.token, p.chatId, eventBus);
      } catch (e) {
        console.log(chalk.red(`[PAIR ERR] ${p.number}: ${e.message}`));
      }
    }
  } catch {}
}

async function renderQR(dataStr) {
  // dataStr = Baileys ki QR string (ref,blob,timestamp)
  return await qrcode.toDataURL(dataStr, QR_OPTS);
}

function getLatestQRBuffer() {
  if (!latestQRDataUrl) return null;
  return Buffer.from(latestQRDataUrl.split(",")[1], "base64");
}


async function loadCommands() {
  const dir = path.join(__dirname, "..", "commands");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
  for (const f of files) {
    try {
      const mod = require(path.join(dir, f));
      const list = Array.isArray(mod) ? mod : [mod];
      for (const item of list) {
        if (item && item.name && item.execute) {
          cmds[item.name] = item;
          (item.aliases || []).forEach((a) => { cmds[a] = item; });
        }
      }
    } catch (err) {
      console.log(chalk.red(`[CMD FAIL] ${f}: ${err.message}`));
    }
  }
  console.log(chalk.green(`✓ Loaded WhatsApp command modules`));
}

async function connectWA(eventBus) {
  await loadCommands();
  if (currentSock) return currentSock;
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const store = { loadMessage: async () => null }; // message store placeholder

  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["SENZO MD", "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: true,
    getMessage: async () => ({ conversation: "" }),
  });

  // QR code as base64 for Telegram relay
  sock.ev.on("creds.update", saveCreds);
  sock.store = store;
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      const qrB64 = await renderQR(qr);
      latestQRDataUrl = qrB64;
      fs.writeFileSync(path.join(__dirname, "..", "media", "qr.png"), qrB64.split(",")[1], "base64");
      console.log(chalk.yellow("📱 New QR code saved (media/qr.png)"));
      if (eventBus) eventBus.emit("qr", qrB64);
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(chalk.red(`Connection closed: ${lastDisconnect?.error}`));
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => connectWA(eventBus), 5000);
      } else {
        // WA ne companion ko officially logout kar diya (phone se "Linked Devices" se remove kiya)
        // purana auth folder saaf karo taake agle start par fresh pairing/QR mil sake
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
        // Guard bhi reset karo — warna yeh number kabhi dobara /pair NAHI kar sakta tha
        // (guard file mein persist hota tha aur hamesha ke liye block kar deta tha)
        const loggedNumber = sock.user?.id?.split(":")[0];
        if (loggedNumber) clearPairGuard(loggedNumber);
        try { db.removePairCode(loggedNumber); } catch {}
        console.log(chalk.red("Logged out — auth + guard cleared, fresh pairing/QR possible on next start"));
        if (eventBus) eventBus.emit("wa_logged_out");
        setTimeout(() => connectWA(eventBus), 5000);
      }
    }
    if (connection === "open") {
      // 'open' sirf tab emit hota hai jab WA ne pair-success + CB:success confirm kiya ho —
      // yeh WhatsApp ki taraf se VERIFIED connection hai (fake nahi)
      const who = sock.user?.id?.split(":")[0] || "unknown";
      console.log(chalk.green(`✓ WhatsApp VERIFIED connection as ${who}`));
      if (eventBus) eventBus.emit("wa_connected", sock);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const raw of messages) {
      if (raw.key.fromMe) continue;
      try {
        // Auto-behavior watchers (autoreact/autotyping/autostatus) — sab messages par
        try {
          const au = require("../commands/auto");
          if (au.watch) await au.watch(sock, raw, store);
        } catch {}
        if (!raw.message) continue;
        // MP3/MP4 button handler (__eliteyt_mp3/mp4 <url>)
        try {
          const btn = raw.message?.buttonsResponseMessage?.selectedButtonId ||
            raw.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
            raw.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.id;
          if (btn) {
            const btnStr = typeof btn === "string" ? btn : String(btn);
            if (btnStr.startsWith("__eliteyt_mp3 ") || btnStr.startsWith("__eliteyt_mp4 ")) {
              const [tag, url] = btnStr.split(" ");
              const fmt = tag.split("_").pop();
              const elites = require("../utils/elites");
              const fromBtn = raw.key.remoteJid;
              const pm = await sock.sendMessage(fromBtn, { text: `⬇️ Downloading (${fmt.toUpperCase()})...` }, { quoted: raw });
              const d = await elites.eliteYtDownload(url, fmt);
              if (fmt === "mp3") await sock.sendMessage(fromBtn, { audio: d.buffer, mimetype: "audio/mpeg" }, { quoted: raw });
              else await sock.sendMessage(fromBtn, { video: d.buffer, caption: `🎬 ${d.title}` }, { quoted: raw });
              continue;
            }
          }
        } catch {}
        await handle(sock, raw, store);
      } catch (e) {
        console.log(chalk.red(`[MSG ERR] ${e.message}`));
      }
    }
  });

  sock.ev.on("group-participants.update", async (data) => {
    try {
      const g = require("../commands/group");
      if (g.welcomeWatcher) await g.welcomeWatcher(sock, data);
      if (eventBus) eventBus.emit("group_update", data);
    } catch (e) {
      console.log(chalk.red(`[GRP WATCH ERR] ${e.message}`));
    }
  });

  currentSock = sock;
  sock.ev.on("connection.update", async (upd) => {
    if (upd.qr) {
      // NOTE: latestQRDataUrl + media/qr.png already updated by the first
      // connection.update listener above — avoid duplicate writes here.
      if (!latestQRDataUrl) {
        const qrB64 = await renderQR(upd.qr);
        latestQRDataUrl = qrB64;
        fs.writeFileSync(path.join(__dirname, "..", "media", "qr.png"), qrB64.split(",")[1], "base64");
      }
    }
    if (upd.connection === "open") {
      // Auto-join configured channels on fresh connection
      try {
        const channels = db.listAutoChannels();
        for (const ch of channels) {
          try {
            if (ch.endsWith("@newsletter")) {
              if (typeof sock.newsletterFollow !== "function") {
                console.log(chalk.yellow(`[AUTO-JOIN SKIP] NewsletterFollow method unavailable in this baileys version: ${ch}`));
                continue;
              }
              await sock.newsletterFollow(ch);
              console.log(chalk.green(`[AUTO-JOIN] Newsletter ${ch}`));
            } else {
              await sock.groupAcceptInvite(ch).catch(async () => {
                // maybe invite code
                await sock.groupAcceptInviteV4?.(ch).catch(() => {});
              });
              console.log(chalk.green(`[AUTO-JOIN] Group/Channel ${ch}`));
            }
          } catch (e) {
            console.log(chalk.red(`[AUTO-JOIN ERR] ${ch}: ${e.message}`));
          }
        }
      } catch {}
      // Force-join gate: agar ON hai aur account set channels subscribe nahi hai toh owner DM mein warning
      try {
        if (db.getForceJoin() && eventBus) {
          const channels = db.listAutoChannels();
          if (channels.length > 0 && sock.newsletterSubscribers) {
            const lid = channels[0].split("@")[0] + "@lid";
            sock.newsletterSubscribers(lid).then((r) => {
              const me = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
              const subs = (r?.subscribers || []).map((s) => s.id);
              const joined = subs.includes(me);
              eventBus.emit("forcejoin_check", { joined, channel: channels[0] });
            }).catch(() => eventBus.emit("forcejoin_check", { joined: false, channel: channels[0] }));
          }
        }
      } catch {}
      // Pending pairing requests ko process karo — har ek ke liye EPHEMERAL one-shot socket
      // (zinda bot socket par requestPairingCode galat identity se "fake" code deta hai)
      await handlePendingPairs(sock, eventBus);
    }
  });

  return sock;
}

function getSock() {
  return currentSock;
}

module.exports.getSock = getSock;
module.exports.clearPairGuard = clearPairGuard;

async function handle(sock, msg, store) {
  const m = msg.message;
  const type = Object.keys(m)[0];
  let body = "";
  if (type === "conversation") body = m.conversation || "";
  else if (type === "extendedTextMessage") body = m.extendedTextMessage?.text || "";
  if (!body) return;

  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;
  const isGroup = from.endsWith("@g.us");
  const isOwner =
    sender === `${OWNER_NUMBER}@s.whatsapp.net` ||
    from === `${OWNER_NUMBER}@s.whatsapp.net`;

  // banned check
  if (db.isBanned(sender)) return;

  const reply = async (t, options = {}) => {
    await sock.sendMessage(from, { text: t, ...options }, { quoted: msg });
  };

  // access mode check (paid mode = only owner can use)
  const accessMode = db.getAccessMode();
  if (accessMode === "paid" && !isOwner) {
    return reply("💳 *PAID BOT*\n\nYeh bot abhi *PAID MODE* mein hai.\nAccess lene ke liye owner se contact karein:\n👑 @Senzo268\n📱 923021142153");
  }

  // ── Per-user scope: .private / .public ──
  // 1. Group scope private: us group mein sirf OWNER ki commands chalein gi (baaki sab ignore)
  // 2. User scope private (DM): agar koi user apne DM mein .private kare toh owner se
  //    baad mein owner group/user scope set kar sakta hai
  // Default: public — sab ke commands par respond
  if (isGroup) {
    const grpScope = db.getUserScope(from);
    if (grpScope === "private" && !isOwner) return;
  }

  // anti-link watcher (non-command messages)
  const groupMod = cmds["antilink"];
  try {
    if (groupMod && groupMod.constructor && groupMod.antiLinkWatch) {
      // loaded from group.js — attach watcher via db event instead
    }
  } catch {}

  if (!body.startsWith(PREFIX)) {
    // run anti-link watcher even for plain messages
    try {
      const g = require("../commands/group");
      if (g.antiLinkWatch) await g.antiLinkWatch(sock, msg, store, { from, sender, isGroup, isOwner, body });
      if (g.channelLinkWatch) await g.channelLinkWatch(sock, msg, store, { from, sender, isGroup, isOwner, body });
      const sp = require("../commands/antispam");
      if (sp.badwordsWatch) await sp.badwordsWatch(sock, msg, { from, sender, isGroup, isOwner, body });
      if (sp.floodWatch) await sp.floodWatch(sock, msg, { from, sender, isGroup, isOwner, body });
      const gm = require("../commands/games");
      if (gm.handleXOMove) await gm.handleXOMove(sock, msg, { body, from, sender, isGroup });
    } catch {}
    return;
  }
  const [rawCmd, ...rest] = body.slice(PREFIX.length).trim().split(/\s+/);
  const text = rest.join(" ");
  const cmd = rawCmd.toLowerCase();

  const sendImage = async (buffer, caption) =>
    await sock.sendMessage(from, { image: buffer, caption }, { quoted: msg });
  const sendVideo = async (buffer, caption) =>
    await sock.sendMessage(from, { video: buffer, caption }, { quoted: msg });
  const sendAudio = async (buffer) =>
    await sock.sendMessage(from, { audio: buffer, mimetype: "audio/mpeg" }, { quoted: msg });
  const sendSticker = async (buffer) =>
    await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
  const sendDocument = async (buffer, fileName, caption, mime) =>
    await sock.sendMessage(from, { document: buffer, fileName, caption, mimetype: mime || "application/octet-stream" }, { quoted: msg });

  const sendToOwner = async (content) =>
    await sock.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, content);

  const c = cmds[cmd];
  if (!c) return;

  db.getUser(sender);

  // user-level scope (DM): agar user ne apna scope .private kiya ho toh owner hi uski commands use kar sake;
  // normal users ke liye yeh owner-controlled feature hai
  const uScope = db.getUserScope(sender);
  if (uScope === "private" && !isOwner) {
    // private scope wale user ke bot se sirf owner interact karega
    return;
  }

  // access control
  if (c.ownerOnly && !isOwner) return reply("*Yeh command sirf Owner ke liye hai!* 🔒");
  if (c.groupOnly && !isGroup) return reply("*Yeh command sirf groups ke liye hai!*");
  if (c.premiumOnly && !db.isPremium(sender) && !isOwner)
    return reply("*Yeh command Premium users ke liye hai.* Premium lene ke liye owner se contact karein.");
  if (c.adminRequired) {
    const meta = await sock.groupMetadata(from);
    const isAdmin = meta.participants.find((p) => p.id === sender)?.admin;
    if (!isAdmin && !isOwner) return reply("*Yeh command sirf Group Admins ke liye hai!*");
  }

  await c.execute(sock, msg, store, {
    from, sender, isGroup, isOwner, body, args: text, reply,
    sendImage, sendVideo, sendAudio, sendSticker, sendDocument,
    sendToOwner,
    getGroupMeta: () => sock.groupMetadata(from),
  });
}

module.exports = { connectWA, loadCommands, cmds, handle, getSock, getLatestQRBuffer, handlePendingPairs, runPairingOnDemand, clearPairGuard };
