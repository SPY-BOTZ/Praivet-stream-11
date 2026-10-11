import asyncio
from pathlib import Path
from urllib.parse import quote
from pyrogram import Client, filters
from pyrogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton
import config
from utils.logger import Logger
from utils.streamer.file_properties import get_name, get_media_from_message

logger = Logger(__name__)

START_CMD = """🚀 **Welcome to TG Drive's Bot Mode**

You can use this bot to upload files directly to your TG Drive website and instantly get **Direct Download** and **Online Streaming** links!

🗄 **Commands:**
/set_folder - Set the folder where new files will be uploaded
/current_folder - View the current active upload folder
/stats (or /views) - View total member views, stream counts & file analytics
/help - Show this help message

📤 **How to Upload Files:**
Send or forward any file, video, audio, photo, or document to this bot.
The bot will save it to your selected folder and instantly reply with:
• ⚡ **Direct Download Link**
• 🎬 **Online Stream Link** (with built-in web player)
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
    if config.WEBSITE_URL and config.WEBSITE_URL.strip():
        url = config.WEBSITE_URL.strip().rstrip("/")
        if not (url.startswith("http://") or url.startswith("https://")):
            url = f"https://{url}"
        return url
    return ""

@main_bot.on_message(
    filters.command(["start", "help"])
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def start_handler(client: Client, message: Message):
    await message.reply_text(START_CMD, disable_web_page_preview=True)

@main_bot.on_message(
    filters.command("set_folder")
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def set_folder_handler(client: Client, message: Message):
    global SET_FOLDER_PATH_CACHE, DRIVE_DATA
    while True:
        try:
            folder_name = await message.ask(
                "📁 Send the name of the folder where you want to upload files:\n\nSend /cancel to cancel.",
                timeout=60,
                filters=filters.text,
            )
        except asyncio.TimeoutError:
            await message.reply_text("⏱ Request timed out. Use /set_folder to try again.")
            return

        if folder_name.text.lower() == "/cancel":
            await message.reply_text("❌ Action cancelled.")
            return

        folder_name_clean = folder_name.text.strip()
        search_result = DRIVE_DATA.search_file_folder(folder_name_clean)
        
        # Filter folders from search result
        folders = {item.id: item for item in search_result.values() if item.type == "folder"}

        if len(folders) == 0:
            await message.reply_text(f"⚠️ No folder found with name: **{folder_name_clean}**\nPlease try another name or send /cancel.")
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
    await message.reply_text(
        "📂 **Select destination folder:**",
        reply_markup=InlineKeyboardMarkup(buttons),
    )

@main_bot.on_callback_query(
    filters.user(config.TELEGRAM_ADMIN_IDS) & filters.regex(r"set_folder_")
)
async def set_folder_callback(client: Client, callback_query):
    global SET_FOLDER_PATH_CACHE, BOT_MODE
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

@main_bot.on_message(
    filters.command("current_folder")
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def current_folder_handler(client: Client, message: Message):
    global BOT_MODE
    await message.reply_text(
        f"📁 **Current Upload Folder:** `{BOT_MODE.current_folder_name}`\n"
        f"📍 **Internal Path:** `{BOT_MODE.current_folder}`"
    )

@main_bot.on_message(
    filters.command(["stats", "views"])
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def stats_handler(client: Client, message: Message):
    global DRIVE_DATA
    if not DRIVE_DATA:
        await message.reply_text("⚠️ Drive data not loaded yet.")
        return

    analytics = DRIVE_DATA.get_analytics_summary()
    total_files = analytics.get("total_files", 0)
    total_views = analytics.get("total_views", 0)
    total_downloads = analytics.get("total_downloads", 0)
    top_files = analytics.get("top_files", [])
    recent_activity = analytics.get("recent_activity", [])

    text = (
        "📊 **TG Drive File Views & Analytics**\n\n"
        f"📁 **Total Files:** `{total_files}`\n"
        f"👁 **Total Views / Streams:** `{total_views}`\n"
        f"📥 **Total Downloads:** `{total_downloads}`\n\n"
        "🔥 **Top Viewed Files:**\n"
    )

    if top_files:
        for idx, f in enumerate(top_files[:7], start=1):
            text += f"{idx}. **{f['name']}**\n   👁 `{f['views']} views` | 📥 `{f['downloads']} downloads`\n"
    else:
        text += "No files viewed yet.\n"

    if recent_activity:
        text += "\n🕒 **Recent Visitor Activity:**\n"
        for act in recent_activity[:4]:
            t_type = "🎬 Stream" if act.get("type") == "stream" else "📥 Download"
            text += f"• `{act.get('time', '')}` - {t_type} on `{act.get('file_name', '')[:25]}` (IP: `{act.get('ip', 'N/A')}`)\n"

    base_url = get_base_url()
    buttons = []
    if base_url:
        buttons.append([InlineKeyboardButton("🌐 Open Web Drive Analytics", url=f"{base_url}/")])

    reply_markup = InlineKeyboardMarkup(buttons) if buttons else None
    await message.reply_text(text, reply_markup=reply_markup)

# File handler for all Telegram media types
@main_bot.on_message(
    filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS)
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
    and returns Direct Download, Video/Audio Stream, and Drive Web links directly to the user!
    """
    global BOT_MODE, DRIVE_DATA
    status_msg = await message.reply_text("⏳ Processing and indexing your file...")

    try:
        # Copy file to storage channel
        copied_message = await message.copy(config.STORAGE_CHANNEL)
        media = get_media_from_message(copied_message)
        
        if not media:
            await status_msg.edit_text("❌ Could not read media from message.")
            return

        # Safe filename & size extraction
        file_name = get_name(copied_message)
        file_size = getattr(media, "file_size", 0) or 0
        formatted_size = format_bytes(file_size)

        # Store in TG Drive data structure
        new_file_item = DRIVE_DATA.new_file(
            BOT_MODE.current_folder,
            file_name,
            copied_message.id,
            file_size,
        )

        file_id = new_file_item.id if new_file_item else getattr(new_file_item, "id", None)
        raw_folder = BOT_MODE.current_folder.strip("/")
        file_path = "/" + (raw_folder + "/" + file_id if raw_folder else file_id)

        base_url = get_base_url()
        is_streamable = any(file_name.lower().endswith(ext) for ext in [
            ".mp4", ".mkv", ".webm", ".mov", ".avi", ".ts", ".ogv", ".mp3", ".m4a", ".wav", ".ogg", ".flac"
        ])

        if base_url:
            download_url = f"{base_url}/file?path={file_path}"
            stream_url = f"{base_url}/stream?path={file_path}"
            folder_url = f"{base_url}/?path={BOT_MODE.current_folder}"

            keyboard_buttons = [
                [InlineKeyboardButton("📥 Direct Download", url=download_url)]
            ]
            if is_streamable:
                keyboard_buttons.append([InlineKeyboardButton("🎬 Stream Online", url=stream_url)])
            keyboard_buttons.append([InlineKeyboardButton("📂 Open In Web Drive", url=folder_url)])

            reply_text = (
                f"✅ **File Uploaded Successfully!**\n\n"
                f"📄 **File Name:** `{file_name}`\n"
                f"💾 **File Size:** `{formatted_size}`\n"
                f"📁 **Folder:** `{BOT_MODE.current_folder_name}`\n\n"
                f"⚡ **Direct Download Link:**\n`{download_url}`\n\n"
            )
            if is_streamable:
                reply_text += f"🎬 **Online Stream Link:**\n`{stream_url}`\n\n"
            reply_text += f"🌐 **Web Drive Folder:**\n`{folder_url}`"

            await status_msg.edit_text(
                reply_text,
                reply_markup=InlineKeyboardMarkup(keyboard_buttons),
                disable_web_page_preview=True,
            )
        else:
            # Fallback if WEBSITE_URL is not set in .env
            reply_text = (
                f"✅ **File Uploaded Successfully!**\n\n"
                f"📄 **File Name:** `{file_name}`\n"
                f"💾 **File Size:** `{formatted_size}`\n"
                f"📁 **Folder:** `{BOT_MODE.current_folder_name}`\n"
                f"📍 **File Path:** `{file_path}`\n\n"
                f"⚠️ *Note: Set `WEBSITE_URL` in your `.env` file to generate clickable website links directly here!*"
            )
            await status_msg.edit_text(reply_text)

    except Exception as e:
        logger.error(f"Error handling file upload in bot mode: {e}")
        await status_msg.edit_text(f"❌ **Upload Failed:** `{str(e)}`")

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
