import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/legal/refunds")({
  head: () => ({
    meta: [
      { title: "Refund policy — TheGent's Style Report" },
      { name: "description", content: "When and how refunds are issued." },
      { property: "og:title", content: "Refund policy — TheGent's" },
      { property: "og:description", content: "When and how refunds are issued." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Legal" title="Refund policy" description="When and how refunds are issued.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
