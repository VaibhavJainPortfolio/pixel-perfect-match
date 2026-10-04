import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { GoldButton } from "@/components/gent/buttons";
import { Card } from "@/components/gent/primitives";
import { SamplePageThumb, samplePages } from "@/components/gent/SamplePages";

export const Route = createFileRoute("/sample-report")({
  head: () => ({
    meta: [
      { title: "Sample style report — TheGent's Style Report" },
      { name: "description", content: "Preview the five main sections of a TheGent's personal style report." },
      { property: "og:title", content: "Sample style report — TheGent's" },
      { property: "og:description", content: "Preview what's inside a personal style report." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageShell>
      <Placeholder eyebrow="Sample" title="A look inside the report" description="A blurred preview of five report pages. Yours is written for your face, body and skin tone.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {samplePages.map((p, i) => <SamplePageThumb key={p.title} page={p} index={i} blurred />)}
        </div>
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <Lock className="size-6 text-gold" />
          <h2 className="text-2xl text-foreground">Unlock the full report — yours, not a sample.</h2>
          <GoldButton asChild size="lg"><Link to="/app/checkout" search={{ product: "style_report" }}>Get my style report – ₹1,999</Link></GoldButton>
        </Card>
      </Placeholder>
    </PageShell>
  );
}
