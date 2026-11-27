import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, MapPin, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PublicPageHeader from "@/components/PublicPageHeader";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { FALLBACK_CONTENT } from "@/lib/content";
import { DEPARTMENTS, initialsOf } from "@/lib/types";
import type { ApplicationPayload, CabinetMember, PublicContent } from "@/lib/types";

const publicContent = () => apiGet<PublicContent>("/public");
const usePublicContent = () => {
  const query = useQuery({ queryKey: ["public-content"], queryFn: publicContent, retry: false });
  return query.data && !query.isError ? query.data : FALLBACK_CONTENT;
};

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="relative overflow-hidden bg-[#2d070d] px-5 py-16 text-white sm:py-20 lg:px-10 lg:py-24">
    <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl" />
    <div className="relative mx-auto max-w-7xl">
      <p className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]"><span className="h-px w-8 bg-current" />{eyebrow}</p>
      <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[.98] tracking-[-.04em] sm:text-6xl lg:text-7xl">{title}</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-white/65 sm:text-base sm:leading-8">{description}</p>
    </div>
  </section>;
}

function PublicSectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="max-w-3xl">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">{eyebrow}</p>
    <h2 className="mt-3 font-display text-4xl leading-tight tracking-[-.03em] text-[#4A070E] sm:text-5xl">{title}</h2>
    {description && <p className="mt-4 max-w-2xl text-sm leading-7 text-[#4c3737]/70">{description}</p>}
  </div>;
}

function SiteFooter() {
  return <footer className="border-t border-[#4A070E]/10 bg-white px-5 py-8 text-center text-xs text-[#8b5b60] lg:px-10">
    <Link to="/" className="font-bold uppercase tracking-[0.14em] text-[#4A070E]">BEM FH UNISAL</Link>
    <p className="mt-2">Kabinet Abisatya · 2026</p>
  </footer>;
}

function PageShell({ testId, children }: { testId: string; children: React.ReactNode }) {
  return <main data-testid={testId} className="min-h-screen bg-[#FAF7F0] text-[#2a1818]"><PublicPageHeader testId={`${testId}-header`} />{children}<SiteFooter /></main>;
}

export function AboutPage() {
  const content = usePublicContent();
  const { settings } = content;
  return <PageShell testId="about-page">
    <PageIntro eyebrow="BEM FH UNISAL" title="Mengenal ruang gerak kita." description="Tempat mahasiswa hukum belajar mendengar, menyuarakan gagasan, dan bergerak bersama." />
    <section id="profil" className="scroll-mt-24 px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <img src={content.gallery[0]?.image_url || settings.hero_image_url || FALLBACK_CONTENT.settings.hero_image_url} alt={content.gallery[0]?.caption_id || "Kegiatan BEM FH UNISAL"} className="aspect-[4/3] w-full rounded-sm object-cover lg:aspect-[4/5]" />
        <div className="self-center">
          <PublicSectionHeading eyebrow="Profil organisasi" title={settings.about_title_id} />
          <p className="mt-6 whitespace-pre-line text-sm leading-8 text-[#4c3737]/75">{settings.about_body_id}</p>
          <p className="mt-8 border-l-2 border-[#D4AF37] pl-5 font-serif text-lg italic leading-8 text-[#4A070E]">{settings.tagline_id}</p>
        </div>
      </div>
    </section>
    <section id="visi-misi" className="scroll-mt-24 bg-[#efe7d9] px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
        <div><PublicSectionHeading eyebrow="Arah organisasi" title="Visi & Misi" /><blockquote className="mt-7 rounded-sm border border-[#4A070E]/10 bg-[#FAF7F0] p-6 font-serif text-xl italic leading-8 text-[#4A070E]">{settings.vision_id}</blockquote></div>
        <div className="grid gap-0 border-t border-[#4A070E]/15 sm:grid-cols-2">
          {settings.missions.map((mission, index) => <article key={`${mission.title_id}-${index}`} className="border-b border-[#4A070E]/15 py-6 sm:odd:pr-8 sm:even:pl-8"><span className="font-mono text-xs text-[#a17b22]">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-3 font-display text-xl text-[#4A070E]">{mission.title_id}</h3><p className="mt-2 text-sm leading-6 text-[#4c3737]/65">{mission.desc_id}</p></article>)}
        </div>
      </div>
    </section>
    <section id="sejarah" className="scroll-mt-24 px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.75fr_1.25fr]">
        <div><PublicSectionHeading eyebrow="Jejak perjalanan" title="Sejarah BEM FH UNISAL" /><p className="mt-6 font-display text-6xl text-[#a17b22]">{settings.founded_year}</p>{settings.history_is_draft && <p className="mt-3 inline-flex rounded-full border border-[#4A070E]/15 px-3 py-1 text-[10px] uppercase tracking-widest text-[#8b5b60]">Narasi sementara · sedang diverifikasi</p>}</div>
        <div><p className="whitespace-pre-line font-serif text-xl leading-9 text-[#4A070E]">{settings.history_id}</p><p className="mt-8 rounded-sm bg-[#4A070E] p-6 text-sm leading-7 text-white/75">{settings.urgency_id}</p></div>
      </div>
    </section>
  </PageShell>;
}

function CabinetCard({ member }: { member: CabinetMember }) {
  return <article className="overflow-hidden rounded-sm border border-[#4A070E]/10 bg-white shadow-sm">
    <div className="aspect-[4/5] overflow-hidden bg-[#4A070E]">{member.image_url ? <img src={member.image_url} alt={member.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-end bg-[radial-gradient(circle_at_70%_20%,#6b1019,#2d070d)] p-5 font-display text-6xl text-[#D4AF37]">{initialsOf(member.name)}</div>}</div>
    <div className="min-h-24 p-4"><h3 className="font-display text-lg leading-snug text-[#4A070E]">{member.name}</h3><p className="mt-2 text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-[#8b5b60]">{member.role_id}</p></div>
  </article>;
}

export function CabinetPage() {
  const content = usePublicContent();
  const leaders = content.cabinet.filter((member) => member.group === "Pimpinan");
  const ministries = content.cabinet.filter((member) => member.group !== "Pimpinan");
  return <PageShell testId="cabinet-page">
    <PageIntro eyebrow={`Kabinet · ${content.settings.period}`} title={content.settings.cabinet_name} description="Kenali pengurus dan kementerian yang bekerja bersama untuk Fakultas Hukum UNISAL." />
    <section id="pimpinan" className="scroll-mt-24 px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl"><PublicSectionHeading eyebrow="Kepengurusan" title="Pimpinan" /><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">{leaders.map((member) => <CabinetCard key={member.id} member={member} />)}</div></div>
    </section>
    <section id="kementerian" className="scroll-mt-24 bg-[#efe7d9] px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl"><PublicSectionHeading eyebrow="Bidang kerja" title="Kementerian" /><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{ministries.map((member) => <CabinetCard key={member.id} member={member} />)}</div><Link to="/arsip" className="admin-primary mt-10"><ArrowUpRight size={15} />Lihat arsip kabinet</Link></div>
    </section>
  </PageShell>;
}

export function ActivitiesPage() {
  const content = usePublicContent();
  const { programs, agendas, gallery } = content;
  return <PageShell testId="activities-page">
    <PageIntro eyebrow="Kegiatan BEM FH UNISAL" title="Gagasan yang jadi gerakan." description="Program, agenda, dan dokumentasi kegiatan Kabinet Abisatya dalam satu tempat." />
    <section id="program" className="scroll-mt-24 px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl"><PublicSectionHeading eyebrow="Ruang kontribusi" title="Program kerja" /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{programs.map((program) => <article key={program.id} className="rounded-sm border border-[#4A070E]/10 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><span className="font-mono text-xs text-[#a17b22]">{program.number}</span><span className="rounded-full bg-[#efe7d9] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#4A070E]">{program.status}</span></div><h3 className="mt-8 font-display text-2xl text-[#4A070E]">{program.title_id}</h3><p className="mt-3 text-sm leading-7 text-[#4c3737]/70">{program.description_id}</p></article>)}</div></div>
    </section>
    <section id="agenda" className="scroll-mt-24 bg-[#efe7d9] px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl"><PublicSectionHeading eyebrow="Kalender kegiatan" title="Agenda" /><div className="mt-8 grid gap-4 md:grid-cols-2">{agendas.map((agenda) => <article key={agenda.id} className="flex gap-5 rounded-sm border border-[#4A070E]/10 bg-[#FAF7F0] p-5"><div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-sm bg-[#4A070E] text-[#D4AF37]"><strong className="font-display text-xl leading-none">{agenda.day}</strong><span className="text-[9px] font-bold tracking-widest">{agenda.month}</span></div><div><h3 className="font-display text-xl text-[#4A070E]">{agenda.title_id}</h3><p className="mt-2 flex items-center gap-1 text-xs text-[#8b5b60]"><MapPin size={13} />{agenda.location_id}{agenda.time_start ? ` · ${agenda.time_start} WIB` : ""}</p></div></article>)}</div></div>
    </section>
    <section id="galeri" className="scroll-mt-24 px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl"><PublicSectionHeading eyebrow="Dokumentasi" title="Galeri" /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((image) => <figure key={image.id} className="overflow-hidden rounded-sm bg-[#4A070E]"><img src={image.image_url} alt={image.caption_id} loading="lazy" className="aspect-[4/3] w-full object-cover" /><figcaption className="p-4 text-white"><span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{image.year}</span><p className="mt-1 font-display text-lg">{image.caption_id}</p></figcaption></figure>)}</div></div>
    </section>
  </PageShell>;
}

export function NewsListingPage() {
  const content = usePublicContent();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const categories = ["Semua", ...Array.from(new Set(content.news.map((news) => news.category)))];
  const filtered = useMemo(() => content.news.filter((news) => {
    const text = `${news.title_id} ${news.excerpt_id} ${news.category}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (category === "Semua" || category === news.category);
  }), [category, content.news, search]);
  return <PageShell testId="news-listing-page">
    <PageIntro eyebrow="Informasi & cerita" title="Berita BEM FH UNISAL." description="Kabar, gagasan, dan catatan kegiatan dari lingkungan Fakultas Hukum UNISAL." />
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><PublicSectionHeading eyebrow="Kabar terbaru" title="Semua berita" /><div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b5b60]" size={16} /><input aria-label="Cari berita" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari berita..." className="h-11 w-full rounded-full border border-[#4A070E]/15 bg-white pl-9 pr-4 text-sm outline-none focus:border-[#D4AF37] sm:w-56" /></label><select aria-label="Kategori berita" value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 rounded-full border border-[#4A070E]/15 bg-white px-4 text-xs font-semibold text-[#4A070E]">{categories.map((item) => <option key={item}>{item}</option>)}</select></div></div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((news) => <article key={news.id} className="overflow-hidden rounded-sm border border-[#4A070E]/10 bg-white shadow-sm"><img src={news.image_url} alt={news.title_id} loading="lazy" className="aspect-[16/10] w-full object-cover" /><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a17b22]">{news.category} · {news.published_at}</p><h2 className="mt-3 font-display text-2xl leading-tight text-[#4A070E]">{news.title_id}</h2><p className="mt-3 text-sm leading-6 text-[#4c3737]/70">{news.excerpt_id}</p><Link to={`/berita/${news.slug}`} className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4A070E]">Baca berita <ArrowUpRight size={14} /></Link></div></article>)}</div>
      {!filtered.length && <p className="mt-8 rounded-sm bg-white p-8 text-center text-sm text-[#8b5b60]">Tidak ada berita yang cocok dengan pencarian.</p>}
    </section>
  </PageShell>;
}

const emptyApplication: ApplicationPayload = { name: "", nim: "", email: "", whatsapp: "", semester: 1, department: DEPARTMENTS[0], motivation: "", captcha_answer: "" };

export function RegistrationPage() {
  const content = usePublicContent();
  const [form, setForm] = useState<ApplicationPayload>(emptyApplication);
  const [applicationId, setApplicationId] = useState("");
  const application = useMutation({
    mutationFn: () => apiPost<{ id: string }>("/applications", form),
    onSuccess: ({ id }) => { setApplicationId(id); setForm(emptyApplication); toast.success("Pendaftaran berhasil dikirim."); },
    onError: (error) => {
      const body = error instanceof ApiError ? error.body as { detail?: unknown } | null : null;
      const detail = body?.detail;
      const message = typeof detail === "string" ? detail : Array.isArray(detail) ? String((detail[0] as { msg?: string })?.msg ?? "").replace("Value error, ", "") : "";
      toast.error(message || "Pendaftaran gagal. Periksa kembali data Anda.");
    },
  });
  const updateForm = (key: keyof ApplicationPayload, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const isOpen = content.settings.registration_open !== false;
  return <PageShell testId="registration-page">
    <PageIntro eyebrow="Bergabung bersama kami" title="Jadilah bagian dari gerakan." description="Isi formulir pendaftaran anggota BEM FH UNISAL. Setiap suara punya tempat di sini." />
    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[.7fr_1.3fr] lg:px-10 lg:py-24">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">Pendaftaran anggota</p><h2 className="mt-3 font-display text-4xl leading-tight text-[#4A070E]">Mulai langkah pertamamu.</h2><p className="mt-5 text-sm leading-7 text-[#4c3737]/70">Lengkapi data dengan benar. Pengurus akan menghubungi Anda melalui kontak yang diberikan.</p>{content.settings.google_form_url && <a href={content.settings.google_form_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4A070E]">Daftar melalui Google Form <ArrowUpRight size={14} /></a>}</div>
      {!isOpen ? <div className="rounded-sm border border-[#4A070E]/10 bg-white p-8"><h2 className="font-display text-2xl text-[#4A070E]">Pendaftaran sedang ditutup.</h2><p className="mt-3 text-sm leading-7 text-[#8b5b60]">Silakan kembali lagi saat pendaftaran anggota dibuka.</p></div> : <form data-testid="registration-form" onSubmit={(event) => { event.preventDefault(); application.mutate(); }} className="grid gap-4 rounded-sm border border-[#4A070E]/10 bg-white p-6 shadow-sm sm:grid-cols-2 md:p-8">
        <h2 className="font-display text-3xl text-[#4A070E] sm:col-span-2">Formulir pendaftaran</h2>
        {applicationId && <div data-testid="application-success-card" className="rounded-sm bg-[#2d070d] p-5 text-sm text-white sm:col-span-2"><ShieldCheck className="mb-3 text-[#D4AF37]" size={22} /><strong>Pendaftaran tercatat.</strong><p className="mt-1 break-all text-white/60">ID: {applicationId}</p><Link data-testid="application-status-link" to={`/status/${applicationId}`} className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Cek status</Link></div>}
        <label className="field-label">Nama lengkap<input required minLength={3} value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></label>
        <label className="field-label">NIM<input required inputMode="numeric" pattern="\d{8,15}" title="8–15 digit angka" value={form.nim} onChange={(event) => updateForm("nim", event.target.value.replace(/\D/g, ""))} /></label>
        <label className="field-label">Email<input type="email" required value={form.email} onChange={(event) => updateForm("email", event.target.value)} /></label>
        <label className="field-label">WhatsApp<input required inputMode="tel" placeholder="08xxxxxxxxxx" value={form.whatsapp} onChange={(event) => updateForm("whatsapp", event.target.value)} /></label>
        <label className="field-label">Semester<select value={form.semester} onChange={(event) => updateForm("semester", Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
        <label className="field-label">Kementerian yang diminati<select value={form.department} onChange={(event) => updateForm("department", event.target.value)}>{DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}</select></label>
        <label className="field-label sm:col-span-2">Mengapa ingin bergabung?<textarea required minLength={20} rows={4} value={form.motivation} onChange={(event) => updateForm("motivation", event.target.value)} /></label>
        <label className="field-label sm:col-span-2">Verifikasi: {content.captcha_question}<input required inputMode="numeric" value={form.captcha_answer} onChange={(event) => updateForm("captcha_answer", event.target.value)} /></label>
        <button disabled={application.isPending} className="admin-primary h-12 justify-center sm:col-span-2">{application.isPending ? "Mengirim…" : "Kirim pendaftaran"}<ArrowUpRight size={15} /></button>
      </form>}
    </section>
  </PageShell>;
}
