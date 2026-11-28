import { useQuery } from "@tanstack/react-query";
import { Archive as ArchiveIcon } from "lucide-react";
import { apiGet } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import PublicPageHeader from "@/components/PublicPageHeader";
import { initialsOf } from "@/lib/types";
import type { CabinetArchive } from "@/lib/types";

export default function Archive() {
  const query = useQuery({ queryKey: ["archives"], queryFn: () => apiGet<CabinetArchive[]>("/archives"), retry: false });
  const archives = query.data && !query.isError ? query.data : [];
  return <main data-testid="archive-page" className="min-h-screen bg-[#FAF7F0] text-[#2a1818]">
    <PublicPageHeader testId="archive-header" />
    <section className="mx-auto max-w-6xl px-5 py-16 lg:px-10 lg:py-24">
      <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8b5b60]"><span className="h-px w-8 bg-current" />Arsip kabinet</p>
      <h1 data-testid="archive-title" className="mt-5 font-display text-5xl tracking-[-.04em] text-[#4A070E] md:text-7xl">Mereka yang pernah <em className="font-serif text-[#a17b22]">mengabdi.</em></h1>
      <p className="mt-6 max-w-xl text-sm leading-7 text-[#4c3737]/70">Susunan kepengurusan BEM FH UNISAL dari periode ke periode, sebagai jejak estafet perjuangan.</p>
      {query.isLoading && <div data-testid="archive-loading" className="mt-12 h-64 animate-pulse bg-white/70" />}
      {!query.isLoading && !archives.length && <div data-testid="archive-empty-state" className="mt-12 flex flex-col items-center rounded bg-white p-12 text-center"><ArchiveIcon className="text-[#D4AF37]" size={28} /><p className="mt-4 font-display text-2xl text-[#4A070E]">Belum ada arsip.</p><p className="mt-2 max-w-sm text-sm text-[#8b5b60]">Arsip akan muncul di sini setelah kabinet menyelesaikan periodenya.</p></div>}
      <div className="mt-14 space-y-20">
        {archives.map((a) => <article data-testid={`archive-${a.id}`} key={a.id}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#4A070E]/15 pb-5"><h2 className="font-display text-4xl text-[#4A070E]">{a.cabinet_name}</h2><span data-testid={`archive-period-${a.id}`} className="rounded-full bg-[#4A070E] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Periode {a.period}</span></div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 lg:grid-cols-5">{a.members.map((m, i) => <div data-testid={`archive-${a.id}-member-${i}`} key={i}>
            <div className="aspect-[4/5] overflow-hidden bg-[#4A070E]">{m.image_url ? <img src={resolveAssetUrl(m.image_url)} alt={m.name} loading="lazy" className="h-full w-full object-cover grayscale-[35%]" /> : <div className="flex h-full items-end bg-[radial-gradient(circle_at_70%_20%,#6b1019,#2d070d)] p-4 font-display text-5xl text-[#D4AF37]">{initialsOf(m.name)}</div>}</div>
            <p className="mt-3 font-display text-lg text-[#4A070E]">{m.name}</p><p className="mt-0.5 text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-[#8b5b60]">{m.role_id}</p>
          </div>)}</div>
        </article>)}
      </div>
    </section>
  </main>;
}
