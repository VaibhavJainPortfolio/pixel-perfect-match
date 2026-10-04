import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Your style reports — TheGent's Style Report" },
      { name: "description", content: "Your orders and reports live here." },
      { property: "og:title", content: "Your style reports — TheGent's" },
      { property: "og:description", content: "Your orders and reports live here." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Dashboard" title="Your style reports" description="Your orders and reports live here.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
