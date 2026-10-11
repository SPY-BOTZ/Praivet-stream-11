import asyncio
from collections import deque
from typing import Dict, Union, Optional
from pyrogram import Client, utils, raw
from pyrogram.session import Session, Auth
from pyrogram.errors import AuthBytesInvalid, FloodWait, RPCError, BadRequest
from pyrogram.file_id import FileId, FileType, ThumbnailSource
from .file_properties import get_file_ids
from utils.logger import Logger

logger = Logger(__name__)

# Concurrency & Chunking tuning
CONCURRENT_FETCHES = 3   # Sliding window concurrent chunk fetches
PREFETCH_QUEUE_SIZE = 6  # Buffer size in chunks
MAX_CLIENT_FETCHES = 4   # Max parallel calls per Telegram client

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
        """
        Generates or reuses the media session for the DC containing the media file.
        Safely thread-locked to avoid concurrent session creation collisions.
        """
        async with _get_session_lock(client):
            media_session = client.media_sessions.get(file_id.dc_id, None)
            
            if media_session is not None and getattr(media_session, "is_connected", True):
                return media_session

            # Create new media session
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
                
                # Export and import auth to the target data center
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
                        logger.debug(f"DC {file_id.dc_id} AuthBytesInvalid on attempt {attempt + 1}")
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
            logger.debug(f"Created persistent media session for DC {file_id.dc_id}")
            return media_session

    @staticmethod
    async def get_location(
        file_id: FileId,
    ) -> Union[
        raw.types.InputPhotoFileLocation,
        raw.types.InputDocumentFileLocation,
        raw.types.InputPeerPhotoFileLocation,
    ]:
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

    async def _fetch_chunk(
        self,
        media_session: Session,
        location,
        offset: int,
        chunk_size: int,
        retries: int = 5,
    ) -> bytes:
        """
        Fetches an individual chunk from Telegram MTProto with exponential backoff & FloodWait protection.
        """
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
                logger.warning(f"Telegram FloodWait {wait_time}s at offset {offset} (attempt {attempt}/{retries})")
                await asyncio.sleep(wait_time)
            except (TimeoutError, asyncio.TimeoutError) as err:
                logger.warning(f"Timeout at offset {offset} (attempt {attempt}/{retries}), retrying in {delay}s: {err}")
                await asyncio.sleep(delay)
                delay = min(delay * 2, 8.0)
            except (ConnectionError, ConnectionResetError, OSError) as err:
                logger.warning(f"Connection error at offset {offset} (attempt {attempt}/{retries}): {err}")
                await asyncio.sleep(delay)
                delay = min(delay * 2, 8.0)
            except BadRequest as bad_req:
                # File reference expired or invalid location
                logger.error(f"BadRequest at offset {offset}: {bad_req}")
                raise
            except RPCError as rpc_err:
                logger.warning(f"Telegram RPCError at offset {offset}: {rpc_err}")
                await asyncio.sleep(delay)
                delay = min(delay * 2, 8.0)

        return b""

    async def yield_file(
        self,
        file_id: FileId,
        offset: int,
        first_part_cut: int,
        last_part_cut: int,
        part_count: int,
        chunk_size: int,
        message_id: Optional[int] = None,
    ):
        """
        High-throughput asynchronous generator for streaming media bytes to the HTTP client.
        Uses sliding-window prefetcher so next chunks buffer ahead of time.
        """
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
                    # Prime the sliding window
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
                        # Invalidate stale file reference
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
            self.cached_file_ids.clear()
            logger.debug("Cleaned file properties cache")
