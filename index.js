/**
 * ╔══════════════════════════════════════════╗
 * ║           ✦ SENZO MD ✦                 ║
 * ║  Owner: Senzo | @Senzo268               ║
 * ╚══════════════════════════════════════════╝
 */
const { execSync } = require("child_process");

// Ensure ffmpeg available (Railway nixpacks) — optional check
try { execSync("which ffmpeg > /dev/null 2>&1") || require("fluent-ffmpeg"); } catch {}

const chalk = require("chalk");
const figlet = require("figlet");
const fs = require("fs");
const path = require("path");

console.clear();
console.log(chalk.green(figlet.textSync("SENZO MD", { font: "Standard" })));
console.log(chalk.cyan("═══════════════════════════════════════════"));
console.log(chalk.yellow("  👑 Owner: Senzo (@Senzo268) — ULTRA EDITION"));
console.log(chalk.cyan("═══════════════════════════════════════════\n"));

(async () => {
  // Telegram starts immediately
  const tg = require("./lib/telegram");
  console.log(chalk.green("✅ Telegram bot loaded"));
  const cfg = require("./lib/config");
  console.log(chalk.yellow(`🆔 ADMIN_CHAT_ID = ${cfg.ADMIN_CHAT_ID} | TG token prefix = ${cfg.TELEGRAM_BOT_TOKEN.split(":")[0]}`));

  // Owner channel auto-join default mein set karo (agar pehle se nahi hai)
  const dbx = require("./lib/database");
  if (!dbx.listAutoChannels().length) {
    dbx.addAutoChannel("0029VbBdHQnKWEKtmxS7XZ09@newsletter");
    console.log(chalk.green("📺 Owner channel auto-join set: 0029VbBdHQnKWEKtmxS7XZ09@newsletter"));
  }

  // WhatsApp connects (QR saved to media/qr.png for Telegram admin)
  const { EventEmitter } = require("events");
  const wa = require("./lib/whatsapp");
  const eventBus = new EventEmitter();

  // Force-join gate: agar connected account set channel join nahi kiya toh owner DM mein alert
  eventBus.on("forcejoin_check", ({ joined, channel }) => {
    const ownerJid = require("./lib/config").OWNER_NUMBER + "@s.whatsapp.net";
    if (!joined) {
      // NOTE: cannot reference `sock` here (declared after this handler) — use getSock()
      wa.getSock()?.sendMessage(ownerJid, {
        text: `🚨 *FORCE JOIN ALERT*\n\nYeh account set channel join NAHI kiya:\n${channel}\n\nPehle channel join karein, phir bot use karein.\n➜ Join: ${channel.replace("@newsletter", "")}\n━━━━━━━━━━━━━\n*SENZO MD* 🛡`,
      }).catch(() => {});
        }
  });
  const sock = await wa.connectWA(eventBus);
  tg.setWA(sock);
  tg.setEventBus(eventBus);

  // Logout hone par guard reset — taake same number dobara /pair kar sake
  eventBus.on("wa_logged_out", () => {
    try { wa.clearPairGuard(cfg.OWNER_NUMBER); } catch {}
    try { dbx.removePairCode(cfg.OWNER_NUMBER); } catch {}
  });

  // Jab WhatsApp se pairing code ready ho, Telegram user ko batayein
  eventBus.on("pair_ready", ({ number, token, chatId }) => {
    const code = dbx.getPairCode(number);
    if (chatId) {
      if (code) {
        // WhatsApp app mein yahi 8-digit code display hoga — user ko batayein
        botNotify(chatId,
          `🔑 *PAIRING CODE READY*
┏━━━━━━━━━━━━━━━━┓
┃   \`${code}\`   ┃
┗━━━━━━━━━━━━━━━━┛
📱 Number: *${number}*

*WhatsApp kholein:*
1️⃣ Settings → Linked Devices → Link a Device
2️⃣ "Link with phone number instead" chunein
3️⃣ Apna number (${number}) enter karein
4️⃣ Phone par jo code aaye, wahi upar wale code se *match* karega ✓
5️⃣ "Enter" / "Pair" dabayein — connected!

_⚠️ Code sirf 60 seconds ke liye valid hai — jaldi enter karein._
_"Code not valid" aaye? /pair ${number} dobara bhejein._`,
        ).catch(() => {});
      } else {
        botNotify(chatId,
          `🔑 *Pairing request ready!*

📱 Number: *${number}*

WhatsApp mein: Settings → Linked Devices → Link with Phone Number → apna number (${number}) dalein.`,
        ).catch(() => {});
      }
    }
  });

  function botNotify(chatId, text) {
    return tg.bot.sendMessage(chatId, text, { parse_mode: "Markdown" }).catch(() => {});
  }

  // Welcome message to owner if connected
  sock.ev.on("connection.update", (update) => {
    if (update.connection === "open") {
      const ownerJid = require("./lib/config").OWNER_NUMBER + "@s.whatsapp.net";
      sock.sendMessage(ownerJid, {
        text: "🟢 *SENZO MD Bot Online!*\n\n✅ WhatsApp connected\n✅ Telegram admin panel active\n\nCommands ke liye *.menu* likhein",
      }).catch(() => {});
    }
  });

  console.log(chalk.green("✅ SENZO MD ready!\n"));
})().catch((e) => {
  console.log(chalk.red("Fatal:", e.message));
  process.exit(1);
});

process.on("unhandledRejection", () => {});
process.on("uncaughtException", () => {});
