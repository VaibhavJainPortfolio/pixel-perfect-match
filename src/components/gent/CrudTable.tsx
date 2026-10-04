// Generic admin CRUD table with add/edit dialog, delete, search and CSV import. Writes go through the
// browser client so table RLS (admin-only) is the security boundary.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/gent/primitives";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export type Field = {
  key: string; label: string;
  type: "text" | "textarea" | "number" | "bool" | "select" | "tags";
  options?: readonly string[]; required?: boolean; inList?: boolean;
};

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = ""; if (row.some((c) => c.trim())) rows.push(row); row = [];
    } else cell += ch;
  }
  row.push(cell); if (row.some((c) => c.trim())) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

function coerce(f: Field, v: unknown): unknown {
  if (v === undefined) return undefined;
  if (f.type === "number") { const s = String(v ?? "").trim(); if (!s) return null; const n = Number(s); if (Number.isNaN(n)) throw new Error(`${f.label} must be a number`); return n; }
  if (f.type === "bool") return typeof v === "boolean" ? v : !["false", "0", "no", "n", ""].includes(String(v).trim().toLowerCase());
  if (f.type === "tags") return Array.isArray(v) ? v : String(v ?? "").split(/[|;,]/).map((t) => t.trim()).filter(Boolean);
  const s = String(v ?? "").trim();
  if (f.type === "select" && s && f.options && !f.options.includes(s)) throw new Error(`${f.label} must be one of: ${f.options.join(", ")}`);
  return s || null;
}

export function CrudTable({ table, fields, orderBy, defaults, csvHint }: {
  table: "style_rules" | "products_catalog"; fields: Field[]; orderBy: string; defaults: Record<string, unknown>; csvHint: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const db = supabase.from(table) as any;

  const load = useCallback(async () => {
    const { data, error } = await (supabase.from(table) as any).select("*").order(orderBy).limit(2000);
    if (error) toast.error(error.message); else setRows(data ?? []);
  }, [table, orderBy]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s)) : rows;
  }, [rows, search]);

  const toRecord = (src: Record<string, unknown>, partial: boolean) => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      if (partial && !(f.key in src)) continue;
      const v = coerce(f, src[f.key]);
      if (f.required && (v === null || v === "" || v === undefined)) throw new Error(`${f.label} is required`);
      out[f.key] = v;
    }
    return out;
  };

  const save = async () => {
    if (!edit) return;
    let rec; try { rec = toRecord(edit, false); } catch (e: any) { toast.error(e.message); return; }
    setBusy(true);
    const { error } = edit["id"] ? await db.update(rec).eq("id", edit["id"]) : await db.insert(rec);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setEdit(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this row? This can't be undone.")) return;
    const { error } = await db.delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const importCsv = async (file: File) => {
    const parsed = parseCsv(await file.text());
    if (!parsed.length) { toast.error("The file has no rows."); return; }
    const inserts: any[] = [], updates: any[] = [], errors: string[] = [];
    parsed.forEach((r, i) => {
      try {
        const rec = toRecord({ ...defaults, ...r }, false);
        if (r["id"]) updates.push({ id: r["id"], rec: toRecord(r, true) }); else inserts.push(rec);
      } catch (e: any) { errors.push(`Row ${i + 2}: ${e.message}`); }
    });
    if (errors.length) { toast.error(`Nothing imported. ${errors.slice(0, 3).join(" · ")}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ""}`); return; }
    setBusy(true);
    for (let i = 0; i < inserts.length; i += 200) {
      const { error } = await db.insert(inserts.slice(i, i + 200));
      if (error) { setBusy(false); toast.error(error.message); load(); return; }
    }
    for (const u of updates) {
      const { error } = await db.update(u.rec).eq("id", u.id);
      if (error) { setBusy(false); toast.error(`Row ${u.id}: ${error.message}`); load(); return; }
    }
    setBusy(false);
    toast.success(`Imported ${inserts.length} new, updated ${updates.length}.`); load();
  };

  const exportCsv = () => {
    const cols = ["id", ...fields.map((f) => f.key)];
    const esc = (v: unknown) => { const s = Array.isArray(v) ? v.join("|") : v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${table}.csv`; a.click();
  };

  const listFields = fields.filter((f) => f.inList);
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <GoldButton onClick={() => setEdit({ ...defaults })}>Add</GoldButton>
        <GhostButton onClick={() => fileRef.current?.click()} disabled={busy}>Import CSV</GhostButton>
        <GhostButton onClick={exportCsv}>Export CSV</GhostButton>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
      </div>
      <p className="text-xs text-muted-foreground">{csvHint} Rows with an <code>id</code> column update that row; rows without one are added. Lists use <code>|</code> between values.</p>
      <p className="text-xs text-muted-foreground">{filtered.length} of {rows.length} rows</p>
      <div className="space-y-2">
        {filtered.map((r) => (
          <Card key={r.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0 space-y-1 text-sm">
              {listFields.map((f) => (
                <div key={f.key} className="truncate">
                  <span className="text-muted-foreground">{f.label}: </span>
                  {f.type === "bool" ? (r[f.key] ? "Yes" : "No") : Array.isArray(r[f.key]) ? r[f.key].join(", ") : String(r[f.key] ?? "—")}
                </div>
              ))}
            </div>
            <div className="flex shrink-0 gap-2">
              <GhostButton onClick={() => setEdit({ ...r })}>Edit</GhostButton>
              <GhostButton onClick={() => remove(r.id)}>Delete</GhostButton>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.["id"] ? "Edit" : "Add"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              {fields.map((f) => {
                const v = edit[f.key];
                const set = (val: unknown) => setEdit((e) => ({ ...e!, [f.key]: val }));
                return (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key}>{f.label}{f.required ? " *" : ""}</Label>
                    {f.type === "bool" ? <div><Switch id={f.key} checked={!!v} onCheckedChange={set} /></div>
                      : f.type === "textarea" ? <Textarea id={f.key} value={v ?? ""} onChange={(e) => set(e.target.value)} rows={4} />
                      : f.type === "select" ? (
                        <select id={f.key} value={v ?? ""} onChange={(e) => set(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          <option value="">—</option>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>)
                      : <Input id={f.key} type={f.type === "number" ? "number" : "text"} value={Array.isArray(v) ? v.join(", ") : v ?? ""} onChange={(e) => set(e.target.value)} />}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter><GoldButton onClick={save} disabled={busy}>Save</GoldButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
