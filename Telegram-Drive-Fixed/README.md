# 🚀 TG Drive - High-Speed Telegram Cloud Drive & Streaming Suite

> **A Complete Google Drive & Streaming Web Platform powered by Telegram Storage, FastAPI, Multi-Bot Engine, Auto IMDb Movie Poster/Rating Integration, Dynamic Admin Management, and Real-Time View Analytics.**

---

## 🌟 Key Features / Mukhy Khasiyat

1. 📂 **Google Drive Clone Web UI:**
   - Full-featured web interface to browse folders, view files, upload, rename, move, delete, and manage trash/bin.
   - Beautiful dark mode modern dashboard.

2. 🎬 **Direct Online Streaming & Fast Download Links:**
   - Instant HTML5 video/audio player (`/stream?path=...`) with seek support, range requests, and high throughput.
   - High-speed direct download link (`/file?path=...`) for any file format.

3. 🤖 **Interactive Telegram Bot Mode:**
   - Send or forward any video, document, photo, or audio directly to your Telegram bot.
   - Bot automatically saves the file to your TG Drive web folder and immediately replies with **Direct Download Link**, **Online Streaming Link**, and **Web Folder Location**!

4. 🍿 **Automatic IMDb Poster & Metadata Fetcher:**
   - When you upload any movie or web series file, the bot automatically cleans the filename, extracts the title & year, and fetches:
     - 🌟 **Official Poster** (sent directly as photo preview)
     - ⭐ **IMDb Rating** (e.g. `8.8/10`)
     - 🎭 **Genres** (Action, Sci-Fi, Drama)
     - ⏳ **Runtime & Duration**
     - 🗣 **Languages & Country**
     - 🎬 **Director & Top Cast**
     - 📖 **Storyline / Plot Synopsis**
     - 🍿 **IMDb.com Direct Web Link Button**
   - Supports both `IMDB_API_KEY` (OMDb API) and free fallback so it always displays rich metadata!
   - Manual `/imdb <title>` command to search any movie anytime.

5. 🛡 **Dynamic Multi-Admin Management System:**
   - Add or remove admins directly via Telegram without restarting your server or editing environment variables!
   - `/addadmin <user_id>`: Add a new admin (or reply to a user's message with `/addadmin`).
   - `/deladmin <user_id>`: Remove an admin (or reply with `/deladmin`).
   - `/admins`: View all Primary Owners (from `TELEGRAM_ADMIN_IDS`) and dynamic bot admins.
   - Admins are persistently saved in `cache/admins.json`.

6. 📊 **Member View Tracking & Real-Time Analytics:**
   - Track how many members viewed/streamed or downloaded each file!
   - View total view counts, top-viewed files, and recent stream access logs (including timestamp, file name, and IP address).
   - Check analytics via Telegram bot (`/stats` or `/views`) or in the Web Dashboard.

7. ⚡ **Multi-Bot Worker Pooling & 4GB Telegram Premium Support:**
   - Add multiple bot tokens in `BOT_TOKENS` to distribute streaming traffic across multiple worker bots (prevents Telegram rate limits).
   - Add Pyrogram string sessions in `STRING_SESSIONS` to upload files up to **4 GB**!

8. 🔄 **Automated Telegram Database Backup:**
   - Automatically serializes and backs up your drive metadata to your Telegram storage channel at configurable intervals (`DATABASE_BACKUP_TIME`).
   - Auto-recovers on server restarts.

---

## ⚙️ Environment Variables Guide / Sabhi Settings

Sabhi environment variables ko `.env` file mein ya Koyeb / Heroku / VPS ke Environment Settings mein set karein:

| Variable Name | Required? | Example Value | Description (English & Hindi) |
|---|---|---|---|
| `API_ID` | **Yes** | `12345678` | Telegram API ID from [my.telegram.org](https://my.telegram.org) |
| `API_HASH` | **Yes** | `a1b2c3d4e5f6g7h8...` | Telegram API Hash from [my.telegram.org](https://my.telegram.org) |
| `MAIN_BOT_TOKEN` | **Yes** | `6789012345:AA...` | Bot token for the main interactive Bot Mode (from [@BotFather](https://t.me/BotFather)) |
| `BOT_TOKENS` | **Yes** | `6789012345:AA...,6789012346:BB...` | Comma-separated bot tokens used as download/stream workers |
| `STORAGE_CHANNEL` | **Yes** | `-1001234567890` | Telegram Channel ID where files and backups are stored (Bot must be Admin!) |
| `DATABASE_BACKUP_MSG_ID`| **Yes** | `2` | Message ID of any file/document sent to `STORAGE_CHANNEL` for storing database backups |
| `WEBSITE_URL` | **Yes** | `https://your-app.koyeb.app` | Public URL of your deployed website (Direct Download & Stream links isi URL par bante hain) |
| `TELEGRAM_ADMIN_IDS` | Recommended | `123456789,987654321` | Comma-separated Telegram User IDs of Primary Owners who have access to the bot |
| `IMDB_API_KEY` | Recommended | `1a2b3c4d` | OMDb / IMDb API Key for movie posters & ratings (Get free at [omdbapi.com](https://www.omdbapi.com/apikey.aspx)) |
| `ENABLE_IMDB` | Optional | `True` | `True` to enable automatic IMDb details on video upload, `False` to disable |
| `ADMIN_PASSWORD` | Optional | `admin` | Password for web drive admin panel (default: `admin`) |
| `STRING_SESSIONS` | Optional | `BQ...` | Pyrogram String Session for 4GB uploads (Telegram Premium account) |
| `DATABASE_BACKUP_TIME` | Optional | `60` | Backup interval in seconds (default: 60) |
| `SLEEP_THRESHOLD` | Optional | `60` | Delay in seconds before retrying Telegram FloodWait (default: 60) |

---

## 🤖 All Bot Commands & Examples / Sabhi Bot Commands

### 1. Basic & Help
- `/start` or `/help`
  - Bot ka welcome message, quick navigation buttons, aur Web Drive ka direct link dikhata hai.
  - Agar unauthorized user bheje to unka Telegram User ID dikhata hai taaki aap unhe admin bana sakein.

### 2. Folder Navigation
- `/set_folder`
  - Bot aapse poochega ki agle files kis folder mein save karni hain.
  - Folder ka naam bhejein aur select karein. Sabhi nayi files usi folder mein jaayengi.
- `/current_folder`
  - Dikhata hai ki abhi upload folder kaun sa active hai.

### 3. IMDb Movie Information (New!)
- Automatic on file upload:
  - Jab bhi aap koi video ya movie file (`.mkv`, `.mp4`, etc.) bhejenge, bot automatically title aur year pehchan kar:
    - 🖼 **Official Movie Poster Photo**
    - ⭐ **IMDb Rating**
    - 🎭 **Genre & Runtime**
    - 🎬 **Director & Cast**
    - 📖 **Plot Storyline**
    - 📥 **Direct Download Button**
    - 🎬 **Stream Online Button**
    - 🍿 **IMDb Web Page Button**
- Manual Command:
  - `/imdb <Movie or Series Name>`
  - *Example:* `/imdb Inception 2010`
  - *Example:* `/imdb Oppenheimer`
  - *Example:* `/imdb Breaking Bad`
  - Kisi bhi movie ka poster, cast aur rating turant search karne ke liye.

### 4. Admin Management (New!)
- `/addadmin <Telegram_User_ID>`
  - Naye user ko bot admin banata hai.
  - *Example:* `/addadmin 987654321`
  - *Alternative:* Kisi bhi user ke message ko reply karke `/addadmin` bhejein.
- `/deladmin <Telegram_User_ID>` (ya `/removeadmin`)
  - Admin ko remove karta hai.
  - *Example:* `/deladmin 987654321`
  - *Alternative:* Admin ke message ko reply karke `/deladmin` bhejein.
- `/admins`
  - Sabhi active admins ki list dikhata hai (Primary Owners + dynamically added admins).

### 5. Views & Analytics
- `/stats` (ya `/views`)
  - Total Files, Total Views/Streams, Total Downloads, Most Viewed Files list, aur Recent Member streaming access logs dikhata hai.

---

## 🔑 How to Get a Free IMDb / OMDb API Key

1. Go to [https://www.omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)
2. Select **FREE (1,000 daily requests)**.
3. Enter your email and name, then click **Submit**.
4. Check your email inbox to verify the key.
5. Add the key in your Koyeb environment variables:
   ```env
   IMDB_API_KEY=your_key_here
   ```
*(Note: Agar aap key nahi bhi daalte hain, tab bhi bot ke paas free fallback system hai jo title, year, poster aur IMDb web link automatically dikhayega!)*

---

## 🚀 Deployment Guide / Kaise Deploy Karein

### Option 1: Koyeb (Recommended)

1. Fork ya Push karein ye repo apne GitHub par (`SPY-BOTZ/Praivet-stream-11`).
2. [Koyeb.com](https://app.koyeb.com/) par login karein.
3. **Create Service** par click karein -> **GitHub**.
4. Apni repository select karein.
5. Builder: **Dockerfile** (Root directory wala `Dockerfile` auto-detect hoga).
6. **Environment Variables** add karein:
   - `API_ID`
   - `API_HASH`
   - `MAIN_BOT_TOKEN`
   - `BOT_TOKENS`
   - `STORAGE_CHANNEL`
   - `DATABASE_BACKUP_MSG_ID`
   - `WEBSITE_URL` (Jaise: `https://your-app.koyeb.app`)
   - `TELEGRAM_ADMIN_IDS` (Aapka Telegram ID)
   - `IMDB_API_KEY` (Optional)
7. **Deploy** par click karein! Koyeb automatically build karke live kar dega.

### Option 2: Docker / VPS

```bash
# Clone the repository
git clone https://github.com/SPY-BOTZ/Praivet-stream-11.git
cd Praivet-stream-11

# Copy sample env and edit credentials
cp sample.env .env
nano .env

# Build and run Docker container
docker build -t tgdrive .
docker run -d -p 8000:8000 --name tgdrive-app tgdrive
```

---

## 📁 Project Architecture / Files Structure

```
├── Dockerfile                  # Production Docker container definition
├── requirements.txt            # Python dependencies (FastAPI, Pyrogram, Uvicorn, aiohttp)
├── config.py                   # Global configuration & environment variable parser
├── main.py                     # FastAPI web server, streaming routes, analytics endpoints
├── sample.env                  # Example environment file with full comments
├── utils/
│   ├── bot_mode.py             # Interactive Telegram bot handler, commands & file upload
│   ├── admin_manager.py        # Dynamic persistent admin management (/addadmin, /deladmin)
│   ├── imdb_helper.py          # Automatic movie title cleaning & IMDb poster/rating fetcher
│   ├── directoryHandler.py     # Drive hierarchy, file indexing & Telegram cloud backup
│   ├── clients.py              # Multi-bot worker initialization & pooling
│   └── streamer/               # Custom streaming engine with video byte-range support
└── website/                    # Web drive frontend assets (HTML, CSS, JS)
```

---

## 🤝 Support & Contribution

Agar koi issue aaye ya new feature chahiye to issue create karein.
Full support for Python 3.10+, Pyrogram (Kurigram), FastAPI, and Uvicorn.
