import math
import mimetypes
from urllib.parse import quote
from fastapi.responses import StreamingResponse, Response
from utils.logger import Logger
from utils.streamer.custom_dl import ByteStreamer
from utils.clients import get_client

logger = Logger(__name__)
class_cache = {}

async def media_streamer(channel: int, message_id: int, file_name: str, request, force_download: bool = False):
    """
    High-performance, RFC 7233 compliant media streaming and chunked download handler.
    Fixes:
    - 416 Range Not Satisfiable errors on empty or probe ranges.
    - Eliminates invalid Content-Range header on 200 OK responses (which crashes HTML5 video players and download managers).
    - Fixes math chunk boundary calculation bug where part_count evaluated to 0.
    - Handles suffix byte ranges (bytes=-500) and open-ended ranges (bytes=1024-).
    - Robust character encoding for filenames in Content-Disposition.
    """
    global class_cache
    
    # Get Range header case-insensitively
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

    # Handle 0-byte files gracefully
    if file_size == 0:
        return Response(
            status_code=200,
            content=b"",
            headers={
                "Content-Length": "0",
                "Accept-Ranges": "bytes",
            },
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
            # If comma-separated multiple ranges, take the first range
            range_str = range_str.split(",")[0].strip()
            parts = range_str.split("-")
            
            if len(parts) == 2:
                start_part, end_part = parts[0].strip(), parts[1].strip()
                if not start_part and end_part:
                    # Suffix range: e.g. bytes=-500 (fetch last 500 bytes)
                    suffix_length = int(end_part)
                    from_bytes = max(0, file_size - suffix_length)
                    until_bytes = file_size - 1
                    has_range = True
                elif start_part and not end_part:
                    # Prefix range: e.g. bytes=500- (from byte 500 to end)
                    from_bytes = int(start_part)
                    until_bytes = file_size - 1
                    has_range = True
                elif start_part and end_part:
                    # Explicit range: e.g. bytes=0-1000
                    from_bytes = int(start_part)
                    until_bytes = int(end_part)
                    has_range = True
        except (ValueError, TypeError) as parse_err:
            logger.warning(f"Invalid Range header '{range_header}': {parse_err}. Serving full file.")
            has_range = False

    # Validate range boundaries
    if has_range and ((until_bytes >= file_size) or (from_bytes < 0) or (until_bytes < from_bytes)):
        return Response(
            status_code=416,
            content="416: Range Not Satisfiable",
            headers={
                "Content-Range": f"bytes */{file_size}",
                "Accept-Ranges": "bytes",
            },
            media_type="text/plain",
        )

    chunk_size = 1024 * 1024  # 1 MiB chunk (divisible by Telegram's 4096-byte boundary)
    until_bytes = min(until_bytes, file_size - 1)
    
    offset = from_bytes - (from_bytes % chunk_size)
    first_part_cut = from_bytes - offset
    last_part_cut = (until_bytes % chunk_size) + 1
    req_length = until_bytes - from_bytes + 1

    # Exact part count calculation (handles boundary condition when until_bytes is divisible by chunk_size)
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
        # Streamable types inline, everything else attachment
        is_streamable = any(mime_type.startswith(p) for p in ["video/", "audio/", "image/"]) or "pdf" in mime_type
        disposition = "inline" if is_streamable else "attachment"

    ascii_clean_name = file_name.encode("ascii", "ignore").decode("ascii") or "file"
    encoded_utf8_name = quote(file_name)

    headers = {
        "Content-Type": mime_type,
        "Content-Length": str(req_length),
        "Content-Disposition": f'{disposition}; filename="{ascii_clean_name}"; filename*=UTF-8\'\'{encoded_utf8_name}',
        "Accept-Ranges": "bytes",
        "Cache-Control": "max-age=180, public",
    }

    # RFC compliant: ONLY send Content-Range on 206 Partial Content
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
    )
