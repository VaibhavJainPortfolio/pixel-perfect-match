import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service — TheGent's Style Report" },
      { name: "description", content: "The terms for using TheGent's Style Report." },
      { property: "og:title", content: "Terms of service — TheGent's" },
      { property: "og:description", content: "The terms for using TheGent's Style Report." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Legal" title="Terms of service" description="The terms for using TheGent's Style Report.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
