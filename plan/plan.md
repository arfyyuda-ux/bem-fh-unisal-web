# Website Resmi BEM FH UNISAL — Kabinet Abisatya 2026

## Apa ini
Website resmi Badan Eksekutif Mahasiswa Fakultas Hukum Universitas Sali Al-Aitaam Bandung, dibangun ulang sesuai dokumen "Prompt Master versi sempurna": situs publik satu halaman bilingual + halaman detail berita + panel admin. Semua perbaikan hasil audit di dokumen (konten tanpa placeholder, validasi form, SEO, keamanan admin) diimplementasikan.

## Untuk siapa
- **Publik**: mahasiswa FH UNISAL dan masyarakat — membaca berita/agenda, melihat kabinet & program kerja, mendaftar keanggotaan.
- **Pengurus (admin)**: mengelola seluruh konten, foto, pengaturan kontak, dan data pendaftar.

## Fitur inti & pengalaman
- **Identitas visual sesuai referensi**: maroon #4A070E, emas #D4AF37, krem #FAF7F0; navbar blur transparan→solid; hero megah dengan emblem logo + dua tombol; marquee nilai berjalan; kartu berita + sidebar agenda sticky + kartu presiden; visi-misi bernomor 01–04; grid kabinet 4 kolom; badge status proker; galeri hover-zoom; footer maroon 4 kartu kontak. Animasi reveal saat scroll, hormat pada `prefers-reduced-motion`.
  - *Catatan keputusan*: font Cinzel & Cormorant Garamond tidak tersedia di lingkungan — dipakai padanan Playfair Display (judul display) + Lora italic (kutipan) + Plus Jakarta Sans (body).
- **Bilingual ID/EN**: toggle di navbar, preferensi tersimpan di browser, tanggal mengikuti bahasa, fallback ke ID bila EN kosong.
- **Berita**: pencarian dengan jeda ketik, filter kategori, estimasi waktu baca, skeleton saat memuat, pesan rapi saat kosong.
- **Detail berita** `/berita/:slug`: judul & gambar terindeks mesin pencari + tombol bagikan WhatsApp/Facebook/X.
- **Pendaftaran**: validasi ketat NIM (angka 8–15 digit), WhatsApp format Indonesia, email, semester 1–8, departemen; captcha sederhana + pembatasan pengiriman per IP; toast sukses/gagal; halaman/status pendaftaran + tombol "Daftar via Google Form" bila diisi admin.
- **Panel admin** `/admin`: login email+password (sesi cookie aman berkedaluwarsa, pembatasan 5 percobaan/menit), dashboard statistik, CRUD lengkap semua konten + unggah foto (jpg/png/webp ≤2MB, otomatis dipadatkan), pengaturan kontak & link Google Form, kelola pendaftar (ubah status, export CSV/Excel), audit log aktivitas, dan peringatan "jangan publish bila kontak masih placeholder".
- **Kebijakan placeholder**: email & Instagram tidak diisi → disembunyikan dari publik (bukan tampil "[email BEM]"); nama pengurus tanpa foto → fallback inisial bergaya.

## Fase 1 — yang dibangun sekarang
1. **Situs publik lengkap**: beranda satu halaman dengan semua section + detail berita + form pendaftaran, bilingual, responsif 360–1440px tanpa scroll horizontal.
2. **Panel admin lengkap**: login, CRUD semua konten, upload foto, pengaturan, kelola pendaftar + export, audit log, health check.
3. **Konten awal realistis** dari dokumen (tagline, visi, 4 misi, 8 posisi kabinet, 5 proker, berita, 3 agenda, galeri) — foto pengurus/presiden/berita/galeri digenerate AI sebagai konten awal yang layak tampil, nanti diganti foto asli lewat admin.
4. **Satu akun superadmin awal** dibuat otomatis; kredensial dicatat dan diserahkan ke pemilik untuk diganti.
5. **Standar selesai (sesuai dokumen)**: tanpa placeholder terlihat, semua tombol/filter/search/form berfungsi, EN lengkap, detail berita bisa dibuka & dibagikan, admin bisa login → tambah berita → muncul di publik → export pendaftar.
