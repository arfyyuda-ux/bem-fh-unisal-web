"""Sync BEM agendas to a dedicated Google Calendar via the user's Emergent Google Calendar connection."""
import logging
from datetime import datetime, timedelta

from lib.db import db
from lib.sheets import ConnectorError, call_google

logger = logging.getLogger(__name__)
API = "https://www.googleapis.com/calendar/v3"
TZ = "Asia/Jakarta"
MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"]


def fill_day_month(values: dict) -> dict:
    """Derive the card's day/month badge from the ISO date when one is given."""
    try:
        d = datetime.strptime(values.get("date", ""), "%Y-%m-%d")
        values["day"], values["month"] = f"{d.day:02d}", MONTHS[d.month - 1]
    except ValueError:
        pass
    return values


async def call_calendar(method: str, url: str, **kwargs):
    return await call_google("CALENDAR_CONNECTION_ID", method, url, **kwargs)


async def ensure_calendar(calendar_id: str) -> str:
    if calendar_id:
        await call_calendar("GET", f"{API}/calendars/{calendar_id}")
        return calendar_id
    r = await call_calendar("POST", f"{API}/calendars", json={"summary": "Agenda BEM FH UNISAL", "description": "Agenda resmi BEM Fakultas Hukum Universitas Sali Al-Aitaam", "timeZone": TZ})
    return r.json()["id"]


def event_body(agenda: dict) -> dict | None:
    if not agenda.get("date"):
        return None
    location = agenda.get("location_id", "")
    body = {"summary": agenda.get("title_id", "Agenda BEM"), "location": location, "description": f"Agenda BEM FH UNISAL\n{agenda.get('title_en', '')}".strip()}
    if agenda.get("time_start"):
        start = datetime.strptime(f"{agenda['date']} {agenda['time_start']}", "%Y-%m-%d %H:%M")
        end = datetime.strptime(f"{agenda['date']} {agenda['time_end']}", "%Y-%m-%d %H:%M") if agenda.get("time_end") else start + timedelta(hours=2)
        if end <= start:
            end = start + timedelta(hours=2)
        body["start"] = {"dateTime": start.strftime("%Y-%m-%dT%H:%M:00"), "timeZone": TZ}
        body["end"] = {"dateTime": end.strftime("%Y-%m-%dT%H:%M:00"), "timeZone": TZ}
    else:
        day = datetime.strptime(agenda["date"], "%Y-%m-%d")
        body["start"] = {"date": day.strftime("%Y-%m-%d")}
        body["end"] = {"date": (day + timedelta(days=1)).strftime("%Y-%m-%d")}
    body["reminders"] = {"useDefault": False, "overrides": [{"method": "popup", "minutes": 60}, {"method": "email", "minutes": 24 * 60}]}
    return body


async def _settings() -> dict:
    return await db.site_settings.find_one({"id": "main"}) or {}


async def sync_agenda(agenda_id: str) -> str:
    """Creates/updates the event for one agenda. Returns a short status string; never raises."""
    settings = await _settings()
    cal = settings.get("calendar_id", "")
    if not settings.get("calendar_sync_enabled") or not cal:
        return "off"
    agenda = await db.agendas.find_one({"id": agenda_id})
    if not agenda:
        return "missing"
    body = event_body(agenda)
    event_id = agenda.get("calendar_event_id", "")
    try:
        if body is None:
            return "no-date"
        if event_id:
            try:
                await call_calendar("PUT", f"{API}/calendars/{cal}/events/{event_id}", json=body)
                return "updated"
            except ConnectorError as exc:
                if exc.code != "not_found":
                    raise
        r = await call_calendar("POST", f"{API}/calendars/{cal}/events", json=body)
        await db.agendas.update_one({"id": agenda_id}, {"$set": {"calendar_event_id": r.json()["id"]}})
        return "created"
    except Exception as exc:
        logger.error("Calendar sync failed for agenda %s: %s", agenda_id, exc)
        return f"failed: {exc}"


async def delete_event(event_id: str) -> None:
    settings = await _settings()
    cal = settings.get("calendar_id", "")
    if not event_id or not settings.get("calendar_sync_enabled") or not cal:
        return
    try:
        await call_calendar("DELETE", f"{API}/calendars/{cal}/events/{event_id}")
    except Exception as exc:
        logger.error("Calendar delete failed for %s: %s", event_id, exc)


async def sync_all() -> dict:
    results: dict[str, int] = {}
    for agenda in await db.agendas.find({"date": {"$nin": ["", None]}}, {"id": 1}).to_list(500):
        status = (await sync_agenda(agenda["id"])).split(":")[0]
        results[status] = results.get(status, 0) + 1
    return results
