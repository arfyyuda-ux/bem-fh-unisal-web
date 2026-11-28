from unittest.mock import AsyncMock, Mock

import pytest

from models.content import AgendaItem, Application, SiteSettings
from routers import content as content_module
from routers.complaints import router as complaints_router
from routers.content import fill_day_month, router as content_router


def test_legacy_integration_fields_are_ignored_by_api_models():
    settings = SiteSettings(calendar_id="legacy-calendar", sheet_spreadsheet_id="legacy-sheet")
    agenda = AgendaItem(title_id="Agenda", location_id="Kampus", calendar_event_id="legacy-event")
    application = Application(
        name="Mahasiswa",
        nim="12345678",
        email="mahasiswa@example.test",
        whatsapp="628123456789",
        semester=1,
        department="Advokasi",
        motivation="Saya ingin berkontribusi untuk organisasi mahasiswa.",
        created_at="2026-01-01T00:00:00+00:00",
        email_notification="Terkirim",
        sheet_sync="Tersinkron",
    )

    assert "calendar_id" not in settings.model_dump()
    assert "calendar_event_id" not in agenda.model_dump()
    assert "email_notification" not in application.model_dump()
    assert "sheet_sync" not in application.model_dump()


def test_agenda_day_and_month_still_derive_from_date():
    assert fill_day_month({"date": "2026-03-01", "day": "", "month": ""}) == {
        "date": "2026-03-01",
        "day": "01",
        "month": "MAR",
    }


def test_external_sync_and_recap_routes_are_not_registered():
    content_paths = {route.path for route in content_router.routes}
    complaint_paths = {route.path for route in complaints_router.routes}

    assert "/admin/sheets/sync-all" not in content_paths
    assert "/admin/calendar/sync-all" not in content_paths
    assert "/admin/complaints/recap" not in complaint_paths
    assert "/cron/complaint-recap" not in complaint_paths


@pytest.mark.asyncio
async def test_legacy_seed_image_urls_are_migrated_to_local_assets(monkeypatch):
    class FakeDatabase:
        def __init__(self):
            self.collections = {
                name: Mock(update_many=AsyncMock())
                for name in ("site_settings", "news", "gallery", "cabinet", "cabinet_archives")
            }
            self.site_settings = self.collections["site_settings"]
            self.cabinet_archives = self.collections["cabinet_archives"]

        def __getitem__(self, name):
            return self.collections[name]

    fake_db = FakeDatabase()
    monkeypatch.setattr(content_module, "db", fake_db)

    await content_module.migrate_image_urls()

    assert fake_db.site_settings.update_many.await_count == 16
    for collection in ("news", "gallery", "cabinet", "cabinet_archives"):
        assert fake_db.collections[collection].update_many.await_count == 4
    assert any(
        call.args[1]["$set"].get("image_url") == "/images/hero.jpeg"
        for call in fake_db.collections["news"].update_many.await_args_list
    )
    assert any(
        call.args[1]["$set"].get("members.$[member].image_url") == "/images/hero.jpeg"
        for call in fake_db.cabinet_archives.update_many.await_args_list
    )
