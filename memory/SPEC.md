# BEM FH UNISAL — Kabinet Abisatya 2026

## What it does
Public bilingual (ID/EN) single-page website for BEM Faculty of Law, Universitas Sali Al-Aitaam Bandung: hero, news (search/filter/detail/share), agenda, about + vision/missions, cabinet (Pimpinan + Kementerian), programs, gallery, membership registration + status page. Every public section is editable from the admin panel, so a new cabinet can take over each period without touching code.

## Data model (Mongo)
- `site_settings` (id="main"): contacts (email, whatsapp, google_form_url, address id/en), social URLs (instagram, x, youtube, linkedin), branding (logo_url, cabinet_name, period, tagline), hero slideshow (hero_image_url through hero_image_url_4, hero title/body id/en), home news count (home_news_limit, 1–12; default 4), about (title/body id/en, vision id/en, missions[] {title_id,title_en,desc_id,desc_en})
- `news`: slug (unique), category, bilingual title/excerpt/content, image_url, published_at, read_minutes, featured
- `cabinet`: name, role_id, role_en, group ("Pimpinan" | "Kementerian"), image_url, order
- `programs`, `agendas`, `gallery`: bilingual fields + `order`
- `applications`: name, nim, email (unique), whatsapp, semester, department, motivation, status (Baru/Ditinjau/Diterima/Ditolak), email_notification, notified_at
- `admin_users`, `admin_sessions` (cookie sessions, 8h), `audit_logs`, `media` (uploaded images, compressed to WEBP ≤1800px), `meta` (seed version)

## Seeded cabinet (13 positions; names are SAMPLE names, replace in admin)
Pimpinan: Presiden Mahasiswa, Wakil Presiden Mahasiswa, Sekretaris Jenderal I, Sekretaris Jenderal II, Kementerian Keuangan.
Kementerian (8): Kaderisasi dan Pengembangan Profesi, Luar Negeri, Dalam Negeri, Komunikasi Informasi, Publikasi Dekorasi dan Dokumentasi, Olahraga dan Seni, Keagamaan, Wirausaha.

## Key flows
1. Visitor: ID/EN toggle, news search/filter → `/berita/:slug` → share (WA/FB/X/copy).
2. Registration: NIM 8–15 digits, Indonesian WhatsApp, email, semester 1–8, preferred ministry, captcha `7 + 5 = 12`, 3 submissions/hour/IP → `/status/:id`.
3. Admin: hamburger menu (☰) → Admin → `/admin` login. Tabs: Ringkasan, Beranda & Tentang, Berita, Kabinet, Program kerja, Agenda, Galeri, Pendaftar, Kontak & Akun, Log aktivitas. Beranda & Tentang manages the four hero slideshow images and how many latest news items appear on the home page. Kontak & Akun manages public contact and social URLs; configured Instagram, X, YouTube, and LinkedIn links appear as footer icons. Full create/edit/delete with photo upload (JPG/PNG/WEBP ≤5MB).
4. Status change on an applicant → email sent automatically through the configured email provider (sender name "BEM FH UNISAL") in the background; result shown in "Email notifikasi" column. "Kirim WA" button opens wa.me with a ready-made message (sent manually by the admin).

## API (all under /api)
Public: GET /public, GET /news/{slug}, POST /applications, GET /applications/{id}, GET /media/{id}
Admin (cookie): POST /admin/login, GET /admin/me, POST /admin/logout, POST /admin/password, POST|PUT|DELETE /admin/{news|cabinet|programs|agendas|gallery}[/{id}], PUT /admin/settings, GET /admin/applications, PUT /admin/applications/{id}, GET /admin/applications/export (CSV), POST /admin/upload, GET /admin/audit

## Auth roles
Single superadmin; credentials in `memory/test_credentials.md`. 5 failed logins/minute/IP lockout.

## Deliberate defaults
Empty email/Instagram/Google Form are hidden from public and flagged on the admin dashboard. Initial photos are AI-generated; replace via admin.

## Added in iteration 3
- **Registration on/off**: `site_settings.registration_open`. When false the "Bergabung" nav item + section are hidden and POST /applications returns 403. Toggle in admin → Pendaftaran.
- **Google Sheets sync**: `sheet_sync_enabled` + `sheet_spreadsheet_id` (link or ID). Saving settings with sync on and an empty ID creates "Pendaftar BEM FH UNISAL" in the connected Google account (connection id in backend/.env `SHEETS_CONNECTION_ID`) and writes a header row. Each new application is appended in a background task; result in `applications.sheet_sync`. POST /admin/sheets/sync-all pushes unsynced rows. Current spreadsheet: 1aSstd-3915D6stxwu8HHnuTVVGIepWM88_w78iihAkM.
- **Cabinet archive**: `cabinet_archives` {cabinet_name, period, members[], archived_at}. POST /admin/archives snapshots the current cabinet (409 if that name+period already exists); GET /archives is public; page `/arsip`.
- **Complaints** (`/pengaduan`): multipart POST /complaints (`payload` JSON + up to 3 `files`, ≤8MB, image/pdf/mp4/audio). Requires `commitment=true` + captcha 12; 5/hour rate limit (hashed key held only in memory, IP never stored). Anonymous → name/NIM/contact blanked server-side. Returns tracking code `ADU-XXXXXXXX`; GET /complaints/status/{code} returns only category/status/response. Evidence is in `complaint_files`, served only to admins. Admin tab Pengaduan: status (Diterima→Dikaji→Dimusyawarahkan→Ditindaklanjuti→Selesai), public response, internal notes, "Teruskan ke WA" (to `complaint_whatsapp`, no identity). New report → email to `complaint_email` (no identity) if set.
- **History**: settings `founded_year`, `history_id/en`, `urgency_id/en`, `history_is_draft` (shows "narasi sementara" label). Section `#sejarah` on home. Seeded text is a DRAFT sample.

## Added in iteration 4
- **Roles**: `admin_users.role` = `superadmin` | `satgas`. `require_superadmin` guards all content/settings/applications/archive/upload/sheets/calendar endpoints; `current_admin` (any role) guards complaints, complaint stats/recap, GET /admin/settings, /admin/me, password. Superadmin manages accounts: GET/POST /admin/users, DELETE /admin/users/{email} (not self, not last superadmin; deletes that user's sessions). Satgas UI shows only "Pengaduan" + "Akun saya".
- **Privacy**: GET /public blanks private settings (sheet/recap/calendar IDs, complaint recipients, sync flags). Admin reads full settings from GET /admin/settings.
- **Complaint stats**: GET /admin/complaints-stats → total, active, by_category, by_status, by_month (last 6). Shown in admin overview and the Pengaduan tab (CSS bar charts).
- **Monthly recap**: separate spreadsheet "Rekap Pengaduan BEM FH UNISAL (anonim)" (`recap_spreadsheet_id`, created on first send, server-managed). One row per month containing counts only. Re-sending a month overwrites its row (`recap_log`). Manual: POST /admin/complaints/recap {month}. Cron: the `complaint-recap` cron (see README) "0 1 1 * *" UTC (08:00 WIB on the 1st) → POST /api/cron/complaint-recap (Bearer WEBHOOK_CRON_SECRET, idempotent by X-Webhook-Id in `cron_runs`, background work).
- **Google Calendar**: `calendar_sync_enabled` + `calendar_id` (calendar "Agenda BEM FH UNISAL" auto-created; connection `CALENDAR_CONNECTION_ID`). Agendas have `date` (YYYY-MM-DD), `time_start`/`time_end` (HH:MM WIB, optional = all-day). day/month are derived from date. Create/update/delete of an agenda creates/updates/deletes the event in the background (`calendar_event_id`), with reminders 1h popup + 1 day email. POST /admin/calendar/sync-all pushes all dated agendas. The 3 seeded sample agendas were intentionally NOT pushed to the user's calendar.
- **Complaint handling trail**: `complaints.history[]` {at, actor (email), role, action, from_status, to_status}. Append-only via `$push`. New reports start with "Laporan masuk" (actor Sistem). Each PUT /admin/complaints/{id} adds entries only for fields that actually changed (status / response / internal notes). Shown as a timeline in the admin complaint detail; never exposed by the public status endpoint.
