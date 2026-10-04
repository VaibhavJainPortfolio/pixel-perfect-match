import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/app/account")({
  head: () => ({
    meta: [
      { title: "Account — TheGent's Style Report" },
      { name: "description", content: "Your profile, consents and notification preferences." },
      { property: "og:title", content: "Account — TheGent's" },
      { property: "og:description", content: "Your profile, consents and notification preferences." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Account" title="Account" description="Your profile, consents and notification preferences.">
        <EmptyState title="Coming soon" description="This page is being built." />
      </Placeholder>
    </PageShell>
  );
}
