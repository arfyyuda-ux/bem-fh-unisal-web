import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <main data-testid="not-found-page" className="flex min-h-screen items-center justify-center bg-[#FAF7F0] p-6 text-[#4A070E]">
    <div className="max-w-md text-center">
      <img src="/logo-bem.png" alt="Logo BEM FH UNISAL" className="mx-auto h-16 w-16 object-contain" />
      <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-[#9d7728]">Error 404</p>
      <h1 className="mt-3 font-display text-5xl">Halaman tidak ditemukan.</h1>
      <p className="mt-4 text-sm leading-7 text-[#4c3737]/70">Tautan yang kamu buka tidak tersedia atau sudah dipindahkan.</p>
      <Link data-testid="not-found-home-link" to="/" className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><ArrowLeft size={15} />Kembali ke beranda</Link>
    </div>
  </main>;
}
