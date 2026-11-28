# BEM FH UNISAL — Kabinet Abisatya 2026

## What it does
Public bilingual (ID/EN) single-page website for BEM Faculty of Law, Universitas Sali Al-Aitaam Bandung: hero, news (search/filter/detail/share), agenda, about + vision/missions, cabinet (Pimpinan + Kementerian), programs, gallery, membership registration + status page. Every public section is editable from the admin panel, so a new cabinet can take over each period without touching code.

## Data model (Mongo)
- `site_settings` (id="main"): contacts (email, whatsapp, google_form_url, address id/en), social URLs (instagram, x, youtube, linkedin), branding (logo_url, cabinet_name, period, tagline), hero slideshow (hero_image_url through hero_image_url_4, hero title/body id/en), home news count (home_news_limit, 1–12; default 4), about (title/body id/en, vision id/en, missions[] {title_id,title_en,desc_id,desc_en})
- `news`: slug (unique), category, bilingual title/excerpt/content, image_url, published_at, read_minutes, featured
- `cabinet`: name, role_id, role_en, group ("Pimpinan" | "Kementerian"), image_url, order
- `programs`, `agendas`, `gallery`: bilingual fields + `order`
- `applications`: name, nim, email (unique), whatsapp, semester, department, motivation, status (Baru/Ditinjau/Diterima/Ditolak)
- `admin_users`, `admin_sessions` (cookie sessions, 8h), `audit_logs`, `media` (uploaded images, compressed to WEBP ≤1800px), `meta` (seed version)

## Seeded cabinet (13 positions; names are SAMPLE names, replace in admin)
Pimpinan: Presiden Mahasiswa, Wakil Presiden Mahasiswa, Sekretaris Jenderal I, Sekretaris Jenderal II, Kementerian Keuangan.
Kementerian (8): Kaderisasi dan Pengembangan Profesi, Luar Negeri, Dalam Negeri, Komunikasi Informasi, Publikasi Dekorasi dan Dokumentasi, Olahraga dan Seni, Keagamaan, Wirausaha.

## Key flows
1. Visitor: ID/EN toggle, news search/filter → `/berita/:slug` → share (WA/FB/X/copy).
2. Registration: NIM 8–15 digits, Indonesian WhatsApp, email, semester 1–8, preferred ministry, captcha `7 + 5 = 12`, 3 submissions/hour/IP → `/status/:id`.
3. Admin: hamburger menu (☰) → Admin → `/admin` login. Tabs: Ringkasan, Beranda & Tentang, Berita, Kabinet, Program kerja, Agenda, Galeri, Pendaftar, Kontak & Akun, Log aktivitas. Beranda & Tentang manages the four hero slideshow images and how many latest news items appear on the home page. Kontak & Akun manages public contact and social URLs; configured Instagram, X, YouTube, and LinkedIn links appear as footer icons. Full create/edit/delete with photo upload (JPG/PNG/WEBP ≤5MB).
4. Status change on an applicant → status appears on the applicant's status-check page. "Kirim WA" opens a ready-made message for the admin to send manually.

## API (all under /api)
Public: GET /public, GET /news/{slug}, POST /applications, GET /applications/{id}, GET /media/{id}
Admin (cookie): POST /admin/login, GET /admin/me, POST /admin/logout, POST /admin/password, POST|PUT|DELETE /admin/{news|cabinet|programs|agendas|gallery}[/{id}], PUT /admin/settings, GET /admin/applications, PUT /admin/applications/{id}, GET /admin/applications/export (CSV), POST /admin/upload, GET /admin/audit

## Auth roles
Single superadmin; credentials in `memory/test_credentials.md`. 5 failed logins/minute/IP lockout.

## Deliberate defaults
Empty email/Instagram/Google Form are hidden from public and flagged on the admin dashboard. Seed photos are stored locally under `frontend/public/images`; replace via admin. Legacy integration fields remain in MongoDB but are ignored by current models and are not exposed or used.

## Added in iteration 3
- **Registration on/off**: `site_settings.registration_open`. When false the "Bergabung" nav item + section are hidden and POST /applications returns 403. Toggle in admin → Pendaftaran.
- **Cabinet archive**: `cabinet_archives` {cabinet_name, period, members[], archived_at}. POST /admin/archives snapshots the current cabinet (409 if that name+period already exists); GET /archives is public; page `/arsip`.
- **Complaints** (`/pengaduan`): multipart POST /complaints (`payload` JSON + up to 3 `files`, ≤8MB, image/pdf/mp4/audio). Requires `commitment=true` + captcha 12; 5/hour rate limit (hashed key held only in memory, IP never stored). Anonymous → name/NIM/contact blanked server-side. Returns tracking code `ADU-XXXXXXXX`; GET /complaints/status/{code} returns only category/status/response. Evidence is in `complaint_files`, served only to admins. Admin tab Pengaduan: status (Diterima→Dikaji→Dimusyawarahkan→Ditindaklanjuti→Selesai), public response, internal notes, "Teruskan ke WA" (to `complaint_whatsapp`, no identity). Email and scheduled integrations are not used.
- **History**: settings `founded_year`, `history_id/en`, `urgency_id/en`, `history_is_draft` (shows "narasi sementara" label). Section `#sejarah` on home. Seeded text is a DRAFT sample.

## Added in iteration 4
- **Roles**: `admin_users.role` = `superadmin` | `satgas`. `require_superadmin` guards content/settings/applications/archive/upload endpoints; `current_admin` (any role) guards complaints, complaint stats, GET /admin/settings, /admin/me, password. Superadmin manages accounts: GET/POST /admin/users, DELETE /admin/users/{email} (not self, not last superadmin; deletes that user's sessions). Satgas UI shows only "Pengaduan" + "Akun saya".
- **Privacy**: GET /public blanks the private `complaint_whatsapp` setting. Admin reads it from GET /admin/settings.
- **Complaint stats**: GET /admin/complaints-stats → total, active, by_category, by_status, by_month (last 6). Shown in admin overview and the Pengaduan tab (CSS bar charts).
- **Complaint handling trail**: `complaints.history[]` {at, actor (email), role, action, from_status, to_status}. Append-only via `$push`. New reports start with "Laporan masuk" (actor Sistem). Each PUT /admin/complaints/{id} adds entries only for fields that actually changed (status / response / internal notes). Shown as a timeline in the admin complaint detail; never exposed by the public status endpoint.
