# Website BEM FH UNISAL — Kabinet Abisatya

Website resmi Badan Eksekutif Mahasiswa Fakultas Hukum Universitas Sali Al-Aitaam Bandung.

**Fitur:** situs publik bilingual (ID/EN), berita, agenda, tentang & visi-misi, sejarah & urgensi, kabinet (Pimpinan + 8 Kementerian), arsip kabinet per periode, program kerja, galeri, pendaftaran anggota (bisa dibuka/ditutup, sinkron ke Google Sheets), layanan pengaduan rahasia/anonim dengan bukti & kode lacak, panel admin lengkap (`/admin`) dengan peran superadmin & satgas, statistik + rekap pengaduan bulanan anonim ke Google Sheets, jejak penanganan laporan, dan sinkron agenda ke Google Calendar.

**Stack:** FastAPI + MongoDB (motor) · React 19 + Vite + TypeScript + Tailwind v4.

## Menjalankan
```bash
cp backend/.env.example backend/.env   # isi nilainya
cd backend && pip install -r requirements.txt && uvicorn server:app --port 8001 --reload
cd frontend && yarn && yarn dev        # http://localhost:3000 (proxy /api → 8001)
```

Detail fitur, model data, dan API ada di `memory/SPEC.md`.
Akun admin awal dibuat otomatis saat backend pertama kali jalan. Segera ganti passwordnya di Admin → Kontak & Akun.
