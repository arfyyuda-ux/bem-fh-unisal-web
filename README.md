# Website BEM FH UNISAL, Kabinet Abisatya

Website resmi Badan Eksekutif Mahasiswa Fakultas Hukum Universitas Sali Al-Aitaam Bandung.

Fitur utama: situs publik dua bahasa (Indonesia dan Inggris), berita, agenda, profil dan sejarah, kabinet dan arsip per periode, program kerja, galeri, pendaftaran anggota, serta layanan pengaduan rahasia atau anonim dengan kode pelacakan. Konten dikelola lewat panel admin (`/admin`) dengan peran superadmin dan satgas. Integrasi Google Sheets, Google Calendar, dan email bersifat opsional.

Teknologi: Python, FastAPI, MongoDB (Motor), React 19, Vite, TypeScript, Tailwind CSS v4.

## Struktur proyek

```
backend/    API FastAPI (routers, models, lib, tests)
frontend/   Aplikasi React + Vite
memory/     SPEC.md: dokumentasi fitur, model data, dan endpoint
plan/       Catatan perencanaan
tests/      Skenario Playwright (opsional)
docker-compose.yml   MongoDB lokal
```

## Prasyarat

- Python 3.11 atau lebih baru
- Node.js 20 atau lebih baru dan Yarn Classic (v1)
- MongoDB. Cara tercepat: `docker compose up -d` dari root proyek, atau pakai MongoDB Atlas dan isi `MONGO_URL`.

## Menjalankan secara lokal

Buka dua terminal dari root proyek.

### 1. Backend

```bash
cp -n backend/.env.example backend/.env     # lalu isi ADMIN_INITIAL_PASSWORD (min. 12 karakter)
cd backend
python -m venv .venv
source .venv/bin/activate                   # Windows: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

### 2. Frontend

```bash
cd frontend
yarn install
yarn dev
```

Buka http://localhost:3000. Vite meneruskan `/api` ke `http://localhost:8001`; ubah dengan variabel `VITE_API_PROXY_TARGET` bila perlu. Panel admin ada di `/admin`, login dengan `ADMIN_EMAIL` dan `ADMIN_INITIAL_PASSWORD`. Akun awal hanya dibuat saat belum ada; setelah itu ganti password lewat menu Akun.

Di GitHub Codespaces, buka port 3000 dan tambahkan URL preview ke `CORS_ORIGINS` bila login admin ditolak karena origin.

## Build produksi dengan satu proses

```bash
cd frontend && yarn install --frozen-lockfile && yarn build
cd ../backend && python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

Bila folder `frontend/dist` ada, FastAPI menyajikan situs sekaligus API di satu alamat, sehingga tidak perlu server web terpisah.

## Pengujian

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests/test_security.py -n 0
cd ../frontend && yarn typecheck && yarn lint && yarn build
```

## Keamanan produksi

- Isi `ADMIN_INITIAL_PASSWORD` dengan password kuat sebelum backend dijalankan pada database baru.
- Atur `CORS_ORIGINS` ke origin frontend yang tepat, tanpa wildcard, misalnya `https://bem.example.id`.
- Sajikan lewat HTTPS dan atur `COOKIE_SECURE=true`, termasuk bila TLS dihentikan di reverse proxy. Cookie admin memakai `HttpOnly` dan `SameSite=Lax`.
- Batasi akses MongoDB dan simpan rahasia integrasi hanya di `backend/.env` (sudah masuk `.gitignore`).

## Integrasi opsional

Semua dikonfigurasi lewat `backend/.env` (lihat `.env.example`). Bila kosong, fitur terkait dinonaktifkan dengan pesan jelas dan situs tetap berjalan.

- Email notifikasi: `EMERGENT_EMAIL_KEY`, `EMAIL_FROM_NAME`.
- Google Sheets dan Calendar: `SHEETS_CONNECTION_ID`, `CALENDAR_CONNECTION_ID`, `EMERGENT_LLM_KEY`.
- Rekap pengaduan bulanan: jadwalkan `POST /api/cron/complaint-recap` setiap tanggal 1 pukul 01.00 UTC (08.00 WIB) dengan header `Authorization: Bearer <WEBHOOK_CRON_SECRET>` dan `X-Webhook-Id` unik, misalnya lewat crontab:

```
0 1 1 * * curl -fsS -X POST -H "Authorization: Bearer $WEBHOOK_CRON_SECRET" -H "X-Webhook-Id: recap-$(date +\%Y\%m)" -H "Content-Type: application/json" -d '{}' https://domain-anda/api/cron/complaint-recap
```

Dokumentasi fitur, model data, dan endpoint ada di [memory/SPEC.md](memory/SPEC.md).

## Catatan gambar

Foto awal (hero, forum, pengabdian) dimuat dari URL eksternal. Bila gagal dimuat, situs otomatis memakai `frontend/public/images/placeholder.svg`. Ganti foto lewat panel admin (unggah JPG, PNG, atau WEBP maksimal 5 MB).
