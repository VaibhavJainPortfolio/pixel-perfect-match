import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Placeholder } from "@/components/gent/PageShell";
import { EmptyState, StepProgress } from "@/components/gent/primitives";

export const Route = createFileRoute("/_authenticated/app/order/$orderId/photos")({
  head: () => ({
    meta: [
      { title: "Upload your 8 photos — TheGent's Style Report" },
      { name: "description", content: "Face front, left, right, 45°, body front, side, wrist and an outfit." },
      { property: "og:title", content: "Upload your 8 photos — TheGent's" },
      { property: "og:description", content: "Face front, left, right, 45°, body front, side, wrist and an outfit." },
    ],
  }),
  component: Page,
});

function Page() {
  void StepProgress;
  return (
    <PageShell>
      <Placeholder eyebrow="Step 2 of 4" title="Upload your 8 photos" description="Face front, left, right, 45°, body front, side, wrist and an outfit.">
        <StepProgress steps={["Basics","Photos","Analysis","Report"]} current={1} />
      </Placeholder>
    </PageShell>
  );
}
