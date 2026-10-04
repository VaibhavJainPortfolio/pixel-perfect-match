import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/app/report/$reportId")({
  head: () => ({
    meta: [
      { title: "Your style report — TheGent's Style Report" },
      { name: "description", content: "Your personalised report." },
      { property: "og:title", content: "Your style report — TheGent's" },
      { property: "og:description", content: "Your personalised report." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Report" title="Your style report" description="Your personalised report.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
