"""Monthly anonymous complaint recap -> separate Google Spreadsheet. Only counts, never identities or descriptions."""
import re
from datetime import datetime, timezone

from lib.db import db
from lib.sheets import SHEETS, _first_tab, _range, call_sheets

CATEGORIES = ["Kekerasan seksual", "Perundungan (bullying)", "Kekerasan fisik/psikis", "Narkoba", "Akademik", "Fasilitas kampus", "Lainnya"]
STATUSES = ["Diterima", "Dikaji", "Dimusyawarahkan", "Ditindaklanjuti", "Selesai"]
HEADER = ["Bulan", "Total laporan", *CATEGORIES, *[f"Status: {s}" for s in STATUSES], "Diperbarui"]


def previous_month() -> str:
    now = datetime.now(timezone.utc)
    year, month = (now.year, now.month - 1) if now.month > 1 else (now.year - 1, 12)
    return f"{year:04d}-{month:02d}"


async def month_counts(month: str) -> tuple[int, dict[str, int], dict[str, int]]:
    docs = await db.complaints.find({"created_at": {"$regex": f"^{re.escape(month)}"}}, {"category": 1, "status": 1}).to_list(10000)
    by_cat = {c: 0 for c in CATEGORIES}
    by_status = {s: 0 for s in STATUSES}
    for d in docs:
        by_cat[d.get("category", "Lainnya")] = by_cat.get(d.get("category", "Lainnya"), 0) + 1
        by_status[d.get("status", "Diterima")] = by_status.get(d.get("status", "Diterima"), 0) + 1
    return len(docs), by_cat, by_status


async def ensure_recap_spreadsheet() -> str:
    settings = await db.site_settings.find_one({"id": "main"}) or {}
    sid = settings.get("recap_spreadsheet_id", "")
    if not sid:
        r = await call_sheets("POST", SHEETS, json={"properties": {"title": "Rekap Pengaduan BEM FH UNISAL (anonim)"}, "sheets": [{"properties": {"title": "Rekap Bulanan"}}]})
        sid = r.json()["spreadsheetId"]
        await db.site_settings.update_one({"id": "main"}, {"$set": {"recap_spreadsheet_id": sid}})
    tab = await _first_tab(sid)
    r = await call_sheets("GET", f"{SHEETS}/{sid}/values/{_range(tab, 'A1:A1')}")
    if not r.json().get("values"):
        await call_sheets("PUT", f"{SHEETS}/{sid}/values/{_range(tab, 'A1')}", params={"valueInputOption": "RAW"}, json={"values": [HEADER]})
    return sid


async def send_recap(month: str) -> dict:
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
        raise ValueError("Format bulan harus YYYY-MM")
    sid = await ensure_recap_spreadsheet()
    tab = await _first_tab(sid)
    total, by_cat, by_status = await month_counts(month)
    row = [month, total, *[by_cat[c] for c in CATEGORIES], *[by_status[s] for s in STATUSES], datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")]
    log = await db.recap_log.find_one({"month": month, "spreadsheet_id": sid})
    if log:  # re-sending a month overwrites its row instead of duplicating it
        await call_sheets("PUT", f"{SHEETS}/{sid}/values/{_range(tab, log['cells'])}", params={"valueInputOption": "RAW"}, json={"values": [row]})
        updated = True
    else:
        r = await call_sheets("POST", f"{SHEETS}/{sid}/values/{_range(tab, 'A1')}:append", params={"valueInputOption": "RAW", "insertDataOption": "INSERT_ROWS"}, json={"values": [row]})
        cells = r.json()["updates"]["updatedRange"].split("!", 1)[1]
        await db.recap_log.insert_one({"month": month, "spreadsheet_id": sid, "cells": cells})
        updated = False
    return {"month": month, "total": total, "spreadsheet_id": sid, "updated": updated}
