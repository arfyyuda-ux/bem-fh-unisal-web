import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, LogOut, MessageCircle, Plus, Save, Shield, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import { CollectionEditor, errorMessage, FieldInput } from "@/components/admin/editors";
import { ArchivePanel, ComplaintStatsPanel, ComplaintsPanel, UsersPanel } from "@/components/admin/panels";
import type { Draft, FieldDef } from "@/components/admin/editors";
import type { AdminUser, Application, Complaint, ApplicationStatus, AuditLog, PublicContent, SettingsUpdate, SiteSettings } from "@/lib/types";

type Tab = "overview" | "home" | "news" | "cabinet" | "archive" | "programs" | "agendas" | "gallery" | "applications" | "complaints" | "contact" | "users" | "account" | "audit";
const TABS: [Tab, string][] = [["overview", "Ringkasan"], ["home", "Beranda & Tentang"], ["news", "Berita"], ["cabinet", "Kabinet"], ["archive", "Arsip kabinet"], ["programs", "Program kerja"], ["agendas", "Agenda"], ["gallery", "Galeri"], ["applications", "Pendaftaran"], ["complaints", "Pengaduan"], ["contact", "Kontak & Akun"], ["users", "Pengguna"], ["audit", "Log aktivitas"]];
const SATGAS_TABS: [Tab, string][] = [["complaints", "Pengaduan"], ["account", "Akun saya"]];
const STATUSES: ApplicationStatus[] = ["Baru", "Ditinjau", "Diterima", "Ditolak"];
const today = new Date().toISOString().slice(0, 10);

const NEWS_FIELDS: FieldDef[] = [
  { key: "title_id", label: "Judul (ID)", required: true }, { key: "title_en", label: "Title (EN)" },
  { key: "slug", label: "Slug URL", required: true, hint: "huruf kecil & tanda hubung, mis. rapat-kerja-2026" }, { key: "category", label: "Kategori", required: true },
  { key: "published_at", label: "Tanggal", type: "date", required: true }, { key: "read_minutes", label: "Menit baca", type: "number" },
  { key: "image_url", label: "Foto berita", type: "image" },
  { key: "excerpt_id", label: "Ringkasan (ID)", type: "textarea", required: true }, { key: "excerpt_en", label: "Summary (EN)", type: "textarea" },
  { key: "content_id", label: "Isi berita (ID)", type: "textarea", required: true }, { key: "content_en", label: "Content (EN)", type: "textarea" },
  { key: "featured", label: "Jadikan berita utama", type: "checkbox" },
];
const CABINET_FIELDS: FieldDef[] = [
  { key: "name", label: "Nama lengkap", required: true }, { key: "group", label: "Kelompok", type: "select", options: ["Pimpinan", "Kementerian"] },
  { key: "role_id", label: "Jabatan (ID)", required: true, wide: true }, { key: "role_en", label: "Position (EN)", wide: true },
  { key: "order", label: "Urutan tampil", type: "number" }, { key: "image_url", label: "Foto pengurus", type: "image" },
];
const PROGRAM_FIELDS: FieldDef[] = [
  { key: "number", label: "Nomor", required: true }, { key: "status", label: "Status", type: "select", options: ["Berjalan", "Segera", "Selesai"] },
  { key: "title_id", label: "Nama program (ID)", required: true }, { key: "title_en", label: "Program name (EN)" },
  { key: "description_id", label: "Deskripsi (ID)", type: "textarea", required: true }, { key: "description_en", label: "Description (EN)", type: "textarea" },
  { key: "order", label: "Urutan tampil", type: "number" },
];
const AGENDA_FIELDS: FieldDef[] = [
  { key: "date", label: "Tanggal", type: "date", required: true }, { key: "time_start", label: "Jam mulai (opsional, mis. 09:00)", hint: "kosong = acara seharian" },
  { key: "time_end", label: "Jam selesai (opsional)" },
  { key: "title_id", label: "Judul (ID)", required: true }, { key: "title_en", label: "Title (EN)" },
  { key: "location_id", label: "Lokasi (ID)", required: true }, { key: "location_en", label: "Location (EN)" },
  { key: "order", label: "Urutan tampil", type: "number" },
];
const GALLERY_FIELDS: FieldDef[] = [
  { key: "image_url", label: "Foto dokumentasi", type: "image", required: true },
  { key: "caption_id", label: "Keterangan (ID)", required: true }, { key: "caption_en", label: "Caption (EN)" },
  { key: "year", label: "Tahun", required: true }, { key: "order", label: "Urutan tampil", type: "number" },
];
const HOME_FIELDS: FieldDef[] = [
  { key: "cabinet_name", label: "Nama kabinet", required: true }, { key: "period", label: "Periode", required: true, hint: "mis. 2026 atau 2026/2027" },
  { key: "hero_image_url", label: "Foto slideshow 1 (utama)", type: "image", hint: "Atur empat foto slideshow dari sini. Slot kosong akan dilengkapi dari galeri, berita, dan foto kabinet." },
  { key: "hero_image_url_2", label: "Foto slideshow 2", type: "image" },
  { key: "hero_image_url_3", label: "Foto slideshow 3", type: "image" },
  { key: "hero_image_url_4", label: "Foto slideshow 4", type: "image" },
  { key: "home_news_limit", label: "Jumlah berita terbaru di beranda", type: "number", min: 1, max: 12, required: true, hint: "1–12 berita terbaru. Berita lainnya tersedia lewat Selengkapnya." },
  { key: "logo_url", label: "Logo", type: "image" },
  { key: "hero_title_id", label: "Judul hero (ID)", wide: true, required: true }, { key: "hero_title_en", label: "Hero title (EN)", wide: true },
  { key: "hero_body_id", label: "Deskripsi hero (ID)", type: "textarea" }, { key: "hero_body_en", label: "Hero description (EN)", type: "textarea" },
  { key: "tagline_id", label: "Tagline (ID)" }, { key: "tagline_en", label: "Tagline (EN)" },
  { key: "about_title_id", label: "Judul Tentang (ID)", required: true }, { key: "about_title_en", label: "About title (EN)" },
  { key: "about_body_id", label: "Isi Tentang (ID)", type: "textarea" }, { key: "about_body_en", label: "About text (EN)", type: "textarea" },
  { key: "vision_id", label: "Visi (ID)", type: "textarea" }, { key: "vision_en", label: "Vision (EN)", type: "textarea" },
  { key: "founded_year", label: "Tahun berdiri", required: true }, { key: "history_is_draft", label: "Tampilkan label \"narasi sementara\" di Sejarah", type: "checkbox" },
  { key: "history_id", label: "Sejarah berdiri (ID)", type: "textarea" }, { key: "history_en", label: "History (EN)", type: "textarea" },
  { key: "urgency_id", label: "Urgensi / mengapa BEM penting (ID)", type: "textarea" }, { key: "urgency_en", label: "Why it matters (EN)", type: "textarea" },
];
const REGISTRATION_FIELDS: FieldDef[] = [
  { key: "registration_open", label: "Pendaftaran dibuka (tampilkan bagian Bergabung di situs)", type: "checkbox", wide: true },
];
const CONTACT_FIELDS: FieldDef[] = [
  { key: "email", label: "Email publik", hint: "kosongkan untuk menyembunyikan" },
  { key: "instagram", label: "Instagram URL", hint: "mis. https://instagram.com/bemfhunisal" }, { key: "x", label: "X URL", hint: "kosongkan untuk menyembunyikan" },
  { key: "youtube", label: "YouTube URL", hint: "kosongkan untuk menyembunyikan" }, { key: "linkedin", label: "LinkedIn URL", hint: "kosongkan untuk menyembunyikan" },
  { key: "whatsapp", label: "WhatsApp", hint: "format 62812xxxx" }, { key: "google_form_url", label: "Google Form URL", hint: "kosongkan bila tidak dipakai" },
  { key: "address_id", label: "Alamat (ID)", wide: true, required: true }, { key: "address_en", label: "Address (EN)", wide: true },
  { key: "complaint_whatsapp", label: "WhatsApp penerima laporan", hint: "untuk tombol Teruskan ke WA, format 62812xxxx" },
];

const waNumber = (raw: string) => raw.replace(/\D/g, "").replace(/^0/, "62");
const waMessage = (app: Application, cabinet: string) => `Halo ${app.name}, kami dari BEM FH UNISAL (${cabinet}). Status pendaftaranmu saat ini: *${app.status}*. Terima kasih telah mendaftar!`;

function SettingsForm({ settings, fields, testId, title, eyebrow, children }: { settings: SiteSettings; fields: FieldDef[]; testId: string; title: string; eyebrow: string; children?: (draft: SettingsUpdate, set: (d: SettingsUpdate) => void) => React.ReactNode }) {
  const queryClient = useQueryClient();
  const { id: _id, ...initial } = settings;
  const [draft, setDraft] = useState<SettingsUpdate>(initial);
  const save = useMutation({
    mutationFn: () => apiPut<SiteSettings>("/admin/settings", draft),
    onSuccess: (saved) => { const { id: _savedId, ...rest } = saved; setDraft(rest); toast.success("Pengaturan disimpan"); queryClient.invalidateQueries({ queryKey: ["public-content"] }); queryClient.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const record = draft as unknown as Draft;
  return <div data-testid={testId}>
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">{eyebrow}</p>
    <h1 className="mt-3 font-display text-5xl text-[#4A070E]">{title}</h1>
    <form data-testid={`${testId}-form`} onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="mt-8 grid gap-4 rounded bg-white p-6 sm:grid-cols-2">
      {fields.map((field) => <FieldInput key={field.key} field={field} value={record[field.key]} testPrefix={testId} onChange={(v) => setDraft((d) => ({ ...d, [field.key]: v }))} />)}
      {children?.(draft, setDraft)}
      <button data-testid={`${testId}-save-button`} disabled={save.isPending} className="admin-primary justify-center sm:col-span-2"><Save size={15} />{save.isPending ? "Menyimpan…" : "Simpan perubahan"}</button>
    </form>
  </div>;
}

function MissionsEditor({ draft, setDraft }: { draft: SettingsUpdate; setDraft: (d: SettingsUpdate) => void }) {
  const update = (index: number, key: keyof SettingsUpdate["missions"][number], value: string) => setDraft({ ...draft, missions: draft.missions.map((m, i) => (i === index ? { ...m, [key]: value } : m)) });
  return <div data-testid="missions-editor" className="sm:col-span-2">
    <div className="flex items-center justify-between border-t border-[#4A070E]/10 pt-5"><p className="font-display text-2xl text-[#4A070E]">Misi</p><button type="button" data-testid="missions-add-button" onClick={() => setDraft({ ...draft, missions: [...draft.missions, { title_id: "", title_en: "", desc_id: "", desc_en: "" }] })} className="admin-chip"><Plus size={13} />Tambah misi</button></div>
    <div className="mt-4 space-y-4">{draft.missions.map((mission, index) => <div data-testid={`mission-editor-${index}`} key={index} className="grid gap-3 border border-[#4A070E]/10 p-4 sm:grid-cols-2">
      <div className="flex items-center justify-between sm:col-span-2"><span className="font-mono text-xs text-[#a17b22]">{String(index + 1).padStart(2, "0")}</span><button type="button" data-testid={`mission-remove-${index}`} onClick={() => setDraft({ ...draft, missions: draft.missions.filter((_, i) => i !== index) })} className="text-[#8b5b60] hover:text-red-700"><Trash2 size={14} /></button></div>
      <label className="field-label">Judul (ID)<input data-testid={`mission-title-id-${index}`} required value={mission.title_id} onChange={(e) => update(index, "title_id", e.target.value)} /></label>
      <label className="field-label">Title (EN)<input data-testid={`mission-title-en-${index}`} value={mission.title_en} onChange={(e) => update(index, "title_en", e.target.value)} /></label>
      <label className="field-label">Deskripsi (ID)<input data-testid={`mission-desc-id-${index}`} required value={mission.desc_id} onChange={(e) => update(index, "desc_id", e.target.value)} /></label>
      <label className="field-label">Description (EN)<input data-testid={`mission-desc-en-${index}`} value={mission.desc_en} onChange={(e) => update(index, "desc_en", e.target.value)} /></label>
    </div>)}</div>
  </div>;
}

function PasswordForm() {
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const change = useMutation({
    mutationFn: () => apiPost<{ message: string }>("/admin/password", form),
    onSuccess: () => { toast.success("Password diperbarui"); setForm({ current_password: "", new_password: "" }); },
    onError: (error) => toast.error(errorMessage(error, "Gagal mengganti password")),
  });
  return <form data-testid="admin-password-form" onSubmit={(event) => { event.preventDefault(); change.mutate(); }} className="mt-8 grid gap-4 rounded bg-white p-6 sm:grid-cols-2">
    <p className="font-display text-2xl text-[#4A070E] sm:col-span-2">Ganti password admin</p>
    <label className="field-label">Password lama<input data-testid="admin-current-password-input" type="password" required value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} /></label>
    <label className="field-label">Password baru (12–128 karakter)<input data-testid="admin-new-password-input" type="password" required minLength={12} maxLength={128} value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} /></label>
    <button data-testid="admin-password-save-button" disabled={change.isPending} className="admin-primary justify-center sm:col-span-2"><Shield size={15} />Perbarui password</button>
  </form>;
}

export default function Admin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [login, setLogin] = useState({ email: "admin@bemfh.unisal.ac.id", password: "" });
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const meQuery = useQuery({ queryKey: ["admin-me"], queryFn: () => apiGet<AdminUser>("/admin/me"), retry: false });
  const isLoggedIn = Boolean(meQuery.data) && !meQuery.isError;
  const isSatgas = meQuery.data?.role === "satgas";
  const tabs = isSatgas ? SATGAS_TABS : TABS;
  const currentTab: Tab = tabs.some(([t]) => t === activeTab) ? activeTab : tabs[0][0];
  const settingsQuery = useQuery({ queryKey: ["admin-settings"], queryFn: () => apiGet<SiteSettings>("/admin/settings"), enabled: isLoggedIn });
  const publicQuery = useQuery({ queryKey: ["public-content"], queryFn: () => apiGet<PublicContent>("/public"), enabled: isLoggedIn });
  const applicationQuery = useQuery({ queryKey: ["admin-applications"], queryFn: () => apiGet<Application[]>("/admin/applications"), enabled: isLoggedIn && !isSatgas, refetchInterval: currentTab === "applications" ? 5000 : false });
  const auditQuery = useQuery({ queryKey: ["admin-audit"], queryFn: () => apiGet<AuditLog[]>("/admin/audit"), enabled: isLoggedIn && currentTab === "audit" });
  useEffect(() => { document.title = "Admin · BEM FH UNISAL"; }, []);
  const loginMutation = useMutation({ mutationFn: () => apiPost<AdminUser>("/admin/login", login), onSuccess: (user) => { queryClient.setQueryData(["admin-me"], user); toast.success("Login berhasil"); }, onError: (error) => toast.error(errorMessage(error, "Email atau password salah")) });
  const logoutMutation = useMutation({ mutationFn: () => apiPost<{ message: string }>("/admin/logout"), onSettled: () => { queryClient.clear(); navigate("/"); } });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => apiPut<Application>(`/admin/applications/${id}`, { status }),
    onSuccess: () => { toast.success("Status pendaftaran diperbarui"); queryClient.invalidateQueries({ queryKey: ["admin-applications"] }); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const complaintsQuery = useQuery({ queryKey: ["admin-complaints"], queryFn: () => apiGet<Complaint[]>("/admin/complaints"), enabled: isLoggedIn });
  const activeComplaints = complaintsQuery.data?.filter((c) => c.status !== "Selesai").length ?? 0;
  const data = publicQuery.data;
  const settings = settingsQuery.data;
  const cabinetLabel = settings ? `${settings.cabinet_name} ${settings.period}` : "Kabinet";
  const missingContacts = settings ? [!settings.email && "email", !settings.instagram && "Instagram", !settings.google_form_url && "Google Form"].filter(Boolean) : [];

  if (!isLoggedIn) return <main data-testid="admin-login-page" className="flex min-h-screen items-center justify-center bg-[#2d070d] p-5 text-white">
    <form data-testid="admin-login-form" onSubmit={(event) => { event.preventDefault(); loginMutation.mutate(); }} className="w-full max-w-md rounded bg-white p-8 text-[#2d070d] shadow-2xl md:p-12">
      <Link data-testid="admin-login-back-link" to="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8b5b60]"><ArrowLeft size={14} />Situs publik</Link>
      <img src={`${import.meta.env.BASE_URL}logo-bem.png`} alt="Logo BEM FH UNISAL" className="mt-10 h-16 w-16 object-contain" />
      <h1 data-testid="admin-login-title" className="mt-6 font-display text-5xl text-[#4A070E]">Ruang kerja.</h1>
      <p className="mt-3 text-sm leading-6 text-[#4c3737]/60">Panel pengurus BEM FH UNISAL. Masuk untuk mengelola seluruh konten website.</p>
      <label data-testid="admin-email-field" className="field-label dark-field mt-8">Email<input data-testid="admin-email-input" type="email" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /></label>
      <label data-testid="admin-password-field" className="field-label dark-field mt-4">Password<input data-testid="admin-password-input" type="password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
      <button data-testid="admin-login-submit-button" disabled={loginMutation.isPending} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#4A070E] text-xs font-bold uppercase tracking-widest text-white">{loginMutation.isPending ? "..." : "Masuk"}<Shield size={15} /></button>
    </form>
  </main>;

  return <main data-testid="admin-dashboard-page" className="min-h-screen bg-[#f5efe5] text-[#2d070d]">
    <header data-testid="admin-header" className="border-b border-[#4A070E]/10 bg-[#2d070d] px-5 py-4 text-white lg:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3"><img src={resolveAssetUrl(settings?.logo_url || "/logo-bem.png")} alt="" className="h-10 w-10 object-contain" /><div><p className="text-xs font-bold uppercase tracking-[0.18em]">Admin · {cabinetLabel}</p><p data-testid="admin-user-email" className="mt-1 text-[10px] text-white/50">{meQuery.data?.email}</p></div></div>
        <div className="flex items-center gap-5"><Link data-testid="admin-public-link" to="/" className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-[#D4AF37] sm:inline-flex"><Users size={13} />Lihat situs</Link><button data-testid="admin-logout-button" onClick={() => logoutMutation.mutate()} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-[#D4AF37]"><LogOut size={14} />Keluar</button></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[220px_1fr] lg:px-10">
      <aside data-testid="admin-sidebar" className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-6 lg:h-fit lg:flex-col lg:gap-1">
        {tabs.map(([tab, label]) => <button data-testid={`admin-tab-${tab}`} key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded px-4 py-3 text-left text-xs font-bold uppercase tracking-widest ${currentTab === tab ? "bg-[#4A070E] text-white" : "text-[#4A070E]/55 hover:bg-white"}`}>{label}{tab === "complaints" && activeComplaints > 0 && <span data-testid="admin-complaints-badge" className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] text-white">{activeComplaints}</span>}</button>)}
      </aside>
      <section data-testid="admin-content" className="min-w-0">
        {!data && <p data-testid="admin-loading" className="text-sm text-[#8b5b60]">Memuat data…</p>}
        {data && settings && <>
          {currentTab === "overview" && <>
            <div data-testid="admin-overview-heading"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">Dashboard</p><h1 className="mt-3 font-display text-6xl text-[#4A070E]">Selamat bekerja.</h1></div>
            <div data-testid="admin-stat-grid" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {([["Berita", data.news.length, "news"], ["Pengurus", data.cabinet.length, "cabinet"], ["Program kerja", data.programs.length, "programs"], ["Pendaftar", applicationQuery.data?.length ?? 0, "applications"], ["Pengaduan aktif", activeComplaints, "complaints"]] as const).map(([label, count, tab]) => <button data-testid={`admin-stat-${tab}`} key={tab} onClick={() => setActiveTab(tab)} className="stat-card text-left hover:-translate-y-0.5"><span>{label}</span><strong>{count}</strong></button>)}
            </div>
            <ComplaintStatsPanel />
            {missingContacts.length > 0 && <div data-testid="admin-placeholder-warning" className="mt-8 flex gap-3 border border-[#D4AF37] bg-[#fff8e4] p-5 text-sm text-[#4A070E]"><Shield size={18} className="shrink-0 text-[#a17b22]" /><p><strong>Lengkapi sebelum publish:</strong> {missingContacts.join(", ")} belum diisi dan sedang disembunyikan dari publik. <button data-testid="admin-warning-contact-link" onClick={() => setActiveTab("contact")} className="font-bold underline">Isi di Kontak & Akun</button>.</p></div>}
            {settings.history_is_draft && <div data-testid="admin-history-warning" className="mt-4 flex gap-3 border border-[#D4AF37] bg-[#fff8e4] p-5 text-sm text-[#4A070E]"><Shield size={18} className="shrink-0 text-[#a17b22]" /><p><b>Sejarah masih draf contoh.</b> Ganti dengan sejarah asli di <button onClick={() => setActiveTab("home")} className="font-bold underline">Beranda & Tentang</button>, lalu hilangkan centang "narasi sementara".</p></div>}
            <div className="mt-8 rounded bg-white p-6 text-sm leading-7 text-[#4c3737]/80"><p className="font-display text-2xl text-[#4A070E]">Pergantian periode</p><p className="mt-2">Saat kepengurusan berganti: ubah <b>Nama kabinet & Periode</b> di Beranda & Tentang, lalu perbarui nama, jabatan, dan foto setiap pengurus di menu Kabinet.</p></div>
          </>}
          {currentTab === "home" && <SettingsForm key="home" settings={settings} fields={HOME_FIELDS} testId="admin-home-settings" title="Beranda & Tentang." eyebrow="Halaman depan">{(draft, set) => <MissionsEditor draft={draft} setDraft={set} />}</SettingsForm>}
          {currentTab === "news" && <CollectionEditor name="news" title="Berita." eyebrow="Editorial" items={data.news} fields={NEWS_FIELDS}
            empty={{ slug: "", category: "Kampus", title_id: "", title_en: "", excerpt_id: "", excerpt_en: "", content_id: "", content_en: "", image_url: "", published_at: today, read_minutes: 4, featured: false }}
            rowTitle={(r) => String(r.title_id)} rowSub={(r) => `${r.published_at} · ${r.category} · /berita/${r.slug}`} rowImage={(r) => String(r.image_url)} />}
          {currentTab === "cabinet" && <CollectionEditor name="cabinet" title="Kabinet." eyebrow={cabinetLabel} items={data.cabinet} fields={CABINET_FIELDS}
            empty={{ name: "", role_id: "", role_en: "", group: "Kementerian", image_url: "", order: 0 }}
            rowTitle={(r) => String(r.name)} rowSub={(r) => `${r.order}. ${r.role_id} · ${r.group}`} rowImage={(r) => String(r.image_url)} />}
          {currentTab === "archive" && <ArchivePanel settings={settings} />}
          {currentTab === "complaints" && <ComplaintsPanel settings={settings} />}
          {currentTab === "programs" && <CollectionEditor name="programs" title="Program kerja." eyebrow="Proker" items={data.programs} fields={PROGRAM_FIELDS}
            empty={{ number: "", title_id: "", title_en: "", description_id: "", description_en: "", status: "Segera", order: 0 }}
            rowTitle={(r) => `${r.number} · ${r.title_id}`} rowSub={(r) => String(r.status)} />}
          {currentTab === "agendas" && <CollectionEditor name="agendas" title="Agenda." eyebrow="Kalender" items={data.agendas} fields={AGENDA_FIELDS}
            empty={{ date: today, time_start: "", time_end: "", day: "", month: "", title_id: "", title_en: "", location_id: "", location_en: "", type: "Agenda", order: 0 }}
            rowTitle={(r) => String(r.title_id)} rowSub={(r) => `${r.date || `${r.day} ${r.month}`}${r.time_start ? ` · ${r.time_start}` : ""} · ${r.location_id}`} />}
          {currentTab === "gallery" && <CollectionEditor name="gallery" title="Galeri." eyebrow="Dokumentasi" items={data.gallery} fields={GALLERY_FIELDS}
            empty={{ image_url: "", caption_id: "", caption_en: "", year: String(new Date().getFullYear()), order: 0 }}
            rowTitle={(r) => String(r.caption_id)} rowSub={(r) => String(r.year)} rowImage={(r) => String(r.image_url)} />}
          {currentTab === "applications" && <div>
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">Keanggotaan</p><h1 className="mt-3 font-display text-5xl text-[#4A070E]">Pendaftar.</h1></div><a data-testid="admin-export-button" href="/api/admin/applications/export" className="admin-chip"><Download size={14} />Export CSV / Excel</a></div>
            <SettingsForm key="registration" settings={settings} fields={REGISTRATION_FIELDS} testId="admin-registration-settings" title="" eyebrow={settings.registration_open ? "Status: pendaftaran DIBUKA" : "Status: pendaftaran DITUTUP"} />
            <p className="mt-4 text-sm text-[#8b5b60]">Status dapat dilihat pendaftar melalui halaman cek status. Tombol WhatsApp membuka pesan siap kirim.</p>
            <div data-testid="admin-applications-table" className="mt-6 overflow-x-auto rounded bg-white"><table className="w-full min-w-[740px] text-left text-sm"><thead className="border-b border-[#4A070E]/10 text-[10px] uppercase tracking-widest text-[#8b5b60]"><tr><th className="p-4">Nama</th><th className="p-4">NIM</th><th className="p-4">Kementerian</th><th className="p-4">Status</th><th className="p-4">WhatsApp</th></tr></thead><tbody>
              {applicationQuery.data?.map((item) => <tr data-testid={`admin-application-row-${item.id}`} key={item.id} className="border-b border-[#4A070E]/5 align-top">
                <td className="p-4"><p className="font-semibold">{item.name}</p><p className="text-xs text-[#8b5b60]">{item.email}</p></td>
                <td className="p-4">{item.nim}<p className="text-xs text-[#8b5b60]">Smt {item.semester}</p></td>
                <td className="p-4">{item.department}</td>
                <td className="p-4"><select data-testid={`admin-application-status-${item.id}`} value={item.status} disabled={statusMutation.isPending} onChange={(event) => statusMutation.mutate({ id: item.id, status: event.target.value as ApplicationStatus })} className="rounded border border-[#4A070E]/15 bg-transparent px-2 py-1 text-xs">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
                <td className="p-4"><a data-testid={`admin-application-whatsapp-${item.id}`} href={`https://wa.me/${waNumber(item.whatsapp)}?text=${encodeURIComponent(waMessage(item, cabinetLabel))}`} target="_blank" rel="noreferrer" className="admin-chip !bg-[#1f7a4d] !text-white"><MessageCircle size={13} />Kirim WA</a></td>
              </tr>)}
            </tbody></table>{!applicationQuery.data?.length && <p data-testid="admin-no-applications" className="p-8 text-center text-sm text-[#8b5b60]">Belum ada pendaftar.</p>}</div>
          </div>}
          {currentTab === "users" && <UsersPanel me={meQuery.data?.email ?? ""} />}
          {currentTab === "account" && <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">Akun saya</p><h1 className="mt-3 font-display text-5xl text-[#4A070E]">{meQuery.data?.email}</h1><PasswordForm /></div>}
          {currentTab === "contact" && <><SettingsForm key="contact" settings={settings} fields={CONTACT_FIELDS} testId="admin-contact-settings" title="Kontak & Akun." eyebrow="Informasi publik" /><PasswordForm /></>}
          {currentTab === "audit" && <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">Keamanan</p><h1 className="mt-3 font-display text-5xl text-[#4A070E]">Log aktivitas.</h1>
            <div data-testid="admin-audit-list" className="mt-8 divide-y divide-[#4A070E]/5 rounded bg-white">{auditQuery.data?.map((log) => <div data-testid={`admin-audit-row-${log.id}`} key={log.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm"><span><b>{log.action}</b> · <span className="text-[#8b5b60]">{log.actor}</span></span><span className="text-xs text-[#8b5b60]">{new Date(log.created_at).toLocaleString("id-ID")}</span></div>)}{!auditQuery.data?.length && <p className="p-8 text-center text-sm text-[#8b5b60]">Belum ada aktivitas.</p>}</div>
          </div>}
        </>}
      </section>
    </div>
  </main>;
}
