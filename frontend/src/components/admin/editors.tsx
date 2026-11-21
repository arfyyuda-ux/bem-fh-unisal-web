import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiPost, apiPut, apiUpload, ApiError } from "@/lib/api";
import type { UploadResponse } from "@/lib/types";

export type Value = string | number | boolean;
export type Draft = Record<string, Value>;
type Row = Draft & { id: string };

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "image" | "select" | "date" | "checkbox";
  options?: string[];
  required?: boolean;
  wide?: boolean;
  hint?: string;
}

export const errorMessage = (error: unknown, fallback = "Gagal menyimpan") => {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string; loc?: string[] } | undefined;
      return `${first?.loc?.slice(-1)[0] ?? ""}: ${String(first?.msg ?? "").replace("Value error, ", "")}`;
    }
    if (error.status === 401) return "Sesi admin berakhir, silakan login ulang";
  }
  return fallback;
};

export function ImageField({ value, onChange, testId, label }: { value: string; onChange: (url: string) => void; testId: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Format harus JPG, PNG, atau WEBP");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran maksimum 5MB");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await apiUpload<UploadResponse>("/admin/upload", body);
      onChange(result.url);
      toast.success("Foto terunggah");
    } catch (error) {
      toast.error(errorMessage(error, "Upload gagal"));
    } finally {
      setUploading(false);
    }
  };
  return <div data-testid={`${testId}-field`} className="field-label sm:col-span-2">
    {label}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden border border-[#4A070E]/15 bg-[#f5efe5]">
        {value ? <img data-testid={`${testId}-preview`} src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="text-[#8b5b60]" size={20} />}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <input data-testid={`${testId}-url-input`} value={value} placeholder="URL gambar atau unggah file" onChange={(event) => onChange(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} data-testid={`${testId}-file-input`} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ""; }} />
          <button type="button" data-testid={`${testId}-upload-button`} onClick={() => inputRef.current?.click()} disabled={uploading} className="admin-chip">{uploading ? "Mengunggah…" : "Unggah foto"}</button>
          {value && <button type="button" data-testid={`${testId}-clear-button`} onClick={() => onChange("")} className="admin-chip">Hapus foto</button>}
        </div>
      </div>
    </div>
  </div>;
}

export function FieldInput({ field, value, onChange, testPrefix }: { field: FieldDef; value: Value; onChange: (v: Value) => void; testPrefix: string }) {
  const testId = `${testPrefix}-${field.key.replace(/_/g, "-")}`;
  if (field.type === "image") return <ImageField label={field.label} value={String(value ?? "")} onChange={onChange} testId={testId} />;
  if (field.type === "checkbox") return <label data-testid={`${testId}-field`} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#4A070E]"><input data-testid={`${testId}-input`} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#4A070E]" />{field.label}</label>;
  const common = { "data-testid": `${testId}-input`, required: field.required, value: String(value ?? "") };
  return <label data-testid={`${testId}-field`} className={`field-label ${field.wide || field.type === "textarea" ? "sm:col-span-2" : ""}`}>
    {field.label}
    {field.type === "textarea" ? <textarea {...common} rows={4} onChange={(event) => onChange(event.target.value)} />
      : field.type === "select" ? <select {...common} onChange={(event) => onChange(event.target.value)}>{field.options?.map((o) => <option key={o}>{o}</option>)}</select>
      : <input {...common} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)} />}
    {field.hint && <span className="text-[10px] font-normal normal-case tracking-normal text-[#8b5b60]">{field.hint}</span>}
  </label>;
}

interface CollectionEditorProps {
  name: string;
  title: string;
  eyebrow: string;
  items: object[];
  fields: FieldDef[];
  empty: Draft;
  rowTitle: (row: Draft) => string;
  rowSub: (row: Draft) => string;
  rowImage?: (row: Draft) => string;
}

export function CollectionEditor({ name, title, eyebrow, items, fields, empty, rowTitle, rowSub, rowImage }: CollectionEditorProps) {
  const queryClient = useQueryClient();
  const rows = items as unknown as Row[];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const close = () => { setDraft(null); setEditingId(null); };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["public-content"] });
  const save = useMutation({
    mutationFn: (payload: Draft) => (editingId ? apiPut(`/admin/${name}/${editingId}`, payload) : apiPost(`/admin/${name}`, payload)),
    onSuccess: () => { toast.success(editingId ? "Perubahan disimpan" : "Data ditambahkan"); close(); refresh(); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/${name}/${id}`),
    onSuccess: () => { toast.success("Data dihapus"); refresh(); },
    onError: (error) => toast.error(errorMessage(error, "Gagal menghapus")),
  });
  const startEdit = (row: Row) => { const { id, ...rest } = row; setEditingId(id); setDraft({ ...empty, ...rest }); };
  const nextOrder = rows.reduce((max, r) => Math.max(max, Number(r.order ?? 0)), 0) + 1;

  return <div data-testid={`admin-${name}-editor`}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a17b22]">{eyebrow}</p><h1 className="mt-3 font-display text-5xl text-[#4A070E]">{title}</h1></div>
      {!draft && <button data-testid={`admin-${name}-add-button`} onClick={() => { setEditingId(null); setDraft("order" in empty ? { ...empty, order: nextOrder } : { ...empty }); }} className="admin-primary"><Plus size={15} />Tambah</button>}
    </div>
    {draft && <form data-testid={`admin-${name}-form`} onSubmit={(event) => { event.preventDefault(); save.mutate(draft); }} className="mt-8 grid gap-4 rounded border border-[#D4AF37]/50 bg-white p-6 sm:grid-cols-2">
      <div className="flex items-center justify-between sm:col-span-2"><p className="font-display text-2xl text-[#4A070E]">{editingId ? "Edit data" : "Data baru"}</p><button type="button" data-testid={`admin-${name}-cancel-button`} onClick={close} className="text-[#8b5b60]"><X size={18} /></button></div>
      {fields.map((field) => <FieldInput key={field.key} field={field} value={draft[field.key]} testPrefix={`admin-${name}`} onChange={(v) => setDraft((d) => (d ? { ...d, [field.key]: v } : d))} />)}
      <button data-testid={`admin-${name}-save-button`} disabled={save.isPending} className="admin-primary justify-center sm:col-span-2"><Save size={15} />{save.isPending ? "Menyimpan…" : "Simpan"}</button>
    </form>}
    <div data-testid={`admin-${name}-list`} className="mt-8 space-y-3">
      {rows.map((row) => <div data-testid={`admin-${name}-row-${row.id}`} key={row.id} className={`flex items-center gap-4 rounded bg-white p-4 ${editingId === row.id ? "ring-2 ring-[#D4AF37]" : ""}`}>
        {rowImage && (rowImage(row) ? <img src={rowImage(row)} alt="" className="h-14 w-14 shrink-0 object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-[#4A070E] font-display text-lg text-[#D4AF37]">{rowTitle(row).slice(0, 1)}</div>)}
        <div className="min-w-0 flex-1"><p className="truncate font-display text-xl text-[#4A070E]">{rowTitle(row)}</p><p className="truncate text-xs text-[#8b5b60]">{rowSub(row)}</p></div>
        <button data-testid={`admin-${name}-edit-${row.id}`} onClick={() => startEdit(row)} className="admin-icon" aria-label="Edit"><Pencil size={15} /></button>
        <button data-testid={`admin-${name}-delete-${row.id}`} onClick={() => { if (window.confirm(`Hapus "${rowTitle(row)}"?`)) remove.mutate(row.id); }} className="admin-icon hover:!bg-red-700" aria-label="Hapus"><Trash2 size={15} /></button>
      </div>)}
      {!rows.length && <p data-testid={`admin-${name}-empty`} className="rounded bg-white p-8 text-center text-sm text-[#8b5b60]">Belum ada data.</p>}
    </div>
  </div>;
}
