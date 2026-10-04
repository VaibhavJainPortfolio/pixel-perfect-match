import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { PageShell } from "@/components/gent/PageShell";
import { Card, StepProgress } from "@/components/gent/primitives";
import { GoldButton } from "@/components/gent/buttons";
import { supabase } from "@/integrations/supabase/client";
import { getOrderProgress } from "@/lib/pipeline.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/order/$orderId/processing")({
  head: () => ({
    meta: [
      { title: "Your report is being made — TheGent's Style Report" },
      { name: "description", content: "Our stylists and AI are working on your report. We will message you when it's ready." },
      { property: "og:title", content: "Your report is being made — TheGent's" },
      { property: "og:description", content: "Our stylists and AI are working on your report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Progress = Awaited<ReturnType<typeof getOrderProgress>>;

function Page() {
  const { orderId } = Route.useParams();
  const progressFn = useServerFn(getOrderProgress);
  const [p, setP] = useState<Progress | null>(null);

  const refresh = useCallback(() => { progressFn({ data: { orderId } }).then(setP).catch(() => {}); }, [orderId]);

  useEffect(() => { refresh(); const t = setInterval(refresh, 20000); return () => clearInterval(t); }, [refresh]);

  // Live updates: every step change touches the run row, which we subscribe to.
  useEffect(() => {
    if (!p?.runId) return;
    const ch = supabase.channel(`run-${p.runId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pipeline_runs", filter: `id=eq.${p.runId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [p?.runId, refresh]);

  const mins = p ? Math.max(1, Math.ceil(p.etaSeconds / 60)) : 0;

  return (
    <PageShell width="max-w-xl">
      <div className="space-y-8">
        <StepProgress steps={["Basics", "Photos", "Analysis", "Report"]} current={p?.state === "done" ? 3 : 2} />
        {!p ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : p.state === "done" ? (
          <Card className="space-y-5 p-6 text-center">
            <p className="eyebrow">Ready</p>
            <h1 className="text-3xl">Your style report is ready</h1>
            <p className="text-muted-foreground">Everything we found, and 16 outfits picked for you.</p>
            <GoldButton asChild size="lg" className="w-full">
              <Link to="/app/report/$reportId" params={{ reportId: p.reportId! }}>Open my report</Link>
            </GoldButton>
          </Card>
        ) : p.state === "review" ? (
          <Card className="space-y-3 p-6">
            <p className="eyebrow">Almost there</p>
            <h1 className="text-2xl">Our stylist is reviewing your report personally</h1>
            <p className="text-muted-foreground">You'll get it within 24 hours. We'll message you on WhatsApp and email.</p>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              <p className="eyebrow">Step 3 of 4</p>
              <h1 className="text-3xl">Your report is being made</h1>
              <p className="text-muted-foreground">{p.state === "not_started" ? "Starting up…" : `About ${mins} minute${mins === 1 ? "" : "s"} left.`}</p>
            </div>
            <Card className="divide-y divide-border p-0">
              {p.lines.map((l) => (
                <div key={l.label} className="flex items-center gap-3 px-5 py-4">
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    l.state === "done" ? "border-success bg-success/15 text-success" : l.state === "active" ? "border-gold text-gold" : "border-border text-muted-foreground")}>
                    {l.state === "done" ? <Check className="h-3.5 w-3.5" /> : l.state === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  </span>
                  <span className={cn("text-sm", l.state === "pending" ? "text-muted-foreground" : "text-foreground")}>{l.label}</span>
                </div>
              ))}
            </Card>
            <p className="text-sm text-muted-foreground">We'll also WhatsApp you when it's ready, you can close this page.</p>
          </>
        )}
      </div>
    </PageShell>
  );
}
