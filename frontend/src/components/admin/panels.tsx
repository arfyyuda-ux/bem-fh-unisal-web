import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BarChart3, ChevronDown, FileText, History, MessageCircle, Save, Sheet, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { errorMessage } from "@/components/admin/editors";
import { COMPLAINT_STATUSES } from "@/lib/types";
import type { AdminRole, AdminUser, AdminUserCreate, CabinetArchive, Complaint, ComplaintStats, ComplaintUpdate, RecapResult, SiteSettings } from "@/lib/types";

const waNumber = (raw: string) => raw.replace(/\D/g, "").replace(/^0/, "62");

function ComplaintRow({ complaint, settings }: { complaint: Complaint; settings: SiteSettings }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ComplaintUpdate>({ status: complaint.status, response: complaint.response, internal_notes: complaint.internal_notes });
  const save = useMutation({
    mutationFn: () => apiPut<Complaint>(`/admin/complaints/${complaint.id}`, draft),
    onSuccess: () => { toast.success("Laporan diperbarui"); queryClient.invalidateQueries({ queryKey: ["admin-complaints"] }); queryClient.invalidateQueries({ queryKey: ["admin-complaint-stats"] }); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const waText = `Laporan pengaduan BEM FH UNISAL\nKode: ${complaint.code}\nKategori: ${complaint.category}\nJudul: ${complaint.title}\nStatus: ${complaint.status}\n\nDetail & bukti dibuka di panel admin. Mohon dijaga kerahasiaannya.`;
  const waHref = settings.complaint_whatsapp ? `https://wa.me/${waNumber(settings.complaint_whatsapp)}?text=${encodeURIComponent(waText)}` : `https://wa.me/?text=${encodeURIComponent(waText)}`;
  const urgent = ["Kekerasan seksual", "Kekerasan fisik/psikis", "Narkoba"].includes(complaint.category);
  return <div data-testid={`admin-complaint-${complaint.code}`} className="rounded bg-white">
    <button data-testid={`admin-complaint-toggle-${complaint.code}`} onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-4 text-left">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${complaint.status === "Selesai" ? "bg-[#1f7a4d]" : urgent ? "bg-red-600" : "bg-[#D4AF37]"}`} />
      <div className="min-w-0 flex-1"><p className="truncate font-display text-xl text-[#4A070E]">{complaint.title}</p><p className="truncate text-xs text-[#8b5b60]"><span className="font-mono">{complaint.code}</span> · {complaint.category} · {new Date(complaint.created_at).toLocaleDateString("id-ID")} · {complaint.anonymous ? "Anonim" : "Beridentitas"}</p></div>
      <span className="hidden rounded-full bg-[#f5efe5] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#4A070E] sm:inline">{complaint.status}</span>
      <ChevronDown size={16} className={`shrink-0 text-[#8b5b60] transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div data-testid={`admin-complaint-detail-${complaint.code}`} className="grid gap-6 border-t border-[#4A070E]/10 p-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-4 text-sm leading-7">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#a17b22]">Kronologi</p><p className="whitespace-pre-line">{complaint.description}</p></div>
        {complaint.opinion && <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#a17b22]">Pendapat / harapan</p><p className="whitespace-pre-line">{complaint.opinion}</p></div>}
        <p className="text-xs text-[#8b5b60]">Tanggal kejadian: {complaint.incident_date || "—"} · Lokasi: {complaint.location || "—"}</p>
        <div className="rounded bg-[#f5efe5] p-3 text-xs">{complaint.anonymous ? "Pelapor memilih anonim, sehingga tidak ada data identitas yang tersimpan." : <>Nama: <b>{complaint.reporter_name}</b> · NIM: {complaint.reporter_nim || "—"} · Kontak: <b>{complaint.reporter_contact}</b></>}</div>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#a17b22]">Bukti ({complaint.evidence.length})</p><div className="mt-2 flex flex-wrap gap-2">{complaint.evidence.map((f) => <a data-testid={`admin-complaint-evidence-${f.id}`} key={f.id} href={`/api/admin/complaints/files/${f.id}`} target="_blank" rel="noreferrer" className="admin-chip"><FileText size={13} />{f.filename}</a>)}{!complaint.evidence.length && <span className="text-xs text-[#8b5b60]">Tidak ada bukti dilampirkan.</span>}</div></div>
      </div>
      <div data-testid={`admin-complaint-history-${complaint.code}`} className="lg:col-span-2 lg:order-last">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#a17b22]"><History size={13} />Jejak penanganan</p>
        <ol className="mt-3 border-l border-[#4A070E]/15 pl-5">{[...(complaint.history ?? [])].reverse().map((h, i) => <li data-testid={`admin-complaint-history-entry-${complaint.code}-${i}`} key={i} className="relative pb-4 text-xs last:pb-0">
          <span className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${h.to_status === "Selesai" ? "bg-[#1f7a4d]" : h.to_status ? "bg-[#4A070E]" : "bg-[#D4AF37]"}`} />
          <p className="text-[#4A070E]"><b>{h.action}</b>{h.from_status && h.to_status && <> · {h.from_status} → <b>{h.to_status}</b></>}</p>
          <p className="mt-0.5 text-[#8b5b60]">{h.actor}{h.role && <span className="ml-1 rounded-full bg-[#f5efe5] px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{h.role}</span>} · {new Date(h.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
        </li>)}{!complaint.history?.length && <li className="text-xs text-[#8b5b60]">Belum ada riwayat (laporan lama sebelum fitur ini aktif).</li>}</ol>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <label className="field-label">Status penanganan<select data-testid={`admin-complaint-status-${complaint.code}`} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ComplaintUpdate["status"] })}>{COMPLAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field-label">Tanggapan untuk pelapor (terlihat saat cek kode)<textarea data-testid={`admin-complaint-response-${complaint.code}`} rows={3} value={draft.response} onChange={(e) => setDraft({ ...draft, response: e.target.value })} /></label>
        <label className="field-label">Catatan musyawarah (internal)<textarea data-testid={`admin-complaint-notes-${complaint.code}`} rows={3} value={draft.internal_notes} onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2"><button data-testid={`admin-complaint-save-${complaint.code}`} disabled={save.isPending} className="admin-primary"><Save size={14} />Simpan</button><a data-testid={`admin-complaint-whatsapp-${complaint.code}`} href={waHref} target="_blank" rel="noreferrer" className="admin-chip !bg-[#1f7a4d] !text-white"><MessageCircle size={13} />Teruskan ke WA</a></div>
      </form>
    </div>}
  </div>;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const CATEGORY_COLORS = ["#b3141f", "#d9772b", "#8a1c5c", "#4b3f9e", "#1f6f8b", "#2f7d4f", "#8b7d6b"];

export function ComplaintStatsPanel() {
  const query = useQuery({ queryKey: ["admin-complaint-stats"], queryFn: () => apiGet<ComplaintStats>("/admin/complaints-stats") });
  const stats = query.data;
  if (!stats) return <div data-testid="complaint-stats-loading" className="mt-8 h-56 animate-pulse rounded bg-white" />;
  const maxCat = Math.max(1, ...stats.by_category.map((c) => c.count));
  const maxMonth = Math.max(1, ...stats.by_month.map((c) => c.count));
  return <div data-testid="complaint-stats-panel" className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
    <div className="rounded bg-white p-6">
      <div className="flex items-center justify-between"><p className="font-display text-2xl text-[#4A070E]">Laporan per kategori</p><BarChart3 size={18} className="text-[#a17b22]" /></div>
      <p className="mt-1 text-xs text-[#8b5b60]">{stats.total} laporan total · {stats.active} masih diproses</p>
      <div data-testid="complaint-stats-categories" className="mt-6 space-y-3">{stats.by_category.map((c, i) => <div data-testid={`complaint-stat-category-${i}`} key={c.label} className="grid grid-cols-[150px_1fr_28px] items-center gap-3 text-xs sm:grid-cols-[180px_1fr_32px]">
        <span className="truncate text-[#4c3737]">{c.label}</span>
        <div className="h-3 overflow-hidden rounded-full bg-[#f5efe5]"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(c.count / maxCat) * 100}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} /></div>
        <b className="text-right font-mono text-[#4A070E]">{c.count}</b>
      </div>)}</div>
    </div>
    <div className="grid gap-4">
      <div className="rounded bg-white p-6"><p className="font-display text-2xl text-[#4A070E]">6 bulan terakhir</p>
        <div data-testid="complaint-stats-months" className="mt-5 flex h-28 items-end gap-2">{stats.by_month.map((m) => <div key={m.label} className="flex flex-1 flex-col items-center gap-1"><span className="font-mono text-[10px] text-[#4A070E]">{m.count}</span><div className="w-full rounded-t bg-[#4A070E] transition-[height] duration-700" style={{ height: `${Math.max(4, (m.count / maxMonth) * 80)}px` }} /><span className="text-[10px] text-[#8b5b60]">{MONTH_NAMES[Number(m.label.slice(5)) - 1]}</span></div>)}</div>
      </div>
      <div className="rounded bg-white p-6"><p className="font-display text-2xl text-[#4A070E]">Status</p><div data-testid="complaint-stats-statuses" className="mt-3 flex flex-wrap gap-2">{stats.by_status.map((st) => <span key={st.label} className="rounded-full bg-[#f5efe5] px-3 py-1 text-xs text-[#4A070E]">{st.label} <b>{st.count}</b></span>)}</div></div>
    </div>
  </div>;
}

function RecapControl({ settings }: { settings: SiteSettings }) {
  const queryClient = useQueryClient();
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [month, setMonth] = useState(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  const recap = useMutation({
    mutationFn: () => apiPost<RecapResult>("/admin/complaints/recap", { month }),
    onSuccess: (r) => { toast.success(`Rekap ${r.month} ${r.updated ? "diperbarui" : "dikirim"} (${r.total} laporan)`); queryClient.invalidateQueries({ queryKey: ["public-content"] }); },
    onError: (e) => toast.error(errorMessage(e, "Rekap gagal dikirim")),
  });
  return <div data-testid="complaint-recap-panel" className="mt-4 flex flex-wrap items-end gap-3 rounded border border-[#4A070E]/10 bg-white p-5 text-sm">
    <Sheet size={18} className="mb-2 text-[#1f7a4d]" />
    <div className="min-w-[220px] flex-1"><p className="font-semibold text-[#4A070E]">Rekap bulanan ke Google Sheets</p><p className="text-xs text-[#8b5b60]">Hanya berisi jumlah per kategori dan status, tanpa identitas atau isi laporan. Terkirim otomatis setiap tanggal 1 pukul 08.00 WIB.</p></div>
    <label className="field-label">Bulan<input data-testid="complaint-recap-month-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
    <button data-testid="complaint-recap-send-button" disabled={recap.isPending} onClick={() => recap.mutate()} className="admin-primary">{recap.isPending ? "Mengirim…" : "Kirim rekap"}</button>
    {settings.recap_spreadsheet_id && <a data-testid="complaint-recap-open-link" href={`https://docs.google.com/spreadsheets/d/${settings.recap_spreadsheet_id}/edit`} target="_blank" rel="noreferrer" className="admin-chip">Buka rekap</a>}
  </div>;
}

export function UsersPanel({ me }: { me: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminUserCreate>({ email: "", password: "", role: "satgas" });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => apiGet<AdminUser[]>("/admin/users") });
  const create = useMutation({ mutationFn: () => apiPost<AdminUser>("/admin/users", form), onSuccess: (u) => { toast.success(`Akun ${u.email} dibuat`); setForm({ email: "", password: "", role: "satgas" }); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); }, onError: (e) => toast.error(errorMessage(e, "Gagal membuat akun")) });
  const remove = useMutation({ mutationFn: (email: string) => apiDelete(`/admin/users/${encodeURIComponent(email)}`), onSuccess: () => { toast.success("Akun dihapus"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); }, onError: (e) => toast.error(errorMessage(e, "Gagal menghapus")) });
  return <div data-testid="admin-users-panel">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">Akses</p>
    <h1 className="mt-3 font-display text-5xl text-[#4A070E]">Pengguna admin.</h1>
    <p className="mt-4 max-w-2xl text-sm text-[#8b5b60]"><b>Satgas</b> hanya bisa membuka menu Pengaduan beserta statistik dan rekapnya. Data pendaftar, konten, dan pengaturan tidak bisa mereka akses. <b>Superadmin</b> bisa membuka semua menu.</p>
    <form data-testid="admin-user-create-form" onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="mt-8 grid gap-4 rounded bg-white p-6 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
      <label className="field-label">Email<input data-testid="admin-user-email-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="field-label">Password awal (min. 10)<input data-testid="admin-user-password-input" type="text" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <label className="field-label">Peran<select data-testid="admin-user-role-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}><option value="satgas">Satgas</option><option value="superadmin">Superadmin</option></select></label>
      <button data-testid="admin-user-create-button" disabled={create.isPending} className="admin-primary justify-center"><UserPlus size={14} />Buat akun</button>
    </form>
    <div data-testid="admin-users-list" className="mt-6 space-y-2">{users.data?.map((u) => <div data-testid={`admin-user-row-${u.email}`} key={u.email} className="flex items-center gap-4 rounded bg-white p-4"><div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#4A070E]">{u.email}{u.email === me && <span className="ml-2 text-xs font-normal text-[#8b5b60]">(Anda)</span>}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${u.role === "superadmin" ? "bg-[#4A070E] text-[#D4AF37]" : "bg-[#f5efe5] text-[#4A070E]"}`}>{u.role}</span>{u.email !== me && <button data-testid={`admin-user-delete-${u.email}`} onClick={() => { if (window.confirm(`Hapus akun ${u.email}? Akun akan langsung keluar dari semua perangkat.`)) remove.mutate(u.email); }} className="admin-icon" aria-label="Hapus"><Trash2 size={15} /></button>}</div>)}</div>
  </div>;
}

export function ComplaintsPanel({ settings }: { settings: SiteSettings }) {
  const [filter, setFilter] = useState("Semua");
  const query = useQuery({ queryKey: ["admin-complaints"], queryFn: () => apiGet<Complaint[]>("/admin/complaints") });
  const rows = (query.data ?? []).filter((c) => filter === "Semua" || (filter === "Aktif" ? c.status !== "Selesai" : c.status === filter));
  return <div data-testid="admin-complaints-panel">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">Rahasia</p>
    <h1 className="mt-3 font-display text-5xl text-[#4A070E]">Pengaduan.</h1>
    <p className="mt-4 max-w-2xl text-sm text-[#8b5b60]">Email pemberitahuan dikirim otomatis ke {settings.complaint_email ? <b>{settings.complaint_email}</b> : "alamat yang diisi di Kontak & Akun (saat ini masih kosong)"}. Email itu tidak memuat identitas pelapor. Gunakan tombol WA untuk meneruskan ringkasan ke pengurus.</p>
    <ComplaintStatsPanel />
    <RecapControl settings={settings} />
    <div data-testid="admin-complaints-filters" className="mt-6 flex flex-wrap gap-2">{["Semua", "Aktif", ...COMPLAINT_STATUSES].map((f) => <button data-testid={`admin-complaints-filter-${f.toLowerCase()}`} key={f} onClick={() => setFilter(f)} className={`admin-chip ${filter === f ? "!bg-[#4A070E] !text-white" : ""}`}>{f}</button>)}</div>
    <div className="mt-6 space-y-3">{rows.map((c) => <ComplaintRow key={c.id} complaint={c} settings={settings} />)}{!rows.length && <p data-testid="admin-complaints-empty" className="rounded bg-white p-8 text-center text-sm text-[#8b5b60]">{query.isLoading ? "Memuat…" : "Belum ada laporan."}</p>}</div>
  </div>;
}

export function ArchivePanel({ settings }: { settings: SiteSettings }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["archives"], queryFn: () => apiGet<CabinetArchive[]>("/archives") });
  const create = useMutation({ mutationFn: () => apiPost<CabinetArchive>("/admin/archives"), onSuccess: () => { toast.success("Kabinet diarsipkan"); queryClient.invalidateQueries({ queryKey: ["archives"] }); }, onError: (e) => toast.error(errorMessage(e, "Gagal mengarsipkan")) });
  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`/admin/archives/${id}`), onSuccess: () => { toast.success("Arsip dihapus"); queryClient.invalidateQueries({ queryKey: ["archives"] }); }, onError: (e) => toast.error(errorMessage(e)) });
  return <div data-testid="admin-archive-panel">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">Pergantian periode</p>
    <h1 className="mt-3 font-display text-5xl text-[#4A070E]">Arsip kabinet.</h1>
    <div className="mt-8 rounded border border-[#D4AF37]/60 bg-[#fff8e4] p-6 text-sm leading-7 text-[#4A070E]">
      <p><b>Langkah pergantian:</b> 1) Arsipkan kabinet saat ini, 2) ubah Nama kabinet & Periode di Beranda & Tentang, 3) perbarui pengurus di menu Kabinet. Arsip tetap bisa dilihat publik di halaman /arsip.</p>
      <button data-testid="admin-archive-create-button" disabled={create.isPending} onClick={() => { if (window.confirm(`Arsipkan ${settings.cabinet_name} periode ${settings.period}?`)) create.mutate(); }} className="admin-primary mt-4"><Archive size={14} />Arsipkan {settings.cabinet_name} {settings.period}</button>
    </div>
    <div data-testid="admin-archive-list" className="mt-8 space-y-3">{query.data?.map((a) => <div data-testid={`admin-archive-row-${a.id}`} key={a.id} className="flex items-center gap-4 rounded bg-white p-4"><div className="min-w-0 flex-1"><p className="font-display text-xl text-[#4A070E]">{a.cabinet_name} · {a.period}</p><p className="text-xs text-[#8b5b60]">{a.members.length} pengurus · diarsipkan {new Date(a.archived_at).toLocaleDateString("id-ID")}</p></div><button data-testid={`admin-archive-delete-${a.id}`} onClick={() => { if (window.confirm("Hapus arsip ini?")) remove.mutate(a.id); }} className="admin-icon" aria-label="Hapus"><Trash2 size={15} /></button></div>)}{!query.data?.length && <p data-testid="admin-archive-empty" className="rounded bg-white p-8 text-center text-sm text-[#8b5b60]">Belum ada arsip.</p>}</div>
  </div>;
}
