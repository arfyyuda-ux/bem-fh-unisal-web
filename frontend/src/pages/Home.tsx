import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Archive, CalendarDays, Megaphone, ChevronRight, Instagram, LockKeyhole, Mail, MapPin, Menu, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { FALLBACK_CONTENT } from "@/lib/content";
import { DEPARTMENTS, initialsOf } from "@/lib/types";
import type { ApplicationPayload, CabinetMember, PublicContent } from "@/lib/types";

type Language = "id" | "en";
const copy = {
  id: { navNews: "Berita", navAbout: "Tentang", navCabinet: "Kabinet", navPrograms: "Program", navJoin: "Bergabung", navHistory: "Sejarah", report: "Pengaduan", admin: "Admin", readNews: "Baca berita", join: "Daftar anggota", news: "Catatan terbaru", agenda: "Agenda mendatang", viewAll: "Lihat program", about: "Tentang kami", vision: "Visi", cabinet: "Kabinet kami", leaders: "Pimpinan", ministries: "Kementerian", programs: "Program kerja", gallery: "Potret pergerakan", register: "Jadi bagian dari gerakan", registerBody: "Kirimkan langkah pertamamu. Setiap suara punya tempat di sini.", send: "Kirim pendaftaran", footer: "Bergerak untuk keadilan yang dekat.", explore: "Jelajahi", visit: "Alamat", connect: "Kontak", all: "Semua" },
  en: { navNews: "News", navAbout: "About", navCabinet: "Cabinet", navPrograms: "Programs", navJoin: "Join us", navHistory: "History", report: "Report", admin: "Admin", readNews: "Read news", join: "Join the movement", news: "Latest notes", agenda: "Coming up", viewAll: "See programs", about: "About us", vision: "Vision", cabinet: "Our cabinet", leaders: "Leadership", ministries: "Ministries", programs: "Programs", gallery: "Moments in motion", register: "Be part of the movement", registerBody: "Send your first step. Every voice has a place here.", send: "Send application", footer: "Moving justice closer.", explore: "Explore", visit: "Address", connect: "Contact", all: "All" },
};
const formatDate = (date: string, language: Language) => {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
};
const pick = (language: Language, id: string, en: string) => (language === "en" && en ? en : id);
const emptyForm: ApplicationPayload = { name: "", nim: "", email: "", whatsapp: "", semester: 1, department: DEPARTMENTS[0], motivation: "", captcha_answer: "" };

function SectionLabel({ children, light = false, id }: { children: React.ReactNode; light?: boolean; id: string }) {
  return <div data-testid={`section-label-${id}`} className={`mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] ${light ? "text-[#D4AF37]" : "text-[#8b5b60]"}`}><span className="h-px w-8 bg-current" />{children}</div>;
}

function MemberCard({ member, language, large = false }: { member: CabinetMember; language: Language; large?: boolean }) {
  return <article data-testid={`cabinet-member-${member.id}`} className="group">
    <div className={`relative overflow-hidden bg-[#4A070E] ${large ? "aspect-[4/5]" : "aspect-[4/5]"}`}>
      {member.image_url
        ? <img data-testid={`cabinet-image-${member.id}`} src={member.image_url} alt={member.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        : <div data-testid={`cabinet-initials-${member.id}`} className="flex h-full items-end bg-[radial-gradient(circle_at_70%_20%,#6b1019,#2d070d)] p-5 font-display text-6xl text-[#D4AF37]">{initialsOf(member.name)}</div>}
      <div className="absolute inset-0 bg-gradient-to-t from-[#2d070d]/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
    <h3 data-testid={`cabinet-name-${member.id}`} className="mt-4 font-display text-xl text-[#4A070E]">{member.name}</h3>
    <p data-testid={`cabinet-role-${member.id}`} className="mt-1 text-[10px] font-bold uppercase leading-relaxed tracking-[0.14em] text-[#8b5b60]">{pick(language, member.role_id, member.role_en)}</p>
  </article>;
}

export default function Home() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("bem-language") as Language) || "id");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState<ApplicationPayload>(emptyForm);
  const [applicationId, setApplicationId] = useState("");
  const t = copy[language];
  const publicQuery = useQuery({ queryKey: ["public-content"], queryFn: () => apiGet<PublicContent>("/public"), retry: false });
  const content = publicQuery.data && !publicQuery.isError ? publicQuery.data : FALLBACK_CONTENT;
  const s = content.settings;
  const categories = ["all", ...Array.from(new Set(content.news.map((item) => item.category)))];
  const leaders = content.cabinet.filter((m) => m.group === "Pimpinan");
  const ministries = content.cabinet.filter((m) => m.group !== "Pimpinan");
  const filteredNews = useMemo(() => content.news.filter((item) => {
    const haystack = `${item.title_id} ${item.title_en} ${item.excerpt_id} ${item.excerpt_en}`.toLowerCase();
    return haystack.includes(debounced.toLowerCase()) && (category === "all" || item.category === category);
  }), [category, content.news, debounced]);
  const applicationMutation = useMutation({
    mutationFn: (payload: ApplicationPayload) => apiPost<{ id: string }>("/applications", payload),
    onSuccess: (result) => { setApplicationId(result.id); toast.success(language === "id" ? "Pendaftaran berhasil dikirim." : "Application sent successfully."); setForm(emptyForm); },
    onError: (error) => {
      const detail = error instanceof ApiError ? (error.body as { detail?: unknown } | null)?.detail : null;
      const message = typeof detail === "string" ? detail : Array.isArray(detail) ? String((detail[0] as { msg?: string })?.msg ?? "").replace("Value error, ", "") : "";
      toast.error(message || (language === "id" ? "Pendaftaran gagal, periksa kembali data." : "Submission failed, please check your data."));
    },
  });
  useEffect(() => { const timer = setTimeout(() => setDebounced(search), 250); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 40); onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => { localStorage.setItem("bem-language", language); document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  const updateForm = (key: keyof ApplicationPayload, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const open = s.registration_open !== false;
  const navItems: [string, string][] = [["berita", t.navNews], ["tentang", t.navAbout], ["sejarah", t.navHistory], ["kabinet", t.navCabinet], ["program", t.navPrograms], ...(open ? [["bergabung", t.navJoin] as [string, string]] : [])];

  return <div data-testid="public-home-page" className="min-h-screen overflow-x-hidden bg-[#FAF7F0] text-[#2a1818]">
    <header data-testid="public-navbar" className={`fixed inset-x-0 top-0 z-50 border-b text-white transition-[background-color,border-color,backdrop-filter] duration-300 ${scrolled || menuOpen ? "border-white/10 bg-[#2d070d]/90 backdrop-blur-xl" : "border-transparent bg-transparent"}`}>
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-10">
        <a data-testid="brand-home-link" href="#top" className="flex items-center gap-3">
          <img data-testid="brand-logo" src={s.logo_url || "/logo-bem.png"} alt="Logo BEM FH UNISAL" className="h-11 w-11 object-contain" />
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] sm:block">BEM FH<br /><span className="text-[#D4AF37]">UNISAL</span></span>
        </a>
        <nav data-testid="desktop-navigation" className="hidden items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.18em] lg:flex">
          {navItems.map(([href, label]) => <a data-testid={`nav-${href}-link`} key={href} href={`#${href}`} className="hover:text-[#D4AF37]">{label}</a>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link data-testid="nav-report-button" to="/pengaduan" className="hidden items-center gap-2 rounded-full border border-[#D4AF37]/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#2d070d] md:inline-flex"><Megaphone size={13} />{t.report}</Link>
          <div data-testid="language-toggle" className="flex rounded-full border border-white/20 p-1 text-[10px] font-bold">
            <button data-testid="language-id-button" onClick={() => setLanguage("id")} className={`rounded-full px-2.5 py-1 ${language === "id" ? "bg-[#D4AF37] text-[#2d070d]" : "text-white/60"}`}>ID</button>
            <button data-testid="language-en-button" onClick={() => setLanguage("en")} className={`rounded-full px-2.5 py-1 ${language === "en" ? "bg-[#D4AF37] text-[#2d070d]" : "text-white/60"}`}>EN</button>
          </div>
          <button data-testid="hamburger-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37]">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {menuOpen && <div data-testid="hamburger-menu-panel" className="absolute right-5 top-[84px] w-[min(320px,calc(100vw-2.5rem))] rounded border border-white/10 bg-[#2d070d]/95 p-5 shadow-2xl backdrop-blur-xl lg:right-10">
        <nav className="flex flex-col text-xs font-semibold uppercase tracking-[0.2em]">
          {navItems.map(([href, label]) => <a data-testid={`menu-${href}-link`} key={href} href={`#${href}`} onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-3 hover:text-[#D4AF37]">{label}</a>)}
          <Link data-testid="menu-report-link" to="/pengaduan" className="flex items-center gap-2 border-b border-white/10 py-3 text-[#D4AF37]"><Megaphone size={13} />{t.report}</Link>
          <Link data-testid="menu-archive-link" to="/arsip" className="flex items-center gap-2 border-b border-white/10 py-3 hover:text-[#D4AF37]"><Archive size={13} />{language === "id" ? "Arsip kabinet" : "Cabinet archive"}</Link>
          <Link data-testid="menu-admin-link" to="/admin" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2.5 text-[#2d070d]"><LockKeyhole size={14} />{t.admin}</Link>
        </nav>
      </div>}
    </header>

    <main id="top">
      <section data-testid="hero-section" className="relative flex min-h-[720px] items-end overflow-hidden bg-[#2d070d] text-white lg:min-h-[820px]">
        <div data-testid="hero-background" className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${s.hero_image_url || FALLBACK_CONTENT.settings.hero_image_url})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2d070d] via-[#2d070d]/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#2d070d] to-transparent" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-44 lg:grid-cols-[1.2fr_.8fr] lg:px-10 lg:pb-28">
          <div className="reveal max-w-2xl">
            <SectionLabel light id="hero">{s.cabinet_name} · {s.period}</SectionLabel>
            <h1 data-testid="hero-title" className="max-w-2xl font-display text-5xl leading-[.96] tracking-[-.04em] sm:text-7xl lg:text-[6.5rem]">{pick(language, s.hero_title_id, s.hero_title_en)}</h1>
            <p data-testid="hero-description" className="mt-7 max-w-lg text-base leading-8 text-white/70">{pick(language, s.hero_body_id, s.hero_body_en)}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a data-testid="hero-read-news-button" href="#berita" className="group inline-flex items-center gap-3 rounded-full bg-[#D4AF37] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#2d070d]">{t.readNews}<ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>
              {open ? <a data-testid="hero-join-button" href="#bergabung" className="inline-flex items-center gap-3 rounded-full border border-white/35 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] hover:border-[#D4AF37]">{t.join}</a>
                : <Link data-testid="hero-report-button" to="/pengaduan" className="inline-flex items-center gap-3 rounded-full border border-white/35 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] hover:border-[#D4AF37]"><Megaphone size={15} />{t.report}</Link>}
            </div>
          </div>
          <div className="hidden items-center justify-end lg:flex">
            <img data-testid="hero-emblem" src={s.logo_url || "/logo-bem.png"} alt="Lambang BEM FH UNISAL" className="emblem-float h-52 w-52 object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,.45)]" />
          </div>
        </div>
      </section>
      <div data-testid="values-marquee" className="overflow-hidden border-b border-[#D4AF37]/30 bg-[#D4AF37] py-3 text-[#2d070d]"><div className="marquee-track flex w-max gap-10 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.25em]">{Array.from({ length: 2 }).map((_, index) => <span data-testid={`marquee-item-${index}`} key={index}>Integritas · Keberanian · Kolaborasi · Keadilan · {s.cabinet_name} · {pick(language, s.tagline_id, s.tagline_en)} · </span>)}</div></div>

      <section id="berita" data-testid="news-section" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 lg:px-10 lg:py-32">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="reveal"><SectionLabel id="news">{t.news}</SectionLabel><h2 data-testid="news-heading" className="font-display text-5xl tracking-[-.04em] text-[#4A070E] md:text-6xl">{language === "id" ? "Cerita yang" : "Stories in"} <em className="font-serif text-[#a17b22]">{language === "id" ? "bergerak." : "motion."}</em></h2></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label data-testid="news-search-label" className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b5b60]" size={16} /><input data-testid="news-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === "id" ? "Cari berita..." : "Search news..."} className="h-10 w-full rounded-full border border-[#4A070E]/15 bg-white/60 pl-9 pr-4 text-sm outline-none focus:border-[#D4AF37] sm:w-52" /></label>
            <div data-testid="news-category-filters" className="flex flex-wrap rounded-full border border-[#4A070E]/15 p-1">{categories.map((item) => <button data-testid={`news-filter-${item.toLowerCase()}`} key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${category === item ? "bg-[#4A070E] text-white" : "text-[#4A070E]/60"}`}>{item === "all" ? t.all : item}</button>)}</div>
          </div>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div data-testid="news-list" className="grid content-start gap-6 md:grid-cols-2">
            {publicQuery.isLoading && Array.from({ length: 2 }).map((_, i) => <div data-testid={`news-skeleton-${i}`} key={i} className="h-80 animate-pulse bg-white/70" />)}
            {!publicQuery.isLoading && (filteredNews.length ? filteredNews.map((item, index) => <article data-testid={`news-card-${item.slug}`} key={item.id} className={`group overflow-hidden rounded-[2px] bg-white shadow-[0_15px_50px_rgba(74,7,14,.08)] ${index === 0 ? "md:col-span-2 md:grid md:grid-cols-2" : ""}`}>
              <div className="overflow-hidden"><img data-testid={`news-image-${item.slug}`} src={item.image_url} alt={pick(language, item.title_id, item.title_en)} loading="lazy" className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-full" /></div>
              <div className="flex flex-col justify-center p-6 lg:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9d7728]"><span>{item.category}</span><span className="h-1 w-1 rounded-full bg-[#D4AF37]" /><span>{formatDate(item.published_at, language)}</span><span className="h-1 w-1 rounded-full bg-[#D4AF37]" /><span>{item.read_minutes} min</span></div>
                <h3 data-testid={`news-title-${item.slug}`} className="font-display text-3xl leading-tight text-[#4A070E]">{pick(language, item.title_id, item.title_en)}</h3>
                <p className="mt-3 text-sm leading-7 text-[#4c3737]/70">{pick(language, item.excerpt_id, item.excerpt_en)}</p>
                <Link data-testid={`news-read-link-${item.slug}`} to={`/berita/${item.slug}`} className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#4A070E]">{t.readNews}<ChevronRight size={15} className="transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </article>) : <div data-testid="news-empty-state" className="rounded bg-white p-10 text-center text-sm text-[#4c3737]/60 md:col-span-2">{language === "id" ? "Belum ada berita yang cocok." : "No matching news yet."}</div>)}
          </div>
          <aside data-testid="agenda-sidebar" className="rounded bg-[#4A070E] p-7 text-white lg:sticky lg:top-28 lg:h-fit">
            <div className="flex items-center justify-between"><div><SectionLabel light id="agenda">{t.agenda}</SectionLabel><h3 className="font-display text-3xl">{language === "id" ? "Di kalender." : "On the calendar."}</h3></div><CalendarDays className="text-[#D4AF37]" size={26} /></div>
            <div className="mt-8 divide-y divide-white/10">{content.agendas.length ? content.agendas.map((agenda) => <div data-testid={`agenda-item-${agenda.id}`} key={agenda.id} className="flex gap-4 py-5 first:pt-0"><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center border border-[#D4AF37]/60 text-[#D4AF37]"><strong className="font-display text-xl leading-none">{agenda.day}</strong><small className="text-[9px] font-bold tracking-widest">{agenda.month}</small></div><div><p className="font-display text-xl">{pick(language, agenda.title_id, agenda.title_en)}</p><p className="mt-1 flex items-center gap-1 text-xs text-white/50"><MapPin size={12} />{pick(language, agenda.location_id, agenda.location_en)}{agenda.time_start && <span data-testid={`agenda-time-${agenda.id}`} className="ml-1 text-[#D4AF37]/80">· {agenda.time_start}{agenda.time_end ? `–${agenda.time_end}` : ""} WIB</span>}</p></div></div>) : <p data-testid="agenda-empty-state" className="text-sm text-white/50">{language === "id" ? "Belum ada agenda." : "No events yet."}</p>}</div>
            <a data-testid="agenda-view-all-link" href="#program" className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#D4AF37]">{t.viewAll}<ArrowUpRight size={14} /></a>
          </aside>
        </div>
      </section>

      <section id="tentang" data-testid="about-section" className="scroll-mt-20 bg-[#efe7d9] px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[.85fr_1.15fr]">
          <div className="reveal">
            <SectionLabel id="about">{t.about}</SectionLabel>
            <h2 data-testid="about-heading" className="max-w-md font-display text-5xl leading-[.98] tracking-[-.04em] text-[#4A070E] md:text-7xl">{pick(language, s.about_title_id, s.about_title_en)}</h2>
            <p data-testid="about-body" className="mt-7 max-w-md whitespace-pre-line text-sm leading-8 text-[#4c3737]/70">{pick(language, s.about_body_id, s.about_body_en)}</p>
            <blockquote data-testid="vision-text" className="mt-10 border-l-2 border-[#D4AF37] pl-5 font-serif text-xl italic leading-9 text-[#4A070E]"><span className="mb-2 block font-sans text-[10px] font-bold not-italic uppercase tracking-[0.2em] text-[#a17b22]">{t.vision}</span>{pick(language, s.vision_id, s.vision_en)}</blockquote>
          </div>
          <div data-testid="vision-mission-grid" className="grid content-start gap-0 border-t border-[#4A070E]/15 sm:grid-cols-2">
            {s.missions.map((mission, index) => <div data-testid={`mission-item-${index + 1}`} key={index} className="border-b border-[#4A070E]/15 py-7 sm:odd:pr-8 sm:even:pl-8"><span className="font-mono text-xs text-[#a17b22]">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-4 font-display text-2xl text-[#4A070E]">{pick(language, mission.title_id, mission.title_en)}</h3><p className="mt-2 text-sm leading-6 text-[#4c3737]/60">{pick(language, mission.desc_id, mission.desc_en)}</p></div>)}
          </div>
        </div>
      </section>

      <section id="sejarah" data-testid="history-section" className="relative scroll-mt-20 overflow-hidden bg-[#4A070E] px-5 py-24 text-white lg:px-10 lg:py-32">
        <span aria-hidden className="pointer-events-none absolute -right-6 -top-10 select-none font-display text-[16rem] leading-none text-white/[.04] lg:text-[22rem]">{s.founded_year}</span>
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <div className="reveal">
            <SectionLabel light id="history">{language === "id" ? "Sejarah & urgensi" : "History & purpose"}</SectionLabel>
            <h2 data-testid="history-heading" className="font-display text-5xl leading-[.98] tracking-[-.04em] md:text-6xl">{language === "id" ? "Dari forum kecil," : "From a small forum,"} <em className="font-serif text-[#D4AF37]">{language === "id" ? "menjadi gerakan." : "to a movement."}</em></h2>
            <div className="mt-8 flex items-center gap-4"><span className="font-display text-6xl text-[#D4AF37]">{s.founded_year}</span><span className="text-[10px] font-bold uppercase leading-relaxed tracking-[0.2em] text-white/50">{language === "id" ? "Tahun" : "Year"}<br />{language === "id" ? "berdiri" : "founded"}</span></div>
            {s.history_is_draft && <p data-testid="history-draft-note" className="mt-6 inline-block rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-white/50">{language === "id" ? "Narasi sementara · sedang diverifikasi pengurus" : "Provisional narrative · under review"}</p>}
          </div>
          <div className="grid gap-10">
            <p data-testid="history-body" className="whitespace-pre-line font-serif text-xl leading-9 text-white/85">{pick(language, s.history_id, s.history_en)}</p>
            <div data-testid="urgency-card" className="rounded border border-[#D4AF37]/40 bg-[#2d070d]/50 p-7 backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{language === "id" ? "Mengapa BEM penting" : "Why the BEM matters"}</p><p data-testid="urgency-body" className="mt-3 whitespace-pre-line text-sm leading-7 text-white/70">{pick(language, s.urgency_id, s.urgency_en)}</p></div>
          </div>
        </div>
      </section>

      <section id="kabinet" data-testid="cabinet-section" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 lg:px-10 lg:py-32">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><SectionLabel id="cabinet">{t.cabinet} · {s.period}</SectionLabel><h2 data-testid="cabinet-heading" className="font-display text-5xl tracking-[-.04em] text-[#4A070E] md:text-6xl">{s.cabinet_name}</h2></div>
          <p className="max-w-sm text-sm leading-7 text-[#4c3737]/60">{language === "id" ? `${content.cabinet.length} pengurus inti, satu komitmen: menjadikan Fakultas Hukum ruang yang lebih berani dan manusiawi.` : `${content.cabinet.length} core members, one commitment: making the Faculty of Law a braver, more human space.`}</p>
        </div>
        {leaders.length > 0 && <><h3 data-testid="cabinet-leaders-heading" className="mt-14 text-[11px] font-bold uppercase tracking-[0.24em] text-[#a17b22]">{t.leaders}</h3><div data-testid="cabinet-leaders-grid" className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-5">{leaders.map((member) => <MemberCard key={member.id} member={member} language={language} />)}</div></>}
        {ministries.length > 0 && <><h3 data-testid="cabinet-ministries-heading" className="mt-16 text-[11px] font-bold uppercase tracking-[0.24em] text-[#a17b22]">{t.ministries}</h3><div data-testid="cabinet-ministries-grid" className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">{ministries.map((member) => <MemberCard key={member.id} member={member} language={language} />)}</div></>}
        <Link data-testid="cabinet-archive-link" to="/arsip" className="group mt-14 inline-flex items-center gap-3 border-b border-[#4A070E]/30 pb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#4A070E] hover:border-[#D4AF37]"><Archive size={15} />{language === "id" ? "Lihat arsip kabinet periode sebelumnya" : "See previous cabinets"}<ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
      </section>

      <section id="program" data-testid="program-section" className="scroll-mt-20 bg-[#2d070d] px-5 py-24 text-white lg:px-10 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionLabel light id="programs">{t.programs}</SectionLabel>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><h2 className="font-display text-5xl tracking-[-.04em] md:text-6xl">{language === "id" ? "Kerja yang" : "Work that"} <em className="font-serif text-[#D4AF37]">{language === "id" ? "berarti." : "matters."}</em></h2><p className="max-w-sm text-sm leading-7 text-white/55">{language === "id" ? "Cara kami menerjemahkan keberanian menjadi kerja yang bisa dirasakan." : "How we turn courage into work people can feel."}</p></div>
          <div data-testid="program-grid" className="mt-14 grid gap-px bg-white/15 md:grid-cols-2 lg:grid-cols-5">{content.programs.map((program) => <article data-testid={`program-card-${program.id}`} key={program.id} className="group bg-[#2d070d] p-6 transition-colors hover:bg-[#4A070E]"><div className="flex items-start justify-between"><span className="font-mono text-xs text-[#D4AF37]">{program.number}</span><span data-testid={`program-status-${program.id}`} className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${program.status === "Selesai" ? "bg-[#D4AF37] text-[#2d070d]" : program.status === "Berjalan" ? "bg-white/10 text-white" : "border border-white/20 text-white/60"}`}>{program.status}</span></div><h3 className="mt-14 font-display text-2xl">{pick(language, program.title_id, program.title_en)}</h3><p className="mt-3 text-sm leading-6 text-white/50">{pick(language, program.description_id, program.description_en)}</p></article>)}</div>
        </div>
      </section>

      <section data-testid="gallery-section" className="mx-auto max-w-7xl px-5 py-24 lg:px-10 lg:py-32">
        <div className="flex items-end justify-between"><div><SectionLabel id="gallery">{t.gallery}</SectionLabel><h2 className="font-display text-5xl tracking-[-.04em] text-[#4A070E]">{language === "id" ? "Yang" : "What we"} <em className="font-serif text-[#a17b22]">{language === "id" ? "terekam." : "captured."}</em></h2></div><Sparkles className="text-[#D4AF37]" /></div>
        <div data-testid="gallery-grid" className="mt-12 grid gap-4 md:grid-cols-3">{content.gallery.map((item, index) => <figure data-testid={`gallery-item-${item.id}`} key={item.id} className={`group relative overflow-hidden bg-[#4A070E] ${index % 3 === 1 ? "md:mt-12" : ""}`}><img data-testid={`gallery-image-${item.id}`} src={item.image_url} alt={pick(language, item.caption_id, item.caption_en)} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" /><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2d070d]/90 to-transparent p-5 pt-16 text-white"><span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{item.year}</span><p className="mt-1 font-display text-xl">{pick(language, item.caption_id, item.caption_en)}</p></figcaption></figure>)}</div>
      </section>

      {open && <section id="bergabung" data-testid="registration-section" className="scroll-mt-20 bg-[#D4AF37] px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <SectionLabel id="register">{t.navJoin}</SectionLabel>
            <h2 data-testid="registration-heading" className="font-display text-5xl leading-[.98] tracking-[-.04em] text-[#2d070d] md:text-7xl">{t.register}</h2>
            <p className="mt-7 max-w-sm text-sm leading-7 text-[#2d070d]/70">{t.registerBody}</p>
            {s.google_form_url && <a data-testid="google-form-link" href={s.google_form_url} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#4A070E]">{language === "id" ? "Atau daftar via Google Form" : "Or apply via Google Form"}<ArrowUpRight size={15} /></a>}
            {applicationId && <div data-testid="application-success-card" className="mt-10 rounded bg-[#2d070d] p-5 text-sm text-white"><ShieldCheck className="mb-3 text-[#D4AF37]" size={22} /><strong>{language === "id" ? "Pendaftaran tercatat." : "Application received."}</strong><p className="mt-1 break-all text-white/60">ID: {applicationId}</p><Link data-testid="application-status-link" to={`/status/${applicationId}`} className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-[#D4AF37]">{language === "id" ? "Cek status" : "Check status"}</Link></div>}
          </div>
          <form data-testid="registration-form" onSubmit={(event) => { event.preventDefault(); applicationMutation.mutate(form); }} className="grid gap-4 sm:grid-cols-2">
            <label data-testid="name-field" className="field-label">{language === "id" ? "Nama lengkap" : "Full name"}<input data-testid="registration-name-input" required minLength={3} value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></label>
            <label data-testid="nim-field" className="field-label">NIM<input data-testid="registration-nim-input" required inputMode="numeric" pattern="\d{8,15}" title="8–15 digit angka" value={form.nim} onChange={(event) => updateForm("nim", event.target.value.replace(/\D/g, ""))} /></label>
            <label data-testid="email-field" className="field-label">Email<input data-testid="registration-email-input" type="email" required value={form.email} onChange={(event) => updateForm("email", event.target.value)} /></label>
            <label data-testid="whatsapp-field" className="field-label">WhatsApp<input data-testid="registration-whatsapp-input" required inputMode="tel" placeholder="08xxxxxxxxxx" value={form.whatsapp} onChange={(event) => updateForm("whatsapp", event.target.value)} /></label>
            <label data-testid="semester-field" className="field-label">Semester<select data-testid="registration-semester-select" value={form.semester} onChange={(event) => updateForm("semester", Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
            <label data-testid="department-field" className="field-label">{language === "id" ? "Kementerian yang diminati" : "Preferred ministry"}<select data-testid="registration-department-select" value={form.department} onChange={(event) => updateForm("department", event.target.value)}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></label>
            <label data-testid="motivation-field" className="field-label sm:col-span-2">{language === "id" ? "Mengapa ingin bergabung?" : "Why do you want to join?"}<textarea data-testid="registration-motivation-input" required minLength={20} rows={4} value={form.motivation} onChange={(event) => updateForm("motivation", event.target.value)} /></label>
            <label data-testid="captcha-field" className="field-label sm:col-span-2">{language === "id" ? "Verifikasi" : "Verification"}: {content.captcha_question}<input data-testid="registration-captcha-input" required inputMode="numeric" value={form.captcha_answer} onChange={(event) => updateForm("captcha_answer", event.target.value)} /></label>
            <button data-testid="registration-submit-button" disabled={applicationMutation.isPending} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2d070d] px-6 text-xs font-bold uppercase tracking-[0.16em] text-white hover:bg-[#4A070E] disabled:opacity-60 sm:col-span-2">{applicationMutation.isPending ? "..." : t.send}<ArrowUpRight size={15} /></button>
          </form>
        </div>
      </section>}

      <section data-testid="report-cta-section" className="bg-[#efe7d9] px-5 py-16 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">{language === "id" ? "Layanan pengaduan" : "Reporting service"}</p><h2 className="mt-2 max-w-2xl font-display text-4xl leading-tight text-[#4A070E]">{language === "id" ? "Mengalami atau melihat kekerasan, perundungan, atau masalah kampus? Laporkan dengan aman." : "Experienced or witnessed violence, bullying, or a campus issue? Report it safely."}</h2></div>
          <Link data-testid="report-cta-button" to="/pengaduan" className="admin-primary h-12 shrink-0"><Megaphone size={15} />{language === "id" ? "Buat laporan (bisa anonim)" : "Report (anonymous allowed)"}</Link>
        </div>
      </section>
    </main>

    <footer data-testid="site-footer" className="bg-[#2d070d] px-5 py-14 text-white lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div><div className="flex items-center gap-3"><img src={s.logo_url || "/logo-bem.png"} alt="" className="h-12 w-12 object-contain" /><span className="text-xs font-bold uppercase tracking-[0.2em]">BEM FH UNISAL</span></div><p data-testid="footer-tagline" className="mt-6 max-w-xs text-sm leading-7 text-white/50">{s.cabinet_name} {s.period} · {t.footer}</p></div>
        <div><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{t.visit}</h3><p data-testid="footer-address" className="mt-4 text-sm leading-7 text-white/60">{pick(language, s.address_id, s.address_en)}</p></div>
        <div><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{t.connect}</h3><div className="mt-4 space-y-3 text-sm text-white/60">
          {s.email && <a data-testid="footer-email-link" className="flex items-center gap-2 hover:text-[#D4AF37]" href={`mailto:${s.email}`}><Mail size={14} />{s.email}</a>}
          {s.instagram && <a data-testid="footer-instagram-link" className="flex items-center gap-2 hover:text-[#D4AF37]" href={s.instagram} target="_blank" rel="noreferrer"><Instagram size={14} />Instagram</a>}
          {s.whatsapp && <a data-testid="footer-whatsapp-link" className="flex items-center gap-2 hover:text-[#D4AF37]" href={`https://wa.me/${s.whatsapp.replace(/\D/g, "").replace(/^0/, "62")}`} target="_blank" rel="noreferrer"><span className="text-xs font-bold">WA</span>{s.whatsapp}</a>}
        </div></div>
        <div><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{t.explore}</h3><div className="mt-4 flex flex-col gap-2 text-sm text-white/60">{navItems.slice(0, 4).map(([href, label]) => <a data-testid={`footer-${href}-link`} key={href} href={`#${href}`} className="hover:text-[#D4AF37]">{label}</a>)}</div></div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.16em] text-white/35">© {s.period} BEM Fakultas Hukum Universitas Sali Al-Aitaam Bandung</div>
    </footer>
  </div>;
}
