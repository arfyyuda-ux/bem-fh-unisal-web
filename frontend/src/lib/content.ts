import type { CabinetMember, PublicContent } from "@/lib/types";

// Static fallback so the page renders fully even when the backend is unreachable (static preview).
const hero = "https://static.prod-images.emergentagent.com/jobs/9d5d6cbf-7076-41a9-9c9e-2df75d62b295/images/8bc40d98ee47ed75c6f33a5ba65b4157fa470b0e15ecc68021791868811b93f7.jpeg";
const president = "https://static.prod-images.emergentagent.com/jobs/9d5d6cbf-7076-41a9-9c9e-2df75d62b295/images/0d5406ea66eb500bd3d188b3c5ecf9a5feb7626cc27e75bb2da0dc152cde291b.jpeg";
const forum = "https://static.prod-images.emergentagent.com/jobs/9d5d6cbf-7076-41a9-9c9e-2df75d62b295/images/3c024e6a7edb7248cf9315dfdc6af14b80b556835c56e6be0e6087c2cd234436.jpeg";
const service = "https://static.prod-images.emergentagent.com/jobs/9d5d6cbf-7076-41a9-9c9e-2df75d62b295/images/9d83b7438eb5d953ccf07ad30df885d13e0fe91da7fae5bbf2dc12c4593942d5.jpeg";

const cabinetSeed: [string, string, string, CabinetMember["group"]][] = [
  ["Aulia Rahma", "Presiden Mahasiswa", "Student President", "Pimpinan"],
  ["Raka Pratama", "Wakil Presiden Mahasiswa", "Vice President", "Pimpinan"],
  ["Nabila Putri", "Sekretaris Jenderal I", "Secretary General I", "Pimpinan"],
  ["Rizky Fauzan", "Sekretaris Jenderal II", "Secretary General II", "Pimpinan"],
  ["Fikri Ramadhan", "Kementerian Keuangan", "Ministry of Finance", "Pimpinan"],
  ["Dimas Akbar", "Kepala Kementerian Kaderisasi dan Pengembangan Profesi", "Head of Cadre & Professional Development", "Kementerian"],
  ["Salsa Amalia", "Ketua Kementerian Luar Negeri", "Head of External Affairs", "Kementerian"],
  ["Iqbal Maulana", "Ketua Kementerian Dalam Negeri", "Head of Internal Affairs", "Kementerian"],
  ["Hana Nursyifa", "Ketua Kementerian Komunikasi Informasi", "Head of Communication & Information", "Kementerian"],
  ["Anisa Zahra", "Ketua Kementerian Publikasi, Dekorasi dan Dokumentasi", "Head of Publication, Decoration & Documentation", "Kementerian"],
  ["Bagas Saputra", "Kepala Kementerian Olahraga dan Seni", "Head of Sports & Arts", "Kementerian"],
  ["Muhammad Fadhil", "Kepala Kementerian Keagamaan", "Head of Religious Affairs", "Kementerian"],
  ["Citra Lestari", "Kepala Kementerian Wirausaha", "Head of Entrepreneurship", "Kementerian"],
];

export const FALLBACK_CONTENT: PublicContent = {
  settings: {
    id: "main", email: "", instagram: "", whatsapp: "6281234567890", google_form_url: "",
    address_id: "Jl. Soekarno Hatta No. 34, Bandung", address_en: "Jl. Soekarno Hatta No. 34, Bandung",
    tagline_id: "Bergerak dengan Integritas, Mengabdi dengan Keberanian", tagline_en: "Moving with Integrity, Serving with Courage",
    logo_url: `${import.meta.env.BASE_URL}logo-bem.png`, cabinet_name: "Kabinet Abisatya", period: "2026", hero_image_url: hero,
    hero_title_id: "Menyalakan keberanian, merawat keadilan.", hero_title_en: "Lighting courage, caring for justice.",
    hero_body_id: "BEM Fakultas Hukum Universitas Sali Al-Aitaam Bandung hadir sebagai ruang tumbuh yang jujur, inklusif, dan berdampak.",
    hero_body_en: "BEM Faculty of Law, Universitas Sali Al-Aitaam Bandung is a space to grow with honesty, inclusion, and impact.",
    about_title_id: "Bukan sekadar jabatan.", about_title_en: "More than a title.",
    about_body_id: "Abisatya berarti keteguhan hati. Kami membawa nilai itu ke setiap ruang: dari advokasi kecil di kelas hingga pengabdian yang hadir di tengah masyarakat.",
    about_body_en: "Abisatya means steadfastness. We carry it into every room: from small classroom advocacy to service that meets the community.",
    vision_id: "Mewujudkan BEM FH UNISAL yang berintegritas, inklusif, dan berani memperjuangkan keadilan bagi mahasiswa dan masyarakat.",
    vision_en: "To build an FH UNISAL Student Executive Board that is principled, inclusive, and brave in fighting for justice for students and society.",
    missions: [
      { title_id: "Hadir untuk mendengar", title_en: "Here to listen", desc_id: "Membuka ruang dialog yang aman dan setara.", desc_en: "Opening a safe and equal space for dialogue." },
      { title_id: "Berani menyuarakan", title_en: "Brave enough to speak", desc_id: "Mengubah keresahan menjadi advokasi yang nyata.", desc_en: "Turning concerns into meaningful advocacy." },
      { title_id: "Tulus dalam melayani", title_en: "Serving with sincerity", desc_id: "Menjadikan keadilan terasa dekat bagi sesama.", desc_en: "Making justice feel closer to one another." },
      { title_id: "Tumbuh bersama", title_en: "Growing together", desc_id: "Merawat proses, bukan hanya mengejar hasil.", desc_en: "Caring for the process, not only the outcome." },
    ],
    registration_open: true, sheet_sync_enabled: false, sheet_spreadsheet_id: "", complaint_email: "", complaint_whatsapp: "", recap_spreadsheet_id: "", calendar_sync_enabled: false, calendar_id: "",
    founded_year: "2010", history_is_draft: true,
    history_id: "Badan Eksekutif Mahasiswa Fakultas Hukum Universitas Sali Al-Aitaam lahir dari kebutuhan mahasiswa hukum akan wadah yang mampu menyuarakan aspirasi, mengawal kebijakan kampus, dan menghidupkan tradisi berpikir kritis.",
    history_en: "The Student Executive Board of the Faculty of Law, Universitas Sali Al-Aitaam was born from law students' need for a body that voices aspirations, oversees campus policy, and keeps critical thinking alive.",
    urgency_id: "Mahasiswa hukum dididik untuk memahami keadilan, dan BEM menjadi ruang pertama untuk mempraktikkannya.",
    urgency_en: "Law students are trained to understand justice, and the BEM is the first place to practise it.",
  },
  news: [
    { id: "n1", slug: "ruang-aman-untuk-bertumbuh", category: "Kampus", title_id: "Ruang Aman untuk Bertumbuh", title_en: "A Safe Space to Grow", excerpt_id: "BEM FH UNISAL membuka ruang dialog yang hangat untuk setiap suara mahasiswa.", excerpt_en: "BEM FH UNISAL opens a warm dialogue space for every student voice.", content_id: "Kabinet Abisatya percaya bahwa kampus yang hidup lahir dari percakapan yang jujur. Melalui forum terbuka ini, mahasiswa dapat menyampaikan gagasan, keresahan, dan harapan untuk Fakultas Hukum.", content_en: "The Abisatya Cabinet believes a living campus is born from honest conversations. Through this open forum, students can share ideas, concerns, and hopes for the Faculty of Law.", image_url: forum, published_at: "2026-01-20", read_minutes: 4, featured: true },
    { id: "n2", slug: "pengabdian-hukum-di-cibiru", category: "Pengabdian", title_id: "Belajar Hukum, Mengabdi di Cibiru", title_en: "Learning Law, Serving Cibiru", excerpt_id: "Mahasiswa membawa pengetahuan hukum lebih dekat kepada warga melalui kelas hukum sederhana.", excerpt_en: "Students bring legal knowledge closer to residents through accessible legal classes.", content_id: "Program pengabdian ini mempertemukan mahasiswa dengan warga Cibiru dalam kelas hukum keluarga dan konsultasi dasar.", content_en: "This service program connects students with Cibiru residents through family law classes and basic consultations.", image_url: service, published_at: "2026-01-12", read_minutes: 5, featured: false },
    { id: "n3", slug: "menyambut-semester-baru", category: "Kampus", title_id: "Menyambut Semester Baru dengan Energi Baru", title_en: "Welcoming a New Semester", excerpt_id: "Catatan awal tahun dari Presiden BEM untuk seluruh keluarga besar FH UNISAL.", excerpt_en: "A new-year note from the BEM President to the FH UNISAL community.", content_id: "Kita memulai tahun ini dengan keberanian untuk hadir, mendengar, dan bekerja bersama.", content_en: "We begin this year with the courage to show up, listen, and work together.", image_url: hero, published_at: "2026-01-05", read_minutes: 3, featured: false },
  ],
  agendas: [
    { id: "a1", date: "2026-02-14", time_start: "", time_end: "", calendar_event_id: "", day: "14", month: "FEB", title_id: "Rapat Kerja Kabinet", title_en: "Cabinet Work Meeting", location_id: "Ruang Sidang FH", location_en: "Faculty Moot Court", type: "Agenda", order: 1 },
    { id: "a2", date: "2026-02-21", time_start: "", time_end: "", calendar_event_id: "", day: "21", month: "FEB", title_id: "Kelas Advokasi Dasar", title_en: "Basic Advocacy Class", location_id: "Aula UNISAL", location_en: "UNISAL Hall", type: "Agenda", order: 2 },
    { id: "a3", date: "2026-03-01", time_start: "", time_end: "", calendar_event_id: "", day: "01", month: "MAR", title_id: "Open Recruitment", title_en: "Open Recruitment", location_id: "Taman Kampus", location_en: "Campus Garden", type: "Agenda", order: 3 },
  ],
  cabinet: cabinetSeed.map(([name, role_id, role_en, group], index) => ({ id: `c${index + 1}`, name, role_id, role_en, group, image_url: index === 0 ? president : "", order: index + 1 })),
  programs: [
    { id: "p1", number: "01", title_id: "Klinik Advokasi", title_en: "Advocacy Clinic", description_id: "Pendampingan dan edukasi hukum yang mudah diakses mahasiswa.", description_en: "Accessible legal education and support for students.", status: "Berjalan", order: 1 },
    { id: "p2", number: "02", title_id: "Ruang Bicara", title_en: "Dialogue Room", description_id: "Forum aman untuk menyampaikan aspirasi dan membangun solusi.", description_en: "A safe forum for aspirations and collaborative solutions.", status: "Berjalan", order: 2 },
    { id: "p3", number: "03", title_id: "Sekolah Organisasi", title_en: "Organization School", description_id: "Belajar kepemimpinan, tata kelola, dan kerja kolaboratif.", description_en: "Learning leadership, governance, and collaboration.", status: "Segera", order: 3 },
    { id: "p4", number: "04", title_id: "Desa Sadar Hukum", title_en: "Law-Aware Village", description_id: "Pengabdian hukum bersama warga di sekitar kampus.", description_en: "Community legal service with neighborhoods around campus.", status: "Segera", order: 4 },
    { id: "p5", number: "05", title_id: "Jurnal Abisatya", title_en: "Abisatya Journal", description_id: "Catatan gagasan mahasiswa untuk hukum yang lebih manusiawi.", description_en: "Student ideas for a more humane legal culture.", status: "Selesai", order: 5 },
  ],
  gallery: [
    { id: "g1", image_url: forum, caption_id: "Forum Aspirasi Mahasiswa", caption_en: "Student Aspirations Forum", year: "2026", order: 1 },
    { id: "g2", image_url: service, caption_id: "Pengabdian Masyarakat", caption_en: "Community Service", year: "2026", order: 2 },
    { id: "g3", image_url: hero, caption_id: "Langkah Pertama Kabinet", caption_en: "The Cabinet's First Step", year: "2026", order: 3 },
  ],
  captcha_question: "7 + 5 = ?",
};
