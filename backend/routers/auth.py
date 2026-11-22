import hashlib
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from lib.db import db
from lib.security import parse_cors_origins, request_origin_is_allowed
from models.content import AdminLogin, AdminUserCreate, AdminUserResponse

router = APIRouter()
LOGIN_ATTEMPTS: dict[str, list[float]] = {}
SESSION_SECONDS = 8 * 3600
LOGIN_WINDOW_SECONDS = 60
MAX_LOGIN_ATTEMPTS = 5


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def login_is_limited(ip: str, now: float) -> bool:
    recent = [stamp for stamp in LOGIN_ATTEMPTS.get(ip, []) if now - stamp < LOGIN_WINDOW_SECONDS]
    if recent:
        LOGIN_ATTEMPTS[ip] = recent
    else:
        LOGIN_ATTEMPTS.pop(ip, None)
    if len(recent) >= MAX_LOGIN_ATTEMPTS:
        return True
    LOGIN_ATTEMPTS[ip] = recent + [now]
    if len(LOGIN_ATTEMPTS) > 10_000:
        for key, stamps in list(LOGIN_ATTEMPTS.items()):
            if not stamps or now - stamps[-1] >= LOGIN_WINDOW_SECONDS:
                LOGIN_ATTEMPTS.pop(key, None)
    return False


def login_attempt_is_limited(email: str, ip: str, now: float) -> bool:
    email_limited = login_is_limited(f"email:{email}", now)
    ip_limited = login_is_limited(f"ip:{ip}", now)
    return email_limited or ip_limited


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


DUMMY_PASSWORD_HASH = password_hash(secrets.token_urlsafe(24))


async def ensure_admin() -> None:
    email = os.environ.get("ADMIN_EMAIL", "admin@bemfh.unisal.ac.id").lower().strip()
    if not await db.admin_users.find_one({"email": email}):
        password = os.environ.get("ADMIN_INITIAL_PASSWORD", "")
        if len(password) < 12:
            raise RuntimeError("Set ADMIN_INITIAL_PASSWORD to at least 12 characters before creating the initial admin account")
        await db.admin_users.insert_one({"email": email, "role": "superadmin", "password_hash": password_hash(password)})


async def current_admin(request: Request) -> dict:
    origin = request.headers.get("origin")
    fetch_site = request.headers.get("sec-fetch-site")
    if not request_origin_is_allowed(origin, fetch_site, parse_cors_origins(os.environ.get("CORS_ORIGINS"))):
        raise HTTPException(status_code=403, detail="Origin tidak diizinkan")
    session_id = request.cookies.get("bem_session", "")
    session = await db.admin_sessions.find_one({"id": session_id}) if session_id else None
    if not session or session["expires"] < time.time():
        if session:
            await db.admin_sessions.delete_one({"id": session_id})
        raise HTTPException(status_code=401, detail="Sesi admin berakhir")
    user = await db.admin_users.find_one({"email": session["email"]}, {"_id": 0, "email": 1, "role": 1})
    if not user:
        await db.admin_sessions.delete_one({"id": session_id})
        raise HTTPException(status_code=401, detail="Akun admin tidak aktif")
    return {**session, **user}


async def require_superadmin(admin: dict = Depends(current_admin)) -> dict:
    if admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Akses khusus superadmin")
    return admin


@router.post("/admin/login", response_model=AdminUserResponse)
async def login(payload: AdminLogin, request: Request, response: Response):
    if not request_origin_is_allowed(
        request.headers.get("origin"),
        request.headers.get("sec-fetch-site"),
        parse_cors_origins(os.environ.get("CORS_ORIGINS")),
    ):
        raise HTTPException(status_code=403, detail="Origin tidak diizinkan")
    now = time.time()
    email = payload.email.lower().strip()
    ip = client_ip(request)
    if login_attempt_is_limited(email, ip, now):
        raise HTTPException(status_code=429, detail="Terlalu banyak percobaan login, coba lagi 1 menit")
    user = await db.admin_users.find_one({"email": email})
    password_ok = password_matches(payload.password, user["password_hash"] if user else DUMMY_PASSWORD_HASH)
    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Email atau password salah")
    LOGIN_ATTEMPTS.pop(f"ip:{ip}", None)
    LOGIN_ATTEMPTS.pop(f"email:{email}", None)
    await db.admin_sessions.delete_many({"expires": {"$lt": now}})
    session_id = secrets.token_urlsafe(32)
    expires = now + SESSION_SECONDS
    await db.admin_sessions.insert_one({
        "id": session_id,
        "email": user["email"],
        "role": user["role"],
        "expires": expires,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=SESSION_SECONDS),
    })
    secure_override = os.environ.get("COOKIE_SECURE", "").lower()
    secure = secure_override == "true" if secure_override in {"true", "false"} else request.url.scheme == "https"
    response.set_cookie("bem_session", session_id, httponly=True, samesite="lax", secure=secure, max_age=SESSION_SECONDS, path="/")
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
    new_password: str = Field(min_length=12, max_length=128)


@router.post("/admin/password")
async def change_password(payload: PasswordChange, admin: dict = Depends(current_admin)):
    user = await db.admin_users.find_one({"email": admin["email"]})
    if not user or not password_matches(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
    await db.admin_users.update_one({"email": admin["email"]}, {"$set": {"password_hash": password_hash(payload.new_password)}})
    await db.admin_sessions.delete_many({"email": admin["email"], "id": {"$ne": admin["id"]}})
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
