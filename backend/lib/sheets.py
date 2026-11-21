"""Google Sheets sync for new applications, via the user's Emergent Google Sheets connection."""
import logging
import os
import re
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

from lib.db import db

load_dotenv(Path(__file__).parent.parent / ".env")
logger = logging.getLogger(__name__)

CONNECTORS_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
SHEETS = "https://sheets.googleapis.com/v4/spreadsheets"
HEADER = ["Tanggal daftar", "Nama", "NIM", "Email", "WhatsApp", "Semester", "Kementerian", "Motivasi", "Status", "ID pendaftaran"]
_tokens: dict[str, tuple[str, float]] = {}


class ConnectorError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def _expiry(expires_at: str | None) -> float:
    try:
        return datetime.fromisoformat(expires_at.replace("Z", "+00:00")).timestamp()  # type: ignore[union-attr]
    except (AttributeError, ValueError):
        return time.time() + 300


async def provider_token(connection_id: str, fresh: bool = False) -> str:
    token, expires = _tokens.get(connection_id, ("", 0.0))
    if token and not fresh and time.time() < expires - 60:
        return token
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(CONNECTORS_BASE.rstrip("/") + "/connectors/v2/access-token",
                              headers={"Authorization": f"Bearer {os.environ.get('EMERGENT_LLM_KEY', '')}"},
                              json={"connection_id": connection_id})
    body = r.json() if r.content else {}
    if r.status_code != 200:
        raise ConnectorError(body.get("code", "provider_error"), body.get("message", r.text))
    _tokens[connection_id] = (body["access_token"], _expiry(body.get("expires_at")))
    return body["access_token"]


async def call_sheets(method: str, url: str, **kwargs) -> httpx.Response:
    return await call_google("SHEETS_CONNECTION_ID", method, url, **kwargs)


async def call_google(env_key: str, method: str, url: str, **kwargs) -> httpx.Response:
    connection_id = os.environ.get(env_key, "")
    if not connection_id:
        raise ConnectorError("not_configured", "Akun Google belum terhubung")
    r: httpx.Response | None = None
    for fresh in (False, True):
        token = await provider_token(connection_id, fresh=fresh)
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.request(method, url, headers={"Authorization": f"Bearer {token}"}, **kwargs)
        if r.status_code != 401:
            break
    assert r is not None
    if r.status_code == 403:
        raise ConnectorError("forbidden", "Akun Google yang terhubung tidak punya akses ke file/kalender ini")
    if r.status_code == 404:
        raise ConnectorError("not_found", "Spreadsheet/kalender tidak ditemukan, periksa link atau ID-nya")
    if r.status_code >= 400:
        raise ConnectorError("provider_error", f"Google API error {r.status_code}")
    return r


def parse_spreadsheet_id(value: str) -> str:
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", value)
    return match.group(1) if match else value.strip()


async def _first_tab(spreadsheet_id: str) -> str:
    r = await call_sheets("GET", f"{SHEETS}/{spreadsheet_id}", params={"fields": "sheets.properties.title"})
    return r.json()["sheets"][0]["properties"]["title"]


def _range(tab: str, cells: str) -> str:
    return quote(f"'{tab}'!{cells}", safe="")


async def ensure_spreadsheet(spreadsheet_id: str) -> str:
    """Creates the spreadsheet when the id is empty; writes the header row when the first tab is empty. Returns the id."""
    spreadsheet_id = parse_spreadsheet_id(spreadsheet_id)
    if not spreadsheet_id:
        r = await call_sheets("POST", SHEETS, json={"properties": {"title": "Pendaftar BEM FH UNISAL"}, "sheets": [{"properties": {"title": "Pendaftar"}}]})
        spreadsheet_id = r.json()["spreadsheetId"]
    tab = await _first_tab(spreadsheet_id)
    r = await call_sheets("GET", f"{SHEETS}/{spreadsheet_id}/values/{_range(tab, 'A1:J1')}")
    if not r.json().get("values"):
        await call_sheets("PUT", f"{SHEETS}/{spreadsheet_id}/values/{_range(tab, 'A1:J1')}", params={"valueInputOption": "RAW"}, json={"values": [HEADER]})
    return spreadsheet_id


async def append_rows(spreadsheet_id: str, apps: list[dict]) -> None:
    tab = await _first_tab(spreadsheet_id)
    rows = [[a.get("created_at", "")[:19].replace("T", " "), a["name"], a["nim"], a["email"], a["whatsapp"], a["semester"], a["department"], a["motivation"], a["status"], a["id"]] for a in apps]
    await call_sheets("POST", f"{SHEETS}/{spreadsheet_id}/values/{_range(tab, 'A1')}:append", params={"valueInputOption": "RAW", "insertDataOption": "INSERT_ROWS"}, json={"values": rows})


async def append_application_row(application_id: str) -> None:
    settings = await db.site_settings.find_one({"id": "main"}) or {}
    app_doc = await db.applications.find_one({"id": application_id})
    if not app_doc or not settings.get("sheet_sync_enabled") or not settings.get("sheet_spreadsheet_id"):
        return
    try:
        await append_rows(settings["sheet_spreadsheet_id"], [app_doc])
        result = "Tersinkron"
    except Exception as exc:  # never break registration because of Sheets
        logger.error("Sheets sync failed for %s: %s", application_id, exc)
        result = f"Gagal ({getattr(exc, 'code', 'error')})"
    await db.applications.update_one({"id": application_id}, {"$set": {"sheet_sync": result}})
