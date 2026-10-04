import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/app/order/$orderId/basics")({
  head: () => ({
    meta: [
      { title: "Tell us the basics — TheGent's Style Report" },
      { name: "description", content: "Age, height, weight, city and budget." },
      { property: "og:title", content: "Tell us the basics — TheGent's" },
      { property: "og:description", content: "Age, height, weight, city and budget." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Step 1 of 4" title="Tell us the basics" description="Age, height, weight, city and budget.">
        <StepProgress steps={["Basics","Photos","Analysis","Report"]} current={0} />
      </Placeholder>
    </PageShell>
  );
}
