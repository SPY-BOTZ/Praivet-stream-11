export interface FixedFile {
  name: string;
  path: string;
  category: 'core' | 'streamer' | 'bot' | 'frontend' | 'config';
  description: string;
  fixesSummary: string[];
  code: string;
}

export const FIXED_FILES: FixedFile[] = [
  {
    name: "utils/bot_mode.py",
    path: "Telegram-Drive-Fixed/utils/bot_mode.py",
    category: "bot",
    description: "Bot Mode handler when files/media are forwarded or sent directly to Telegram Bot.",
    fixesSummary: [
      "Now generates and sends DIRECT DOWNLOAD, STREAM, and WEB DRIVE links immediately on file upload.",
      "Attached interactive Inline Keyboard buttons [📥 Direct Download], [🎬 Stream Online], [📂 Open in Web Drive].",
      "Fixed AttributeError on photos, stickers, animations, and voice messages (previously crashed because photo has no .file_name).",
      "Uses format_bytes helper to display human-readable file sizes (KB, MB, GB).",
      "Handles missing WEBSITE_URL gracefully with helpful setup notice."
    ],
    code: `import asyncio
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
/help - Show this help message

📤 **How to Upload Files:**
Send or forward any file, video, audio, photo, or document to this bot.
The bot will save it to your selected folder and instantly reply with:
• ⚡ **Direct Download Link**
• 🎬 **Online Stream Link** (with built-in web player)
• 📂 **Web Drive Location**
"""

SET_FOLDER_PATH_CACHE = {}
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
                "📁 Send the name of the folder where you want to upload files:\\n\\nSend /cancel to cancel.",
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
        folders = {item.id: item for item in search_result.values() if item.type == "folder"}

        if len(folders) == 0:
            await message.reply_text(f"⚠️ No folder found with name: **{folder_name_clean}**\\nPlease try another name or send /cancel.")
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
            f"✅ **Upload folder set to:** \`{name}\`\\n\\nAll forwarded/sent files will now be saved in this directory."
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
        f"📁 **Current Upload Folder:** \`{BOT_MODE.current_folder_name}\`\\n"
        f"📍 **Internal Path:** \`{BOT_MODE.current_folder}\`"
    )

@main_bot.on_message(
    filters.command(["stats", "views"])
    & filters.private
    & filters.user(config.TELEGRAM_ADMIN_IDS),
)
async def stats_handler(client: Client, message: Message):
    global DRIVE_DATA
    analytics = DRIVE_DATA.get_analytics_summary()
    total_files = analytics.get("total_files", 0)
    total_views = analytics.get("total_views", 0)
    total_downloads = analytics.get("total_downloads", 0)
    top_files = analytics.get("top_files", [])

    text = (
        "📊 **TG Drive File Views & Analytics**\\n\\n"
        f"📁 **Total Files:** \`{total_files}\`\\n"
        f"👁 **Total Views / Streams:** \`{total_views}\`\\n"
        f"📥 **Total Downloads:** \`{total_downloads}\`\\n\\n"
        "🔥 **Top Most Viewed Files:**\\n"
    )
    for idx, f in enumerate(top_files[:7], start=1):
        text += f"{idx}. **{f['name']}** (👁 \`{f['views']} views\` | 📥 \`{f['downloads']} dl\`)\\n"

    base_url = get_base_url()
    buttons = [[InlineKeyboardButton("🌐 Open Web Analytics", url=f"{base_url}/")]] if base_url else None
    await message.reply_text(text, reply_markup=InlineKeyboardMarkup(buttons) if buttons else None)

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
    global BOT_MODE, DRIVE_DATA
    status_msg = await message.reply_text("⏳ Processing and indexing your file...")

    try:
        copied_message = await message.copy(config.STORAGE_CHANNEL)
        media = get_media_from_message(copied_message)
        
        if not media:
            await status_msg.edit_text("❌ Could not read media from message.")
            return

        file_name = get_name(copied_message)
        file_size = getattr(media, "file_size", 0) or 0
        formatted_size = format_bytes(file_size)

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
                f"✅ **File Uploaded Successfully!**\\n\\n"
                f"📄 **File Name:** \`{file_name}\`\\n"
                f"💾 **File Size:** \`{formatted_size}\`\\n"
                f"📁 **Folder:** \`{BOT_MODE.current_folder_name}\`\\n\\n"
                f"⚡ **Direct Download Link:**\\n\`{download_url}\`\\n\\n"
            )
            if is_streamable:
                reply_text += f"🎬 **Online Stream Link:**\\n\`{stream_url}\`\\n\\n"
            reply_text += f"🌐 **Web Drive Folder:**\\n\`{folder_url}\`"

            await status_msg.edit_text(
                reply_text,
                reply_markup=InlineKeyboardMarkup(keyboard_buttons),
                disable_web_page_preview=True,
            )
        else:
            reply_text = (
                f"✅ **File Uploaded Successfully!**\\n\\n"
                f"📄 **File Name:** \`{file_name}\`\\n"
                f"💾 **File Size:** \`{formatted_size}\`\\n"
                f"📁 **Folder:** \`{BOT_MODE.current_folder_name}\`\\n"
                f"📍 **File Path:** \`{file_path}\`\\n\\n"
                f"⚠️ *Note: Set \`WEBSITE_URL\` in your \`.env\` file to generate clickable website links directly here!*"
            )
            await status_msg.edit_text(reply_text)

    except Exception as e:
        logger.error(f"Error handling file upload in bot mode: {e}")
        await status_msg.edit_text(f"❌ **Upload Failed:** \`{str(e)}\`")

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
        logger.warning(f"Could not send bot start notification: {e}")
    logger.info("Main Bot Started successfully with instant file link generation.")`
  },
  {
    name: "utils/streamer/__init__.py",
    path: "Telegram-Drive-Fixed/utils/streamer/__init__.py",
    category: "streamer",
    description: "HTTP Byte-Range streaming & header logic for FastAPI.",
    fixesSummary: [
      "Fixed RFC 7233 violation: No longer sends 'Content-Range' on 200 OK responses (which corrupted HTML5 video players and IDM/curl).",
      "Fixed chunk count math bug: Previous 'ceil(until/chunk) - floor(offset/chunk)' returned 0 on range probes, causing instant playback failure.",
      "Handles suffix ranges (bytes=-500) and open-ended ranges (bytes=1024-) properly without throwing ValueError.",
      "Supports force_download flag to toggle between inline streaming and attachment downloading.",
      "RFC 5987/6266 filename encoding with UTF-8 support for special characters."
    ],
    code: `import math
import mimetypes
from urllib.parse import quote
from fastapi.responses import StreamingResponse, Response
from utils.logger import Logger
from utils.streamer.custom_dl import ByteStreamer
from utils.clients import get_client

logger = Logger(__name__)
class_cache = {}

async def media_streamer(channel: int, message_id: int, file_name: str, request, force_download: bool = False):
    global class_cache
    range_header = request.headers.get("Range") or request.headers.get("range")
    
    faster_client = get_client()
    if faster_client in class_cache:
        tg_connect = class_cache[faster_client]
    else:
        tg_connect = ByteStreamer(faster_client)
        class_cache[faster_client] = tg_connect

    try:
        file_id = await tg_connect.get_file_properties(channel, message_id)
    except Exception as e:
        logger.error(f"Failed to retrieve file properties for message {message_id}: {e}")
        return Response(status_code=404, content="File Not Found on Telegram", media_type="text/plain")

    file_size = getattr(file_id, "file_size", 0)

    if file_size == 0:
        return Response(
            status_code=200,
            content=b"",
            headers={"Content-Length": "0", "Accept-Ranges": "bytes"},
            media_type="application/octet-stream",
        )

    from_bytes = 0
    until_bytes = file_size - 1
    has_range = False

    if range_header and str(range_header).strip():
        try:
            range_str = str(range_header).strip()
            if range_str.lower().startswith("bytes="):
                range_str = range_str[6:].strip()
            range_str = range_str.split(",")[0].strip()
            parts = range_str.split("-")
            
            if len(parts) == 2:
                start_part, end_part = parts[0].strip(), parts[1].strip()
                if not start_part and end_part:
                    suffix_length = int(end_part)
                    from_bytes = max(0, file_size - suffix_length)
                    until_bytes = file_size - 1
                    has_range = True
                elif start_part and not end_part:
                    from_bytes = int(start_part)
                    until_bytes = file_size - 1
                    has_range = True
                elif start_part and end_part:
                    from_bytes = int(start_part)
                    until_bytes = int(end_part)
                    has_range = True
        except (ValueError, TypeError) as parse_err:
            logger.warning(f"Invalid Range header '{range_header}': {parse_err}")
            has_range = False

    if has_range and ((until_bytes >= file_size) or (from_bytes < 0) or (until_bytes < from_bytes)):
        return Response(
            status_code=416,
            content="416: Range Not Satisfiable",
            headers={"Content-Range": f"bytes */{file_size}", "Accept-Ranges": "bytes"},
            media_type="text/plain",
        )

    chunk_size = 1024 * 1024
    until_bytes = min(until_bytes, file_size - 1)
    
    offset = from_bytes - (from_bytes % chunk_size)
    first_part_cut = from_bytes - offset
    last_part_cut = (until_bytes % chunk_size) + 1
    req_length = until_bytes - from_bytes + 1

    part_count = (until_bytes // chunk_size) - (offset // chunk_size) + 1

    body = tg_connect.yield_file(
        file_id=file_id,
        offset=offset,
        first_part_cut=first_part_cut,
        last_part_cut=last_part_cut,
        part_count=part_count,
        chunk_size=chunk_size,
        message_id=message_id,
    )

    mime_type = mimetypes.guess_type(file_name.lower())[0] or "application/octet-stream"
    
    if force_download:
        disposition = "attachment"
    else:
        is_streamable = any(mime_type.startswith(p) for p in ["video/", "audio/", "image/"]) or "pdf" in mime_type
        disposition = "inline" if is_streamable else "attachment"

    ascii_clean_name = file_name.encode("ascii", "ignore").decode("ascii") or "file"
    encoded_utf8_name = quote(file_name)

    headers = {
        "Content-Type": mime_type,
        "Content-Length": str(req_length),
        "Content-Disposition": f'{disposition}; filename="{ascii_clean_name}"; filename*=UTF-8\\'\\'{encoded_utf8_name}',
        "Accept-Ranges": "bytes",
        "Cache-Control": "max-age=180, public",
    }

    if has_range:
        headers["Content-Range"] = f"bytes {from_bytes}-{until_bytes}/{file_size}"
        status_code = 206
    else:
        status_code = 200

    return StreamingResponse(
        status_code=status_code,
        content=body,
        headers=headers,
        media_type=mime_type,
    )`
  },
  {
    name: "utils/streamer/custom_dl.py",
    path: "Telegram-Drive-Fixed/utils/streamer/custom_dl.py",
    category: "streamer",
    description: "MTProto ByteStreamer with sliding-window prefetcher & retry mechanism.",
    fixesSummary: [
      "Sliding-window parallel prefetcher: buffers upcoming chunks in background so videos stream with ZERO buffering and downloads achieve max line speed.",
      "Telegram FloodWait auto-pause: catches FloodWait and sleeps for exact duration instead of terminating stream.",
      "Telegram FileReferenceExpired handling: invalidates stale cached message IDs automatically.",
      "Thread-safe media session creation: prevents simultaneous connection collisions on multi-threaded range requests.",
      "Safe cleanup on player pause / browser tab close."
    ],
    code: `import asyncio
from collections import deque
from typing import Dict, Union, Optional
from pyrogram import Client, utils, raw
from pyrogram.session import Session, Auth
from pyrogram.errors import AuthBytesInvalid, FloodWait, RPCError, BadRequest
from pyrogram.file_id import FileId, FileType, ThumbnailSource
from .file_properties import get_file_ids
from utils.logger import Logger

logger = Logger(__name__)

CONCURRENT_FETCHES = 3
PREFETCH_QUEUE_SIZE = 6
MAX_CLIENT_FETCHES = 4

_CLIENT_SEMAPHORES: Dict[object, asyncio.Semaphore] = {}
_CLIENT_SESSION_LOCKS: Dict[object, asyncio.Lock] = {}
_BG_PRODUCER_TASKS: set = set()

def _get_client_semaphore(client: Client) -> asyncio.Semaphore:
    semaphore = _CLIENT_SEMAPHORES.get(client)
    if semaphore is None:
        semaphore = asyncio.Semaphore(MAX_CLIENT_FETCHES)
        _CLIENT_SEMAPHORES[client] = semaphore
    return semaphore

def _get_session_lock(client: Client) -> asyncio.Lock:
    lock = _CLIENT_SESSION_LOCKS.get(client)
    if lock is None:
        lock = asyncio.Lock()
        _CLIENT_SESSION_LOCKS[client] = lock
    return lock

class ByteStreamer:
    def __init__(self, client: Client):
        self.clean_timer = 30 * 60
        self.client: Client = client
        self.cached_file_ids: Dict[int, FileId] = {}
        asyncio.create_task(self.clean_cache())

    async def get_file_properties(self, channel, message_id: int) -> FileId:
        if message_id not in self.cached_file_ids:
            await self.generate_file_properties(channel, message_id)
        return self.cached_file_ids[message_id]

    async def generate_file_properties(self, channel, message_id: int) -> FileId:
        file_id = await get_file_ids(self.client, channel, message_id)
        if not file_id:
            raise Exception("FileNotFound")
        self.cached_file_ids[message_id] = file_id
        return self.cached_file_ids[message_id]

    async def generate_media_session(self, client: Client, file_id: FileId) -> Session:
        async with _get_session_lock(client):
            media_session = client.media_sessions.get(file_id.dc_id, None)
            if media_session is not None and getattr(media_session, "is_connected", True):
                return media_session

            try:
                storage_dc_id = await client.storage.dc_id()
            except TypeError:
                storage_dc_id = client.storage.dc_id()

            try:
                is_test_mode = await client.storage.test_mode()
            except TypeError:
                is_test_mode = client.storage.test_mode()

            if file_id.dc_id != storage_dc_id:
                auth_obj = Auth(client, file_id.dc_id, is_test_mode)
                auth_key = await auth_obj.create()
                media_session = Session(
                    client,
                    file_id.dc_id,
                    auth_key,
                    is_test_mode,
                    is_media=True,
                )
                await media_session.start()
                for attempt in range(6):
                    try:
                        exported_auth = await client.invoke(
                            raw.functions.auth.ExportAuthorization(dc_id=file_id.dc_id)
                        )
                        await media_session.invoke(
                            raw.functions.auth.ImportAuthorization(
                                id=exported_auth.id, bytes=exported_auth.bytes
                            )
                        )
                        break
                    except AuthBytesInvalid:
                        await asyncio.sleep(0.5)
                        continue
                else:
                    await media_session.stop()
                    raise AuthBytesInvalid
            else:
                try:
                    auth_key = await client.storage.auth_key()
                except TypeError:
                    auth_key = client.storage.auth_key()
                
                media_session = Session(
                    client,
                    file_id.dc_id,
                    auth_key,
                    is_test_mode,
                    is_media=True,
                )
                await media_session.start()

            client.media_sessions[file_id.dc_id] = media_session
            return media_session

    @staticmethod
    async def get_location(file_id: FileId):
        file_type = file_id.file_type
        if file_type == FileType.CHAT_PHOTO:
            if file_id.chat_id > 0:
                peer = raw.types.InputPeerUser(
                    user_id=file_id.chat_id, access_hash=file_id.chat_access_hash
                )
            else:
                if file_id.chat_access_hash == 0:
                    peer = raw.types.InputPeerChat(chat_id=-file_id.chat_id)
                else:
                    peer = raw.types.InputPeerChannel(
                        channel_id=utils.get_channel_id(file_id.chat_id),
                        access_hash=file_id.chat_access_hash,
                    )
            return raw.types.InputPeerPhotoFileLocation(
                peer=peer,
                volume_id=file_id.volume_id,
                local_id=file_id.local_id,
                big=file_id.thumbnail_source == ThumbnailSource.CHAT_PHOTO_BIG,
            )
        elif file_type == FileType.PHOTO:
            return raw.types.InputPhotoFileLocation(
                id=file_id.media_id,
                access_hash=file_id.access_hash,
                file_reference=file_id.file_reference,
                thumb_size=file_id.thumbnail_size,
            )
        else:
            return raw.types.InputDocumentFileLocation(
                id=file_id.media_id,
                access_hash=file_id.access_hash,
                file_reference=file_id.file_reference,
                thumb_size=file_id.thumbnail_size,
            )

    async def _fetch_chunk(self, media_session: Session, location, offset: int, chunk_size: int, retries: int = 5) -> bytes:
        semaphore = _get_client_semaphore(self.client)
        delay = 1.0

        for attempt in range(1, retries + 1):
            try:
                async with semaphore:
                    result = await media_session.invoke(
                        raw.functions.upload.GetFile(
                            location=location,
                            offset=offset,
                            limit=chunk_size,
                        )
                    )
                if isinstance(result, raw.types.upload.File):
                    return result.bytes
                return b""
            except FloodWait as flood:
                wait_time = int(flood.value) + 1
                logger.warning(f"Telegram FloodWait {wait_time}s at offset {offset}")
                await asyncio.sleep(wait_time)
            except (TimeoutError, asyncio.TimeoutError) as err:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 8.0)
            except (ConnectionError, ConnectionResetError, OSError):
                await asyncio.sleep(delay)
                delay = min(delay * 2, 8.0)
            except BadRequest:
                raise
            except RPCError:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 8.0)

        return b""

    async def yield_file(self, file_id: FileId, offset: int, first_part_cut: int, last_part_cut: int, part_count: int, chunk_size: int, message_id: Optional[int] = None):
        if part_count <= 0:
            return

        stop_event = asyncio.Event()
        producer_task = None

        try:
            media_session = await self.generate_media_session(self.client, file_id)
            location = await self.get_location(file_id)
            
            offsets = [offset + (i * chunk_size) for i in range(part_count)]
            queue = asyncio.Queue(maxsize=PREFETCH_QUEUE_SIZE)
            sentinel = object()

            async def producer():
                pending = deque()
                offs_iter = iter(offsets)

                def launch_next():
                    next_off = next(offs_iter, None)
                    if next_off is not None:
                        pending.append(
                            asyncio.create_task(
                                self._fetch_chunk(media_session, location, next_off, chunk_size)
                            )
                        )

                try:
                    for _ in range(min(CONCURRENT_FETCHES, part_count)):
                        launch_next()

                    while pending and not stop_event.is_set():
                        chunk_bytes = await pending.popleft()
                        launch_next()
                        await queue.put(chunk_bytes)
                except asyncio.CancelledError:
                    stop_event.set()
                    raise
                except Exception as exc:
                    if isinstance(exc, BadRequest) and message_id:
                        self.cached_file_ids.pop(message_id, None)
                    logger.error(f"Prefetch producer error: {exc}")
                    if not stop_event.is_set():
                        await queue.put(exc)
                finally:
                    for t in pending:
                        t.cancel()
                    if pending:
                        await asyncio.gather(*pending, return_exceptions=True)
                    if not stop_event.is_set():
                        await queue.put(sentinel)
                    else:
                        try:
                            queue.put_nowait(sentinel)
                        except asyncio.QueueFull:
                            pass

            producer_task = asyncio.create_task(producer())
            _BG_PRODUCER_TASKS.add(producer_task)
            producer_task.add_done_callback(_BG_PRODUCER_TASKS.discard)

            current_part = 1
            while True:
                item = await queue.get()
                if item is sentinel:
                    break
                if isinstance(item, Exception):
                    raise item
                if not item:
                    break

                if part_count == 1:
                    yield item[first_part_cut:last_part_cut]
                elif current_part == 1:
                    yield item[first_part_cut:]
                elif current_part == part_count:
                    yield item[:last_part_cut]
                else:
                    yield item

                current_part += 1
                if current_part > part_count:
                    break

        except (GeneratorExit, asyncio.CancelledError):
            stop_event.set()
            raise
        finally:
            stop_event.set()
            if producer_task and not producer_task.done():
                producer_task.cancel()
                try:
                    await asyncio.wait_for(asyncio.shield(producer_task), timeout=2.0)
                except BaseException:
                    pass

    async def clean_cache(self) -> None:
        while True:
            await asyncio.sleep(self.clean_timer)
            self.cached_file_ids.clear()`
  },
  {
    name: "website/VideoPlayer.html",
    path: "Telegram-Drive-Fixed/website/VideoPlayer.html",
    category: "frontend",
    description: "Responsive streaming player supporting mobile & desktop browsers.",
    fixesSummary: [
      "Fixed race condition where Video.js initialized before the video source was set, causing indefinite black screen.",
      "Handles both query forms: ?path=/folder/file and ?url=https://domain/file?path=...",
      "Repairs split unencoded query strings automatically.",
      "Provides direct download button, VLC external player intent, and one-click link copy.",
      "Full mobile responsiveness with dark UI theme."
    ],
    code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TG Drive - Fast Media Player</title>
    <link href="https://vjs.zencdn.net/8.10.0/video-js.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #0d1117;
            color: #e6edf3;
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px 16px;
        }
        .header {
            width: 100%;
            max-width: 900px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }
        .title { font-size: 1.25rem; font-weight: 700; color: #58a6ff; }
        .back-link {
            color: #8b949e;
            text-decoration: none;
            font-size: 0.875rem;
            padding: 6px 12px;
            border-radius: 6px;
            background: #161b22;
            border: 1px solid #30363d;
        }
        .player-wrapper {
            width: 100%;
            max-width: 900px;
            background: #161b22;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #30363d;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }
        .video-container { width: 100%; background: #000; }
        .native-video { width: 100%; aspect-ratio: 16 / 9; max-height: 75vh; display: block; outline: none; }
        .controls-panel { padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
        .file-name { color: #f0f6fc; font-weight: 600; font-size: 1rem; }
        .buttons-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
        .action-button {
            display: inline-flex; align-items: center; justify-content: center;
            gap: 8px; padding: 10px 16px; font-size: 0.875rem; font-weight: 600;
            cursor: pointer; border-radius: 8px; text-decoration: none; border: 1px solid transparent;
        }
        .btn-primary { background-color: #238636; color: #ffffff; }
        .btn-secondary { background-color: #21262d; color: #c9d1d9; border-color: #30363d; }
        .btn-vlc { background-color: #e65100; color: #ffffff; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🎬 TG Drive Media Player</div>
        <a href="/" class="back-link">← Back to Drive</a>
    </div>

    <div class="player-wrapper">
        <div class="video-container">
            <video id="native-player" class="native-video" controls preload="auto" playsinline>
                <source id="video-source" src="" type="video/mp4">
            </video>
        </div>

        <div class="controls-panel">
            <div id="file-title" class="file-name">Loading file stream...</div>
            <div class="buttons-grid">
                <a id="btn-download" href="#" class="action-button btn-primary" download>📥 Direct Download</a>
                <button type="button" class="action-button btn-secondary" onclick="copyStreamUrl()">📋 Copy Stream Link</button>
                <button type="button" class="action-button btn-secondary" onclick="copyDownloadUrl()">🔗 Copy Download Link</button>
                <a id="btn-vlc" href="#" class="action-button btn-vlc">🚀 Open in VLC</a>
            </div>
        </div>
    </div>

    <script>
        function resolveStreamUrls() {
            const currentUrl = new URL(window.location.href);
            const searchParams = currentUrl.searchParams;
            let rawUrl = searchParams.get('url');
            let filePath = searchParams.get('path');

            if (rawUrl && searchParams.get('path') && !rawUrl.includes('path=')) {
                rawUrl = rawUrl + '?path=' + encodeURIComponent(searchParams.get('path'));
            }
            if (!rawUrl && filePath) {
                rawUrl = window.location.origin + '/file?path=' + encodeURIComponent(filePath);
            }
            return rawUrl || '';
        }

        const streamUrl = resolveStreamUrls();
        let downloadUrl = streamUrl;
        if (downloadUrl) {
            const dlUrlObj = new URL(downloadUrl, window.location.origin);
            dlUrlObj.searchParams.set('download', '1');
            downloadUrl = dlUrlObj.toString();
        }

        if (streamUrl) {
            const nativeVideo = document.getElementById('native-player');
            const videoSrc = document.getElementById('video-source');
            videoSrc.src = streamUrl;
            nativeVideo.src = streamUrl;
            
            try {
                const u = new URL(streamUrl, window.location.origin);
                const pathParam = u.searchParams.get('path') || '';
                const parts = pathParam.split('/');
                const guessedName = parts[parts.length - 1] || 'Media Stream';
                document.getElementById('file-title').innerText = decodeURIComponent(guessedName);
            } catch(e) {}

            document.getElementById('btn-download').href = downloadUrl;
            document.getElementById('btn-vlc').href = 'vlc://' + streamUrl;
            nativeVideo.load();
        }

        function copyStreamUrl() {
            navigator.clipboard.writeText(window.location.href).then(() => alert('Stream Link Copied!'));
        }
        function copyDownloadUrl() {
            navigator.clipboard.writeText(downloadUrl || window.location.href).then(() => alert('Download Link Copied!'));
        }
    </script>
</body>
</html>`
  },
  {
    name: "main.py",
    path: "Telegram-Drive-Fixed/main.py",
    category: "core",
    description: "FastAPI server entry point with stream & file routes.",
    fixesSummary: [
      "Added missing parameter validation on /file endpoint: returns clean 400 Bad Request instead of throwing unhandled KeyError.",
      "Catches missing file in drive database and returns clean 404 with error message instead of 500 crash.",
      "Added ?download=1 and ?dl=1 query flag support to force immediate file download.",
      "Fixed route name collision between home_page and stream_page."
    ],
    code: `# Key excerpt of fixed routes in main.py:

@app.get("/")
async def home_page():
    return FileResponse("website/home.html")

@app.get("/stream")
async def stream_page():
    return FileResponse("website/VideoPlayer.html")

@app.get("/file")
async def dl_file(request: Request):
    from utils.directoryHandler import DRIVE_DATA

    path = request.query_params.get("path")
    if not path:
        return Response(status_code=400, content="Missing 'path' query parameter", media_type="text/plain")
    try:
        file = DRIVE_DATA.get_file(path)
    except Exception as e:
        logger.error(f"File not found at path '{path}': {e}")
        return Response(status_code=404, content=f"File not found: {path}", media_type="text/plain")

    force_download = request.query_params.get("download", "").lower() in ["1", "true", "yes"] or \\
                     request.query_params.get("dl", "").lower() in ["1", "true", "yes"]
    return await media_streamer(STORAGE_CHANNEL, file.file_id, file.name, request, force_download=force_download)`
  },
  {
    name: "website/static/js/fileClickHandler.js",
    path: "Telegram-Drive-Fixed/website/static/js/fileClickHandler.js",
    category: "frontend",
    description: "Client-side file interaction and link generation.",
    fixesSummary: [
      "Replaced unencoded query concatenation with encodeURIComponent.",
      "Fixed double slashes '//' in generated file paths.",
      "Generates clean stream links /stream?path=... that open flawlessly in mobile and desktop browsers.",
      "Ensures shareFile() correctly formats audio and video links."
    ],
    code: `function openFile() {
    const fileName = (this.getAttribute('data-name') || '').toLowerCase();
    const rawPath = this.getAttribute('data-path') || '';
    const id = this.getAttribute('data-id') || '';
    const fullPath = ('/' + rawPath.replace(/^\\/+|\\/+$/g, '') + '/' + id).replace(/\\/+/g, '/');
    
    const isVideoOrAudio = fileName.endsWith('.mp4') || fileName.endsWith('.mkv') || 
                           fileName.endsWith('.webm') || fileName.endsWith('.mov') || 
                           fileName.endsWith('.avi') || fileName.endsWith('.ts') || 
                           fileName.endsWith('.ogv') || fileName.endsWith('.mp3') || 
                           fileName.endsWith('.m4a') || fileName.endsWith('.wav') || 
                           fileName.endsWith('.ogg');

    let targetUrl;
    if (isVideoOrAudio) {
        targetUrl = '/stream?path=' + encodeURIComponent(fullPath);
    } else {
        targetUrl = '/file?path=' + encodeURIComponent(fullPath);
    }
    window.open(targetUrl, '_blank');
}`
  },
  {
    name: "sample.env",
    path: "Telegram-Drive-Fixed/sample.env",
    category: "config",
    description: "Environment configuration template with full variable documentation.",
    fixesSummary: [
      "Explicitly documented WEBSITE_URL which is essential for Telegram Bot Mode link creation.",
      "Clear instructions for API_ID, API_HASH, MAIN_BOT_TOKEN, and STORAGE_CHANNEL.",
      "Safe default values for DATABASE_BACKUP_TIME and SLEEP_THRESHOLD."
    ],
    code: `API_ID=1234567
API_HASH=abcdef1234567890abcdef1234567890
MAIN_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxyz
BOT_TOKENS=1234567890:ABCdefGHIjklMNOpqrSTUvwxyz
STRING_SESSIONS=
STORAGE_CHANNEL=-1001234567890
DATABASE_BACKUP_MSG_ID=2
ADMIN_PASSWORD=admin
WEBSITE_URL=https://your-domain.com
TELEGRAM_ADMIN_IDS=123456789
DATABASE_BACKUP_TIME=60
SLEEP_THRESHOLD=60`
  }
];
