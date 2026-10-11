from pyrogram import Client
from pyrogram.types import Message
from pyrogram.file_id import FileId
from typing import Any, Optional, Union
from datetime import datetime

async def parse_file_id(message: "Message") -> Optional[FileId]:
    media = get_media_from_message(message)
    if media and hasattr(media, "file_id"):
        return FileId.decode(media.file_id)
    return None

async def parse_file_unique_id(message: "Message") -> Optional[str]:
    media = get_media_from_message(message)
    if media:
        return getattr(media, "file_unique_id", None)
    return None

async def get_file_ids(client: Client, chat_id, message_id) -> Optional[FileId]:
    message = await client.get_messages(chat_id, int(message_id))
    if not message or message.empty:
        raise Exception("FileNotFound")
    
    media = get_media_from_message(message)
    if not media:
        raise Exception("NoMediaFoundInMessage")
        
    file_unique_id = await parse_file_unique_id(message)
    file_id = await parse_file_id(message)
    if not file_id:
        raise Exception("CouldNotParseFileId")
        
    # Extract file size reliably
    file_size = getattr(media, "file_size", 0)
    if not file_size and hasattr(media, "file_size"):
        file_size = media.file_size or 0

    mime_type = getattr(media, "mime_type", "") or ""
    file_name = get_name(message)

    setattr(file_id, "file_size", file_size)
    setattr(file_id, "mime_type", mime_type)
    setattr(file_id, "file_name", file_name)
    setattr(file_id, "unique_id", file_unique_id)
    return file_id

def get_media_from_message(message: "Message") -> Any:
    media_types = (
        "document",
        "video",
        "audio",
        "photo",
        "sticker",
        "animation",
        "voice",
        "video_note",
    )
    for attr in media_types:
        media = getattr(message, attr, None)
        if media:
            return media
    return None

def get_name(media_msg: Union[Message, FileId]) -> str:
    file_name = ""
    media = None
    media_type = "file"

    if isinstance(media_msg, Message):
        media = get_media_from_message(media_msg)
        if media:
            file_name = getattr(media, "file_name", "") or ""
            if not file_name and hasattr(media_msg, "media") and media_msg.media:
                media_type = str(media_msg.media.value if hasattr(media_msg.media, "value") else media_msg.media).lower()
    elif isinstance(media_msg, FileId):
        file_name = getattr(media_msg, "file_name", "") or ""
        if hasattr(media_msg, "file_type") and media_msg.file_type:
            media_type = media_msg.file_type.name.lower()

    if not file_name:
        formats = {
            "photo": "jpg",
            "audio": "mp3",
            "voice": "ogg",
            "video": "mp4",
            "animation": "mp4",
            "video_note": "mp4",
            "sticker": "webp",
            "document": "bin",
        }
        ext = formats.get(media_type, "bin")
        date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"{media_type}_{date_str}.{ext}"

    return file_name
