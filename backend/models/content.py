from pydantic import BaseModel, Field, field_validator
from typing import Literal
import re
import uuid


def new_id() -> str:
    return str(uuid.uuid4())


class NewsCreate(BaseModel):
    slug: str = Field(min_length=3, max_length=120)
    category: str
    title_id: str
    title_en: str = ""
    excerpt_id: str
    excerpt_en: str = ""
    content_id: str
    content_en: str = ""
    image_url: str = ""
    published_at: str
    read_minutes: int = 4
    featured: bool = False

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value):
            raise ValueError("Slug hanya huruf kecil, angka, dan tanda hubung")
        return value


class NewsItem(NewsCreate):
    id: str = Field(default_factory=new_id)
    image_url: str


class AgendaInput(BaseModel):
    date: str = ""
    time_start: str = ""
    time_end: str = ""
    day: str = ""
    month: str = ""
    title_id: str
    title_en: str = ""
    location_id: str
    location_en: str = ""
    type: str = "Agenda"
    order: int = 0


class AgendaItem(AgendaInput):
    id: str = Field(default_factory=new_id)
    calendar_event_id: str = ""


class CabinetInput(BaseModel):
    name: str = Field(min_length=2)
    role_id: str
    role_en: str = ""
    group: Literal["Pimpinan", "Kementerian"] = "Kementerian"
    image_url: str = ""
    order: int = 0


class CabinetMember(CabinetInput):
    id: str = Field(default_factory=new_id)


class ProgramInput(BaseModel):
    number: str
    title_id: str
    title_en: str = ""
    description_id: str
    description_en: str = ""
    status: Literal["Berjalan", "Selesai", "Segera"]
    order: int = 0


class ProgramItem(ProgramInput):
    id: str = Field(default_factory=new_id)


class GalleryInput(BaseModel):
    image_url: str
    caption_id: str
    caption_en: str = ""
    year: str
    order: int = 0


class GalleryItem(GalleryInput):
    id: str = Field(default_factory=new_id)


class Mission(BaseModel):
    title_id: str
    title_en: str = ""
    desc_id: str
    desc_en: str = ""


class SettingsUpdate(BaseModel):
    email: str = ""
    instagram: str = ""
    whatsapp: str = "6281234567890"
    google_form_url: str = ""
    address_id: str = "Jl. Soekarno Hatta No. 34, Bandung"
    address_en: str = "Jl. Soekarno Hatta No. 34, Bandung"
    tagline_id: str = "Bergerak dengan Integritas, Mengabdi dengan Keberanian"
    tagline_en: str = "Moving with Integrity, Serving with Courage"
    logo_url: str = "/logo-bem.png"
    cabinet_name: str = "Kabinet Abisatya"
    period: str = "2026"
    hero_image_url: str = ""
    hero_title_id: str = "Menyalakan keberanian, merawat keadilan."
    hero_title_en: str = "Lighting courage, caring for justice."
    hero_body_id: str = "BEM Fakultas Hukum Universitas Sali Al-Aitaam Bandung hadir sebagai ruang tumbuh yang jujur, inklusif, dan berdampak."
    hero_body_en: str = "BEM Faculty of Law, Universitas Sali Al-Aitaam Bandung is a space to grow with honesty, inclusion, and impact."
    about_title_id: str = "Bukan sekadar jabatan."
    about_title_en: str = "More than a title."
    about_body_id: str = "Abisatya berarti keteguhan hati. Kami membawa nilai itu ke setiap ruang: dari advokasi kecil di kelas hingga pengabdian yang hadir di tengah masyarakat."
    about_body_en: str = "Abisatya means steadfastness. We carry it into every room: from small classroom advocacy to service that meets the community."
    vision_id: str = "Mewujudkan BEM FH UNISAL yang berintegritas, inklusif, dan berani memperjuangkan keadilan bagi mahasiswa dan masyarakat."
    vision_en: str = "To build an FH UNISAL Student Executive Board that is principled, inclusive, and brave in fighting for justice for students and society."
    missions: list[Mission] = Field(default_factory=lambda: [
        Mission(title_id="Hadir untuk mendengar", title_en="Here to listen", desc_id="Membuka ruang dialog yang aman dan setara.", desc_en="Opening a safe and equal space for dialogue."),
        Mission(title_id="Berani menyuarakan", title_en="Brave enough to speak", desc_id="Mengubah keresahan menjadi advokasi yang nyata.", desc_en="Turning concerns into meaningful advocacy."),
        Mission(title_id="Tulus dalam melayani", title_en="Serving with sincerity", desc_id="Menjadikan keadilan terasa dekat bagi sesama.", desc_en="Making justice feel closer to one another."),
        Mission(title_id="Tumbuh bersama", title_en="Growing together", desc_id="Merawat proses, bukan hanya mengejar hasil.", desc_en="Caring for the process, not only the outcome."),
    ])


    registration_open: bool = True
    sheet_sync_enabled: bool = False
    sheet_spreadsheet_id: str = ""
    complaint_email: str = ""
    complaint_whatsapp: str = ""
    recap_spreadsheet_id: str = ""
    calendar_sync_enabled: bool = False
    calendar_id: str = ""
    founded_year: str = "2010"
    history_is_draft: bool = True
    history_id: str = ("Badan Eksekutif Mahasiswa Fakultas Hukum Universitas Sali Al-Aitaam lahir dari kebutuhan mahasiswa hukum akan wadah "
        "yang mampu menyuarakan aspirasi, mengawal kebijakan kampus, dan menghidupkan tradisi berpikir kritis.\n\n"
        "Berawal dari forum diskusi kecil para mahasiswa angkatan awal, gagasan itu tumbuh menjadi organisasi eksekutif yang "
        "menaungi kementerian-kementerian dengan bidang kerja masing-masing. Dari periode ke periode, setiap kabinet meneruskan "
        "estafet: memperkuat advokasi, kaderisasi, dan pengabdian kepada masyarakat.")
    history_en: str = ("The Student Executive Board of the Faculty of Law, Universitas Sali Al-Aitaam was born from law students' need for a body "
        "that voices aspirations, oversees campus policy, and keeps critical thinking alive.\n\n"
        "What began as small discussion circles grew into an executive organization with ministries for each field of work. "
        "Period after period, every cabinet carries the baton: strengthening advocacy, cadre development, and community service.")
    urgency_id: str = ("Mahasiswa hukum dididik untuk memahami keadilan, dan BEM menjadi ruang pertama untuk mempraktikkannya: "
        "mendampingi mahasiswa yang menghadapi masalah, menjembatani dialog dengan fakultas, serta memastikan kampus tetap aman, "
        "inklusif, dan bebas dari kekerasan.")
    urgency_en: str = ("Law students are trained to understand justice, and the BEM is the first place to practise it: supporting students "
        "facing problems, bridging dialogue with the faculty, and keeping the campus safe, inclusive, and free from violence.")


class SiteSettings(SettingsUpdate):
    id: str = "main"


class PublicContent(BaseModel):
    settings: SiteSettings
    news: list[NewsItem]
    agendas: list[AgendaItem]
    cabinet: list[CabinetMember]
    programs: list[ProgramItem]
    gallery: list[GalleryItem]
    captcha_question: str


class ApplicationCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    nim: str
    email: str
    whatsapp: str
    semester: int = Field(ge=1, le=8)
    department: str = Field(min_length=2, max_length=80)
    motivation: str = Field(min_length=20, max_length=1000)
    captcha_answer: str

    @field_validator("nim")
    @classmethod
    def validate_nim(cls, value: str) -> str:
        if not re.fullmatch(r"\d{8,15}", value):
            raise ValueError("NIM harus berupa 8–15 digit angka")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]{2,}", value):
            raise ValueError("Email tidak valid")
        return value

    @field_validator("whatsapp")
    @classmethod
    def validate_whatsapp(cls, value: str) -> str:
        clean = re.sub(r"[\s-]", "", value)
        if not re.fullmatch(r"(?:\+62|62|08)\d{8,13}", clean):
            raise ValueError("Nomor WhatsApp Indonesia tidak valid")
        return clean


ApplicationStatus = Literal["Baru", "Ditinjau", "Diterima", "Ditolak"]


class Application(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    nim: str
    email: str
    whatsapp: str
    semester: int
    department: str
    motivation: str
    status: ApplicationStatus = "Baru"
    created_at: str
    email_notification: str = ""
    notified_at: str = ""
    sheet_sync: str = ""


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class AdminLogin(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=1024)


AdminRole = Literal["superadmin", "satgas"]


class AdminUserResponse(BaseModel):
    email: str
    role: str


class AdminUserCreate(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=12, max_length=128)
    role: AdminRole = "satgas"


class CountItem(BaseModel):
    label: str
    count: int


class ComplaintStats(BaseModel):
    total: int
    active: int
    by_category: list[CountItem]
    by_status: list[CountItem]
    by_month: list[CountItem]


class RecapRequest(BaseModel):
    month: str = ""  # YYYY-MM; empty = previous month


class RecapResult(BaseModel):
    month: str
    total: int
    spreadsheet_id: str
    updated: bool


class UploadResponse(BaseModel):
    url: str


class ArchiveMember(BaseModel):
    name: str
    role_id: str
    role_en: str = ""
    group: str = "Kementerian"
    image_url: str = ""


class CabinetArchive(BaseModel):
    id: str = Field(default_factory=new_id)
    cabinet_name: str
    period: str
    members: list[ArchiveMember]
    archived_at: str


ComplaintCategory = Literal["Kekerasan seksual", "Perundungan (bullying)", "Kekerasan fisik/psikis", "Narkoba", "Akademik", "Fasilitas kampus", "Lainnya"]
ComplaintStatus = Literal["Diterima", "Dikaji", "Dimusyawarahkan", "Ditindaklanjuti", "Selesai"]


class ComplaintCreate(BaseModel):
    category: ComplaintCategory
    title: str = Field(min_length=5, max_length=150)
    description: str = Field(min_length=30, max_length=5000)
    incident_date: str = ""
    location: str = Field(default="", max_length=200)
    opinion: str = Field(default="", max_length=2000)
    anonymous: bool = True
    reporter_name: str = Field(default="", max_length=100)
    reporter_nim: str = Field(default="", max_length=20)
    reporter_contact: str = Field(default="", max_length=120)
    commitment: bool
    captcha_answer: str


class EvidenceFile(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int


class ComplaintHistoryEntry(BaseModel):
    at: str
    actor: str
    role: str = ""
    action: str
    from_status: str = ""
    to_status: str = ""


class Complaint(BaseModel):
    id: str = Field(default_factory=new_id)
    code: str
    category: str
    title: str
    description: str
    incident_date: str = ""
    location: str = ""
    opinion: str = ""
    anonymous: bool = True
    reporter_name: str = ""
    reporter_nim: str = ""
    reporter_contact: str = ""
    evidence: list[EvidenceFile] = []
    status: ComplaintStatus = "Diterima"
    response: str = ""
    internal_notes: str = ""
    created_at: str
    history: list[ComplaintHistoryEntry] = []


class ComplaintPublicStatus(BaseModel):
    code: str
    category: str
    status: str
    response: str
    created_at: str


class ComplaintUpdate(BaseModel):
    status: ComplaintStatus
    response: str = Field(default="", max_length=3000)
    internal_notes: str = Field(default="", max_length=5000)
