import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/gent/PageShell";
import { Card, SectionHeading, StepProgress } from "@/components/gent/primitives";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { GuidedCamera, type Captured } from "@/components/gent/GuidedCamera";
import { SLOTS, type SlotKey } from "@/lib/capture-slots";
import { checkPhoto, getIntake, submitForAnalysis } from "@/lib/intake.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/order/$orderId/photos")({
  head: () => ({
    meta: [
      { title: "Take your photos — TheGent's Style Report" },
      { name: "description", content: "Eight guided photos, checked instantly." },
      { property: "og:title", content: "Take your photos — TheGent's" },
      { property: "og:description", content: "Eight guided photos, checked instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type State = { status: "empty" | "checking" | "passed" | "failed"; url?: string; tip?: string; issues?: string[] };

function Page() {
  const { orderId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const intakeFn = useServerFn(getIntake);
  const checkFn = useServerFn(checkPhoto);
  const submitFn = useServerFn(submitForAnalysis);
  const [states, setStates] = useState<Record<SlotKey, State>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, { status: "empty" }])) as any);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<"camera" | "result">("camera");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    intakeFn({ data: { orderId } }).then((r) => {
      if (!r.submission?.basics || !Object.keys(r.submission.basics as object).length) { navigate({ to: "/app/order/$orderId/basics", params: { orderId } }); return; }
      if (r.orderStatus === "processing") { navigate({ to: "/app/order/$orderId/processing", params: { orderId } }); return; }
      const next = { ...states };
      for (const p of r.photos as any[]) next[p.slot as SlotKey] = { status: p.quality_status === "passed" ? "passed" : p.quality_status === "failed" ? "failed" : "empty", url: p.url ?? undefined, tip: p.quality_feedback ?? undefined };
      setStates(next);
      const first = SLOTS.findIndex((s) => s.required && next[s.key].status !== "passed");
      if (first >= 0) setIdx(first);
      else { setIdx(SLOTS.length - 1); setMode(next.outfit.status === "empty" ? "camera" : "result"); }
    }).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const slot = SLOTS[idx]!;
  const st = states[slot.key];
  const set = (k: SlotKey, s: State) => setStates((p) => ({ ...p, [k]: s }));

  const onCaptured = async (c: Captured) => {
    const key = slot.key;
    set(key, { status: "checking", url: c.preview });
    setMode("result");
    const path = `${user.id}/${orderId}/${key}.jpg`;
    const up = await supabase.storage.from("photos").upload(path, c.blob, { contentType: "image/jpeg", upsert: true });
    if (up.error) { set(key, { status: "failed", url: c.preview, tip: "Upload failed. Check your connection and retake." }); return; }
    try {
      const r = await checkFn({ data: { orderId, slot: key, landmarks: c.landmarks, width: c.width, height: c.height } });
      set(key, { status: r.passed ? "passed" : "failed", url: c.preview, tip: r.retake_tip, issues: r.issues });
    } catch (e: any) {
      set(key, { status: "failed", url: c.preview, tip: e.message ?? "We couldn't check this photo. Please retake." });
    }
  };

  const goNext = () => {
    const n = SLOTS.findIndex((s, i) => i > idx && states[s.key].status !== "passed");
    if (n >= 0) { setIdx(n); setMode("camera"); }
  };

  const requiredDone = SLOTS.filter((s) => s.required).every((s) => states[s.key].status === "passed");

  const submit = async () => {
    setSubmitting(true);
    try {
      await submitFn({ data: { orderId } });
      navigate({ to: "/app/order/$orderId/processing", params: { orderId } });
    } catch (e: any) { toast.error(e.message); setSubmitting(false); }
  };

  return (
    <PageShell width="max-w-lg">
      <StepProgress steps={["Pay", "Basics", "Photos", "Report"]} current={2} />
      <div className="mt-4 flex gap-1.5" aria-label="Photo progress">
        {SLOTS.map((s, i) => {
          const v = states[s.key].status;
          return (
            <button key={s.key} aria-label={s.label} onClick={() => { setIdx(i); setMode(v === "empty" ? "camera" : "result"); }}
              className={cn("flex h-8 flex-1 items-center justify-center rounded-md border text-xs",
                i === idx ? "border-gold" : "border-border",
                v === "passed" && "bg-success/20 text-success", v === "failed" && "bg-destructive/15 text-destructive",
                !s.required && "border-dashed")}>
              {v === "passed" ? <Check className="size-4" /> : v === "failed" ? <X className="size-4" /> : v === "checking" ? <Loader2 className="size-4 animate-spin" /> : i + 1}
            </button>
          );
        })}
      </div>

      <SectionHeading as="h1" eyebrow={`Photo ${idx + 1} of 8`} title={slot.label} />
      <p className="mt-2 text-sm text-muted-foreground">{slot.tip}</p>

      <div className="mt-4 grid grid-cols-[1fr_88px] gap-3">
        <div>
          {mode === "camera" ? <GuidedCamera key={slot.key} slot={slot} onCaptured={onCaptured} /> : (
            <Card className="space-y-3 p-3">
              {st.url && <img src={st.url} alt={`Your ${slot.label} photo`} className="aspect-[3/4] w-full rounded-md object-cover" />}
              {st.status === "checking" && <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Checking your photo…</p>}
              {st.status === "passed" && <p className="flex items-center gap-2 text-sm text-success"><Check className="size-4" />Looks great.</p>}
              {st.status === "failed" && (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-destructive">Let's retake this one</p>
                  {st.tip && <p className="text-muted-foreground">{st.tip}</p>}
                </div>
              )}
              <div className="flex gap-2">
                <GhostButton className="flex-1" onClick={() => setMode("camera")} disabled={st.status === "checking"}>Retake</GhostButton>
                {st.status === "passed" && idx < SLOTS.length - 1 && <GoldButton className="flex-1" onClick={goNext}>Next</GoldButton>}
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-1">
          <img src={slot.sample} alt={`Example ${slot.label} photo`} loading="lazy" width={88} height={110} className="aspect-[4/5] w-full rounded-md border border-border object-cover" />
          <p className="text-center text-[11px] text-muted-foreground">Example</p>
        </div>
      </div>

      <div className="mt-8 space-y-2">
        <GoldButton block size="lg" disabled={!requiredDone || submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit for analysis"}</GoldButton>
        {!requiredDone && <p className="text-center text-xs text-muted-foreground">All 7 required photos need a green tick. The outfit photo is optional.</p>}
      </div>
    </PageShell>
  );
}
