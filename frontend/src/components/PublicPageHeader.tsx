import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PublicPageHeader({ testId = "subpage-header" }: { testId?: string }) {
  return <header data-testid={testId} className="sticky top-0 z-40 border-b border-white/10 bg-[#2d070d]/90 px-5 py-4 text-white backdrop-blur-xl lg:px-10">
    <div className="mx-auto flex max-w-6xl items-center justify-between">
      <Link data-testid={`${testId}-back-link`} to="/" className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-[#D4AF37]"><ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />Beranda</Link>
      <Link to="/" className="flex items-center gap-3"><span className="hidden text-right text-[10px] font-semibold uppercase tracking-[0.22em] sm:block">BEM FH<br /><span className="text-[#D4AF37]">UNISAL</span></span><img src={`${import.meta.env.BASE_URL}logo-bem.png`} alt="Logo BEM FH UNISAL" className="h-10 w-10 object-contain" /></Link>
    </div>
  </header>;
}
