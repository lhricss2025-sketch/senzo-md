/**
 * SENZO MD — Auto-behavior commands
 * .autoreact on/off  — kisi bhi message par auto emoji reaction
 * .autotyping on/off — chat mein typing indicator auto
 * .autostatus        — apne status ki pics/videos auto-save
 * Settings: /home/ubuntu/senzo-md/database/auto.json (per-user)
 * Watchers called from lib/whatsapp.js messages.upsert
 */
const fs = require("fs");
const path = require("path");

const AUTO_FILE = path.join(__dirname, "..", "database", "auto.json");
function loadAuto() {
  try { return JSON.parse(fs.readFileSync(AUTO_FILE, "utf8")); }
  catch { return { autoreact: {}, autotyping: {}, autostatus: {}, randomEmoji: true }; }
}
function saveAuto(db) {
  fs.mkdirSync(path.dirname(AUTO_FILE), { recursive: true });
  fs.writeFileSync(AUTO_FILE, JSON.stringify(db));
}
const EMOJIS = ["❤️", "😂", "🥰", "👍", "🔥", "😍", "💯", "🙌", "😁", "👏", "🤩", "💪", "✨", "😎", "🥳", "💖"];
function pickEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; }

const CMDS = [
    {
      name: "autoreact",
      category: "auto",
      desc: "Kisi bhi message par auto emoji reaction on/off",
      async execute(sock, msg, store, { args, reply, sender, isOwner }) {
        if (!isOwner) return reply("❌ Yeh command sirf connected user (owner) ke liye hai");
        const db = loadAuto();
        const val = (args || "").toLowerCase().trim();
        if (val === "on") {
          db.autoreact[sender] = true;
          saveAuto(db);
          return reply("✅ *Auto React ON*\n🎯 Ab group/DM mein koi bhi message karega toh auto emoji reaction jayega");
        }
        if (val === "off" || val === "disable") {
          delete db.autoreact[sender];
          saveAuto(db);
          return reply("❌ *Auto React OFF*");
        }
        const st = db.autoreact[sender] ? "✅ ON" : "❌ OFF";
        return reply(`*Auto React:* ${st}\n\nUsage: \`.autoreact on\` ya \`.autoreact off\``);
      },
    },
    {
      name: "autotyping",
      category: "auto",
      desc: "Chat mein auto typing indicator on/off",
      async execute(sock, msg, store, { args, reply, sender, isOwner }) {
        if (!isOwner) return reply("❌ Yeh command sirf connected user (owner) ke liye hai");
        const db = loadAuto();
        const val = (args || "").toLowerCase().trim();
        if (val === "on") {
          db.autotyping[sender] = true;
          saveAuto(db);
          return reply("✅ *Auto Typing ON*\n⌨️ Ab koi bhi message aayega toh typing indicator show hoga (2-3 sec)");
        }
        if (val === "off" || val === "disable") {
          delete db.autotyping[sender];
          saveAuto(db);
          return reply("❌ *Auto Typing OFF*");
        }
        const st = db.autotyping[sender] ? "✅ ON" : "❌ OFF";
        return reply(`*Auto Typing:* ${st}\n\nUsage: \`.autotyping on\` ya \`.autotyping off\``);
      },
    },
    {
      name: "autostatus",
      category: "auto",
      desc: "Apne contacts ke status ki pics/videos auto-save",
      async execute(sock, msg, store, { args, reply, sender, isOwner }) {
        if (!isOwner) return reply("❌ Yeh command sirf connected user (owner) ke liye hai");
        const db = loadAuto();
        const val = (args || "").toLowerCase().trim();
        if (val === "on") {
          db.autostatus[sender] = true;
          saveAuto(db);
          fs.mkdirSync("/home/ubuntu/senzo-md/database/status_saves", { recursive: true });
          return reply("✅ *Auto Status Save ON*\n📥 Ab jo bhi status dekhein wo database/status_saves mein save ho jayega");
        }
        if (val === "off" || val === "disable") {
          delete db.autostatus[sender];
          saveAuto(db);
          return reply("❌ *Auto Status Save OFF*");
        }
        const st = db.autostatus[sender] ? "✅ ON" : "❌ OFF";
        return reply(`*Auto Status Save:* ${st}\n\nUsage: \`.autostatus on\` ya \`.autostatus off\``);
      },
    },
];
CMDS.watch = async function watch(sock, msg, store) {
    let m, from, participant;
    try {
      m = msg.message;
      from = msg.key.remoteJid;
      participant = msg.key.participant || msg.pushName;
      if (!m || !from || from.endsWith("@newsletter")) return;
      const db = loadAuto();
      // Auto typing (owner ke connected account par)
      if (db.autotyping && Object.keys(db.autotyping).length) {
        const isMe = from === sock.user?.id;
        const inDM = from === participant;
        if (isMe || inDM) {
          if (db.autotyping[sock.user?.id]) {
            try { await sock.sendPresenceUpdate("composing", from); } catch {}
          }
        } else if (db.autotyping[participant]) {
          try { await sock.sendPresenceUpdate("composing", from); } catch {}
        }
      }
      // Auto react — har message par owner ke liye
      const reactFor = db.autoreact && (db.autoreact[sock.user?.id] || db.autoreact[participant]);
      if (reactFor && msg.key.id && participant) {
        try { await sock.sendMessage(from, { react: { text: pickEmoji(), key: msg.key } }); } catch {}
      }
      // Auto status save
      const statusSave = db.autostatus && (db.autostatus[sock.user?.id]);
      if (statusSave && from === "status@broadcast") {
        try {
          const mm = msg.message;
          let buf = null, ext = ".bin";
          if (mm.imageMessage) { buf = await sock.downloadMediaMessage(msg); ext = ".jpg"; }
          else if (mm.videoMessage) { buf = await sock.downloadMediaMessage(msg); ext = ".mp4"; }
          if (buf) {
            const f = `/home/ubuntu/senzo-md/database/status_saves/${participant?.split("@")[0] || "unknown"}_${Date.now()}${ext}`;
            fs.writeFileSync(f, buf);
          }
        } catch {}
      }
    } catch {}
};
module.exports = CMDS;
