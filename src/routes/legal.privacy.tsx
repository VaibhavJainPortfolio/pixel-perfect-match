import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — TheGent's Style Report" },
      { name: "description", content: "How we collect, use and protect your photos and data." },
      { property: "og:title", content: "Privacy policy — TheGent's" },
      { property: "og:description", content: "How we collect, use and protect your photos and data." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Legal" title="Privacy policy" description="How we collect, use and protect your photos and data.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
