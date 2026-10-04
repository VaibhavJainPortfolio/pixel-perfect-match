import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "One report. ₹1,999 + GST. — TheGent's Style Report" },
      { name: "description", content: "Face, hair, beard, 16 outfits, accessories, fragrance and a 90-day plan." },
      { property: "og:title", content: "One report. ₹1,999 + GST. — TheGent's" },
      { property: "og:description", content: "Face, hair, beard, 16 outfits, accessories, fragrance and a 90-day plan." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Pricing" title="One report. ₹1,999 + GST." description="Face, hair, beard, 16 outfits, accessories, fragrance and a 90-day plan.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
