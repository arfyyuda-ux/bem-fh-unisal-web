import csv
import io
import logging
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image
from pydantic import BaseModel
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from lib.db import db
from lib.email import send_email, status_email
from lib.gcal import delete_event, ensure_calendar, fill_day_month, sync_agenda, sync_all
from lib.sheets import ConnectorError, append_application_row, append_rows, ensure_spreadsheet
from routers.auth import current_admin, require_superadmin
from models.content import (
    AgendaInput, AgendaItem, Application, ApplicationCreate, ApplicationStatusUpdate,
    CabinetInput, CabinetMember, GalleryInput, GalleryItem, NewsCreate, NewsItem,
    CabinetArchive, ArchiveMember, ProgramInput, ProgramItem, PublicContent, SettingsUpdate, SiteSettings, UploadResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()
SEED_VERSION = 3
IMAGE_URLS = {
    "hero": "https://static.prod-images.emergentagent.com/jobs/9d5d6cbf-7076-41a9-9c9e-2df75d62b295/images/8bc40d98ee47ed75c6f33a5ba65b4157fa470b0e15ecc68021791868811b93f7.jpeg",
    "president": "https://static.prod-images.emergentagent.com/jobs/9d5d6cbf-7076-41a9-9c9e-2df75d62b295/images/0d5406ea66eb500bd3d188b3c5ecf9a5feb7626cc27e75bb2da0dc152cde291b.jpeg",
    "forum": "https://static.prod-images.emergentagent.com/jobs/9d5d6cbf-7076-41a9-9c9e-2df75d62b295/images/3c024e6a7edb7248cf9315dfdc6af14b80b556835c56e6be0e6087c2cd234436.jpeg",
    "service": "https://static.prod-images.emergentagent.com/jobs/9d5d6cbf-7076-41a9-9c9e-2df75d62b295/images/9d83b7438eb5d953ccf07ad30df885d13e0fe91da7fae5bbf2dc12c4593942d5.jpeg",
}
RATE_LIMIT: dict[str, list[float]] = {}
# Settings that must never reach anonymous visitors (internal recipients and Google file/calendar IDs).
PRIVATE_SETTINGS = {"sheet_spreadsheet_id": "", "recap_spreadsheet_id": "", "calendar_id": "", "complaint_email": "", "complaint_whatsapp": "", "sheet_sync_enabled": False, "calendar_sync_enabled": False}

V1_SAMPLE_ROLES = ["Presiden Mahasiswa", "Wakil Presiden", "Sekretaris Jenderal", "Menteri Keuangan", "Menteri Advokasi", "Menteri PSDM", "Menteri Komunikasi", "Menteri Sosial Politik"]
CABINET_SEED = [
    ("Aulia Rahma", "Presiden Mahasiswa", "Student President", "Pimpinan", IMAGE_URLS["president"]),
    ("Raka Pratama", "Wakil Presiden Mahasiswa", "Vice President", "Pimpinan", ""),
    ("Nabila Putri", "Sekretaris Jenderal I", "Secretary General I", "Pimpinan", ""),
    ("Rizky Fauzan", "Sekretaris Jenderal II", "Secretary General II", "Pimpinan", ""),
    ("Fikri Ramadhan", "Kementerian Keuangan", "Ministry of Finance", "Pimpinan", ""),
    ("Dimas Akbar", "Kepala Kementerian Kaderisasi dan Pengembangan Profesi", "Head of Cadre & Professional Development", "Kementerian", ""),
    ("Salsa Amalia", "Ketua Kementerian Luar Negeri", "Head of External Affairs", "Kementerian", ""),
    ("Iqbal Maulana", "Ketua Kementerian Dalam Negeri", "Head of Internal Affairs", "Kementerian", ""),
    ("Hana Nursyifa", "Ketua Kementerian Komunikasi Informasi", "Head of Communication & Information", "Kementerian", ""),
    ("Anisa Zahra", "Ketua Kementerian Publikasi, Dekorasi dan Dokumentasi", "Head of Publication, Decoration & Documentation", "Kementerian", ""),
    ("Bagas Saputra", "Kepala Kementerian Olahraga dan Seni", "Head of Sports & Arts", "Kementerian", ""),
    ("Muhammad Fadhil", "Kepala Kementerian Keagamaan", "Head of Religious Affairs", "Kementerian", ""),
    ("Citra Lestari", "Kepala Kementerian Wirausaha", "Head of Entrepreneurship", "Kementerian", ""),
]


async def ensure_seed() -> None:
    meta = await db.meta.find_one({"id": "seed"}) or {}
    if not await db.site_settings.find_one({"id": "main"}):
        await db.site_settings.insert_one(SiteSettings(hero_image_url=IMAGE_URLS["hero"]).model_dump())
        news = [
            NewsItem(slug="ruang-aman-untuk-bertumbuh", category="Kampus", title_id="Ruang Aman untuk Bertumbuh", title_en="A Safe Space to Grow", excerpt_id="BEM FH UNISAL membuka ruang dialog yang hangat untuk setiap suara mahasiswa.", excerpt_en="BEM FH UNISAL opens a warm dialogue space for every student voice.", content_id="Kabinet Abisatya percaya bahwa kampus yang hidup lahir dari percakapan yang jujur. Melalui forum terbuka ini, mahasiswa dapat menyampaikan gagasan, keresahan, dan harapan untuk Fakultas Hukum.", content_en="The Abisatya Cabinet believes a living campus is born from honest conversations. Through this open forum, students can share ideas, concerns, and hopes for the Faculty of Law.", image_url=IMAGE_URLS["forum"], published_at="2026-01-20", read_minutes=4, featured=True),
            NewsItem(slug="pengabdian-hukum-di-cibiru", category="Pengabdian", title_id="Belajar Hukum, Mengabdi di Cibiru", title_en="Learning Law, Serving Cibiru", excerpt_id="Mahasiswa membawa pengetahuan hukum lebih dekat kepada warga melalui kelas hukum sederhana.", excerpt_en="Students bring legal knowledge closer to residents through accessible legal classes.", content_id="Program pengabdian ini mempertemukan mahasiswa dengan warga Cibiru dalam kelas hukum keluarga dan konsultasi dasar. Sebuah langkah kecil untuk keadilan yang lebih dekat.", content_en="This service program connects students with Cibiru residents through family law classes and basic consultations. A small step toward justice that feels closer.", image_url=IMAGE_URLS["service"], published_at="2026-01-12", read_minutes=5),
            NewsItem(slug="menyambut-semester-baru", category="Kampus", title_id="Menyambut Semester Baru dengan Energi Baru", title_en="Welcoming a New Semester", excerpt_id="Catatan awal tahun dari Presiden BEM untuk seluruh keluarga besar FH UNISAL.", excerpt_en="A new-year note from the BEM President to the FH UNISAL community.", content_id="Kita memulai tahun ini dengan keberanian untuk hadir, mendengar, dan bekerja bersama. Selamat datang di semester baru, teman-teman.", content_en="We begin this year with the courage to show up, listen, and work together. Welcome to the new semester, friends.", image_url=IMAGE_URLS["hero"], published_at="2026-01-05", read_minutes=3),
        ]
        await db.news.insert_many([item.model_dump() for item in news])
        agendas = [
            AgendaItem(day="14", month="FEB", title_id="Rapat Kerja Kabinet", title_en="Cabinet Work Meeting", location_id="Ruang Sidang FH", location_en="Faculty Moot Court", order=1),
            AgendaItem(day="21", month="FEB", title_id="Kelas Advokasi Dasar", title_en="Basic Advocacy Class", location_id="Aula UNISAL", location_en="UNISAL Hall", order=2),
            AgendaItem(day="01", month="MAR", title_id="Open Recruitment", title_en="Open Recruitment", location_id="Taman Kampus", location_en="Campus Garden", order=3),
        ]
        await db.agendas.insert_many([item.model_dump() for item in agendas])
        programs = [
            ProgramItem(number="01", title_id="Klinik Advokasi", title_en="Advocacy Clinic", description_id="Pendampingan dan edukasi hukum yang mudah diakses mahasiswa.", description_en="Accessible legal education and support for students.", status="Berjalan", order=1),
            ProgramItem(number="02", title_id="Ruang Bicara", title_en="Dialogue Room", description_id="Forum aman untuk menyampaikan aspirasi dan membangun solusi.", description_en="A safe forum for aspirations and collaborative solutions.", status="Berjalan", order=2),
            ProgramItem(number="03", title_id="Sekolah Organisasi", title_en="Organization School", description_id="Belajar kepemimpinan, tata kelola, dan kerja kolaboratif.", description_en="Learning leadership, governance, and collaboration.", status="Segera", order=3),
            ProgramItem(number="04", title_id="Desa Sadar Hukum", title_en="Law-Aware Village", description_id="Pengabdian hukum bersama warga di sekitar kampus.", description_en="Community legal service with neighborhoods around campus.", status="Segera", order=4),
            ProgramItem(number="05", title_id="Jurnal Abisatya", title_en="Abisatya Journal", description_id="Catatan gagasan mahasiswa untuk hukum yang lebih manusiawi.", description_en="Student ideas for a more humane legal culture.", status="Selesai", order=5),
        ]
        await db.programs.insert_many([item.model_dump() for item in programs])
        gallery = [
            GalleryItem(image_url=IMAGE_URLS["forum"], caption_id="Forum Aspirasi Mahasiswa", caption_en="Student Aspirations Forum", year="2026", order=1),
            GalleryItem(image_url=IMAGE_URLS["service"], caption_id="Pengabdian Masyarakat", caption_en="Community Service", year="2026", order=2),
            GalleryItem(image_url=IMAGE_URLS["hero"], caption_id="Langkah Pertama Kabinet", caption_en="The Cabinet's First Step", year="2026", order=3),
        ]
        await db.gallery.insert_many([item.model_dump() for item in gallery])
    if meta.get("version", 1) < 2:
        # One-time migration to the official 13-position structure: remove only the v1 sample
        # roles (never admin-entered members), then seed if nothing remains.
        await db.cabinet.delete_many({"role_id": {"$in": V1_SAMPLE_ROLES}, "order": {"$exists": False}})
        if await db.cabinet.count_documents({}) == 0:
            members = [CabinetMember(name=n, role_id=r, role_en=e, group=g, image_url=img, order=i + 1) for i, (n, r, e, g, img) in enumerate(CABINET_SEED)]
            await db.cabinet.insert_many([m.model_dump() for m in members])
        await db.site_settings.update_one({"id": "main", "hero_image_url": {"$in": ["", None]}}, {"$set": {"hero_image_url": IMAGE_URLS["hero"]}})
    if meta.get("version", 1) < 3:
        for title, date in (("Rapat Kerja Kabinet", "2026-02-14"), ("Kelas Advokasi Dasar", "2026-02-21"), ("Open Recruitment", "2026-03-01")):
            await db.agendas.update_one({"title_id": title, "date": {"$in": ["", None]}}, {"$set": {"date": date}})
        await db.agendas.update_many({"date": {"$exists": False}}, {"$set": {"date": "", "time_start": "", "time_end": ""}})
    if meta.get("version", 1) < SEED_VERSION:
        await db.meta.update_one({"id": "seed"}, {"$set": {"version": SEED_VERSION}}, upsert=True)


async def log_action(admin: dict, action: str, target_id: str) -> None:
    await db.audit_logs.insert_one({"id": str(uuid.uuid4()), "action": action, "target_id": target_id, "actor": admin["email"], "created_at": datetime.now(timezone.utc).isoformat()})


@router.get("/public", response_model=PublicContent)
async def public_content():
    settings = SiteSettings(**(await db.site_settings.find_one({"id": "main"}) or {})).model_copy(update=PRIVATE_SETTINGS)
    news = [NewsItem(**doc) for doc in await db.news.find().sort("published_at", -1).to_list(200)]
    agendas = [AgendaItem(**doc) for doc in await db.agendas.find().sort("order", 1).to_list(50)]
    cabinet = [CabinetMember(**doc) for doc in await db.cabinet.find().sort("order", 1).to_list(100)]
    programs = [ProgramItem(**doc) for doc in await db.programs.find().sort([("order", 1), ("number", 1)]).to_list(50)]
    gallery = [GalleryItem(**doc) for doc in await db.gallery.find().sort("order", 1).to_list(100)]
    return PublicContent(settings=settings, news=news, agendas=agendas, cabinet=cabinet, programs=programs, gallery=gallery, captcha_question="7 + 5 = ?")


@router.get("/news/{slug}", response_model=NewsItem)
async def get_news(slug: str):
    item = await db.news.find_one({"slug": slug})
    if not item:
        raise HTTPException(status_code=404, detail="Berita tidak ditemukan")
    return NewsItem(**item)


# ---------- Applications ----------
@router.post("/applications", response_model=Application)
async def create_application(payload: ApplicationCreate, request: Request, background: BackgroundTasks):
    settings = await db.site_settings.find_one({"id": "main"}) or {}
    if not settings.get("registration_open", True):
        raise HTTPException(status_code=403, detail="Pendaftaran sedang ditutup")
    if payload.captcha_answer.strip() != "12":
        raise HTTPException(status_code=400, detail="Jawaban captcha belum tepat")
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    recent = [stamp for stamp in RATE_LIMIT.get(ip, []) if now - stamp < 3600]
    if len(recent) >= 3:
        raise HTTPException(status_code=429, detail="Batas pendaftaran per jam tercapai")
    if await db.applications.find_one({"email": payload.email}):
        raise HTTPException(status_code=409, detail="Email ini sudah terdaftar")
    application = Application(**payload.model_dump(exclude={"captcha_answer"}), created_at=datetime.now(timezone.utc).isoformat())
    await db.applications.insert_one(application.model_dump())
    RATE_LIMIT[ip] = recent + [now]
    if settings.get("sheet_sync_enabled") and settings.get("sheet_spreadsheet_id"):
        background.add_task(append_application_row, application.id)
    return application


@router.get("/applications/{application_id}", response_model=Application)
async def application_status(application_id: str):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Pendaftaran tidak ditemukan")
    return Application(**application)


@router.get("/admin/applications", response_model=list[Application])
async def admin_applications(_: dict = Depends(require_superadmin)):
    return [Application(**doc) for doc in await db.applications.find().sort("created_at", -1).to_list(1000)]


async def notify_status_change(application_id: str, status_url: str | None) -> None:
    app_doc = await db.applications.find_one({"id": application_id})
    if not app_doc:
        return
    settings = await db.site_settings.find_one({"id": "main"}) or {}
    cabinet = f"{settings.get('cabinet_name', 'Kabinet Abisatya')} {settings.get('period', '')}".strip()
    subject, html = status_email(app_doc["name"], app_doc["status"], cabinet, status_url)
    try:
        await send_email(to=app_doc["email"], subject=subject, html=html)
        result = "Terkirim"
    except Exception as exc:  # never fail the status update because of email
        logger.error("Status email failed for %s: %s", application_id, exc)
        result = f"Gagal ({exc})"
    await db.applications.update_one({"id": application_id}, {"$set": {"email_notification": result, "notified_at": datetime.now(timezone.utc).isoformat()}})


@router.put("/admin/applications/{application_id}", response_model=Application)
async def update_application(application_id: str, payload: ApplicationStatusUpdate, request: Request, background: BackgroundTasks, admin: dict = Depends(require_superadmin)):
    result = await db.applications.find_one_and_update({"id": application_id}, {"$set": {"status": payload.status, "email_notification": "Mengirim…"}}, return_document=ReturnDocument.AFTER)
    if not result:
        raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
    origin = request.headers.get("origin", "")
    status_url = f"{origin}/status/{application_id}" if origin.startswith("https://") else None
    background.add_task(notify_status_change, application_id, status_url)
    await log_action(admin, "update_application", application_id)
    return Application(**result)


@router.get("/admin/applications/export")
async def export_applications(_: dict = Depends(require_superadmin)):
    rows = await db.applications.find().sort("created_at", -1).to_list(5000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nama", "NIM", "Email", "WhatsApp", "Semester", "Departemen", "Status", "Tanggal"])
    for row in rows:
        writer.writerow([row.get("name"), row.get("nim"), row.get("email"), row.get("whatsapp"), row.get("semester"), row.get("department"), row.get("status"), row.get("created_at")])
    return StreamingResponse(iter(["\ufeff" + output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=pendaftar-bem.csv"})


# ---------- News ----------
@router.post("/admin/news", response_model=NewsItem)
async def create_news(payload: NewsCreate, admin: dict = Depends(require_superadmin)):
    item = NewsItem(**{**payload.model_dump(), "image_url": payload.image_url or IMAGE_URLS["forum"]})
    try:
        await db.news.insert_one(item.model_dump())
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Slug sudah dipakai berita lain")
    await log_action(admin, "create_news", item.id)
    return item


@router.put("/admin/news/{news_id}", response_model=NewsItem)
async def update_news(news_id: str, payload: NewsCreate, admin: dict = Depends(require_superadmin)):
    values = payload.model_dump()
    values["image_url"] = values["image_url"] or IMAGE_URLS["forum"]
    try:
        result = await db.news.find_one_and_update({"id": news_id}, {"$set": values}, return_document=ReturnDocument.AFTER)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Slug sudah dipakai berita lain")
    if not result:
        raise HTTPException(status_code=404, detail="Berita tidak ditemukan")
    await log_action(admin, "update_news", news_id)
    return NewsItem(**result)


@router.delete("/admin/news/{news_id}")
async def delete_news(news_id: str, admin: dict = Depends(require_superadmin)):
    result = await db.news.delete_one({"id": news_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Berita tidak ditemukan")
    await log_action(admin, "delete_news", news_id)
    return {"message": "Berita dihapus"}


# ---------- Generic CRUD: cabinet, programs, agendas, gallery ----------
def register_collection(name: str, item_model: type[BaseModel], input_model: type[BaseModel], prepare=None, on_save=None, on_delete=None) -> None:
    """Generic admin CRUD. Optional hooks: prepare(values) before write; on_save(id) / on_delete(doc) run as background tasks."""
    collection = db[name]

    def values_of(payload: BaseModel) -> dict:
        values = payload.model_dump()
        return prepare(values) if prepare else values

    async def create(payload: input_model, background: BackgroundTasks, admin: dict = Depends(require_superadmin)):  # type: ignore[valid-type]
        item = item_model(**values_of(payload))
        await collection.insert_one(item.model_dump())
        await log_action(admin, f"create_{name}", item.id)
        if on_save:
            background.add_task(on_save, item.id)
        return item

    async def update(item_id: str, payload: input_model, background: BackgroundTasks, admin: dict = Depends(require_superadmin)):  # type: ignore[valid-type]
        result = await collection.find_one_and_update({"id": item_id}, {"$set": values_of(payload)}, return_document=ReturnDocument.AFTER)
        if not result:
            raise HTTPException(status_code=404, detail="Data tidak ditemukan")
        await log_action(admin, f"update_{name}", item_id)
        if on_save:
            background.add_task(on_save, item_id)
        return item_model(**result)

    async def delete(item_id: str, background: BackgroundTasks, admin: dict = Depends(require_superadmin)):
        doc = await collection.find_one_and_delete({"id": item_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Data tidak ditemukan")
        await log_action(admin, f"delete_{name}", item_id)
        if on_delete:
            background.add_task(on_delete, doc)
        return {"message": "Data dihapus"}

    router.add_api_route(f"/admin/{name}", create, methods=["POST"], response_model=item_model)
    router.add_api_route(f"/admin/{name}/{{item_id}}", update, methods=["PUT"], response_model=item_model)
    router.add_api_route(f"/admin/{name}/{{item_id}}", delete, methods=["DELETE"])


register_collection("cabinet", CabinetMember, CabinetInput)
register_collection("programs", ProgramItem, ProgramInput)
async def _delete_agenda_event(doc: dict) -> None:
    await delete_event(doc.get("calendar_event_id", ""))


register_collection("agendas", AgendaItem, AgendaInput, prepare=fill_day_month, on_save=sync_agenda, on_delete=_delete_agenda_event)
register_collection("gallery", GalleryItem, GalleryInput)


# ---------- Settings, media, audit ----------
@router.get("/admin/settings", response_model=SiteSettings)
async def get_admin_settings(_: dict = Depends(current_admin)):
    return SiteSettings(**(await db.site_settings.find_one({"id": "main"}) or {}))


@router.put("/admin/settings", response_model=SiteSettings)
async def update_settings(payload: SettingsUpdate, background: BackgroundTasks, admin: dict = Depends(require_superadmin)):
    if payload.sheet_sync_enabled:
        try:
            payload.sheet_spreadsheet_id = await ensure_spreadsheet(payload.sheet_spreadsheet_id)
        except ConnectorError as exc:
            raise HTTPException(status_code=400, detail=f"Google Sheets: {exc}")
    current = await db.site_settings.find_one({"id": "main"}) or {}
    payload.recap_spreadsheet_id = current.get("recap_spreadsheet_id", "")  # managed by the recap job
    turned_on = payload.calendar_sync_enabled and not current.get("calendar_sync_enabled")
    if payload.calendar_sync_enabled:
        try:
            payload.calendar_id = await ensure_calendar(payload.calendar_id.strip())
        except ConnectorError as exc:
            raise HTTPException(status_code=400, detail=f"Google Calendar: {exc}")
    result = await db.site_settings.find_one_and_update({"id": "main"}, {"$set": payload.model_dump()}, return_document=ReturnDocument.AFTER, upsert=True)
    await log_action(admin, "update_settings", "main")
    if turned_on:
        background.add_task(sync_all)
    return SiteSettings(**result)


@router.post("/admin/upload", response_model=UploadResponse)
async def upload_image(file: UploadFile = File(...), _: dict = Depends(require_superadmin)):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Format harus JPG, PNG, atau WEBP")
    content = await file.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Ukuran maksimum 5MB")
    try:
        image = Image.open(io.BytesIO(content))
        image.thumbnail((1800, 1800))
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")
        buffer = io.BytesIO()
        image.save(buffer, format="WEBP", quality=82)
    except Exception:
        raise HTTPException(status_code=400, detail="File gambar tidak dapat dibaca")
    media_id = str(uuid.uuid4())
    await db.media.insert_one({"id": media_id, "content_type": "image/webp", "data": buffer.getvalue(), "created_at": datetime.now(timezone.utc).isoformat()})
    return UploadResponse(url=f"/api/media/{media_id}")


@router.get("/media/{media_id}")
async def get_media(media_id: str):
    media = await db.media.find_one({"id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Media tidak ditemukan")
    data = media["data"]
    if isinstance(data, str):  # legacy base64 uploads
        import base64
        data = base64.b64decode(data)
    return Response(content=bytes(data), media_type=media["content_type"], headers={"Cache-Control": "public, max-age=31536000, immutable"})


@router.get("/admin/audit")
async def audit_logs(_: dict = Depends(require_superadmin)):
    return await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


# ---------- Cabinet archives ----------
@router.get("/archives", response_model=list[CabinetArchive])
async def list_archives():
    return [CabinetArchive(**d) for d in await db.cabinet_archives.find().sort("archived_at", -1).to_list(100)]


@router.post("/admin/archives", response_model=CabinetArchive)
async def archive_current_cabinet(admin: dict = Depends(require_superadmin)):
    settings = SiteSettings(**(await db.site_settings.find_one({"id": "main"}) or {}))
    members = [ArchiveMember(**d) for d in await db.cabinet.find().sort("order", 1).to_list(100)]
    if not members:
        raise HTTPException(status_code=400, detail="Kabinet saat ini masih kosong")
    if await db.cabinet_archives.find_one({"cabinet_name": settings.cabinet_name, "period": settings.period}):
        raise HTTPException(status_code=409, detail="Kabinet dan periode ini sudah diarsipkan")
    archive = CabinetArchive(cabinet_name=settings.cabinet_name, period=settings.period, members=members, archived_at=datetime.now(timezone.utc).isoformat())
    await db.cabinet_archives.insert_one(archive.model_dump())
    await log_action(admin, "archive_cabinet", archive.id)
    return archive


@router.delete("/admin/archives/{archive_id}")
async def delete_archive(archive_id: str, admin: dict = Depends(require_superadmin)):
    result = await db.cabinet_archives.delete_one({"id": archive_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Arsip tidak ditemukan")
    await log_action(admin, "delete_archive", archive_id)
    return {"message": "Arsip dihapus"}


@router.post("/admin/sheets/sync-all")
async def sync_all_applications(admin: dict = Depends(require_superadmin)):
    settings = await db.site_settings.find_one({"id": "main"}) or {}
    if not settings.get("sheet_sync_enabled") or not settings.get("sheet_spreadsheet_id"):
        raise HTTPException(status_code=400, detail="Aktifkan sinkron Google Sheets terlebih dahulu")
    pending = await db.applications.find({"sheet_sync": {"$ne": "Tersinkron"}}).sort("created_at", 1).to_list(5000)
    if pending:
        try:
            await append_rows(settings["sheet_spreadsheet_id"], pending)
        except ConnectorError as exc:
            raise HTTPException(status_code=400, detail=f"Google Sheets: {exc}")
        await db.applications.update_many({"id": {"$in": [a["id"] for a in pending]}}, {"$set": {"sheet_sync": "Tersinkron"}})
    await log_action(admin, "sheets_sync_all", str(len(pending)))
    return {"synced": len(pending)}


@router.post("/admin/calendar/sync-all")
async def calendar_sync_all(admin: dict = Depends(require_superadmin)):
    settings = await db.site_settings.find_one({"id": "main"}) or {}
    if not settings.get("calendar_sync_enabled") or not settings.get("calendar_id"):
        raise HTTPException(status_code=400, detail="Aktifkan sinkron Google Calendar terlebih dahulu")
    results = await sync_all()
    await log_action(admin, "calendar_sync_all", str(results))
    return results
