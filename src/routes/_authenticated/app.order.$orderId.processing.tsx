import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/gent/PageShell";
import { Card, StepProgress } from "@/components/gent/primitives";
import { GoldButton } from "@/components/gent/buttons";
import { ProgressLines, useOrderProgress } from "@/components/gent/OrderProgress";

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

function Page() {
  const { orderId } = Route.useParams();
  const p = useOrderProgress(orderId);

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
            <ProgressLines lines={p.lines} />
            <p className="text-sm text-muted-foreground">We'll also WhatsApp you when it's ready, you can close this page.</p>
          </>
        )}
      </div>
    </PageShell>
  );
}
