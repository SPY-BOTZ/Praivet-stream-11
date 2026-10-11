import asyncio
from pathlib import Path
from urllib.parse import quote
from pyrogram import Client, filters
from pyrogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton
import config
from utils.logger import Logger
from utils.streamer.file_properties import get_name, get_media_from_message

logger = Logger(__name__)

# Resilient imports so bot never crashes on startup if files are added sequentially on GitHub
try:
    from utils.admin_manager import admin_manager
except ImportError:
    logger.warning("utils.admin_manager not found. Using in-memory fallback admin manager.")
    class _FallbackAdminManager:
        def is_admin(self, user_id: int) -> bool:
            if not getattr(config, "TELEGRAM_ADMIN_IDS", None):
                return True
            return user_id in config.TELEGRAM_ADMIN_IDS
        def add_admin(self, user_id: int, added_by: int = 0):
            if not hasattr(config, "TELEGRAM_ADMIN_IDS"):
                config.TELEGRAM_ADMIN_IDS = []
            if user_id not in config.TELEGRAM_ADMIN_IDS:
                config.TELEGRAM_ADMIN_IDS.append(user_id)
            return True, "Added as admin (in-memory mode)"
        def remove_admin(self, user_id: int, removed_by: int = 0):
            if user_id in getattr(config, "TELEGRAM_ADMIN_IDS", []):
                config.TELEGRAM_ADMIN_IDS.remove(user_id)
                return True, "Removed from admins (in-memory mode)"
            return False, "User is not an admin"
        def get_all_admins(self):
            return list(getattr(config, "TELEGRAM_ADMIN_IDS", []))
    admin_manager = _FallbackAdminManager()

try:
    from utils.imdb_helper import get_imdb_info, format_imdb_caption, clean_movie_title
except ImportError:
    logger.warning("utils.imdb_helper not found. Using fallback metadata handler.")
    def clean_movie_title(raw_name: str):
        name = raw_name
        for ext in ('.mp4', '.mkv', '.webm', '.mov', '.avi'):
            if name.lower().endswith(ext):
                name = name[:-len(ext)]
        name = name.replace('.', ' ').replace('_', ' ').replace('-', ' ').strip()
        return name, ""

    async def get_imdb_info(query: str, year: str = ""):
        return None

    def format_imdb_caption(info, dl_url, stream_url=None, folder_url=None, file_size="", file_name=""):
        return f"📄 `{file_name}`\n💾 Size: `{file_size}`\n⚡ Download: {dl_url}"

START_CMD = """🚀 **Welcome to TG Drive's Bot Mode**

You can use this bot to upload files directly to your TG Drive website and instantly get **Direct Download**, **Online Streaming**, and automatic **IMDb Movie Information**!

🗄 **Drive & Folder Commands:**
• /set_folder - Set the folder where new files will be uploaded
• /current_folder - View the current active upload folder
• /stats (or /views) - View total member views, stream counts & analytics

🍿 **IMDb & Movie Features:**
• Automatic IMDb poster, rating ⭐ & plot whenever you send any movie/series file!
• /imdb `<movie name>` - Search IMDb details manually anytime

👥 **Admin Management Commands:**
• /addadmin `<user_id>` - Add a new admin (or reply to a user with /addadmin)
• /deladmin `<user_id>` - Remove an admin (or reply to a user with /deladmin)
• /admins - List all current bot admins & primary owners

📤 **How to Upload Files:**
Send or forward any file, video, audio, photo, or document to this bot.
The bot will save it to your TG Drive website and instantly reply with:
• ⚡ **Direct Download Link**
• 🎬 **Online Stream Link** (with web video player)
• 🍿 **IMDb Poster & Details** (for movies and series)
• 📂 **Web Drive Location**
"""

SET_FOLDER_PATH_CACHE = {}  # Cache to store folder paths for callback selection
DRIVE_DATA = None
BOT_MODE = None

session_cache_path = Path("./cache")
session_cache_path.parent.mkdir(parents=True, exist_ok=True)

main_bot = Client(
    name="main_bot",
    api_id=config.API_ID,
    api_hash=config.API_HASH,
    bot_token=config.MAIN_BOT_TOKEN,
    sleep_threshold=config.SLEEP_THRESHOLD,
    workdir=session_cache_path,
)

def format_bytes(size: int) -> str:
    if not size or size <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    unit_index = 0
    size_float = float(size)
    while size_float >= 1024.0 and unit_index < len(units) - 1:
        size_float /= 1024.0
        unit_index += 1
    return f"{size_float:.2f} {units[unit_index]}"

def get_base_url() -> str:
    if config.WEBSITE_URL:
        url = config.WEBSITE_URL.strip().rstrip("/")
        if not (url.startswith("http://") or url.startswith("https://")):
            url = f"https://{url}"
        return url
    return ""

def is_admin(user_id: int) -> bool:
    return admin_manager.is_admin(user_id)

async def safe_reply_text(message: Message, text: str, reply_markup=None) -> Message:
    """Safely replies without crashing on Pyrogram link preview parameter differences"""
    try:
        from pyrogram.types import LinkPreviewOptions
        return await message.reply_text(
            text,
            reply_markup=reply_markup,
            link_preview_options=LinkPreviewOptions(is_disabled=True),
        )
    except Exception:
        try:
            return await message.reply_text(
                text,
                reply_markup=reply_markup,
            )
        except Exception as e:
            logger.error(f"Failed to safe_reply_text: {e}")
            raise

async def safe_edit_text(message: Message, text: str, reply_markup=None) -> Message:
    """Safely edits message text without crashing on disable_web_page_preview or link_preview_options"""
    try:
        from pyrogram.types import LinkPreviewOptions
        return await message.edit_text(
            text,
            reply_markup=reply_markup,
            link_preview_options=LinkPreviewOptions(is_disabled=True),
        )
    except Exception:
        try:
            return await message.edit_text(
                text,
                reply_markup=reply_markup,
            )
        except Exception as e:
            logger.error(f"Failed to safe_edit_text: {e}")
            raise

@main_bot.on_message(filters.command(["start", "help"]) & filters.private)
async def start_handler(client: Client, message: Message):
    user_id = message.from_user.id if message.from_user else 0

    if not is_admin(user_id):
        unauth_text = (
            f"👋 **Hello {message.from_user.first_name if message.from_user else 'User'}!**\n\n"
            f"Your Telegram User ID is: `{user_id}`\n\n"
            "⚠️ **Access Restricted:**\n"
            f"To enable file uploads and manage this bot, please add your ID `{user_id}` to the `TELEGRAM_ADMIN_IDS` environment variable in Koyeb/hosting settings."
        )
        await safe_reply_text(message, unauth_text)
        return

    base_url = get_base_url()
    buttons = []
    if base_url:
        buttons.append([InlineKeyboardButton("🌐 Open Web Drive", url=f"{base_url}/")])
    buttons.append([InlineKeyboardButton("📊 View Analytics", callback_data="btn_stats")])

    reply_markup = InlineKeyboardMarkup(buttons) if buttons else None
    await safe_reply_text(message, START_CMD, reply_markup=reply_markup)

@main_bot.on_message(filters.command("set_folder") & filters.private)
async def set_folder_handler(client: Client, message: Message):
    global SET_FOLDER_PATH_CACHE, DRIVE_DATA
    user_id = message.from_user.id if message.from_user else 0
    if not is_admin(user_id):
        await safe_reply_text(message, f"❌ Access denied. Your User ID is `{user_id}`.")
        return

    while True:
        try:
            folder_name = await message.ask(
                "📁 Send the name of the folder where you want to upload files:\n\nSend /cancel to cancel.",
                timeout=60,
                filters=filters.text,
            )
        except asyncio.TimeoutError:
            await safe_reply_text(message, "⏱ Request timed out. Use /set_folder to try again.")
            return

        if folder_name.text.lower() == "/cancel":
            await safe_reply_text(message, "❌ Action cancelled.")
            return

        folder_name_clean = folder_name.text.strip()
        search_result = DRIVE_DATA.search_file_folder(folder_name_clean)
        
        # Filter folders from search result
        folders = {item.id: item for item in search_result.values() if getattr(item, "type", "") == "folder"}

        if len(folders) == 0:
            await safe_reply_text(
                message,
                f"⚠️ No folder found with name: **{folder_name_clean}**\nPlease try another name or send /cancel."
            )
        else:
            break

    buttons = []
    folder_cache = {}
    folder_cache_id = len(SET_FOLDER_PATH_CACHE) + 1
    for folder in folders.values():
        path = folder.path.strip("/")
        folder_path = "/" + ("/" + path + "/" + folder.id).strip("/")
        folder_cache[folder.id] = (folder_path, folder.name)
        buttons.append(
            [
                InlineKeyboardButton(
                    f"📁 {folder.name}",
                    callback_data=f"set_folder_{folder_cache_id}_{folder.id}",
                )
            ]
        )

    SET_FOLDER_PATH_CACHE[folder_cache_id] = folder_cache
    await safe_reply_text(
        message,
        "📂 **Select destination folder:**",
        reply_markup=InlineKeyboardMarkup(buttons),
    )

@main_bot.on_callback_query(filters.regex(r"set_folder_"))
async def set_folder_callback(client: Client, callback_query):
    global SET_FOLDER_PATH_CACHE, BOT_MODE
    user_id = callback_query.from_user.id if callback_query.from_user else 0
    if not is_admin(user_id):
        await callback_query.answer("❌ Access denied", show_alert=True)
        return

    try:
        parts = callback_query.data.split("_")[2:]
        folder_cache_id, folder_id = parts[0], parts[1]
        folder_path_cache = SET_FOLDER_PATH_CACHE.get(int(folder_cache_id))
        
        if folder_path_cache is None:
            await callback_query.answer("⚠️ Session expired. Please send /set_folder again.", show_alert=True)
            await callback_query.message.delete()
            return

        folder_path, name = folder_path_cache.get(folder_id)
        del SET_FOLDER_PATH_CACHE[int(folder_cache_id)]
        BOT_MODE.set_folder(folder_path, name)
        
        await callback_query.answer(f"✅ Folder set to: {name}")
        await callback_query.message.edit(
            f"✅ **Upload folder set to:** `{name}`\n\nAll forwarded/sent files will now be saved in this directory."
        )
    except Exception as e:
        logger.error(f"Error in set_folder_callback: {e}")

@main_bot.on_callback_query(filters.regex(r"^btn_stats$"))
async def stats_callback(client: Client, callback_query):
    global DRIVE_DATA
    if not DRIVE_DATA:
        await callback_query.answer("Drive data loading...", show_alert=True)
        return
    analytics = DRIVE_DATA.get_analytics_summary()
    total_views = analytics.get("total_views", 0)
    total_downloads = analytics.get("total_downloads", 0)
    total_files = analytics.get("total_files", 0)
    text = (
        f"📊 **Drive Views & Stats Summary**\n\n"
        f"📂 Total Files: {total_files}\n"
        f"👁 Total Views / Streams: {total_views}\n"
        f"📥 Total Downloads: {total_downloads}"
    )
    await callback_query.answer(text, show_alert=True)

@main_bot.on_message(filters.command("current_folder") & filters.private)
async def current_folder_handler(client: Client, message: Message):
    global BOT_MODE
    user_id = message.from_user.id if message.from_user else 0
    if not is_admin(user_id):
        await safe_reply_text(message, f"❌ Access denied. Your User ID is `{user_id}`.")
        return

    folder_name = getattr(BOT_MODE, "current_folder_name", "/ (root directory)")
    folder_path = getattr(BOT_MODE, "current_folder", "/")
    await safe_reply_text(
        message,
        f"📁 **Current Upload Folder:** `{folder_name}`\n"
        f"📍 **Internal Path:** `{folder_path}`"
    )

@main_bot.on_message(filters.command(["stats", "views"]) & filters.private)
async def stats_handler(client: Client, message: Message):
    global DRIVE_DATA
    user_id = message.from_user.id if message.from_user else 0
    if not is_admin(user_id):
        await safe_reply_text(message, f"❌ Access denied. Your User ID is `{user_id}`.")
        return

    if not DRIVE_DATA:
        await safe_reply_text(message, "⚠️ Drive data not loaded yet.")
        return

    analytics = DRIVE_DATA.get_analytics_summary()
    total_files = analytics.get("total_files", 0)
    total_views = analytics.get("total_views", 0)
    total_downloads = analytics.get("total_downloads", 0)
    top_files = analytics.get("top_files", [])
    recent_activity = analytics.get("recent_activity", [])

    text = (
        f"📊 **TG Drive Analytics & Member View Counts**\n\n"
        f"📁 **Total Files in Drive:** `{total_files}`\n"
        f"👁 **Total Views / Streams:** `{total_views}`\n"
        f"📥 **Total Downloads:** `{total_downloads}`\n\n"
    )

    if top_files:
        text += "🏆 **Most Viewed & Downloaded Files:**\n"
        for idx, f in enumerate(top_files[:7], 1):
            text += f"{idx}. **{f['name']}**\n   👁 `{f['views']} views` | 📥 `{f['downloads']} downloads`\n"
    else:
        text += "No files viewed yet.\n"

    if recent_activity:
        text += "\n🕒 **Recent Member Access Activity:**\n"
        for act in recent_activity[:4]:
            t_type = "🎬 Stream" if act.get("type") == "stream" else "📥 Download"
            text += f"• `{act.get('time', '')}` - {t_type} on `{act.get('file_name', '')[:25]}` (IP: `{act.get('ip', 'N/A')}`)\n"

    base_url = get_base_url()
    buttons = []
    if base_url:
        buttons.append([InlineKeyboardButton("🌐 Open Web Drive Analytics", url=f"{base_url}/")])

    reply_markup = InlineKeyboardMarkup(buttons) if buttons else None
    await safe_reply_text(message, text, reply_markup=reply_markup)

# Admin Management Commands
@main_bot.on_message(filters.command(["addadmin", "add_admin"]) & filters.private)
async def add_admin_handler(client: Client, message: Message):
    caller_id = message.from_user.id if message.from_user else 0
    if not is_admin(caller_id):
        await safe_reply_text(message, "❌ Access denied. Only admins can add other admins.")
        return

    target_id = None
    if message.reply_to_message and message.reply_to_message.from_user:
        target_id = message.reply_to_message.from_user.id
    else:
        parts = message.text.split()
        if len(parts) > 1 and parts[1].strip().lstrip("-").isdigit():
            target_id = int(parts[1].strip())

    if not target_id:
        await safe_reply_text(
            message,
            "ℹ️ **How to Add an Admin:**\n\n"
            "• Option 1: Send `/addadmin <Telegram_User_ID>`\n"
            "  *Example:* `/addadmin 1234567890`\n\n"
            "• Option 2: Forward/Reply to any user's message with `/addadmin`"
        )
        return

    success, msg = admin_manager.add_admin(target_id, added_by=caller_id)
    await safe_reply_text(message, msg)

@main_bot.on_message(filters.command(["deladmin", "removeadmin", "remove_admin", "del_admin"]) & filters.private)
async def remove_admin_handler(client: Client, message: Message):
    caller_id = message.from_user.id if message.from_user else 0
    if not is_admin(caller_id):
        await safe_reply_text(message, "❌ Access denied. Only admins can remove admins.")
        return

    target_id = None
    if message.reply_to_message and message.reply_to_message.from_user:
        target_id = message.reply_to_message.from_user.id
    else:
        parts = message.text.split()
        if len(parts) > 1 and parts[1].strip().lstrip("-").isdigit():
            target_id = int(parts[1].strip())

    if not target_id:
        await safe_reply_text(
            message,
            "ℹ️ **How to Remove an Admin:**\n\n"
            "• Option 1: Send `/deladmin <Telegram_User_ID>`\n"
            "  *Example:* `/deladmin 1234567890`\n\n"
            "• Option 2: Reply to the admin's message with `/deladmin`"
        )
        return

    success, msg = admin_manager.remove_admin(target_id)
    await safe_reply_text(message, msg)

@main_bot.on_message(filters.command(["admins", "adminlist"]) & filters.private)
async def list_admins_handler(client: Client, message: Message):
    caller_id = message.from_user.id if message.from_user else 0
    if not is_admin(caller_id):
        await safe_reply_text(message, "❌ Access denied. Only admins can view the admin list.")
        return

    summary = admin_manager.get_all_admins_summary()
    owners = summary.get("primary_owners", [])
    dynamic = summary.get("dynamic_admins", [])

    text = "🛡 **TG Drive Bot Admins**\n━━━━━━━━━━━━━━━━━━━━━━\n\n"
    text += "👑 **Primary Owner(s) (Environment):**\n"
    if owners:
        for oid in owners:
            text += f"• `{oid}` (Super Admin)\n"
    else:
        text += "• *(None in TELEGRAM_ADMIN_IDS)*\n"

    text += "\n👥 **Additional Admins (Added via Bot):**\n"
    if dynamic:
        for idx, adm in enumerate(dynamic, 1):
            uid = adm.get("user_id")
            by = adm.get("added_by", "Owner")
            at = adm.get("added_at", "")
            text += f"{idx}. `{uid}` (Added by `{by}` on `{at}`)\n"
    else:
        text += "• *No additional admins added yet. Use /addadmin <id> to add.*\n"

    text += f"\n📊 **Total Active Admins:** `{summary.get('total_count', 0)}`\n"
    text += "\n💡 *Use /addadmin <id> to add or /deladmin <id> to remove.*"
    await safe_reply_text(message, text)

# Manual IMDb search command
@main_bot.on_message(filters.command("imdb") & filters.private)
async def imdb_search_handler(client: Client, message: Message):
    caller_id = message.from_user.id if message.from_user else 0
    if not is_admin(caller_id):
        await safe_reply_text(message, "❌ Access denied.")
        return

    parts = message.text.split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await safe_reply_text(message, "ℹ️ **Usage:** `/imdb <Movie or Series Name>`\n*Example:* `/imdb Inception 2010`")
        return

    query = parts[1].strip()
    status_msg = await safe_reply_text(message, f"🔍 Searching IMDb for `{query}`...")

    imdb_info = await get_imdb_info(query)
    if not imdb_info:
        await safe_edit_text(status_msg, f"❌ No IMDb results found for `{query}`.")
        return

    caption = (
        f"🎬 **{imdb_info.get('title')} ({imdb_info.get('year')})**\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"⭐ **IMDb Rating:** `{imdb_info.get('rating', 'N/A')}/10`\n"
        f"🎭 **Genre:** `{imdb_info.get('genre', 'N/A')}`\n"
        f"⏳ **Runtime:** `{imdb_info.get('runtime', 'N/A')}`\n"
        f"🗣 **Language:** `{imdb_info.get('language', 'N/A')}`\n"
        f"🎬 **Director:** `{imdb_info.get('director', 'N/A')}`\n"
        f"🌟 **Cast:** `{imdb_info.get('actors', 'N/A')}`\n\n"
        f"📖 **Plot:** _{imdb_info.get('plot', 'N/A')}_\n"
    )

    buttons = []
    if imdb_info.get("imdb_url"):
        buttons.append([InlineKeyboardButton("🍿 View on IMDb", url=imdb_info["imdb_url"])])
    markup = InlineKeyboardMarkup(buttons) if buttons else None

    if imdb_info.get("poster"):
        try:
            await message.reply_photo(photo=imdb_info["poster"], caption=caption, reply_markup=markup)
            await status_msg.delete()
            return
        except Exception as e:
            logger.warning(f"Could not send IMDb photo: {e}")

    await safe_edit_text(status_msg, caption, reply_markup=markup)

# File handler for all Telegram media types
@main_bot.on_message(
    filters.private
    & (
        filters.document
        | filters.video
        | filters.audio
        | filters.photo
        | filters.sticker
        | filters.voice
        | filters.video_note
        | filters.animation
    )
)
async def file_handler(client: Client, message: Message):
    """
    Receives file in bot mode, stores in Telegram channel, registers in TG Drive,
    and returns Direct Download, Video/Audio Stream, IMDb info, and Drive Web links directly to the user!
    """
    global BOT_MODE, DRIVE_DATA
    user_id = message.from_user.id if message.from_user else 0
    if not is_admin(user_id):
        await safe_reply_text(
            message,
            f"❌ **Upload Access Denied**\n\nYour Telegram User ID is `{user_id}`.\nAsk an admin to run `/addadmin {user_id}` or add your ID to `TELEGRAM_ADMIN_IDS` in environment variables."
        )
        return

    status_msg = await safe_reply_text(message, "⏳ Processing and indexing your file...")

    try:
        # Copy file to storage channel
        copied_message = await message.copy(config.STORAGE_CHANNEL)
        media = get_media_from_message(copied_message)
        
        if not media:
            await safe_edit_text(status_msg, "❌ Could not read media from message.")
            return

        # Safe filename & size extraction
        file_name = get_name(copied_message)
        file_size = getattr(media, "file_size", 0) or 0
        formatted_size = format_bytes(file_size)

        current_folder = getattr(BOT_MODE, "current_folder", "/") if BOT_MODE else "/"
        current_folder_name = getattr(BOT_MODE, "current_folder_name", "/ (root directory)") if BOT_MODE else "/ (root directory)"

        # Store in TG Drive data structure and save to disk
        new_file_item = DRIVE_DATA.new_file(
            current_folder,
            file_name,
            copied_message.id,
            file_size,
        )

        file_id = new_file_item.id if new_file_item else getattr(new_file_item, "id", None)
        raw_folder = current_folder.strip("/")
        file_path = "/" + (raw_folder + "/" + file_id if raw_folder else file_id)

        base_url = get_base_url()
        is_streamable = any(file_name.lower().endswith(ext) for ext in [
            ".mp4", ".mkv", ".webm", ".mov", ".avi", ".ts", ".ogv", ".mp3", ".m4a", ".wav", ".ogg", ".flac"
        ])

        download_url = f"{base_url}/file?path={file_path}" if base_url else ""
        stream_url = f"{base_url}/stream?path={file_path}" if base_url else ""
        folder_url = f"{base_url}/?path={current_folder}" if base_url else ""

        # Check IMDb metadata for movies / series
        imdb_info = None
        if getattr(config, "ENABLE_IMDB", True) and is_streamable:
            try:
                imdb_info = await get_imdb_info(file_name)
            except Exception as e:
                logger.warning(f"Error fetching IMDb info for {file_name}: {e}")

        # Construct Keyboard Buttons
        keyboard_buttons = []
        if base_url:
            keyboard_buttons.append([InlineKeyboardButton("📥 Direct Download", url=download_url)])
            if is_streamable:
                keyboard_buttons.append([InlineKeyboardButton("🎬 Stream Online", url=stream_url)])
            keyboard_buttons.append([InlineKeyboardButton("📂 Open In Web Drive", url=folder_url)])

        if imdb_info and imdb_info.get("imdb_url"):
            keyboard_buttons.append([InlineKeyboardButton("🍿 IMDb Info", url=imdb_info["imdb_url"])])

        reply_markup = InlineKeyboardMarkup(keyboard_buttons) if keyboard_buttons else None

        # Build response text with or without IMDb
        if imdb_info:
            reply_text = format_imdb_caption(
                imdb_info=imdb_info,
                file_name=file_name,
                file_size_str=formatted_size,
                download_url=download_url,
                stream_url=stream_url if is_streamable else "",
                folder_name=current_folder_name,
            )

            # Try to send with poster image if available
            if imdb_info.get("poster"):
                try:
                    await message.reply_photo(
                        photo=imdb_info["poster"],
                        caption=reply_text,
                        reply_markup=reply_markup,
                    )
                    await status_msg.delete()
                    return
                except Exception as e:
                    logger.warning(f"Could not reply with poster photo: {e}")

            # Fallback if no poster or photo send failed
            await safe_edit_text(status_msg, reply_text, reply_markup=reply_markup)

        elif base_url:
            reply_text = (
                f"✅ **File Uploaded Successfully!**\n\n"
                f"📄 **File Name:** `{file_name}`\n"
                f"💾 **File Size:** `{formatted_size}`\n"
                f"📁 **Folder:** `{current_folder_name}`\n\n"
                f"⚡ **Direct Download Link:**\n`{download_url}`\n\n"
            )
            if is_streamable:
                reply_text += f"🎬 **Online Stream Link:**\n`{stream_url}`\n\n"
            reply_text += f"🌐 **Web Drive Folder:**\n`{folder_url}`"

            await safe_edit_text(
                status_msg,
                reply_text,
                reply_markup=reply_markup,
            )
        else:
            # Fallback if WEBSITE_URL is not set in .env
            reply_text = (
                f"✅ **File Uploaded Successfully!**\n\n"
                f"📄 **File Name:** `{file_name}`\n"
                f"💾 **File Size:** `{formatted_size}`\n"
                f"📁 **Folder:** `{current_folder_name}`\n"
                f"📍 **File Path:** `{file_path}`\n\n"
                f"⚠️ *Note: Set `WEBSITE_URL` in your Koyeb environment variables (e.g. `https://your-app.koyeb.app`) to generate clickable direct download and streaming buttons!*"
            )
            await safe_edit_text(status_msg, reply_text)

    except Exception as e:
        logger.error(f"Error handling file upload in bot mode: {e}")
        await safe_edit_text(status_msg, f"❌ **Upload Failed:** `{str(e)}`")

async def start_bot_mode(d, b):
    global DRIVE_DATA, BOT_MODE
    DRIVE_DATA = d
    BOT_MODE = b
    logger.info("Starting Main Bot (Bot Mode)")
    await main_bot.start()
    try:
        await main_bot.send_message(
            config.STORAGE_CHANNEL, "🚀 Main Bot Started -> TG Drive Bot Mode Enabled"
        )
    except Exception as e:
        logger.warning(f"Could not send bot start notification to channel: {e}")
    logger.info("Main Bot Started successfully with instant file link generation.")
