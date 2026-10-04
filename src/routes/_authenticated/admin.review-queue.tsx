import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/gent/PageShell";
import { EmptyState } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/admin/review-queue")({
  component: Page,
});

function Page() {
  return (
    <Placeholder eyebrow="Admin" title="Review queue" description="Reports waiting for a stylist.">
      <EmptyState title="Nothing here yet" description="Data will appear once orders start flowing." />
    </Placeholder>
  );
}
