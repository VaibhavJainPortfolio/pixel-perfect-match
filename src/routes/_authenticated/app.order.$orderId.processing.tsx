import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/app/order/$orderId/processing")({
  head: () => ({
    meta: [
      { title: "Your report is being made — TheGent's Style Report" },
      { name: "description", content: "Our stylists and AI are working on it. We will message you when it's ready." },
      { property: "og:title", content: "Your report is being made — TheGent's" },
      { property: "og:description", content: "Our stylists and AI are working on it. We will message you when it's ready." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Step 3 of 4" title="Your report is being made" description="Our stylists and AI are working on it. We will message you when it's ready.">
        <StepProgress steps={["Basics","Photos","Analysis","Report"]} current={2} />
      </Placeholder>
    </PageShell>
  );
}
