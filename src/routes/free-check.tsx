import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/free-check")({
  head: () => ({
    meta: [
      { title: "Free face-shape check — TheGent's Style Report" },
      { name: "description", content: "Upload one selfie and learn your face shape in seconds." },
      { property: "og:title", content: "Free face-shape check — TheGent's" },
      { property: "og:description", content: "Upload one selfie and learn your face shape in seconds." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Free" title="Free face-shape check" description="Upload one selfie and learn your face shape in seconds.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
