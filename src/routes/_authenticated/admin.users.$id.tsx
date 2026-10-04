import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/gent/PageShell";
import { EmptyState } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({
  component: Page,
});

function Page() {
  return (
    <Placeholder eyebrow="Admin" title="User detail" description="Profile, roles, orders and consents.">
      <EmptyState title="Nothing here yet" description="Data will appear once orders start flowing." />
    </Placeholder>
  );
}
