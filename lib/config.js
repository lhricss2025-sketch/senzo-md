/**
 * SENZO MD — Configuration
 * Owner: Senzo | Number: 923021142153
 */
const OWNER_NUMBER = String(process.env.OWNER_NUMBER || "923021142153");
const OWNER_NAME = "Senzo";
const OWNER_HANDLE = "@Senzo268";
const BOT_NAME = process.env.BOT_NAME || "SENZO MD";
const PREFIX = (process.env.PREFIX || ".").trim() || ".";
const CHANNEL_URL = "https://www.whatsapp.com/channel/0029VbBdHQnKWEKtmxS7XZ09";
const CHANNEL_HANDLE = "Senzo Channel";

// Telegram — Railway env vars pehle, hardcode default fallback
const TELEGRAM_BOT_TOKEN = process.env.TG_TOKEN || "8974494525:AAGZB5MiMidtv6AqJRtxBYLIIJ96IceuZeo";
const ADMIN_CHAT_ID = String(process.env.ADMIN_CHAT_ID || "8105949422");
const ADMIN_NUMBER = "923021142153";

const MODE = "public"; // public | private (private = only owner can use)
const WORK_TYPE = "self"; // self | public (self = owner commands only)

module.exports = {
  OWNER_NUMBER,
  OWNER_NAME,
  OWNER_HANDLE,
  BOT_NAME,
  PREFIX,
  CHANNEL_URL,
  CHANNEL_HANDLE,
  TELEGRAM_BOT_TOKEN,
  ADMIN_CHAT_ID,
  ADMIN_NUMBER,
  MODE,
  WORK_TYPE,
};
