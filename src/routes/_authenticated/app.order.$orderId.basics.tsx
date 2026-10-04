import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageShell } from "@/components/gent/PageShell";
import { Card, SectionHeading, StepProgress } from "@/components/gent/primitives";
import { GoldButton } from "@/components/gent/buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getIntake, saveBasics } from "@/lib/intake.functions";

export const Route = createFileRoute("/_authenticated/app/order/$orderId/basics")({
  head: () => ({
    meta: [
      { title: "Tell us the basics — TheGent's Style Report" },
      { name: "description", content: "Age, height, weight, city and budget — under a minute." },
      { property: "og:title", content: "Tell us the basics — TheGent's" },
      { property: "og:description", content: "Age, height, weight, city and budget." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const BUDGETS = [["under_3000", "Under ₹3,000"], ["3000_7000", "₹3,000–7,000"], ["7000_15000", "₹7,000–15,000"], ["15000_plus", "₹15,000+"]] as const;
type Budget = (typeof BUDGETS)[number][0];

function Page() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const intakeFn = useServerFn(getIntake);
  const saveFn = useServerFn(saveBasics);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [unit, setUnit] = useState<"ft" | "cm">("ft");
  const [ft, setFt] = useState(""); const [inch, setInch] = useState(""); const [cm, setCm] = useState("");
  const [weight, setWeight] = useState("");
  const [budget, setBudget] = useState<Budget | null>(null);
  const [fix, setFix] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    intakeFn({ data: { orderId } }).then((r) => {
      const b = (r.submission?.basics ?? {}) as Record<string, any>;
      const p = r.profile ?? ({} as any);
      setName(b.full_name ?? p.full_name ?? ""); setCity(b.city ?? p.city ?? "");
      const a = b.age ?? p.age; if (a) setAge(String(a));
      const h = b.height_cm ?? p.height_cm; if (h) { setCm(String(Math.round(h))); const ti = Number(h) / 2.54; setFt(String(Math.floor(ti / 12))); setInch(String(Math.round(ti % 12))); }
      const w = b.weight_kg ?? p.weight_kg; if (w) setWeight(String(w));
      if (b.budget_band ?? p.budget_band) setBudget((b.budget_band ?? p.budget_band) as Budget);
      if (b.main_fix) setFix(b.main_fix);
    }).catch((e) => toast.error(e.message));
  }, [orderId]);

  const heightCm = unit === "cm" ? Number(cm) : (Number(ft) * 12 + Number(inch || 0)) * 2.54;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget) { toast.error("Pick a monthly budget."); return; }
    if (!(heightCm >= 120 && heightCm <= 230)) { toast.error("Please check your height."); return; }
    setBusy(true);
    try {
      await saveFn({ data: {
        orderId, full_name: name, age: Number(age), city, height_cm: Math.round(heightCm * 10) / 10,
        weight_kg: Number(weight), budget_band: budget, main_fix: fix, consent: true, user_agent: navigator.userAgent,
      } });
      navigate({ to: "/app/order/$orderId/photos", params: { orderId } });
    } catch (err: any) {
      toast.error(err?.message?.includes("Too small") || err?.message?.includes("Too big") ? "Please check your age, height and weight." : err.message);
      setBusy(false);
    }
  };

  return (
    <PageShell width="max-w-lg">
      <StepProgress steps={["Pay", "Basics", "Photos", "Report"]} current={1} />
      <SectionHeading as="h1" eyebrow="Step 2 of 4" title="The basics" />
      <p className="mt-2 text-sm text-muted-foreground">Takes under a minute.</p>
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-5">
          <F label="Name"><Input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Age"><Input required inputMode="numeric" min={18} max={90} type="number" value={age} onChange={(e) => setAge(e.target.value)} /></F>
            <F label="City"><Input required maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} /></F>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Height</Label>
              <div className="flex rounded-md border border-border p-0.5 text-xs">
                {(["ft", "cm"] as const).map((u) => (
                  <button type="button" key={u} onClick={() => setUnit(u)} className={cn("rounded px-3 py-1", unit === u ? "bg-gold-soft text-gold" : "text-muted-foreground")}>{u === "ft" ? "ft-in" : "cm"}</button>
                ))}
              </div>
            </div>
            {unit === "ft" ? (
              <div className="grid grid-cols-2 gap-3">
                <Input required type="number" inputMode="numeric" placeholder="ft" min={4} max={7} value={ft} onChange={(e) => setFt(e.target.value)} />
                <Input type="number" inputMode="numeric" placeholder="in" min={0} max={11} value={inch} onChange={(e) => setInch(e.target.value)} />
              </div>
            ) : <Input required type="number" inputMode="numeric" placeholder="cm" min={120} max={230} value={cm} onChange={(e) => setCm(e.target.value)} />}
          </div>
          <F label="Weight (kg)"><Input required type="number" inputMode="decimal" min={35} max={250} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} /></F>
          <div className="space-y-2">
            <Label>Monthly clothing budget</Label>
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map(([k, l]) => (
                <button type="button" key={k} onClick={() => setBudget(k)}
                  className={cn("rounded-full border px-4 py-2 text-sm", budget === k ? "border-gold bg-gold-soft text-gold" : "border-border text-muted-foreground")}>{l}</button>
              ))}
            </div>
          </div>
          <F label="Main thing to fix (optional)"><Input maxLength={140} placeholder="e.g. look sharper at work" value={fix} onChange={(e) => setFix(e.target.value)} /></F>
          <div className="flex items-start gap-3">
            <Checkbox id="photo-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <label htmlFor="photo-consent" className="text-sm leading-snug text-muted-foreground">I agree my photos are used only to create my report and are deleted after 30 days.</label>
          </div>
          <GoldButton block size="lg" type="submit" disabled={busy || !consent}>{busy ? "Saving…" : "Continue to photos"}</GoldButton>
        </form>
      </Card>
    </PageShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
