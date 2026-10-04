import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/gent/PageShell";
import { EmptyState } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  component: Page,
});

function Page() {
  return (
    <Placeholder eyebrow="Admin" title="Order detail" description="Order, submission, photos, pipeline and report.">
      <EmptyState title="Nothing here yet" description="Data will appear once orders start flowing." />
    </Placeholder>
  );
}
