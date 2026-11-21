import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, CheckCircle2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Application } from "@/lib/types";

export default function ApplicationStatus() {
  const { id = "" } = useParams();
  const query = useQuery({ queryKey: ["application", id], queryFn: () => apiGet<Application>(`/applications/${id}`), retry: false });
  return <main data-testid="application-status-page" className="flex min-h-screen items-center justify-center bg-[#FAF7F0] p-5 text-[#2d070d]"><div data-testid="application-status-card" className="w-full max-w-lg rounded bg-white p-8 shadow-[0_20px_70px_rgba(74,7,14,.1)] md:p-12">{query.isLoading ? <p data-testid="application-status-loading">Memuat status...</p> : query.data ? <><CheckCircle2 className="text-[#a17b22]" size={30} /><p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9d7728]">Pendaftaran {query.data.id.slice(0, 8)}</p><h1 data-testid="application-status-title" className="mt-3 font-display text-5xl text-[#4A070E]">{query.data.status}</h1><p data-testid="application-status-description" className="mt-5 text-sm leading-7 text-[#4c3737]/70">Terima kasih, {query.data.name}. Tim BEM FH UNISAL akan menghubungi kamu melalui email atau WhatsApp.</p></> : <><Clock3 className="text-[#a17b22]" size={30} /><h1 className="mt-6 font-display text-4xl text-[#4A070E]">Status belum tersedia</h1><p className="mt-3 text-sm text-[#4c3737]/70">Pastikan tautan pendaftaran yang kamu gunakan sudah benar.</p></>}<Link data-testid="status-back-home-link" to="/" className="mt-10 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#4A070E]"><ArrowLeft size={15} />Kembali ke beranda</Link></div></main>;
}