import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Menu, X } from "lucide-react";
import { PUBLIC_NAVIGATION } from "@/lib/navigation";

export default function PublicPageHeader({ testId = "subpage-header", backLinkTestId = `${testId}-back-link` }: { testId?: string; backLinkTestId?: string }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return <header data-testid={testId} className="sticky top-0 z-40 border-b border-white/10 bg-[#2d070d]/95 px-5 text-white backdrop-blur-xl lg:px-10">
    <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-5">
      <Link data-testid={backLinkTestId} to="/" className="inline-flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75 hover:text-[#D4AF37]"><ArrowLeft size={15} />Beranda</Link>
      <nav data-testid={`${testId}-desktop-navigation`} className="hidden items-center gap-1 lg:flex">
        {PUBLIC_NAVIGATION.map((group) => <div key={group.id} className="relative" onMouseEnter={() => setOpenGroup(group.id)} onMouseLeave={() => setOpenGroup(null)} onFocus={() => setOpenGroup(group.id)} onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenGroup(null);
        }}>
          <button data-testid={`${testId}-nav-${group.id}`} type="button" aria-expanded={openGroup === group.id} onClick={() => setOpenGroup(group.id)} className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-white/10 hover:text-[#D4AF37] ${openGroup === group.id ? "text-[#D4AF37]" : "text-white/80"}`}>
            {group.label.id}<ChevronDown size={12} />
          </button>
          {openGroup === group.id && <div className="absolute left-0 top-full z-50 min-w-48 pt-2">
            <div className="rounded-sm border border-white/10 bg-[#2d070d] p-2 shadow-xl">
              {group.items.map((item, index) => <Link data-testid={`${testId}-submenu-${group.id}-${index}`} key={item.to} to={item.to} onClick={() => setOpenGroup(null)} className="block rounded px-3 py-2.5 text-xs text-white/75 hover:bg-white/10 hover:text-[#D4AF37]">{item.label.id}</Link>)}
            </div>
          </div>}
        </div>)}
      </nav>
      <Link to="/" className="hidden shrink-0 items-center gap-2 sm:flex"><img src={`${import.meta.env.BASE_URL}logo-bem.png`} alt="Logo BEM FH UNISAL" className="h-10 w-10 object-contain" /><span className="text-[9px] font-bold uppercase leading-tight tracking-[0.16em]">BEM FH<br /><span className="text-[#D4AF37]">UNISAL</span></span></Link>
      <button data-testid={`${testId}-menu-button`} type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Tutup menu" : "Buka menu"} aria-expanded={mobileOpen} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] lg:hidden">{mobileOpen ? <X size={17} /> : <Menu size={17} />}</button>
    </div>
    {mobileOpen && <nav data-testid={`${testId}-mobile-navigation`} className="mx-auto max-w-7xl border-t border-white/10 py-3 lg:hidden">
      {PUBLIC_NAVIGATION.map((group) => <details key={group.id} className="border-b border-white/10">
        <summary data-testid={`${testId}-mobile-group-${group.id}`} className="cursor-pointer list-none py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/85">{group.label.id}</summary>
        <div className="grid gap-1 pb-3 pl-3">
          {group.items.map((item, index) => <Link data-testid={`${testId}-mobile-submenu-${group.id}-${index}`} key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="rounded px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-[#D4AF37]">{item.label.id}</Link>)}
        </div>
      </details>)}
    </nav>}
  </header>;
}
