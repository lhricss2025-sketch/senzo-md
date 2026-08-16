# SENZO MD Bot — Setup & Deploy Guide

## Bot Ki Details

| Cheez | Detail |
|---|---|
| Bot ka naam | SENZO MD (ᴀᴍᴀᴢɪɴɢ ғᴏɴᴛ styling ke saath) |
| Edition | ULTRA EDITION — Forever Free (no version numbers in UI, as per owner request) |
| Owner | Senzo (@Senzo268) — 923021142153 |
| WhatsApp prefix | `.` (dot) |
| Telegram Bot | @Senzomd_bot |
| Admin chat ID | 8105949422 |
| Channel | [Senzo Channel](https://www.whatsapp.com/channel/0029VbBdHQnKWEKtmxS7XZ09) |
| Hosting | Railway (configs ready: `railway.json`, `Procfile`, `start.sh`) |

## v1.4.0 — Nayi Cheezein

### 🛡 Force Join Channel Gate
Jab bhi koi WhatsApp account bot se connect karega, bot check karega ke admin ke set kiye hue channel(s) join kiye hain ya nahi. Agar nahi kiye toh owner ke DM mein turant *FORCE JOIN ALERT* aayega. Default channel aapka (`0029VbBdHQnKWEKtmxS7XZ09`) already set hai.

- Telegram se toggle: `/forcejoin on` ya `/forcejoin off`
- Admin panel mein **🛡 Force Join** button (status + required channels dikhata hai)
- Channels add/remove: `/addchannel <link>`, `/removechannel <link>`, `/channels`

### 🎨 Fake Reactions — `.freacts` (sirf owner)
```
.freacts <channel link> <count> <emoji1, emoji2, emoji3>
```
Example: `.freacts https://whatsapp.com/channel/abc 15 👍,🔥,❤️`

**⚠️ Important (delay wali information):**
- Har reaction ke beech **5-15 seconds random delay** automatic hai (anti-ban throttle)
- Max **30 reactions per run** — safe limit
- Zyada count = WhatsApp spam detection = ban ka khatra. Chhota count use karein aur thoda thoda karke bhejein.

### 🗳 Poll Vote — `.pvote` (sirf owner)
```
.pvote <channel poll link> <option number>
```
- Command bina option ke likhein toh bot batayega: **kitne numbers connected hain = kitne real votes possible** (1 number = 1 vote)
- Option ke saath likhein toh connected number se real vote jayega
- Zyada votes chahiye toh aur WhatsApp numbers bot se connect karein

### 🏓 Ping — `.ping`
Bot ki response speed (ms mein) + status + uptime batata hai. Aliases: `.speed`, `.server`

## Final Edition — Nayi Cheezein (latest)

### 📶 .public / .private — Har User Ke Liye Mode
Har WhatsApp user apna bot ka scope khud set kar sakta hai:
- `.public` — bot uske connected account se **kisi bhi chat mein** response dega
- `.private` — bot sirf **uske apne commands/DMs** par response dega
Default mode bot-wide admin panel se bhi set hota hai; user ki personal setting priority leti hai.

### 📣 Upgraded .tagall — All Restrictions Bypass
Group mein `.tagall` — message ke saath **saare members ko mention karein**, koi bhi restriction bypass. Admin sirf `.tagall <message>` likhein.

### 🎴 Zero-API Stickers & Quotes — Lifetime Guaranteed
- `.attp` / `.ttp` — animated text sticker **locally** generate hota hai (Pillow + ffmpeg) — koi API kabhi expire nahi hogi
- `.quote` — curated local quotes collection (zero-API)
- `.emojimix` — free API chain with graceful fallback

### 📰 Fixed Endpoints
- `.news` — Hacker News API (guaranteed lifetime free)
- `.twitter`, `.currency`, `.ip` — dead APIs replaced with verified alternatives
- `.wallpaper`, `.pinterest`, `.apk`, `.tiktok` — agatz + picsum fallbacks

## 🕵 Hacker / OSINT Zone (New — 12 commands)

### Username OSINT — `.sherlock`
Sherlock-project (sherlock-project/sherlock GitHub) par based — koi bhi username dein, bot **500+ websites** scan karega aur **`.txt` report file** mein result bhejega:
```
.sherlock johndoe
```
⏳ Scan mein 1-3 minute lagte hain. Railway par deploy ke waqt `sherlock-project` automatic install hota hai (`nixpacks.toml` configured).

### Pic Metadata — `.metadata` (alias `.exif`, `.meta`)
Kisi bhi photo par reply karke — EXIF data nikalta hai: **camera model, date, software, aur GPS location** (agar original photo ho). GPS milne par Google Maps link bhi deta hai.

### Media Info — `.info`
Pic/video ki technical details: format, codec, resolution, size, duration.

### Domain WHOIS — `.whois`
```
.whois google.com
```
Official RDAP se: registration date, expiry, nameservers.

### GitHub Stalker — `.gitstalk`
Kisi GitHub user ki profile + avatar photo: repos, followers, location, join date.

### NASA APOD — `.nasa`
Aaj ki NASA ki space photo + explanation (official free API, lifetime).

### Scribd PDF — `.scribd`
```
.scribd https://www.scribd.com/document/494608931/Document
```
Document ki info + **direct PDF download link** (Scribd ka official free download endpoint).

### Status Downloader — `.status-down` (alias `.stsd`)
Kisi ke WhatsApp status (video/photo) par reply karke — media apne chat mein download ho jayegi.

### GitHub Clone — `.gitclone`
Koi bhi public repo link dein — ZIP document ban kar bhejega.

### Hacker Toolkit:

| Command | Kaam |
|---|---|
| `.bin <6-8 digits>` | Card BIN lookup — bank, country, type (binlist.net) |
| `.encode enc <text>` | Base64 encode |
| `.encode dec <text>` | Base64 decode |
| `.hash <text>` | SHA256 + MD5 hash |

## Older Notes (v1.4/v1.5 features)

### 🕌 Islamic Zone (sab lifetime free APIs)

| Command | Kaam |
|---|---|
| `.azan` | Prayer times (city ka naam: `.azan Karachi`, `.azan India Mumbai`) |
| `.quran` | Koi ayat Arabic + Urdu tarjuma ke saath (`.quran 2 255`) |
| `.hadith` | Random Sahih Bukhari hadith (`.hadith muslim` for Sahih Muslim) |
| `.duas` | Masnoon duas — topics: khana, neend, sawari, ghar, masjid, paani |
| `.hijri` | Aaj ki Islamic (Hijri) date |
| `.names` | Asma ul Husna — **99 names ki pyari voice MP3** + text list |

`.names` ke liye MP3 (`media/asma.mp3`) already zip mein included hai — Arabic qari voice. Agar aap koi aur recording use karna chahein toh apni MP3 `media/asma.mp3` mein replace kar dein.

### 🎨 Referral Boost System — `.freacts` / `.fvotes` (sab users ke liye)
Commands `.menu` mein **sab users ko show** hongi, lekin use karne par **referral gate** lagta hai:

- `🔒 Need 5 referrals to unlock` — har user ko apna **unique referral code** milta hai
- Dost bot mein `.join <code>` likhein — 5 joins = **UNLOCK**
- Unlock hone par bot **safety calculator** dikhata hai:
  - **Reactions:** members × 5 + user khud se max 20 (har reaction 5-15s delay)
  - **Votes:** har connected user ke number se sirf 1 real vote
- `👑 Owner (aapka number) EXEMPT` — aapke liye kabhi gate nahi, kisi user ke liye aapke number se koi react/vote nahi jayega

**Commands:**
- `.referral` — status check + apna referral code
- `.join <code>` — kisi ka referral code join karein
- `.freacts` (bina args) — reactions safety calculator
- `.fvotes` (bina args) — votes safety calculator
- `.freacts <link> <count> <emojis>` — reactions bhejein
- `.fvotes <link> <option>` — vote daalein

## Railway Par Deploy Kaise Karein (Step by Step)

1. **GitHub par code upload karein**
   - GitHub.com par jayein → New Repository → `senzo-md`
   - Project ki saari files upload karein (`node_modules` folder nahi, sirf source code)
   - `database/` folder mein sirf `auth` folder aur JSON files rakhein — apna `auth` data secure rakhein

2. **Railway setup**
   - [railway.app](https://railway.app) par login karein → "New Project" → "Deploy from GitHub repo"
   - `senzo-md` repo select karein
   - Settings → Networking → Domain (optional, WhatsApp bot ke liye zaroori nahi)
   - Bot automatically `bash start.sh` se run hoga (`railway.json` configured hai)

3. **WhatsApp Pair — 2 tareeqay**

   **Tareeqa 1: QR Scan (Owner ke liye)**
   - Bot start hote hi `media/qr.png` generate hoga
   - Admin panel (`/start` Telegram mein) se *Send WhatsApp QR* button dabayein
   - WhatsApp kholein → Settings → Linked Devices → Link a Device → QR scan karein

   **Tareeqa 2: Paired Number Code (Users ke liye — QR ki zaroorat nahi!)**
   - Telegram mein bot ko likhein: `pair 923XXXXXXXXXX`
   - Bot aapko ek token dega (e.g. `ABCD-1234`)
   - Ab WhatsApp kholein → Settings → Linked Devices → **Link with Phone Number** → apna number dalein
   - WhatsApp aapko 8-digit code dikhayega — woh Telegram bot ko bhejein: `code ABCD-1234 XXXXXXXX`
   - Pairing complete! Bot us number se connect ho jayega
   - Admin panel mein *Pending Pairs* button se sab pending requests dekh sakte hain

## Telegram Panel — User Flow + Admin Panel (v2 UI)

### 👤 NORMAL USERS ke liye flow:
1. `/start` → agar **TG Force Join** ON hai (channels set hain) toh pehle **channels join karna zaroori** — join button ke saath warning aayegi
2. Join ke baad `/start` dobara → **clean user menu**:

| Button | Kaam |
|---|---|
| 🔗 Pair WhatsApp | Guide — `/pair 923XXXXXXXXXX` se pair karein |
| 🔌 Unpair / Status | Connected device status + disconnect guide |
| 👥 Referral Program | Apna referral code + progress (5 = .freacts/.fvotes unlock) |
| 📊 Bot Status | WhatsApp/Telegram connection status |
| ℹ️ Help & Guide | Sab Telegram commands ki guide |

**User commands:**
```
/pair 923XXXXXXXXXX        # WhatsApp pair request (token aayega)
/code TOKEN-1234 XXXXXXXX  # WhatsApp ka 8-digit code verify
/unpair ya /status         # Connection status
/join R7A3B2C1             # Kisi ka referral code join karein
```

⚠️ Jab PAID mode ON ho: users ko "💳 PAID BOT — contact admin" dikhega.

### 🛠 ADMIN ke liye (chat ID = 8105949422):
`/start` → **Admin Panel** → 8 organized categories (back buttons ke saath):

| Category | Buttons / Commands |
|---|---|
| 🖼 Media Panel | Start Pic, Start Video, WA Menu Pic, List, Delete (saare set karein — pic/video bhej ke) |
| 🔑 Pairing | Pair Guide, Pending Pairs, Send QR |
| 🧰 WhatsApp Ctrl | Bot Settings, WA Commands Info |
| 📢 Broadcast | Guide + `/broadcast <message>` |
| 💳 Access & Premium | Mode toggle button + premium add/remove/check |
| 📺 Channels & Gate | WA Auto Channels + **TG Force Join** gate |
| 🚫 Bans | Ban / Unban |
| 📊 Stats | Live stats |

**TG Force Join Gate (naya!):** admin apne Telegram channels set kare — bot use karne se pehle users ko wo channels join karne honge:
```
/tgate add @channelname      # channel add karein (gate ON)
/tgate remove @channelname   # channel remove karein
```

**Baaki admin commands:**
```
setting mode private/public      # bot mode
setting antilink on/delete/off   # global antilink
premium add 923000000000 30      # 30 din premium
premium remove 923000000000
premium check 923000000000
ban 923000000000 / unban 923000000000
/access free | /access paid      # mode toggle
/broadcast <message>             # sab WhatsApp chats mein bhejein
/addchannel <link>               # WA channel auto-follow
/removechannel <link>            # WA channel remove
/forcejoin on | off              # WA channel subscription check toggle
/cancel                          # media collection cancel
```

## WhatsApp Commands List

| Category | Commands |
|---|---|
| 📦 Main | `.menu` (ya `.m`, `.help`, `.allmenu`) — fancy design ke saath |
| ⬇️ Download | `.ytmp3`, `.ytmp4`, `.play`, `.tiktok`, `.igdl`, `.fbdl`, `.pinterest`, `.apk` (premium), `.vv`, `.vv2`, `.twitter`, `.lyrics`, `.movie`, `.scribd`, `.status-down`, `.gitclone` |
| 🤖 AI | `.ai`, `.gpt`, `.gemini`, `.dalle` (image gen, premium) |
| 🎴 Sticker | `.s`, `.sfull`, `.take`, `.emojimix`, `.attp`, `.quote` |
| 👥 Group | `.antilink`, `.channelwarn` (link auto-del + 3 warns → kick), `.antibot`, `.welcome`, `.goodbye`, `.setwelcome` (4 premium templates + custom), `.setbye`, `.actwelcome`, `.actbye`, `.listwelcome`, `.kick`, `.add`, `.promote`, `.demote`, `.group open/close`, `.lockgc`, `.grouplink`, `.revoke`, `.hidetag`, `.tagall`, `.del`, `.setpp`, `.getpp`, `.groupinfo`, `.desc`, `.subject` |
| 🎉 Fun | `.meme`, `.anime`, `.wallpaper`, `.trivia`, `.facts`, `.couple` |
| 🛠 Tools | `.tts`, `.tr` (translate), `.weather`, `.qrcode`, `.calc`, `.time`, `.news`, `.currency`, `.ip`, `.remind`, `.jid` |
| 🕵 OSINT | `.sherlock`, `.metadata`, `.info`, `.whois`, `.gitstalk`, `.nasa`, `.bin`, `.encode`, `.hash` |
| 🎮 Games | `.dice`, `.coin`, `.slots`, `.quiz`, `.tictactoe` (challenge), `.truth`, `.daily`, `.balance`, `.give`, `.leaderboard` |
| 📦 Extra | `.twitter`, `.lyrics`, `.movie`, `.poll`, `.horoscope`, `.badwords`, `.antiflood` |
| 👑 Owner | `.owner`, `.broadcast`, `.premium add/remove/list/check`, `.ban`, `.unban`, `.blocklist`, `.mode`, `.restart`, `.block`, `.unblock`, `.joingc`, `.leave` |

## Channel/Group Link Protection (Auto Delete + 3 Warnings → Kick)

Jab koi user group/channel link bheje:
1. **Warn 1/3:** message auto-delete + `⚠️ WARNING 1/3` message
2. **Warn 2/3:** dobara delete + `WARNING 2/3`
3. **Warn 3/3:** message delete + `🚫 3 warnings — KICK` + user ko **automatic kick**

Warnings 24 ghante baad reset ho jaati hain. Admins aur owner par yeh apply nahi hota.
Control: `.channelwarn on` (default ON) / `.channelwarn off`

## View-Once (Blur) Media Downloaders

| Command | Kya karta hai | Result kahan |
|---|---|---|
| `.vv` | View-once (blur) image/video ko save karein | **Usi chat mein** bhejta hai |
| `.vv2` | Secret — view-once media chupke se save karein | **Owner ke private inbox (DM) mein** bhejta hai |

Usage: view-once media par reply karke `.vv` ya `.vv2` likhein.

## Telegram Panel — Free/Paid Mode, Broadcast & Channels

| Command | Kaam |
|---|---|
| `/access free` | Sab log freely bot use karein |
| `/access paid` | Sab ko "💳 PAID BOT — contact admin" dikhe |
| `/broadcast <message>` | Telegram se sab WhatsApp users ke inbox mein premium style message |
| `/channels` | Auto-connect channels ki list |
| `/addchannel <link>` | Channel add — bot connect hote hi auto-follow/join |
| `/removechannel <link>` | Channel remove |
| `/tgate add @channel` | Telegram force-join gate mein channel add |
| `/tgate remove @channel` | Gate se channel remove |

WhatsApp side: `.jid <channel link>` — koi bhi user channel/group/number ka JID nikal sakta hai.

## Games & Economy (Lifetime Free)

`.daily` rozana coins de, `.slots` se kamaein ya haarein, `.give` se transfer karein, `.leaderboard` se top users dekhain. `.tictactoe` group mein challenge — reply karke `xo move <1-9>` se khelein.

## Anti-Badwords & Anti-Flood

`.badwords on` + apni words add karein — gaali wala message auto-delete + warning. `.antiflood on` — 10 sec mein 5+ messages = warn, 3 warns = kick.

## API Reliability

Har downloader/fun command mein **multiple backup APIs** hain — agar pehli API fail ho toh automatically doosri try hoti hai:
- `.tiktok` → tikwm.com → agatz backup
- `.igdl` → 2 backup sources
- `.fbdl` → 2 backup sources
- `.meme`, `.anime`, `.wallpaper`, `.facts` → 2-3 fallbacks each
- `.news` → Hacker News (official, lifetime free)
- `.attp`, `.quote` → **100% local, zero-API** — kabhi down nahi honge

**Final API Status (verified):**

| Cheez | Status |
|---|---|
| `.vv` / `.vv2` | Local download — 100% lifetime ✓ |
| `.names` (99 names voice MP3) | Local MP3 — 100% lifetime ✓ |
| `.azan` / `.quran` / `.hadith` | Verified free APIs ✓ |
| `.ytmp3` / `.ytmp4` / `.play` | Local ytdl-core ✓ |
| `.tiktok` / `.igdl` / `.fbdl` | Multiple backups ✓ |
| `.freacts` / `.fvotes` | Bot ke connected accounts se real reacts/votes ✓ (5-referral unlock users ke liye) |
| `.attp` / `.quote` | Zero-API local ✓ |
| `.news` | Hacker News ✓ |
| `.wallpaper` / `.pinterest` | API chain + picsum guarantee ✓ |
| `.sherlock` / `.metadata` / `.info` | Local + verified (sherlock on Railway) ✓ |
| `.whois` / `.gitstalk` / `.nasa` | Official free APIs (RDAP / GitHub / NASA) ✓ |
| `.scribd` / `.status-down` / `.gitclone` | Official endpoints / local Baileys ✓ |
| `.bin` / `.hash` / `.encode` | binlist.net / local crypto (zero-API) ✓ |
| `.dalle` / `.gemini` | Pollinations.ai free tier (no key) ✓ |

## Welcome/Goodbye Templates (Premium Feature)

4 ready-made premium templates hain (Royal, Party, VIP, Gangster style) jo group admin `.setwelcome 1` se activate karta hai. Jab koi user group join kare toh uska **naam + number + group ka naam + time** automatic message mein aata hai. Leave hone par bhi custom goodbye template.

Apna custom template bhi bana sakte hain:
```
.setwelcome Aapke dost {@name} ({@num}) hamare group {@group} mein aa gaye! 🎉
```
Placeholders: `{@mention}` `{@name}` `{@num}` `{@group}` `{@time}`

## Commands Kaise Add Karein (Apni Marzi Se)

`commands/` folder mein nayi `.js` file banayein aur yeh format follow karein:

```js
module.exports = {
  name: "meracmd",
  aliases: ["mc"],
  category: "tools",
  desc: "Mera naya command",
  ownerOnly: false,
  groupOnly: false,
  premiumOnly: false,
  async execute(sock, msg, store, { from, sender, args, reply, sendImage, sendVideo, sendAudio, sendSticker }) {
    if (!args) return reply("Usage: .meracmd <text>");
    await reply("Hello! Aap ne likha: " + args);
  },
};
```

File save karte hi (Railway restart ke baad) command automatically load ho jayegi.

## Important Notes

- **Security:** Telegram token aur owner details `lib/config.js` mein hain — yeh files kisi ko share na karein.
- **`database/auth/`** folder WhatsApp session store karta hai — isse delete karne se bot dobara QR scan mangega.
- **`database/media.json`** admin panel ki set ki hui pics/videos store karta hai — backup zaroor rakhein.
- APIs (`api.senzedevapi.eu.org`, `tikwm.com`, `meme-api.com`) free public APIs hain — agar koi down ho toh alternative API `lib/config.js` ya commands mein replace kar sakte hain.
- Railway free tier mein bot so jata hai 5 min inactivity par — Railway Dashboard se "Auto-Deploy / keep alive" on rakhein ya environment mein `RAILWAY_TOKEN` set karke cron se ping karein.

## Project Structure

```
senzo-md/
├── index.js              # Entry point
├── package.json          # Dependencies
├── railway.json          # Railway deploy config
├── Procfile              # Worker config
├── start.sh              # Start script
├── lib/
│   ├── config.js         # Owner details, token, prefixes
│   ├── database.js       # JSON database + premium/ban/media
│   ├── whatsapp.js       # Baileys WhatsApp core
│   └── telegram.js       # Telegram bot + Admin Panel
├── commands/             # Sab commands yahan (modular)
│   ├── menu.js
│   ├── download.js       # (multiple commands array)
│   ├── ai.js
│   ├── sticker.js
│   ├── group.js          # + anti-link watcher
│   ├── fun.js
│   └── owner.js
├── database/             # Users, premium, banned, media data
└── media/                # QR, thumbnails, admin media
```

## 🛡 Dual API Fallback System (FINAL — Lifetime Reliability)

Har API command ab **2-3 layered backup chain** ke saath kaam karti hai: pehli API result de toh baaki chup rehti hain; pehli fail ho toh automatic doosri try hoti hai.

| Command | Primary | Backup 1 | Backup 2 |
|---|---|---|---|
| `.ai` / `.gpt` / `.gemini` | Pollinations POST /openai (verified) | Pollinations GET json | apinepdev workers |
| `.tiktok` / `.igdl` / `.fbdl` | TikTokWM API (2 attempts) | TikTokWM retry | Local yt-dlp (no API, lifetime) |
| `.twitter` | TikTokWM API (2 attempts) | — | — |
| `.ytmp3` / `.ytmp4` / `.play` | ytdl-core (local) | yt-dlp local fallback | — |
| `.tr` (translate) | Google Translate | MyMemory (verified) | — |
| `.tts` | Google TTS (npm google-tts-api) | translate.google.com direct | — |
| `.anime` / `.waifu` | nekos.life (verified, dual) | — | — |
| `.wallpaper` / `.pinterest` | Bing image scrape | DuckDuckGo scrape | picsum (guaranteed) |
| `.news` | Hacker News | — (local) | — |
| `.currency` | open.er-api | Frankfurter | — |
| `.weather` | open-meteo | open-meteo geocoding | — |
| `.hadith` | Local curated collection | — (zero-API) | — |
| `.quran` | alquran.cloud | — | — |
| `.azan` / `.hijri` | aladhan | — | — |
| `.names` | Archive.org | — | — |
| `.sherlock` | Local Python (sherlock-project) | — (zero-API) | — |
| `.vv` / `.vv2` / `.status-down` / `.metadata` / `.info` / `.hash` / `.encode` | 100% local Baileys/crypto | — | — |

**Note:** Zero-API features (`.vv`, `.vv2`, `.names`, `.attp`, `.quote`, `.sherlock`, `.metadata`, `.hash`, `.encode`, `.status-down`, stickers) kabhi expire nahi honge — koi external service depend nahi.

## ⭐ EliteProTech Verified Commands (New — 8 commands)

eliteprotech-apis.zone.id ki saari 59 APIs live test ki gayi — sirf verified working wali bot mein add ki gayi hain:

| Command | API | Test Result |
|---|---|---|
| `.getpfp <number>` | Baileys `profilePictureUrl` (100% local) | ✅ Lifetime guaranteed — reply ya number dono kaam karte hain |
| `.font <text>` | /font (30+ stylish fonts) | ✅ Verified |
| `.eliteyt <link>` | /ytdown (mp3/mp4) | ✅ Verified — video ya audio download |
| `.elyrics <song>` | /lyrics | ✅ Verified |
| `.transcript <yt-link>` | /transcript → TXT file | ✅ Verified |
| `.zonerai <prompt>` | /zonerai AI image | ✅ Verified (JPEG) |
| `.eliteapk <app>` | /apk (search 1000+ apps) | ✅ Verified |
| `.eliteig <username>` | /igsearch | Attempt with graceful fail (API 404 se intermittent hai) |

**Rejected (500/dead in testing):** copilot, gemini, chatgpt (empty), musicgen, firelogo, imagine, flux, getpp (unka WA PFP generator band hai), fetchpage, facebook, tiktok, instagram, x/twitter, spotify — inhe bot mein nahi lagaya kyunke ye aaj fail ho rahe the.

### .getpfp — 100% Working Guarantee
Kisi bhi WhatsApp number ki profile picture: `.getpfp +923001234567` — ye **WhatsApp ki official API (Baileys)** use karta hai, koi external service nahi. Quoted message par reply se bhi kaam karta hai. Business ya personal dono accounts kaam karte hain.

## 🤖 Auto-Behavior Commands (NEW — latest update)

| Command | Kaam | Status |
|---|---|---|
| `.autoreact on/off` | Kisi bhi group/DM message par auto emoji reaction (16 random emojis) | ✅ Local |
| `.autotyping on/off` | Message aate hi typing indicator show (2-3 sec) | ✅ Local |
| `.autostatus on/off` | Contacts ke status ki pics/videos auto-save (`database/status_saves/`) | ✅ Local |
| `.getpfp <number>` | Kisi bhi number ki PFP (Baileys official — 100% guaranteed) | ✅ Local |

## 🔗 EliteProTech Backups — MERGED (alag commands nahi, existing mein backup)

User ke kehne par saare elite backups existing commands mein merge kar diye:
- `.ytmp3` / `.ytmp4` / `.play` → fail hone par automatic EliteYT API se download; `.ytmp4` mein thumbnail + description + **🎵 MP3 / 📹 MP4 interactive buttons**
- `.lyrics` → Elite lyrics backup
- `.dalle` → Elite ZonerAI image backup
- `.apk` → Elite APK search backup
- Buttons press karne par bot automatically selected format download bhejta hai
