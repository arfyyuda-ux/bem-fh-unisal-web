export type SiteLanguage = "id" | "en";

export interface PublicNavigationItem {
  label: Record<SiteLanguage, string>;
  to: string;
}

export interface PublicNavigationGroup {
  id: string;
  label: Record<SiteLanguage, string>;
  items: PublicNavigationItem[];
}

export const PUBLIC_NAVIGATION: PublicNavigationGroup[] = [
  {
    id: "tentang",
    label: { id: "Tentang", en: "About" },
    items: [
      { label: { id: "Profil BEM", en: "BEM profile" }, to: "/tentang#profil" },
      { label: { id: "Visi & Misi", en: "Vision & Mission" }, to: "/tentang#visi-misi" },
      { label: { id: "Sejarah", en: "History" }, to: "/tentang#sejarah" },
    ],
  },
  {
    id: "kabinet",
    label: { id: "Kabinet", en: "Cabinet" },
    items: [
      { label: { id: "Pimpinan", en: "Leadership" }, to: "/kabinet#pimpinan" },
      { label: { id: "Kementerian", en: "Ministries" }, to: "/kabinet#kementerian" },
      { label: { id: "Arsip kabinet", en: "Cabinet archive" }, to: "/arsip" },
    ],
  },
  {
    id: "program",
    label: { id: "Kegiatan", en: "Activities" },
    items: [
      { label: { id: "Program kerja", en: "Programs" }, to: "/kegiatan#program" },
      { label: { id: "Agenda", en: "Agenda" }, to: "/kegiatan#agenda" },
      { label: { id: "Galeri", en: "Gallery" }, to: "/kegiatan#galeri" },
    ],
  },
  {
    id: "berita",
    label: { id: "Informasi", en: "Updates" },
    items: [
      { label: { id: "Semua berita", en: "All news" }, to: "/berita" },
    ],
  },
  {
    id: "layanan",
    label: { id: "Layanan", en: "Services" },
    items: [
      { label: { id: "Pendaftaran", en: "Join us" }, to: "/pendaftaran" },
      { label: { id: "Pengaduan", en: "Report an issue" }, to: "/pengaduan" },
    ],
  },
];
