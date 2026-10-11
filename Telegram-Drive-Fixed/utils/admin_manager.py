import json
import os
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import config
from utils.logger import Logger

logger = Logger(__name__)

ADMINS_CACHE_FILE = Path("./cache/admins.json")

class AdminManager:
    def __init__(self):
        self.cache_file = ADMINS_CACHE_FILE
        self.dynamic_admins: Dict[int, dict] = {}
        self._load()

    def _load(self):
        """Loads dynamically added admins from file"""
        try:
            if self.cache_file.exists():
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    # Convert string keys to int
                    self.dynamic_admins = {
                        int(uid): meta for uid, meta in data.items() if str(uid).isdigit()
                    }
                    logger.info(f"Loaded {len(self.dynamic_admins)} dynamic admin(s) from {self.cache_file}")
            else:
                self.cache_file.parent.mkdir(parents=True, exist_ok=True)
                self.dynamic_admins = {}
        except Exception as e:
            logger.error(f"Error loading dynamic admins: {e}")
            self.dynamic_admins = {}

    def _save(self):
        """Saves dynamically added admins to disk"""
        try:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump({str(k): v for k, v in self.dynamic_admins.items()}, f, indent=2)
            logger.info("Dynamic admins saved successfully.")
        except Exception as e:
            logger.error(f"Error saving dynamic admins: {e}")

    def get_primary_owners(self) -> List[int]:
        """Returns primary owner IDs defined in environment variables"""
        return list(config.TELEGRAM_ADMIN_IDS)

    def is_primary_owner(self, user_id: int) -> bool:
        """Returns True if the user is a primary owner from environment variables"""
        return user_id in self.get_primary_owners()

    def is_admin(self, user_id: int) -> bool:
        """Returns True if user is either primary owner or dynamic admin"""
        primary = self.get_primary_owners()
        # If no admins configured anywhere, allow to prevent total lockout
        if not primary and not self.dynamic_admins:
            return True
        if user_id in primary:
            return True
        return user_id in self.dynamic_admins

    def add_admin(self, user_id: int, added_by: Optional[int] = None) -> Tuple[bool, str]:
        """
        Adds a new admin.
        Returns (success: bool, message: str)
        """
        if not isinstance(user_id, int) or user_id <= 0:
            return False, "❌ Invalid Telegram User ID. Must be a positive integer."

        if user_id in self.get_primary_owners():
            return False, f"ℹ️ User `{user_id}` is already a Primary Owner in `TELEGRAM_ADMIN_IDS`."

        if user_id in self.dynamic_admins:
            return False, f"ℹ️ User `{user_id}` is already an active admin."

        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        self.dynamic_admins[user_id] = {
            "user_id": user_id,
            "added_by": added_by,
            "added_at": now_str,
        }
        self._save()
        logger.info(f"Admin {user_id} added by {added_by}")
        return True, f"✅ Successfully added `{user_id}` as an Admin!"

    def remove_admin(self, user_id: int) -> Tuple[bool, str]:
        """
        Removes an admin.
        Primary owners in environment variables cannot be deleted via bot command.
        """
        if user_id in self.get_primary_owners():
            return (
                False,
                f"⚠️ User `{user_id}` is a **Primary Owner** defined in `TELEGRAM_ADMIN_IDS`.\n"
                f"To remove this user, update your `TELEGRAM_ADMIN_IDS` environment variable in Koyeb/hosting settings."
            )

        if user_id not in self.dynamic_admins:
            return False, f"❌ User `{user_id}` is not found in the dynamic admins list."

        del self.dynamic_admins[user_id]
        self._save()
        logger.info(f"Admin {user_id} removed.")
        return True, f"✅ Successfully removed `{user_id}` from Admins!"

    def get_all_admins_summary(self) -> Dict[str, Any]:
        """Returns detailed overview of all admins"""
        owners = self.get_primary_owners()
        dynamic = list(self.dynamic_admins.values())
        return {
            "primary_owners": owners,
            "dynamic_admins": dynamic,
            "total_count": len(owners) + len(dynamic),
        }

admin_manager = AdminManager()
