// Hand-written mirrors of backend/models/content.py — keep in sync.

export interface Mission {
  title_id: string;
  title_en: string;
  desc_id: string;
  desc_en: string;
}

export interface SettingsUpdate {
  email: string;
  instagram: string;
  x: string;
  youtube: string;
  linkedin: string;
  whatsapp: string;
  google_form_url: string;
  address_id: string;
  address_en: string;
  tagline_id: string;
  tagline_en: string;
  logo_url: string;
  cabinet_name: string;
  period: string;
  hero_image_url: string;
  hero_image_url_2: string;
  hero_image_url_3: string;
  hero_image_url_4: string;
  home_news_limit: number;
  hero_title_id: string;
  hero_title_en: string;
  hero_body_id: string;
  hero_body_en: string;
  about_title_id: string;
  about_title_en: string;
  about_body_id: string;
  about_body_en: string;
  vision_id: string;
  vision_en: string;
  missions: Mission[];
  registration_open: boolean;
  sheet_sync_enabled: boolean;
  sheet_spreadsheet_id: string;
  complaint_email: string;
  complaint_whatsapp: string;
  recap_spreadsheet_id: string;
  calendar_sync_enabled: boolean;
  calendar_id: string;
  founded_year: string;
  history_is_draft: boolean;
  history_id: string;
  history_en: string;
  urgency_id: string;
  urgency_en: string;
}

export interface SiteSettings extends SettingsUpdate {
  id: string;
}

export interface NewsCreate {
  slug: string;
  category: string;
  title_id: string;
  title_en: string;
  excerpt_id: string;
  excerpt_en: string;
  content_id: string;
  content_en: string;
  image_url: string;
  published_at: string;
  read_minutes: number;
  featured: boolean;
}

export interface NewsItem extends NewsCreate {
  id: string;
}

export interface AgendaInput {
  date: string;
  time_start: string;
  time_end: string;
  day: string;
  month: string;
  title_id: string;
  title_en: string;
  location_id: string;
  location_en: string;
  type: string;
  order: number;
}
export interface AgendaItem extends AgendaInput {
  id: string;
  calendar_event_id: string;
}

export type CabinetGroup = "Pimpinan" | "Kementerian";
export interface CabinetInput {
  name: string;
  role_id: string;
  role_en: string;
  group: CabinetGroup;
  image_url: string;
  order: number;
}
export interface CabinetMember extends CabinetInput {
  id: string;
}

export type ProgramStatus = "Berjalan" | "Selesai" | "Segera";
export interface ProgramInput {
  number: string;
  title_id: string;
  title_en: string;
  description_id: string;
  description_en: string;
  status: ProgramStatus;
  order: number;
}
export interface ProgramItem extends ProgramInput {
  id: string;
}

export interface GalleryInput {
  image_url: string;
  caption_id: string;
  caption_en: string;
  year: string;
  order: number;
}
export interface GalleryItem extends GalleryInput {
  id: string;
}

export interface PublicContent {
  settings: SiteSettings;
  news: NewsItem[];
  agendas: AgendaItem[];
  cabinet: CabinetMember[];
  programs: ProgramItem[];
  gallery: GalleryItem[];
  captcha_question: string;
}

export interface ApplicationPayload {
  name: string;
  nim: string;
  email: string;
  whatsapp: string;
  semester: number;
  department: string;
  motivation: string;
  captcha_answer: string;
}

export type ApplicationStatus = "Baru" | "Ditinjau" | "Diterima" | "Ditolak";
export interface Application extends Omit<ApplicationPayload, "captcha_answer"> {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  email_notification: string;
  notified_at: string;
  sheet_sync: string;
}

export interface AdminUser {
  email: string;
  role: string;
}

export interface UploadResponse {
  url: string;
}

export interface AuditLog {
  id: string;
  action: string;
  target_id: string;
  actor: string;
  created_at: string;
}

export const DEPARTMENTS = [
  "Kementerian Keuangan",
  "Kaderisasi dan Pengembangan Profesi",
  "Luar Negeri",
  "Dalam Negeri",
  "Komunikasi Informasi",
  "Publikasi, Dekorasi dan Dokumentasi",
  "Olahraga dan Seni",
  "Keagamaan",
  "Wirausaha",
];

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

export interface ArchiveMember {
  name: string;
  role_id: string;
  role_en: string;
  group: string;
  image_url: string;
}
export interface CabinetArchive {
  id: string;
  cabinet_name: string;
  period: string;
  members: ArchiveMember[];
  archived_at: string;
}

export const COMPLAINT_CATEGORIES = ["Kekerasan seksual", "Perundungan (bullying)", "Kekerasan fisik/psikis", "Narkoba", "Akademik", "Fasilitas kampus", "Lainnya"] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];
export const COMPLAINT_STATUSES = ["Diterima", "Dikaji", "Dimusyawarahkan", "Ditindaklanjuti", "Selesai"] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export interface ComplaintCreate {
  category: ComplaintCategory;
  title: string;
  description: string;
  incident_date: string;
  location: string;
  opinion: string;
  anonymous: boolean;
  reporter_name: string;
  reporter_nim: string;
  reporter_contact: string;
  commitment: boolean;
  captcha_answer: string;
}
export interface EvidenceFile {
  id: string;
  filename: string;
  content_type: string;
  size: number;
}
export interface ComplaintHistoryEntry {
  at: string;
  actor: string;
  role: string;
  action: string;
  from_status: string;
  to_status: string;
}
export interface Complaint extends Omit<ComplaintCreate, "commitment" | "captcha_answer"> {
  id: string;
  code: string;
  evidence: EvidenceFile[];
  status: ComplaintStatus;
  response: string;
  internal_notes: string;
  created_at: string;
  history: ComplaintHistoryEntry[];
}
export interface ComplaintPublicStatus {
  code: string;
  category: string;
  status: string;
  response: string;
  created_at: string;
}
export interface ComplaintUpdate {
  status: ComplaintStatus;
  response: string;
  internal_notes: string;
}

export type AdminRole = "superadmin" | "satgas";
export interface AdminUserCreate {
  email: string;
  password: string;
  role: AdminRole;
}
export interface CountItem {
  label: string;
  count: number;
}
export interface ComplaintStats {
  total: number;
  active: number;
  by_category: CountItem[];
  by_status: CountItem[];
  by_month: CountItem[];
}
export interface RecapResult {
  month: string;
  total: number;
  spreadsheet_id: string;
  updated: boolean;
}
