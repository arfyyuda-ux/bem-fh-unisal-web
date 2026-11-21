import hashlib
import logging
import os
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from lib.db import db
from models.content import AdminLogin, AdminUserCreate, AdminUserResponse

router = APIRouter()
LOGIN_ATTEMPTS: dict[str, list[float]] = {}
SESSION_SECONDS = 8 * 3600


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def password_matches(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
        return secrets.compare_digest(password_hash(password, salt), stored)
    except ValueError:
        return False


async def ensure_admin() -> None:
    email = os.environ.get("ADMIN_EMAIL", "admin@bemfh.unisal.ac.id")
    if not await db.admin_users.find_one({"email": email}):
        password = os.environ.get("ADMIN_INITIAL_PASSWORD") or secrets.token_urlsafe(12)
        if not os.environ.get("ADMIN_INITIAL_PASSWORD"):
            logging.getLogger(__name__).warning("ADMIN_INITIAL_PASSWORD not set; generated initial admin password: %s", password)
        await db.admin_users.insert_one({"email": email, "role": "superadmin", "password_hash": password_hash(password)})


async def current_admin(request: Request) -> dict:
    session_id = request.cookies.get("bem_session", "")
    session = await db.admin_sessions.find_one({"id": session_id}) if session_id else None
    if not session or session["expires"] < time.time():
        raise HTTPException(status_code=401, detail="Sesi admin berakhir")
    return session


async def require_superadmin(admin: dict = Depends(current_admin)) -> dict:
    if admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Akses khusus superadmin")
    return admin


@router.post("/admin/login", response_model=AdminUserResponse)
async def login(payload: AdminLogin, request: Request, response: Response):
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    now = time.time()
    recent = [stamp for stamp in LOGIN_ATTEMPTS.get(ip, []) if now - stamp < 60]
    if len(recent) >= 5:
        raise HTTPException(status_code=429, detail="Terlalu banyak percobaan login, coba lagi 1 menit")
    user = await db.admin_users.find_one({"email": payload.email.lower().strip()})
    if not user or not password_matches(payload.password, user["password_hash"]):
        LOGIN_ATTEMPTS[ip] = recent + [now]
        raise HTTPException(status_code=401, detail="Email atau password salah")
    session_id = secrets.token_urlsafe(32)
    await db.admin_sessions.insert_one({"id": session_id, "email": user["email"], "role": user["role"], "expires": now + SESSION_SECONDS})
    secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie("bem_session", session_id, httponly=True, samesite="lax", secure=secure, max_age=SESSION_SECONDS)
    return AdminUserResponse(email=user["email"], role=user["role"])


@router.get("/admin/me", response_model=AdminUserResponse)
async def me(admin: dict = Depends(current_admin)):
    return AdminUserResponse(email=admin["email"], role=admin["role"])


@router.post("/admin/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get("bem_session", "")
    if session_id:
        await db.admin_sessions.delete_one({"id": session_id})
    response.delete_cookie("bem_session")
    return {"message": "Logout berhasil"}


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10)


@router.post("/admin/password")
async def change_password(payload: PasswordChange, admin: dict = Depends(current_admin)):
    user = await db.admin_users.find_one({"email": admin["email"]})
    if not user or not password_matches(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
    await db.admin_users.update_one({"email": admin["email"]}, {"$set": {"password_hash": password_hash(payload.new_password)}})
    return {"message": "Password diperbarui"}


@router.get("/admin/users", response_model=list[AdminUserResponse])
async def list_users(_: dict = Depends(require_superadmin)):
    return [AdminUserResponse(email=u["email"], role=u["role"]) for u in await db.admin_users.find().sort("email", 1).to_list(200)]


@router.post("/admin/users", response_model=AdminUserResponse)
async def create_user(payload: AdminUserCreate, admin: dict = Depends(require_superadmin)):
    email = payload.email.lower().strip()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Email tidak valid")
    if await db.admin_users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email ini sudah punya akun")
    await db.admin_users.insert_one({"email": email, "role": payload.role, "password_hash": password_hash(payload.password)})
    await db.audit_logs.insert_one({"id": secrets.token_hex(8), "action": f"create_user_{payload.role}", "target_id": email, "actor": admin["email"], "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
    return AdminUserResponse(email=email, role=payload.role)


@router.delete("/admin/users/{email}")
async def delete_user(email: str, admin: dict = Depends(require_superadmin)):
    email = email.lower().strip()
    if email == admin["email"]:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun sendiri")
    user = await db.admin_users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
    if user["role"] == "superadmin" and await db.admin_users.count_documents({"role": "superadmin"}) <= 1:
        raise HTTPException(status_code=400, detail="Minimal harus ada satu superadmin")
    await db.admin_users.delete_one({"email": email})
    await db.admin_sessions.delete_many({"email": email})  # log the removed account out everywhere
    await db.audit_logs.insert_one({"id": secrets.token_hex(8), "action": "delete_user", "target_id": email, "actor": admin["email"], "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
    return {"message": "Akun dihapus"}
