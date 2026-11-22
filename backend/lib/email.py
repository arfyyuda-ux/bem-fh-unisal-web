"""Emergent managed email (Resend) — transactional sends only, server-side templates."""

import ipaddress
import logging
import os
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")
logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "BEM FH UNISAL")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> str:
    """Raises on failure; callers decide how to record it."""
    if not EMAIL_KEY:
        raise RuntimeError("email_not_configured")
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send", headers={"X-Email-Key": EMAIL_KEY}, json=payload)
    if resp.status_code >= 400:
        try:
            info = resp.json()
        except ValueError:
            info = {}
        code = info.get("code", "")
        if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning("Email paused: %s (%s): %s", code, resp.status_code, info.get("message", ""))
        else:
            logger.error("Email send failed: %s %s", resp.status_code, resp.text)
        raise RuntimeError(code or f"http_{resp.status_code}")
    return resp.json().get("id", "")


STATUS_COPY = {
    "Baru": "Pendaftaranmu sudah kami terima dan tercatat di sistem.",
    "Ditinjau": "Pendaftaranmu sedang ditinjau oleh pengurus. Kami akan mengabarimu kembali.",
    "Diterima": "Selamat! Kamu diterima sebagai bagian dari BEM FH UNISAL. Pengurus akan menghubungimu untuk langkah berikutnya.",
    "Ditolak": "Terima kasih atas minatmu. Untuk periode ini kami belum dapat menerima pendaftaranmu. Tetap semangat dan sampai jumpa di kesempatan berikutnya.",
}


def status_email(name: str, status: str, cabinet: str, status_url: str | None) -> tuple[str, str]:
    subject = f"Status pendaftaran {EMAIL_FROM_NAME}: {status}"
    link = (f'<p style="margin:24px 0"><a href="{escape(status_url)}" style="background:#4A070E;color:#ffffff;'
            f'padding:12px 20px;border-radius:999px;text-decoration:none;font-size:13px">Lihat status pendaftaran</a></p>'
            if status_url else "")
    html = (f'<table role="presentation" width="100%" style="background:#FAF7F0"><tr><td style="padding:32px;'
            f'font-family:Georgia,serif;color:#2d070d">'
            f'<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a17b22">{escape(cabinet)}</p>'
            f'<h1 style="font-size:28px;color:#4A070E;margin:8px 0 16px">Status: {escape(status)}</h1>'
            f'<p style="font-family:Arial,sans-serif;font-size:14px;line-height:22px">Halo {escape(name)},</p>'
            f'<p style="font-family:Arial,sans-serif;font-size:14px;line-height:22px">{escape(STATUS_COPY.get(status, ""))}</p>'
            f'{link}'
            f'<p style="font-family:Arial,sans-serif;font-size:11px;color:#8b5b60">Dikirim oleh {escape(EMAIL_FROM_NAME)}. '
            f'Kami tidak pernah meminta password atau data pembayaran melalui email.</p></td></tr></table>')
    return subject, html


def complaint_email(code: str, category: str, title: str, admin_url: str | None) -> tuple[str, str]:
    subject = f"Laporan pengaduan baru {code} · {category}"
    link = (f'<p style="margin:24px 0"><a href="{escape(admin_url)}" style="background:#4A070E;color:#ffffff;'
            f'padding:12px 20px;border-radius:999px;text-decoration:none;font-size:13px">Buka panel admin</a></p>' if admin_url else "")
    html = (f'<table role="presentation" width="100%" style="background:#FAF7F0"><tr><td style="padding:32px;font-family:Arial,sans-serif;color:#2d070d">'
            f'<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a17b22">Laporan pengaduan</p>'
            f'<h1 style="font-family:Georgia,serif;font-size:26px;color:#4A070E;margin:8px 0 16px">{escape(code)}</h1>'
            f'<p style="font-size:14px;line-height:22px"><b>Kategori:</b> {escape(category)}<br><b>Judul:</b> {escape(title)}</p>'
            f'<p style="font-size:14px;line-height:22px">Detail lengkap dan bukti hanya dapat dibuka oleh pengurus melalui panel admin. '
            f'Identitas pelapor tidak dicantumkan di email ini.</p>{link}'
            f'<p style="font-size:11px;color:#8b5b60">Dikirim oleh {escape(EMAIL_FROM_NAME)}. Mohon jaga kerahasiaan laporan ini.</p></td></tr></table>')
    return subject, html
