import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Archive, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Linkedin, Mail, MapPin, Menu, UserRound, X } from "lucide-react";
import { SiInstagram, SiX, SiYoutube } from "@icons-pack/react-simple-icons";
import { apiGet } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import { FALLBACK_CONTENT } from "@/lib/content";
import { PUBLIC_NAVIGATION } from "@/lib/navigation";
import type { PublicContent } from "@/lib/types";

type Language = "id" | "en";
const copy = {
  id: { admin: "Admin", readNews: "Baca berita", join: "Daftar anggota", joinEyebrow: "Bergabung", news: "Catatan terbaru", agenda: "Agenda mendatang", viewAll: "Lihat semua agenda", about: "Tentang kami", footer: "Bergerak untuk keadilan yang dekat.", explore: "Jelajahi", visit: "Alamat", connect: "Kontak", social: "Media sosial" },
  en: { admin: "Admin", readNews: "Read news", join: "Join us", joinEyebrow: "Join us", news: "Latest notes", agenda: "Coming up", viewAll: "See all events", about: "About us", footer: "Moving justice closer.", explore: "Explore", visit: "Address", connect: "Contact", social: "Social media" },
};
const formatDate = (date: string, language: Language) => {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
};
const pick = (language: Language, id: string, en: string) => (language === "en" && en ? en : id);

function SectionLabel({ children, light = false, id }: { children: React.ReactNode; light?: boolean; id: string }) {
  return <div data-testid={`section-label-${id}`} className={`mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] ${light ? "text-[#D4AF37]" : "text-[#8b5b60]"}`}><span className="h-px w-8 bg-current" />{children}</div>;
}

export default function Home() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("bem-language") as Language) || "id");
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopNavigationOpen, setDesktopNavigationOpen] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const t = copy[language];
  const publicQuery = useQuery({ queryKey: ["public-content"], queryFn: () => apiGet<PublicContent>("/public"), retry: false });
  const content = publicQuery.data && !publicQuery.isError ? publicQuery.data : FALLBACK_CONTENT;
  const s = content.settings;
  const heroSlides = useMemo(() => {
    const candidates = [
      s.hero_image_url,
      s.hero_image_url_2,
      s.hero_image_url_3,
      s.hero_image_url_4,
      ...content.gallery.map((image) => image.image_url),
      ...content.news.map((news) => news.image_url),
      ...content.cabinet.filter((member) => member.image_url).map((member) => member.image_url),
      ...FALLBACK_CONTENT.gallery.map((image) => image.image_url),
      ...FALLBACK_CONTENT.cabinet.filter((member) => member.image_url).map((member) => member.image_url),
    ];
    return Array.from(new Set(candidates.filter((src) => src.trim()).map(resolveAssetUrl))).slice(0, 4);
  }, [content, s.hero_image_url, s.hero_image_url_2, s.hero_image_url_3, s.hero_image_url_4]);
  const homeNewsLimit = Math.min(12, Math.max(1, Math.trunc(s.home_news_limit || 4)));
  const homeNews = useMemo(
    () => [...content.news].sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, homeNewsLimit),
    [content.news, homeNewsLimit],
  );
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 40); onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => { localStorage.setItem("bem-language", language); document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    const closeNavigation = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setDesktopNavigationOpen(null);
      }
    };
    window.addEventListener("keydown", closeNavigation);
    return () => window.removeEventListener("keydown", closeNavigation);
  }, []);
  useEffect(() => {
    if (heroSlides.length < 2 || heroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setHeroSlideIndex((index) => (index + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroSlides.length]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  const activeHeroSlide = heroSlideIndex % heroSlides.length;
  const open = s.registration_open !== false;
  const footerLinks = PUBLIC_NAVIGATION.map((group) => [group.id, group.label[language], group.items[0].to] as const);

  return <div data-testid="public-home-page" className="min-h-screen overflow-x-hidden bg-[#FAF7F0] text-[#2a1818]">
    <header data-testid="public-navbar" className={`fixed inset-x-0 top-0 z-50 border-b text-white transition-[background-color,border-color,backdrop-filter] duration-300 ${scrolled || menuOpen ? "border-white/10 bg-[#2d070d]/90 backdrop-blur-xl" : "border-transparent bg-transparent"}`}>
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-10">
        <a data-testid="brand-home-link" href="#top" className="flex items-center gap-3">
          <img data-testid="brand-logo" src={resolveAssetUrl(s.logo_url || "/logo-bem.png")} alt="Logo BEM FH UNISAL" className="h-11 w-11 object-contain" />
          <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.18em]">BEM FH<br /><span className="text-[#D4AF37]">UNISAL</span></span>
        </a>
        <nav data-testid="desktop-navigation" className="hidden items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] lg:flex">
          {PUBLIC_NAVIGATION.map((group) => <div key={group.id} className="relative" onMouseEnter={() => setDesktopNavigationOpen(group.id)} onMouseLeave={() => setDesktopNavigationOpen(null)} onFocus={() => setDesktopNavigationOpen(group.id)} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDesktopNavigationOpen(null);
          }}>
            <button data-testid={`nav-${group.id}-link`} type="button" aria-expanded={desktopNavigationOpen === group.id} aria-haspopup="menu" onClick={() => setDesktopNavigationOpen(desktopNavigationOpen === group.id ? null : group.id)} className={`nav-top-link flex items-center gap-1 rounded-full px-3 py-2 hover:bg-white/10 hover:text-[#D4AF37] ${desktopNavigationOpen === group.id ? "is-open text-[#D4AF37]" : ""}`}>{group.label[language]}<ChevronDown size={14} className="nav-chevron" /></button>
            {desktopNavigationOpen === group.id && <div role="menu" className="absolute left-0 top-full z-50 min-w-52 pt-2">
              <div className="nav-dropdown rounded-sm border border-white/10 bg-[#2d070d]/95 p-2 shadow-[0_18px_45px_rgba(0,0,0,.28)] backdrop-blur-xl">
                {group.items.map((item, index) => <Link role="menuitem" data-testid={`nav-${group.id}-submenu-${index}`} key={item.to} to={item.to} onClick={() => setDesktopNavigationOpen(null)} className="nav-dropdown-item block rounded px-3 py-2.5 text-xs tracking-normal text-white/75 hover:bg-white/10 hover:text-[#D4AF37]">{item.label[language]}<span aria-hidden="true" className="nav-dropdown-arrow">→</span></Link>)}
              </div>
            </div>}
          </div>)}
        </nav>
        <div className="flex items-center gap-3">
          <div data-testid="language-toggle" className="flex rounded-full border border-white/20 p-1 text-[10px] font-bold">
            <button data-testid="language-id-button" onClick={() => setLanguage("id")} className={`rounded-full px-2.5 py-1 ${language === "id" ? "bg-[#D4AF37] text-[#2d070d]" : "text-white/60"}`}>ID</button>
            <button data-testid="language-en-button" onClick={() => setLanguage("en")} className={`rounded-full px-2.5 py-1 ${language === "en" ? "bg-[#D4AF37] text-[#2d070d]" : "text-white/60"}`}>EN</button>
          </div>
          <Link data-testid="desktop-admin-link" to="/admin" aria-label={t.admin} title={t.admin} className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] lg:flex"><UserRound size={17} /></Link>
          <button data-testid="hamburger-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? (language === "id" ? "Tutup menu" : "Close menu") : (language === "id" ? "Buka menu" : "Open menu")} aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] lg:hidden">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {menuOpen && <div data-testid="hamburger-menu-panel" className="mobile-nav-enter absolute right-5 top-[84px] max-h-[calc(100vh-7rem)] w-[min(360px,calc(100vw-2.5rem))] overflow-y-auto rounded border border-white/10 bg-[#2d070d]/95 p-5 shadow-2xl backdrop-blur-xl lg:hidden">
        <nav className="flex flex-col text-xs font-semibold uppercase tracking-[0.2em]">
          {PUBLIC_NAVIGATION.map((group) => <details key={group.id} className="border-b border-white/10">
            <summary data-testid={`menu-${group.id}-link`} className="mobile-nav-summary cursor-pointer list-none py-3 hover:text-[#D4AF37]"><span>{group.label[language]}</span><ChevronDown size={16} className="mobile-nav-chevron" /></summary>
            <div className="grid gap-1 pb-3 pl-3">
              {group.items.map((item, index) => <Link data-testid={`menu-${group.id}-submenu-${index}`} key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className="mobile-nav-item rounded px-3 py-2 text-xs font-medium normal-case tracking-normal text-white/65 hover:bg-white/10 hover:text-[#D4AF37]">{item.label[language]}<span aria-hidden="true">→</span></Link>)}
            </div>
          </details>)}
          <Link data-testid="menu-archive-link" to="/arsip" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-b border-white/10 py-3 hover:text-[#D4AF37]"><Archive size={13} />{language === "id" ? "Arsip kabinet" : "Cabinet archive"}</Link>
          <Link data-testid="menu-admin-link" to="/admin" onClick={() => setMenuOpen(false)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2.5 text-[#2d070d]"><UserRound size={14} />{t.admin}</Link>
        </nav>
      </div>}
    </header>

    <main id="top">
      <section data-testid="hero-section" className="relative flex min-h-[700px] items-center justify-center overflow-hidden bg-[#2d070d] text-white lg:min-h-[800px]">
        <div data-testid="hero-background" className="absolute inset-0">
          {heroSlides.map((src, index) => <img data-testid={`hero-slide-${index}`} key={src} src={src} alt="" aria-hidden="true" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${index === activeHeroSlide ? "opacity-55" : "opacity-0"}`} />)}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#2d070d]/75 via-[#2d070d]/45 to-[#2d070d]/80" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#2d070d]/70 to-transparent" />
        <div data-testid="home-hero-wave-shadow-back" aria-hidden="true" className="home-hero-wave-shadow home-hero-wave-shadow-back pointer-events-none absolute bottom-0 left-[-100%] z-[8] h-28 w-[300%]">
          <svg viewBox="0 0 4320 100" preserveAspectRatio="none" className="block h-full w-full">
            <defs><linearGradient id="home-hero-wave-shadow-back-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d070d" stopOpacity="0.16" /><stop offset="40%" stopColor="#D4AF37" stopOpacity="0.52" /><stop offset="100%" stopColor="#4A070E" stopOpacity="0.22" /></linearGradient></defs>
            <path d="M0 24 C240 6 480 6 720 24 C960 42 1200 42 1440 24 C1680 6 1920 6 2160 24 C2400 42 2640 42 2880 24 C3120 6 3360 6 3600 24 C3840 42 4080 42 4320 24 V100 H0 Z" fill="url(#home-hero-wave-shadow-back-gradient)" />
          </svg>
        </div>
        <div data-testid="home-hero-wave-shadow-front" aria-hidden="true" className="home-hero-wave-shadow home-hero-wave-shadow-front pointer-events-none absolute bottom-0 left-[-100%] z-[9] h-28 w-[300%]">
          <svg viewBox="0 0 4320 100" preserveAspectRatio="none" className="block h-full w-full">
            <defs><linearGradient id="home-hero-wave-shadow-front-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity="0.22" /><stop offset="50%" stopColor="#F4D788" stopOpacity="0.7" /><stop offset="100%" stopColor="#efe7d9" stopOpacity="0.38" /></linearGradient></defs>
            <path d="M0 42 C240 24 480 24 720 42 C960 60 1200 60 1440 42 C1680 24 1920 24 2160 42 C2400 60 2640 60 2880 42 C3120 24 3360 24 3600 42 C3840 60 4080 60 4320 42 V100 H0 Z" fill="url(#home-hero-wave-shadow-front-gradient)" />
          </svg>
        </div>
        <div data-testid="home-hero-curve" aria-hidden="true" className="home-hero-curve pointer-events-none absolute bottom-0 left-[-100%] z-10 h-28 w-[300%]">
          <svg viewBox="0 0 4320 100" preserveAspectRatio="none" className="block h-full w-full">
            <path d="M0 56 C240 38 480 38 720 56 C960 74 1200 74 1440 56 C1680 38 1920 38 2160 56 C2400 74 2640 74 2880 56 C3120 38 3360 38 3600 56 C3840 74 4080 74 4320 56 V100 H0 Z" fill="#efe7d9" />
          </svg>
        </div>
        <div className="relative z-20 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-28 pt-32 text-center lg:px-10 lg:pb-36">
          <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.24em] text-white/75 sm:text-xs">{language === "id" ? "Selamat datang di situs resmi BEM FH UNISAL" : "Welcome to the official BEM FH UNISAL website"}</p>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">{s.cabinet_name} · {s.period}</p>
          <h1 data-testid="hero-title" className="max-w-5xl font-display text-5xl leading-[.98] tracking-[-.04em] sm:text-7xl lg:text-8xl">{pick(language, s.hero_title_id, s.hero_title_en)}</h1>
          <p data-testid="hero-description" className="mt-6 max-w-2xl text-sm leading-7 text-white/75 sm:text-base sm:leading-8">{pick(language, s.hero_body_id, s.hero_body_en)}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link data-testid="hero-about-button" to="/tentang#profil" className="group inline-flex items-center gap-3 rounded-full bg-[#D4AF37] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-[#2d070d] hover:bg-[#f0ca57]">{language === "id" ? "Kenali Kami" : "Get to Know Us"}<ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
            <Link data-testid="hero-read-news-button" to="/berita" className="inline-flex items-center gap-3 rounded-full border border-white/50 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white hover:border-[#D4AF37] hover:text-[#D4AF37]">{t.readNews}</Link>
          </div>
          <div data-testid="hero-carousel-controls" role="group" aria-label={language === "id" ? "Galeri foto beranda" : "Homepage photo gallery"} className="mt-7 flex items-center justify-center gap-3" onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} onFocus={() => setHeroPaused(true)} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroPaused(false);
          }}>
            <button data-testid="hero-slide-previous" type="button" aria-label={language === "id" ? "Foto sebelumnya" : "Previous photo"} onClick={() => setHeroSlideIndex((index) => (index - 1 + heroSlides.length) % heroSlides.length)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 text-white/80 transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]"><ChevronLeft size={16} /></button>
            {heroSlides.map((_, index) => <button data-testid={`hero-slide-selector-${index}`} key={index} type="button" aria-label={`${language === "id" ? "Foto" : "Photo"} ${index + 1} ${language === "id" ? "dari" : "of"} ${heroSlides.length}`} aria-pressed={index === activeHeroSlide} onClick={() => setHeroSlideIndex(index)} className={`h-2.5 rounded-full transition-[width,background-color] duration-300 ${index === activeHeroSlide ? "w-7 bg-[#D4AF37]" : "w-2.5 bg-white/55 hover:bg-white"}`} />)}
            <button data-testid="hero-slide-next" type="button" aria-label={language === "id" ? "Foto berikutnya" : "Next photo"} onClick={() => setHeroSlideIndex((index) => (index + 1) % heroSlides.length)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 text-white/80 transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]"><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>
      <div data-testid="values-marquee" className="border-b border-[#D4AF37]/35 bg-[#efe7d9] px-5 py-5 text-[#4A070E] lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span data-testid="marquee-item-0" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b5b20]">Integritas <span className="px-1 text-[#4A070E]/35">/</span> Keberanian <span className="px-1 text-[#4A070E]/35">/</span> Kolaborasi <span className="px-1 text-[#4A070E]/35">/</span> Keadilan</span>
          <span data-testid="marquee-item-1" className="text-xs leading-relaxed text-[#4c3737]/70"><strong className="font-semibold text-[#4A070E]">{s.cabinet_name}</strong> · {pick(language, s.tagline_id, s.tagline_en)}</span>
        </div>
      </div>

      <section id="tentang" data-testid="about-section" className="scroll-mt-20 bg-[#efe7d9] px-5 py-20 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div className="reveal">
            <div className="relative overflow-hidden rounded-sm bg-[#4A070E]">
              <img data-testid="about-image" src={resolveAssetUrl(content.gallery[0]?.image_url || s.hero_image_url || FALLBACK_CONTENT.settings.hero_image_url)} alt={content.gallery[0] ? pick(language, content.gallery[0].caption_id, content.gallery[0].caption_en) : "Kegiatan BEM FH UNISAL"} loading="lazy" className="aspect-[4/5] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2d070d]/80 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{s.cabinet_name} · {s.period}</p>
                <p className="mt-2 font-display text-3xl">{language === "id" ? "Bergerak bersama." : "Moving together."}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#4A070E]/15 pt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8b5b60]">
              <span>BEM FH UNISAL</span><span>{language === "id" ? "Bandung, Indonesia" : "Bandung, Indonesia"}</span>
            </div>
          </div>
          <div className="reveal">
            <SectionLabel id="about">{t.about}</SectionLabel>
            <h2 data-testid="about-heading" className="max-w-2xl font-display text-5xl leading-[.98] tracking-[-.04em] text-[#4A070E] md:text-7xl">{pick(language, s.about_title_id, s.about_title_en)}</h2>
            <p data-testid="about-body" className="mt-7 line-clamp-4 max-w-2xl whitespace-pre-line text-sm leading-8 text-[#4c3737]/70">{pick(language, s.about_body_id, s.about_body_en)}</p>
            <Link data-testid="about-more-link" to="/tentang#profil" className="mt-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#4A070E] hover:text-[#9d7728]">{language === "id" ? "Kenali BEM FH UNISAL" : "About BEM FH UNISAL"}<ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section id="berita" data-testid="news-section" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 lg:px-10 lg:py-28">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="reveal"><SectionLabel id="news">{t.news}</SectionLabel><h2 data-testid="news-heading" className="font-display text-5xl tracking-[-.04em] text-[#4A070E] md:text-6xl">{language === "id" ? "Cerita yang" : "Stories in"} <em className="font-serif text-[#a17b22]">{language === "id" ? "bergerak." : "motion."}</em></h2></div>
          <Link data-testid="news-view-all-link" to="/berita" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#4A070E] hover:text-[#9d7728]">{language === "id" ? "Semua berita" : "All news"}<ArrowUpRight size={15} /></Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div data-testid="news-list" className="grid content-start gap-6 md:grid-cols-2">
            {publicQuery.isLoading && Array.from({ length: 2 }).map((_, i) => <div data-testid={`news-skeleton-${i}`} key={i} className="h-80 animate-pulse bg-white/70" />)}
            {!publicQuery.isLoading && (homeNews.length ? homeNews.map((item, index) => <article data-testid={`news-card-${item.slug}`} key={item.id} className={`group overflow-hidden rounded-sm bg-white shadow-[0_15px_50px_rgba(74,7,14,.08)] ${index === 0 ? "md:col-span-2 md:grid md:grid-cols-2" : ""}`}>
              <div className="overflow-hidden">              <img data-testid={`news-image-${item.slug}`} src={resolveAssetUrl(item.image_url)} alt={pick(language, item.title_id, item.title_en)} loading="lazy" className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-full" /></div>
              <div className="flex flex-col justify-center p-6 lg:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9d7728]"><span>{item.category}</span><span className="h-1 w-1 rounded-full bg-[#D4AF37]" /><span>{formatDate(item.published_at, language)}</span><span className="h-1 w-1 rounded-full bg-[#D4AF37]" /><span>{item.read_minutes} min</span></div>
                <h3 data-testid={`news-title-${item.slug}`} className="font-display text-3xl leading-tight text-[#4A070E]">{pick(language, item.title_id, item.title_en)}</h3>
                <p className="mt-3 text-sm leading-7 text-[#4c3737]/70">{pick(language, item.excerpt_id, item.excerpt_en)}</p>
                <Link data-testid={`news-read-link-${item.slug}`} to={`/berita/${item.slug}`} className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#4A070E]">{t.readNews}<ChevronRight size={15} className="transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </article>) : <div data-testid="news-empty-state" className="rounded bg-white p-10 text-center text-sm text-[#4c3737]/60 md:col-span-2">{language === "id" ? "Belum ada berita." : "No news yet."}</div>)}
          </div>
          <aside data-testid="agenda-sidebar" className="rounded-sm bg-[#4A070E] p-7 text-white lg:sticky lg:top-28 lg:h-fit">
            <div className="flex items-center justify-between"><div><SectionLabel light id="agenda">{t.agenda}</SectionLabel><h3 className="font-display text-3xl">{language === "id" ? "Di kalender." : "On the calendar."}</h3></div><CalendarDays className="text-[#D4AF37]" size={26} /></div>
            <div className="mt-8 divide-y divide-white/10">{content.agendas.length ? content.agendas.slice(0, 3).map((agenda) => <div data-testid={`agenda-item-${agenda.id}`} key={agenda.id} className="flex gap-4 py-5 first:pt-0"><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center border border-[#D4AF37]/60 text-[#D4AF37]"><strong className="font-display text-xl leading-none">{agenda.day}</strong><small className="text-[9px] font-bold tracking-widest">{agenda.month}</small></div><div><p className="font-display text-xl">{pick(language, agenda.title_id, agenda.title_en)}</p><p className="mt-1 flex items-center gap-1 text-xs text-white/50"><MapPin size={12} />{pick(language, agenda.location_id, agenda.location_en)}{agenda.time_start && <span data-testid={`agenda-time-${agenda.id}`} className="ml-1 text-[#D4AF37]/80">· {agenda.time_start}{agenda.time_end ? `–${agenda.time_end}` : ""} WIB</span>}</p></div></div>) : <p data-testid="agenda-empty-state" className="text-sm text-white/50">{language === "id" ? "Belum ada agenda." : "No events yet."}</p>}</div>
            <Link data-testid="agenda-view-all-link" to="/kegiatan#agenda" className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#D4AF37]">{t.viewAll}<ArrowUpRight size={14} /></Link>
          </aside>
        </div>
        <div className="mt-10 flex justify-center">
          <Link data-testid="news-more-link" to="/berita" className="group inline-flex items-center gap-3 rounded-full border border-[#4A070E]/20 bg-white px-7 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-[#4A070E] transition-colors hover:border-[#D4AF37] hover:bg-[#fffaf0]">
            {language === "id" ? "Selengkapnya" : "See more news"}
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {open && <section id="bergabung" data-testid="registration-section" className="scroll-mt-20 bg-[#D4AF37] px-5 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <SectionLabel id="register">{t.joinEyebrow}</SectionLabel>
            <h2 data-testid="registration-heading" className="font-display text-4xl leading-tight text-[#2d070d] md:text-5xl">{language === "id" ? "Jadi bagian dari gerakan." : "Be part of the movement."}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#2d070d]/70">{language === "id" ? "Setiap suara punya tempat. Kenali proses bergabung dan daftar melalui halaman pendaftaran." : "Every voice belongs. Learn about joining and apply on our registration page."}</p>
          </div>
          <Link data-testid="registration-page-link" to="/pendaftaran" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#2d070d] px-6 text-xs font-bold uppercase tracking-[0.16em] text-white hover:bg-[#4A070E]">{t.join}<ArrowUpRight size={15} /></Link>
        </div>
      </section>}
    </main>

    <footer data-testid="site-footer" className="bg-[#2d070d] px-5 py-14 text-white lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div><div className="flex items-center gap-3"><img src={resolveAssetUrl(s.logo_url || "/logo-bem.png")} alt="" className="h-12 w-12 object-contain" /><span className="text-xs font-bold uppercase tracking-[0.2em]">BEM FH UNISAL</span></div><p data-testid="footer-tagline" className="mt-6 max-w-xs text-sm leading-7 text-white/50">{s.cabinet_name} {s.period} · {t.footer}</p></div>
        <div><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{t.visit}</h3><p data-testid="footer-address" className="mt-4 text-sm leading-7 text-white/60">{pick(language, s.address_id, s.address_en)}</p></div>
        <div><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{t.connect}</h3><div className="mt-4 space-y-3 text-sm text-white/60">
          {s.email && <a data-testid="footer-email-link" className="flex items-center gap-2 hover:text-[#D4AF37]" href={`mailto:${s.email}`}><Mail size={14} />{s.email}</a>}
          {s.whatsapp && <a data-testid="footer-whatsapp-link" className="flex items-center gap-2 hover:text-[#D4AF37]" href={`https://wa.me/${s.whatsapp.replace(/\D/g, "").replace(/^0/, "62")}`} target="_blank" rel="noreferrer"><span className="text-xs font-bold">WA</span>{s.whatsapp}</a>}
        </div><div data-testid="footer-social-links" className="mt-8"><h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{t.social}</h4><div className="mt-4 flex flex-col items-start gap-3">
          {s.instagram ? <a data-testid="footer-instagram-link" aria-label="Instagram BEM FH UNISAL" title="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/65 transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]" href={s.instagram} target="_blank" rel="noreferrer noopener"><SiInstagram size={16} /></a> : <span data-testid="footer-instagram-icon" aria-label="Instagram" title="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/45"><SiInstagram size={16} /></span>}
          {s.x ? <a data-testid="footer-x-link" aria-label="X BEM FH UNISAL" title="X" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/65 transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]" href={s.x} target="_blank" rel="noreferrer noopener"><SiX size={15} /></a> : <span data-testid="footer-x-icon" aria-label="X" title="X" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/45"><SiX size={15} /></span>}
          {s.youtube ? <a data-testid="footer-youtube-link" aria-label="YouTube BEM FH UNISAL" title="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/65 transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]" href={s.youtube} target="_blank" rel="noreferrer noopener"><SiYoutube size={17} /></a> : <span data-testid="footer-youtube-icon" aria-label="YouTube" title="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/45"><SiYoutube size={17} /></span>}
          {s.linkedin ? <a data-testid="footer-linkedin-link" aria-label="LinkedIn BEM FH UNISAL" title="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/65 transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]" href={s.linkedin} target="_blank" rel="noreferrer noopener"><Linkedin size={16} /></a> : <span data-testid="footer-linkedin-icon" aria-label="LinkedIn" title="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/45"><Linkedin size={16} /></span>}
        </div></div></div>
        <div><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{t.explore}</h3><div className="mt-4 flex flex-col gap-2 text-sm text-white/60">{footerLinks.map(([id, label, to]) => <Link data-testid={`footer-${id}-link`} key={id} to={to} className="hover:text-[#D4AF37]">{label}</Link>)}</div></div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.16em] text-white/35">© {s.period} BEM Fakultas Hukum Universitas Sali Al-Aitaam Bandung</div>
    </footer>
  </div>;
}
