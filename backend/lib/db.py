"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "news": [IndexModel([("slug", ASCENDING)], name="slug_unique", unique=True), IndexModel([("published_at", DESCENDING)], name="published_desc")],
    "applications": [IndexModel([("email", ASCENDING)], name="application_email", unique=True), IndexModel([("created_at", DESCENDING)], name="application_created")],
    "admin_users": [IndexModel([("email", ASCENDING)], name="admin_email", unique=True)],
    "admin_sessions": [IndexModel([("id", ASCENDING)], name="session_id", unique=True)],
    "cabinet": [IndexModel([("order", ASCENDING)], name="cabinet_order")],
    "complaints": [IndexModel([("code", ASCENDING)], name="complaint_code", unique=True), IndexModel([("created_at", DESCENDING)], name="complaint_created")],
    "complaint_files": [IndexModel([("id", ASCENDING)], name="complaint_file_id", unique=True)],
    "cabinet_archives": [IndexModel([("archived_at", DESCENDING)], name="archive_date")],
    "media": [IndexModel([("id", ASCENDING)], name="media_id", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
