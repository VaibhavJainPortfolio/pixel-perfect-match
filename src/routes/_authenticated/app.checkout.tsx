import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/app/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — TheGent's Style Report" },
      { name: "description", content: "Pay ₹1,999 + GST securely to start your report." },
      { property: "og:title", content: "Checkout — TheGent's" },
      { property: "og:description", content: "Pay ₹1,999 + GST securely to start your report." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Checkout" title="Checkout" description="Pay ₹1,999 + GST securely to start your report.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
