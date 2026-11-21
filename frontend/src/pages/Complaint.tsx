import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, EyeOff, FileUp, LockKeyhole, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiUpload } from "@/lib/api";
import { errorMessage } from "@/components/admin/editors";
import PublicPageHeader from "@/components/PublicPageHeader";
import { COMPLAINT_CATEGORIES } from "@/lib/types";
import type { ComplaintCreate, ComplaintPublicStatus } from "@/lib/types";

const empty: ComplaintCreate = { category: "Perundungan (bullying)", title: "", description: "", incident_date: "", location: "", opinion: "", anonymous: true, reporter_name: "", reporter_nim: "", reporter_contact: "", commitment: false, captcha_answer: "" };
const MAX_FILES = 3;
const MAX_SIZE = 8 * 1024 * 1024;

export default function Complaint() {
  const [form, setForm] = useState<ComplaintCreate>(empty);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ComplaintPublicStatus | null>(null);
  const [trackCode, setTrackCode] = useState("");
  const set = <K extends keyof ComplaintCreate>(key: K, value: ComplaintCreate[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.append("payload", JSON.stringify(form));
      files.forEach((f) => body.append("files", f));
      return apiUpload<ComplaintPublicStatus>("/complaints", body);
    },
    onSuccess: (data) => { setResult(data); setForm(empty); setFiles([]); window.scrollTo({ top: 0, behavior: "smooth" }); },
    onError: (error) => toast.error(errorMessage(error, "Laporan gagal dikirim")),
  });
  const track = useMutation({
    mutationFn: (code: string) => apiGet<ComplaintPublicStatus>(`/complaints/status/${encodeURIComponent(code.trim())}`),
    onError: () => toast.error("Kode laporan tidak ditemukan"),
  });
  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const tooBig = picked.find((f) => f.size > MAX_SIZE);
    if (tooBig) return toast.error(`${tooBig.name} melebihi 8MB`);
    setFiles((cur) => [...cur, ...picked].slice(0, MAX_FILES));
  };

  return <main data-testid="complaint-page" className="min-h-screen bg-[#FAF7F0] text-[#2a1818]">
    <PublicPageHeader testId="complaint-header" />
    <section className="relative overflow-hidden bg-[#2d070d] px-5 pb-20 pt-16 text-white lg:px-10">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]"><span className="h-px w-8 bg-current" />Layanan pengaduan</p>
        <h1 data-testid="complaint-title" className="mt-5 max-w-3xl font-display text-5xl leading-[.98] tracking-[-.04em] md:text-7xl">Suaramu aman di sini.</h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/70">Laporkan kekerasan seksual, perundungan, kekerasan fisik maupun psikis, narkoba, atau masalah kampus lainnya di lingkungan Universitas Sali Al-Aitaam. Setiap laporan dikaji dan dimusyawarahkan oleh pengurus secara rahasia.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[[EyeOff, "Bisa anonim", "Pilih anonim, maka nama, NIM, dan kontakmu tidak disimpan sama sekali."], [LockKeyhole, "Bukti terlindungi", "File bukti hanya bisa dibuka oleh pengurus yang login."], [ShieldCheck, "Dikaji bersama", "Laporan dibahas dalam musyawarah pengurus, lalu ditindaklanjuti."]].map(([Icon, title, text], i) => {
            const I = Icon as typeof EyeOff;
            return <div data-testid={`complaint-promise-${i}`} key={i} className="rounded border border-white/10 bg-white/5 p-5 backdrop-blur"><I className="text-[#D4AF37]" size={20} /><p className="mt-4 font-display text-xl">{title as string}</p><p className="mt-1 text-sm leading-6 text-white/55">{text as string}</p></div>;
          })}
        </div>
      </div>
    </section>

    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.4fr_.6fr] lg:px-10">
      <div>
        {result ? <div data-testid="complaint-success-card" className="rounded bg-white p-8 shadow-[0_20px_70px_rgba(74,7,14,.1)] md:p-10">
          <CheckCircle2 className="text-[#1f7a4d]" size={32} />
          <h2 className="mt-5 font-display text-4xl text-[#4A070E]">Laporan terkirim.</h2>
          <p className="mt-3 text-sm leading-7 text-[#4c3737]/70">Simpan kode di bawah ini. Kode ini satu-satunya cara untuk memantau perkembangan laporanmu, terutama jika kamu melapor secara anonim.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3"><code data-testid="complaint-success-code" className="rounded bg-[#2d070d] px-5 py-3 font-mono text-2xl tracking-widest text-[#D4AF37]">{result.code}</code><button data-testid="complaint-copy-code-button" onClick={() => { navigator.clipboard?.writeText(result.code); toast.success("Kode disalin"); }} className="admin-chip">Salin kode</button></div>
          <button data-testid="complaint-new-report-button" onClick={() => setResult(null)} className="mt-8 text-xs font-bold uppercase tracking-widest text-[#4A070E] underline">Buat laporan lain</button>
        </div>
        : <form data-testid="complaint-form" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="grid gap-5 rounded bg-white p-6 shadow-[0_20px_70px_rgba(74,7,14,.08)] sm:grid-cols-2 md:p-10">
          <h2 className="font-display text-3xl text-[#4A070E] sm:col-span-2">Formulir laporan</h2>
          <label data-testid="complaint-category-field" className="field-label">Jenis masalah<select data-testid="complaint-category-select" value={form.category} onChange={(e) => set("category", e.target.value as ComplaintCreate["category"])}>{COMPLAINT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label data-testid="complaint-date-field" className="field-label">Tanggal kejadian (opsional)<input data-testid="complaint-date-input" type="date" value={form.incident_date} onChange={(e) => set("incident_date", e.target.value)} /></label>
          <label data-testid="complaint-subject-field" className="field-label sm:col-span-2">Judul singkat<input data-testid="complaint-subject-input" required minLength={5} maxLength={150} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Gambaran singkat masalah" /></label>
          <label data-testid="complaint-location-field" className="field-label sm:col-span-2">Lokasi (opsional)<input data-testid="complaint-location-input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="mis. gedung, ruang kelas, atau daring" /></label>
          <label data-testid="complaint-description-field" className="field-label sm:col-span-2">Kronologi kejadian<textarea data-testid="complaint-description-input" required minLength={30} rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ceritakan apa yang terjadi, siapa yang terlibat (bila aman), dan kapan." /><span className="text-[10px] font-normal normal-case tracking-normal text-[#8b5b60]">{form.description.length}/5000 · minimal 30 karakter</span></label>
          <label data-testid="complaint-opinion-field" className="field-label sm:col-span-2">Pendapat atau harapan penyelesaian (opsional)<textarea data-testid="complaint-opinion-input" rows={3} value={form.opinion} onChange={(e) => set("opinion", e.target.value)} /></label>

          <div data-testid="complaint-evidence-field" className="field-label sm:col-span-2">Bukti pendukung (opsional, maks. 3 file × 8MB)
            <label data-testid="complaint-evidence-dropzone" className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[#4A070E]/25 bg-[#FAF7F0] p-6 text-center text-xs font-normal normal-case tracking-normal text-[#8b5b60] hover:border-[#D4AF37]">
              <FileUp className="text-[#a17b22]" size={22} />Klik untuk memilih foto, PDF, video MP4, atau rekaman audio
              <input data-testid="complaint-evidence-input" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,audio/mpeg,audio/mp4" className="hidden" disabled={files.length >= MAX_FILES} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
            {files.map((f, i) => <div data-testid={`complaint-evidence-item-${i}`} key={i} className="flex items-center justify-between rounded bg-[#f5efe5] px-3 py-2 text-xs font-normal normal-case tracking-normal"><span className="truncate">{f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" data-testid={`complaint-evidence-remove-${i}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="text-[#8b5b60] hover:text-red-700"><Trash2 size={14} /></button></div>)}
          </div>

          <div data-testid="complaint-identity-toggle" className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
            {[[true, EyeOff, "Kirim secara anonim", "Identitas tidak disimpan"], [false, UserRound, "Sertakan identitas", "Agar pengurus bisa menghubungimu"]].map(([value, Icon, title, sub]) => {
              const I = Icon as typeof EyeOff; const active = form.anonymous === value;
              return <button type="button" data-testid={`complaint-identity-${value ? "anonymous" : "named"}-button`} key={String(value)} onClick={() => set("anonymous", value as boolean)} className={`flex items-start gap-3 rounded border p-4 text-left ${active ? "border-[#4A070E] bg-[#4A070E] text-white" : "border-[#4A070E]/15 hover:border-[#D4AF37]"}`}><I size={18} className={active ? "text-[#D4AF37]" : "text-[#8b5b60]"} /><span><b className="block text-sm">{title as string}</b><span className={`text-xs ${active ? "text-white/60" : "text-[#8b5b60]"}`}>{sub as string}</span></span></button>;
            })}
          </div>
          {!form.anonymous && <>
            <label data-testid="complaint-name-field" className="field-label">Nama<input data-testid="complaint-name-input" required value={form.reporter_name} onChange={(e) => set("reporter_name", e.target.value)} /></label>
            <label data-testid="complaint-nim-field" className="field-label">NIM (opsional)<input data-testid="complaint-nim-input" inputMode="numeric" value={form.reporter_nim} onChange={(e) => set("reporter_nim", e.target.value.replace(/\D/g, ""))} /></label>
            <label data-testid="complaint-contact-field" className="field-label sm:col-span-2">Email atau WhatsApp<input data-testid="complaint-contact-input" required value={form.reporter_contact} onChange={(e) => set("reporter_contact", e.target.value)} /></label>
          </>}

          <label data-testid="complaint-commitment-field" className="flex items-start gap-3 rounded border border-[#D4AF37]/60 bg-[#fff8e4] p-4 text-sm leading-6 text-[#4A070E] sm:col-span-2"><input data-testid="complaint-commitment-checkbox" type="checkbox" required checked={form.commitment} onChange={(e) => set("commitment", e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#4A070E]" />Saya menyatakan bahwa laporan ini benar sesuai fakta yang saya ketahui dan dapat saya pertanggungjawabkan. Saya memahami bahwa laporan palsu dapat merugikan pihak lain.</label>
          <label data-testid="complaint-captcha-field" className="field-label">Verifikasi: 7 + 5 = ?<input data-testid="complaint-captcha-input" required inputMode="numeric" value={form.captcha_answer} onChange={(e) => set("captcha_answer", e.target.value)} /></label>
          <button data-testid="complaint-submit-button" disabled={submit.isPending} className="admin-primary h-12 justify-center self-end">{submit.isPending ? "Mengirim…" : "Kirim laporan"}<ShieldCheck size={15} /></button>
        </form>}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
        <form data-testid="complaint-track-form" onSubmit={(e) => { e.preventDefault(); if (trackCode.trim()) track.mutate(trackCode); }} className="rounded bg-[#4A070E] p-6 text-white">
          <p className="font-display text-2xl">Pantau laporan</p>
          <p className="mt-1 text-sm text-white/60">Masukkan kode laporan, mis. ADU-XXXXXXXX</p>
          <div className="mt-4 flex gap-2"><input data-testid="complaint-track-input" value={trackCode} onChange={(e) => setTrackCode(e.target.value.toUpperCase())} className="h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 font-mono text-sm tracking-widest outline-none placeholder:text-white/30 focus:bg-white/15" placeholder="ADU-" /><button data-testid="complaint-track-button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[#2d070d]" aria-label="Cari"><Search size={16} /></button></div>
          {track.data && <div data-testid="complaint-track-result" className="mt-5 rounded bg-white/10 p-4 text-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{track.data.category}</p><p data-testid="complaint-track-status" className="mt-1 font-display text-2xl">{track.data.status}</p>{track.data.response && <p className="mt-2 whitespace-pre-line leading-6 text-white/70">{track.data.response}</p>}<p className="mt-3 text-xs text-white/40">Dikirim {new Date(track.data.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p></div>}
        </form>
        <div className="rounded bg-white p-6 text-sm leading-7 text-[#4c3737]/80"><p className="font-display text-2xl text-[#4A070E]">Alur penanganan</p><ol className="mt-3 space-y-2">{["Diterima", "Dikaji", "Dimusyawarahkan", "Ditindaklanjuti", "Selesai"].map((s, i) => <li key={s} className="flex gap-3"><span className="font-mono text-xs text-[#a17b22]">0{i + 1}</span>{s}</li>)}</ol><p className="mt-4 text-xs text-[#8b5b60]">Dalam keadaan darurat atau bahaya langsung, segera hubungi pihak berwajib (112) atau satgas PPKS kampus.</p></div>
      </aside>
    </div>
  </main>;
}
