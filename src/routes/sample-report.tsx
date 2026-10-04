import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/sample-report")({
  head: () => ({
    meta: [
      { title: "Sample style report — TheGent's Style Report" },
      { name: "description", content: "See exactly what a full TheGent's report looks like." },
      { property: "og:title", content: "Sample style report — TheGent's" },
      { property: "og:description", content: "See exactly what a full TheGent's report looks like." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Sample" title="Sample style report" description="See exactly what a full TheGent's report looks like.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
