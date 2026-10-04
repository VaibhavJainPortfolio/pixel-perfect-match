import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeading } from "@/components/gent/primitives";
import { GoldButton } from "@/components/gent/buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/business")({
  head: () => ({ meta: [{ title: "Business details — TheGent's admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const FIELDS = [
  ["legal_name", "Legal business name"], ["gstin", "GSTIN"], ["address", "Registered address"],
  ["state", "State"], ["state_code", "State code"], ["email", "Billing email"], ["phone", "Billing phone"], ["sac_code", "SAC code"],
] as const;
type Key = (typeof FIELDS)[number][0];

function Page() {
  const [form, setForm] = useState<Partial<Record<Key, string>>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("business_settings").select("*").eq("id", 1).maybeSingle().then(({ data, error }) => {
      if (error) toast.error("Only admins can edit these details.");
      if (data) setForm(data as any);
    });
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const patch = Object.fromEntries(FIELDS.map(([k]) => [k, (form[k] ?? "").trim()])) as Record<Key, string>;
    const { error } = await supabase.from("business_settings").update(patch).eq("id", 1);
    setBusy(false);
    error ? toast.error(error.message) : toast.success("Saved. New invoices will use these details.");
  };
  return (
    <div className="max-w-xl">
      <SectionHeading as="h1" eyebrow="Settings" title="Business details for invoices" />
      <Card className="mt-6">
        <form onSubmit={save} className="space-y-4">
          {FIELDS.map(([k, label]) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} value={form[k] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Customers in the same state as this business get CGST 9% + SGST 9%; everyone else gets IGST 18%.</p>
          <GoldButton type="submit" disabled={busy}>Save</GoldButton>
        </form>
      </Card>
    </div>
  );
}
