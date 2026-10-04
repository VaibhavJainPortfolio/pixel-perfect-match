import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Lock, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/gent/PageShell";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { Card, SectionHeading } from "@/components/gent/primitives";
import { FaceCamera } from "@/components/gent/FaceCamera";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hairTipsQuery } from "@/lib/public-content";
import { shapeInfo, type FaceShape } from "@/lib/face-shape";

export const Route = createFileRoute("/free-check")({
  head: () => ({
    meta: [
      { title: "Free face shape check — TheGent's Style Report" },
      { name: "description", content: "Find your face shape in 30 seconds with your phone camera, plus 3 hairstyle tips. Your photo never leaves your phone." },
      { property: "og:title", content: "Free face shape check — TheGent's" },
      { property: "og:description", content: "Find your face shape and get hairstyle tips. Free, no login." },
    ],
  }),
  component: FreeCheck,
});

type Step = "details" | "camera" | "result";

function FreeCheck() {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [shape, setShape] = useState<FaceShape | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/[^\d+]/g, "");
    if (!/^\+?\d{10,13}$/.test(digits)) { toast.error("Enter a valid WhatsApp number"); return; }
    setBusy(true);
    const { error } = await supabase.from("leads").insert({ first_name: name.trim(), whatsapp: digits, source: "free_check" });
    setBusy(false);
    if (error) { toast.error("Couldn't save your details. Please try again."); return; }
    setStep("camera");
  };

  const onResult = useCallback((s: FaceShape) => { setShape(s); setStep("result"); }, []);

  return (
    <PageShell width="max-w-md">
      {step === "details" && (
        <div className="space-y-8">
          <SectionHeading as="h1" eyebrow="Free · 30 seconds" title="What's your face shape?" description="Your phone camera reads your proportions and tells you which hairstyles suit you." />
          <Card>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="fn">First name</Label><Input id="fn" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="wa">WhatsApp number</Label><Input id="wa" type="tel" inputMode="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
              <GoldButton block size="lg" type="submit" disabled={busy}>Open camera</GoldButton>
              <p className="flex items-start gap-2 text-xs text-muted-foreground"><Lock className="mt-0.5 size-3.5 shrink-0" />Your photo stays on your phone. We only save your name and number to send you style tips.</p>
            </form>
          </Card>
        </div>
      )}

      {step === "camera" && (
        <div className="space-y-5">
          <SectionHeading as="h1" eyebrow={`Hi ${name.split(" ")[0]}`} title="Fit your face in the oval" description="Good light, hair off your forehead, look straight ahead." />
          <FaceCamera onResult={onResult} />
        </div>
      )}

      {step === "result" && shape && <Result shape={shape} onRetry={() => setStep("camera")} />}
    </PageShell>
  );
}

function Result({ shape, onRetry }: { shape: FaceShape; onRetry: () => void }) {
  const info = shapeInfo[shape];
  const tips = useQuery(hairTipsQuery(shape));
  return (
    <div className="space-y-6">
      <Card className="space-y-6 p-6 text-center">
        <p className="eyebrow">Your face shape</p>
        <svg viewBox="0 0 100 120" className="mx-auto h-36 w-auto" aria-hidden>
          <path d={info.path} className="fill-gold-soft stroke-gold" strokeWidth="2" />
        </svg>
        <div>
          <h1 className="text-4xl text-foreground">{info.label}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{info.blurb}</p>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl text-foreground">3 hairstyle tips for you</h2>
        <ol className="space-y-3">
          {(tips.data ?? []).map((t, i) => (
            <li key={t.id} className="flex gap-3 text-sm text-foreground">
              <span className="font-display text-lg text-gold">{i + 1}</span>{t.rule_text}
            </li>
          ))}
          {tips.isLoading && <li className="text-sm text-muted-foreground">Loading tips…</li>}
        </ol>
      </Card>

      <Card className="space-y-4 border-gold p-6">
        <p className="text-lg text-foreground">Want your full report with outfits and AI images of you?</p>
        <GoldButton asChild block size="lg"><Link to="/app/checkout" search={{ product: "style_report" }}>Get my report →</Link></GoldButton>
      </Card>

      <GhostButton block onClick={onRetry}><RotateCcw />Check again</GhostButton>
      <p className="text-center text-xs text-muted-foreground">This is a quick estimate from one photo. Your full report uses 8 photos.</p>
    </div>
  );
}
