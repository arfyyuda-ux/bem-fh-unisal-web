import asyncio
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.requests import Request
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
import logging
from pathlib import Path
from lib.security import parse_cors_origins
from routers.content import router as content_router, ensure_seed
from routers.auth import router as auth_router, ensure_admin
from routers.complaints import router as complaints_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
logger = logging.getLogger(__name__)

# MongoDB connection
from lib.db import client, ensure_indexes


# Startup runs before the yield, shutdown after it. Add your own setup/teardown here.
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.index_task = asyncio.create_task(ensure_indexes())  # background: a big index build must not block boot
    await ensure_seed()
    await ensure_admin()
    yield
    app.state.index_task.cancel()  # stop a build still running before its client closes
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()


# Create the main app without a prefix
app = FastAPI(lifespan=lifespan)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/api/admin/") or request.url.path.startswith("/api/complaints/status/"):
        response.headers["Cache-Control"] = "no-store"
    secure_override = os.environ.get("COOKIE_SECURE", "").lower()
    if secure_override == "true" or (secure_override != "false" and request.url.scheme == "https"):
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "BEM FH UNISAL API siap", "service": "Kabinet Abisatya 2026"}

api_router.include_router(content_router)
api_router.include_router(auth_router)
api_router.include_router(complaints_router)

# Include the router in the main app
app.include_router(api_router)

# Produksi satu proses: bila frontend sudah di-build (frontend/dist), FastAPI ikut menyajikannya.
DIST_DIR = ROOT_DIR.parent / "frontend" / "dist"
if (DIST_DIR / "index.html").exists():
    if (DIST_DIR / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        target = (DIST_DIR / full_path).resolve()
        if full_path and target.is_file() and DIST_DIR.resolve() in target.parents:
            return FileResponse(target)
        return FileResponse(DIST_DIR / "index.html")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=list(parse_cors_origins(os.environ.get("CORS_ORIGINS"))),
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# A wildcard must never silently become credentialed CORS. In that case the
# security helper intentionally falls back to localhost-only origins.
if any(origin.strip() == "*" for origin in os.environ.get("CORS_ORIGINS", "").split(",")):
    logger.warning("CORS_ORIGINS must list exact origins; using localhost-only origins instead")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
