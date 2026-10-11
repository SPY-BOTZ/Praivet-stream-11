from pathlib import Path
import sys
import config, dill
from pyrogram.types import InputMediaDocument, Message
import os, random, string, asyncio
from utils.logger import Logger
from datetime import datetime, timezone
import os
import signal

logger = Logger(__name__)

cache_dir = Path("./cache")
cache_dir.mkdir(parents=True, exist_ok=True)
drive_cache_path = cache_dir / "drive.data"


def getRandomID():
    global DRIVE_DATA
    while True:
        id = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not DRIVE_DATA:
            return id
        if id not in DRIVE_DATA.used_ids:
            DRIVE_DATA.used_ids.append(id)
            return id


def get_current_utc_time():
    return datetime.now(timezone.utc).strftime("Date - %Y-%m-%d | Time - %H:%M:%S")


class Folder:
    def __init__(self, name: str, path: str) -> None:
        self.name = name
        self.contents = {}
        if name == "/":
            self.id = "root"
        else:
            self.id = getRandomID()
        self.type = "folder"
        self.trash = False
        self.path = ("/" + path.strip("/") + "/").replace("//", "/")
        self.upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.auth_hashes = []


class File:
    def __init__(
        self,
        name: str,
        file_id: int,
        size: int,
        path: str,
    ) -> None:
        self.name = name
        self.file_id = file_id
        self.id = getRandomID()
        self.size = size
        self.type = "file"
        self.trash = False
        self.path = path[:-1] if path[-1] == "/" else path
        self.upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.views_count = 0
        self.downloads_count = 0
        self.last_viewed = None
        self.view_logs = []

    def record_access(self, client_ip: str = "Unknown", user_agent: str = "Unknown", is_download: bool = False):
        self.views_count = getattr(self, "views_count", 0) + 1
        if is_download:
            self.downloads_count = getattr(self, "downloads_count", 0) + 1
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.last_viewed = now_str
        logs = getattr(self, "view_logs", None)
        if logs is None:
            logs = []
            self.view_logs = logs
        logs.append({
            "timestamp": now_str,
            "ip": client_ip,
            "agent": user_agent[:70] if user_agent else "Browser",
            "type": "download" if is_download else "stream",
        })
        if len(logs) > 30:
            del logs[0]


class NewDriveData:
    def __init__(self, contents: dict, used_ids: list) -> None:
        self.contents = contents
        self.used_ids = used_ids
        self.isUpdated = False

    def save(self) -> None:
        with open(drive_cache_path, "wb") as f:
            dill.dump(self, f)
        self.isUpdated = True
        logger.info("Drive data saved successfully.")

    def new_folder(self, path: str, name: str) -> None:
        logger.info(f"Creating new folder '{name}' in path '{path}'.")

        folder = Folder(name, path)
        if path == "/":
            directory_folder: Folder = self.contents[path]
            directory_folder.contents[folder.id] = folder
        else:
            paths = path.strip("/").split("/")
            directory_folder: Folder = self.contents["/"]
            for path in paths:
                directory_folder = directory_folder.contents[path]
            directory_folder.contents[folder.id] = folder

        self.save()
        return folder.path + folder.id

    def new_file(self, path: str, name: str, file_id: int, size: int) -> None:
        logger.info(f"Creating new file '{name}' in path '{path}'.")

        file = File(name, file_id, size, path)
        if path == "/":
            directory_folder: Folder = self.contents[path]
            directory_folder.contents[file.id] = file
        else:
            paths = path.strip("/").split("/")
            directory_folder: Folder = self.contents["/"]
            for path in paths:
                directory_folder = directory_folder.contents[path]
            directory_folder.contents[file.id] = file

        self.save()
        return file

    def get_directory(
        self, path: str, is_admin: bool = True, auth: str = None
    ) -> Folder:
        folder_data: Folder = self.contents["/"]
        auth_success = False
        auth_home_path = None

        if path != "/":
            path = path.strip("/")

            if "/" in path:
                path = path.split("/")
            else:
                path = [path]

            for folder in path:
                folder_data = folder_data.contents[folder]

                if auth in folder_data.auth_hashes:
                    auth_success = True
                    auth_home_path = (
                        "/" + folder_data.path.strip("/") + "/" + folder_data.id
                    )

        if not is_admin and not auth_success:
            logger.warning(f"Unauthorized access attempt to path '{path}'.")
            return None

        if auth_success:
            logger.info(f"Authorization successful for path '{path}'.")
            return folder_data, auth_home_path

        return folder_data

    def get_folder_auth(self, path: str) -> None:
        auth = getRandomID()
        folder_data: Folder = self.contents["/"]

        if path != "/":
            path = path.strip("/")

            if "/" in path:
                path = path.split("/")
            else:
                path = [path]

            for folder in path:
                folder_data = folder_data.contents[folder]

        folder_data.auth_hashes.append(auth)
        self.save()
        logger.info(f"Authorization hash generated for path '{path}'.")
        return auth

    def get_file(self, path) -> File:
        clean_path = "/" + str(path).strip("/")
        parts = [p for p in clean_path.split("/") if p]
        if not parts:
            raise KeyError("Empty file path")
        file_id = parts[-1]
        folder_path = "/" + "/".join(parts[:-1]) if len(parts) > 1 else "/"
        try:
            folder_data = self.get_directory(folder_path)
            if folder_data and file_id in folder_data.contents:
                return folder_data.contents[file_id]
        except Exception:
            pass
        root_dir = self.get_directory("/")
        found_file = [None]
        def traverse(fld):
            for item in fld.contents.values():
                if item.type == "file" and item.id == file_id:
                    found_file[0] = item
                    return
                elif item.type == "folder":
                    traverse(item)
        traverse(root_dir)
        if found_file[0]:
            return found_file[0]
        raise KeyError(f"File '{file_id}' not found in directory")

    def rename_file_folder(self, path: str, new_name: str) -> None:
        if len(path.strip("/").split("/")) > 0:
            folder_path = "/" + "/".join(path.strip("/").split("/")[:-1])
            file_id = path.strip("/").split("/")[-1]
        else:
            folder_path = "/"
            file_id = path.strip("/")
        folder_data = self.get_directory(folder_path)
        folder_data.contents[file_id].name = new_name
        self.save()
        logger.info(f"Item at path '{path}' renamed to '{new_name}'.")

    def trash_file_folder(self, path: str, trash: bool) -> None:
        action = "Trashing" if trash else "Restoring"

        if len(path.strip("/").split("/")) > 0:
            folder_path = "/" + "/".join(path.strip("/").split("/")[:-1])
            file_id = path.strip("/").split("/")[-1]
        else:
            folder_path = "/"
            file_id = path.strip("/")
        folder_data = self.get_directory(folder_path)
        folder_data.contents[file_id].trash = trash
        self.save()
        logger.info(f"Item at path '{path}' {action.lower()} successfully.")

    def get_trashed_files_folders(self):
        root_dir = self.get_directory("/")
        trash_data = {}

        def traverse_directory(folder):
            for item in folder.contents.values():
                if item.type == "folder":
                    if item.trash:
                        trash_data[item.id] = item
                    else:
                        # Recursively traverse the subfolder
                        traverse_directory(item)
                elif item.type == "file":
                    if item.trash:
                        trash_data[item.id] = item

        traverse_directory(root_dir)
        return trash_data

    def delete_file_folder(self, path: str) -> None:

        if len(path.strip("/").split("/")) > 0:
            folder_path = "/" + "/".join(path.strip("/").split("/")[:-1])
            file_id = path.strip("/").split("/")[-1]
        else:
            folder_path = "/"
            file_id = path.strip("/")

        folder_data = self.get_directory(folder_path)
        del folder_data.contents[file_id]
        self.save()
        logger.info(f"Item at path '{path}' deleted successfully.")

    def search_file_folder(self, query: str):
        logger.info(f"Searching for items matching query '{query}'.")

        root_dir = self.get_directory("/")
        search_results = {}

        def traverse_directory(folder):
            for item in folder.contents.values():
                if query.lower() in item.name.lower():
                    search_results[item.id] = item
                if item.type == "folder":
                    traverse_directory(item)

        traverse_directory(root_dir)
        logger.info(f"Search completed. Found {len(search_results)} matching items.")
        return search_results

    def get_analytics_summary(self):
        root_dir = self.get_directory("/")
        all_files = []

        def collect_files(folder):
            for item in folder.contents.values():
                if item.type == "file":
                    all_files.append(item)
                elif item.type == "folder":
                    collect_files(item)

        collect_files(root_dir)

        total_files = len(all_files)
        total_views = sum(getattr(f, "views_count", 0) for f in all_files)
        total_downloads = sum(getattr(f, "downloads_count", 0) for f in all_files)

        sorted_files = sorted(all_files, key=lambda f: getattr(f, "views_count", 0), reverse=True)
        top_files = []
        recent_activity = []

        for f in sorted_files[:20]:
            top_files.append({
                "id": f.id,
                "name": f.name,
                "path": f.path,
                "size": f.size,
                "views": getattr(f, "views_count", 0),
                "downloads": getattr(f, "downloads_count", 0),
                "last_viewed": getattr(f, "last_viewed", None),
            })

        for f in all_files:
            logs = getattr(f, "view_logs", [])
            for log in logs:
                recent_activity.append({
                    "file_name": f.name,
                    "file_id": f.id,
                    "time": log.get("timestamp"),
                    "ip": log.get("ip"),
                    "agent": log.get("agent"),
                    "type": log.get("type"),
                })

        recent_activity.sort(key=lambda x: x.get("time") or "", reverse=True)

        return {
            "total_files": total_files,
            "total_views": total_views,
            "total_downloads": total_downloads,
            "top_files": top_files,
            "recent_activity": recent_activity[:30],
        }


class NewBotMode:
    def __init__(self, drive_data: NewDriveData) -> None:
        self.drive_data = drive_data

        # Set the current folder to root directory by default
        self.current_folder = "/"
        self.current_folder_name = "/ (root directory)"

    def set_folder(self, folder_path: str, name: str) -> None:
        self.current_folder = folder_path
        self.current_folder_name = name
        self.drive_data.save()
        logger.info(f"Current folder set to '{name}' at path '{folder_path}'.")


DRIVE_DATA: NewDriveData = None
BOT_MODE: NewBotMode = None


# Function to backup the drive data to telegram
async def backup_drive_data(loop=True):
    global DRIVE_DATA
    logger.info("Starting backup drive data task.")

    while True:
        try:
            if not DRIVE_DATA.isUpdated:
                if not loop:
                    break
                await asyncio.sleep(config.DATABASE_BACKUP_TIME)
                continue

            logger.info("Backing up drive data to Telegram.")
            from utils.clients import get_client

            client = get_client()
            time_text = f"📅 **Last Updated :** {get_current_utc_time()} (UTC +00:00)"
            caption = (
                f"🔐 **TG Drive Data Backup File**\n\n"
                "Do not edit or delete this message. This is a backup file for the tg drive data.\n\n"
                f"{time_text}"
            )

            try:
                media_doc = InputMediaDocument(str(drive_cache_path), caption=caption)
                msg = await client.edit_message_media(
                    chat_id=config.STORAGE_CHANNEL,
                    message_id=config.DATABASE_BACKUP_MSG_ID,
                    media=media_doc,
                )
            except Exception as edit_err:
                logger.warning(f"edit_message_media failed ({edit_err}), falling back to send_document")
                msg = await client.send_document(
                    chat_id=config.STORAGE_CHANNEL,
                    document=str(drive_cache_path),
                    caption=caption,
                    file_name="drive.data",
                )

            DRIVE_DATA.isUpdated = False
            logger.info("Drive data backed up to Telegram successfully.")

            try:
                await msg.pin()
            except Exception as pin_e:
                logger.debug(f"Note on pinning backup message: {pin_e}")

            if not loop:
                break

            await asyncio.sleep(config.DATABASE_BACKUP_TIME)
        except Exception as e:
            logger.error(f"Backup Error: {e}")
            # Mark updated false on repeat failure to prevent tight-loop error spamming
            await asyncio.sleep(config.DATABASE_BACKUP_TIME)


async def init_drive_data():
    global DRIVE_DATA

    logger.info("Initializing drive data.")
    root_dir = DRIVE_DATA.get_directory("/")
    if not hasattr(root_dir, "auth_hashes"):
        root_dir.auth_hashes = []

    def traverse_directory(folder):
        for item in folder.contents.values():
            if item.type == "folder":
                traverse_directory(item)

                if not hasattr(item, "auth_hashes"):
                    item.auth_hashes = []

    traverse_directory(root_dir)
    DRIVE_DATA.save()
    logger.info("Drive data initialization completed.")


async def loadDriveData():
    global DRIVE_DATA, BOT_MODE

    logger.info("Loading drive data.")
    from utils.clients import get_client

    client = get_client()
    try:
        msg = await client.get_messages(
            config.STORAGE_CHANNEL, config.DATABASE_BACKUP_MSG_ID
        )
        if msg and getattr(msg, "document", None) and getattr(msg.document, "file_name", "") == "drive.data":
            dl_path = await msg.download()
            with open(dl_path, "rb") as f:
                DRIVE_DATA = dill.load(f)
            logger.info("Drive data loaded from Telegram backup.")
        else:
            logger.info("No prior drive.data document found in backup message. Initializing fresh storage.")
            DRIVE_DATA = NewDriveData({"/": Folder("/", "/")}, [])
            DRIVE_DATA.save()
            # Send initial backup document so future edits succeed
            try:
                drive_cache_path = Path("drive.data")
                init_msg = await client.send_document(
                    chat_id=config.STORAGE_CHANNEL,
                    document=str(drive_cache_path),
                    caption="🔐 **TG Drive Initial Backup File**\n\nDo not delete.",
                    file_name="drive.data",
                )
                logger.info(f"Initial backup document sent to Telegram (msg_id: {init_msg.id}).")
            except Exception as send_err:
                logger.warning(f"Could not send initial backup doc: {send_err}")
    except Exception as e:
        logger.warning(f"Backup load failed: {e}")
        logger.info("Creating new drive.data file.")
        DRIVE_DATA = NewDriveData({"/": Folder("/", "/")}, [])
        DRIVE_DATA.save()

    await init_drive_data()

    if config.MAIN_BOT_TOKEN:
        from utils.bot_mode import start_bot_mode

        BOT_MODE = NewBotMode(DRIVE_DATA)
        await start_bot_mode(DRIVE_DATA, BOT_MODE)
        logger.info("Bot mode started.")
