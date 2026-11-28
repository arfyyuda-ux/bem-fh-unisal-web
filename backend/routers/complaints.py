import hashlib
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import get_args

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import ValidationError
from pymongo import ReturnDocument

from lib.db import db
from models.content import Complaint, ComplaintCategory, ComplaintCreate, ComplaintHistoryEntry, ComplaintPublicStatus, ComplaintStats, ComplaintStatus, ComplaintUpdate, CountItem, EvidenceFile
from routers.auth import client_ip, current_admin

router = APIRouter()
RATE: dict[str, list[float]] = {}
CATEGORIES = get_args(ComplaintCategory)
STATUSES = get_args(ComplaintStatus)
ALLOWED = {"image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4", "audio/mpeg", "audio/mp4"}
MAX_FILES, MAX_SIZE = 3, 8 * 1024 * 1024


def _code() -> str:
    return "ADU-" + "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8))


@router.post("/complaints", response_model=ComplaintPublicStatus)
async def create_complaint(request: Request, payload: str = Form(...), files: list[UploadFile] = File(default=[])):
    try:
        data = ComplaintCreate.model_validate_json(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors(include_url=False, include_context=False))
    if not data.commitment:
        raise HTTPException(status_code=400, detail="Centang pernyataan kebenaran laporan terlebih dahulu")
    if data.captcha_answer.strip() != "12":
        raise HTTPException(status_code=400, detail="Jawaban verifikasi belum tepat")
    # Rate-limit by a hashed key kept only in memory; IPs are never stored with the report.
    key = hashlib.sha256(client_ip(request).encode()).hexdigest()
    now = time.time()
    recent = [t for t in RATE.get(key, []) if now - t < 3600]
    if len(recent) >= 5:
        raise HTTPException(status_code=429, detail="Batas laporan per jam tercapai, coba lagi nanti")
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maksimal {MAX_FILES} file bukti")
    evidence: list[EvidenceFile] = []
    blobs = []
    for f in files:
        content = await f.read(MAX_SIZE + 1)
        if f.content_type not in ALLOWED:
            raise HTTPException(status_code=400, detail="Bukti harus berupa gambar, PDF, MP4, atau audio")
        if len(content) > MAX_SIZE:
            raise HTTPException(status_code=413, detail="Ukuran tiap file bukti maksimal 8MB")
        fid = str(uuid.uuid4())
        evidence.append(EvidenceFile(id=fid, filename=(f.filename or "bukti")[:120], content_type=f.content_type, size=len(content)))
        blobs.append({"id": fid, "content_type": f.content_type, "data": content})
    values = data.model_dump(exclude={"captcha_answer", "commitment"})
    if data.anonymous:
        values.update(reporter_name="", reporter_nim="", reporter_contact="")
    created = datetime.now(timezone.utc).isoformat()
    complaint = Complaint(**values, code=_code(), evidence=evidence, created_at=created,
                          history=[ComplaintHistoryEntry(at=created, actor="Sistem", action="Laporan masuk", to_status="Diterima")])
    if blobs:
        await db.complaint_files.insert_many([{**b, "complaint_id": complaint.id} for b in blobs])
    await db.complaints.insert_one(complaint.model_dump())
    RATE[key] = recent + [now]
    if len(RATE) > 10_000:
        for rate_key, stamps in list(RATE.items()):
            if not stamps or now - stamps[-1] >= 3600:
                RATE.pop(rate_key, None)
    return ComplaintPublicStatus(**complaint.model_dump())


@router.get("/complaints/status/{code}", response_model=ComplaintPublicStatus)
async def complaint_status(code: str):
    doc = await db.complaints.find_one({"code": code.strip().upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Kode laporan tidak ditemukan")
    return ComplaintPublicStatus(**doc)


@router.get("/admin/complaints", response_model=list[Complaint])
async def list_complaints(_: dict = Depends(current_admin)):
    return [Complaint(**d) for d in await db.complaints.find().sort("created_at", -1).to_list(1000)]


@router.put("/admin/complaints/{complaint_id}", response_model=Complaint)
async def update_complaint(complaint_id: str, payload: ComplaintUpdate, admin: dict = Depends(current_admin)):
    before = await db.complaints.find_one({"id": complaint_id})
    if not before:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    # Append-only trail: every change records who (email + role), when, and what changed.
    now = datetime.now(timezone.utc).isoformat()
    entries = []
    if payload.status != before.get("status"):
        entries.append(ComplaintHistoryEntry(at=now, actor=admin["email"], role=admin.get("role", ""), action="Status diubah", from_status=before.get("status", ""), to_status=payload.status))
    if payload.response != before.get("response", ""):
        entries.append(ComplaintHistoryEntry(at=now, actor=admin["email"], role=admin.get("role", ""), action="Tanggapan untuk pelapor diperbarui"))
    if payload.internal_notes != before.get("internal_notes", ""):
        entries.append(ComplaintHistoryEntry(at=now, actor=admin["email"], role=admin.get("role", ""), action="Catatan musyawarah diperbarui"))
    update: dict = {"$set": payload.model_dump()}
    if entries:
        update["$push"] = {"history": {"$each": [e.model_dump() for e in entries]}}
    doc = await db.complaints.find_one_and_update({"id": complaint_id}, update, return_document=ReturnDocument.AFTER)
    await db.audit_logs.insert_one({"id": str(uuid.uuid4()), "action": "update_complaint", "target_id": doc["code"], "actor": admin["email"], "created_at": datetime.now(timezone.utc).isoformat()})
    return Complaint(**doc)


@router.get("/admin/complaints/files/{file_id}")
async def complaint_file(file_id: str, _: dict = Depends(current_admin)):
    f = await db.complaint_files.find_one({"id": file_id})
    if not f:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    return Response(content=bytes(f["data"]), media_type=f["content_type"], headers={"Cache-Control": "private, no-store"})


@router.get("/admin/complaints-stats", response_model=ComplaintStats)
async def complaint_stats(_: dict = Depends(current_admin)):
    docs = await db.complaints.find({}, {"category": 1, "status": 1, "created_at": 1}).to_list(20000)
    months: dict[str, int] = {}
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        y, m = now.year, now.month - i
        while m <= 0:
            y, m = y - 1, m + 12
        months[f"{y:04d}-{m:02d}"] = 0
    cats = {c: 0 for c in CATEGORIES}
    stats = {s: 0 for s in STATUSES}
    for d in docs:
        cats[d.get("category", "Lainnya")] = cats.get(d.get("category", "Lainnya"), 0) + 1
        stats[d.get("status", "Diterima")] = stats.get(d.get("status", "Diterima"), 0) + 1
        key = d.get("created_at", "")[:7]
        if key in months:
            months[key] += 1
    return ComplaintStats(total=len(docs), active=len(docs) - stats.get("Selesai", 0),
                          by_category=[CountItem(label=k, count=v) for k, v in cats.items()],
                          by_status=[CountItem(label=k, count=v) for k, v in stats.items()],
                          by_month=[CountItem(label=k, count=v) for k, v in months.items()])
