import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GoldButton } from "./buttons";

export const CONSENT_VERSION = "2026-10";

export function OnboardingSheet() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [terms, setTerms] = useState(false);
  const [age, setAge] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name, email, city").eq("id", data.user.id).maybeSingle();
      setName(p?.full_name ?? (data.user.user_metadata?.full_name as string) ?? "");
      setEmail(p?.email ?? data.user.email ?? "");
      setCity(p?.city ?? "");
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms || !age) { toast.error("Please accept the terms and confirm your age."); return; }
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    const uid = data.user!.id;
    const { error } = await supabase.from("profiles")
      .update({ full_name: name.trim(), email: email.trim(), city: city.trim(), whatsapp_opt_in: whatsapp, marketing_opt_in: marketing })
      .eq("id", uid);
    if (error) { setBusy(false); toast.error(error.message); return; }
    const ua = navigator.userAgent;
    const rows = ([
      ["terms", true], ["privacy", true], ["age_18", true], ["whatsapp", whatsapp], ["marketing", marketing], ["email", true],
    ] as const).map(([consent_type, granted]) => ({ user_id: uid, consent_type, granted, version: CONSENT_VERSION, user_agent: ua }));
    const c = await supabase.from("consents").insert(rows);
    setBusy(false);
    if (c.error) { toast.error(c.error.message); return; }
    toast.success("You're all set.");
    router.invalidate();
  };

  return (
    <Sheet open>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-xl [&>button]:hidden">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">A few quick details</SheetTitle>
          <SheetDescription>So we can send your receipts and personalise your report.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="mx-auto w-full max-w-md space-y-4 p-4">
          <div className="space-y-2"><Label htmlFor="ob-name">Full name</Label><Input id="ob-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="ob-email">Email (for receipts)</Label><Input id="ob-email" type="email" required maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="ob-city">City</Label><Input id="ob-city" required maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="space-y-3 pt-2 text-sm">
            <Row id="c-terms" checked={terms} onChange={setTerms}>
              I agree to the <a href="/legal/terms" target="_blank" className="text-gold underline">Terms</a> and <a href="/legal/privacy" target="_blank" className="text-gold underline">Privacy Policy</a> *
            </Row>
            <Row id="c-age" checked={age} onChange={setAge}>I confirm I am 18 or older *</Row>
            <Row id="c-wa" checked={whatsapp} onChange={setWhatsapp}>Send me order updates on WhatsApp</Row>
            <Row id="c-mk" checked={marketing} onChange={setMarketing}>Send me style tips and offers</Row>
          </div>
          <GoldButton block type="submit" disabled={busy || !terms || !age}>Continue</GoldButton>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Row({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <label htmlFor={id} className="leading-snug text-muted-foreground">{children}</label>
    </div>
  );
}
