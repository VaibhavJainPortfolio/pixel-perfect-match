import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/gent/PageShell";
import { EmptyState, SectionHeading } from "@/components/gent/primitives";
import { EyewearSection } from "@/components/gent/EyewearSection";
import { getMyReport } from "@/lib/report.functions";

export const Route = createFileRoute("/_authenticated/app/report/$reportId")({
  head: () => ({
    meta: [
      { title: "Your style report — TheGent's Style Report" },
      { name: "description", content: "Your personalised report." },
      { property: "og:title", content: "Your style report — TheGent's" },
      { property: "og:description", content: "Your personalised report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { reportId } = Route.useParams();
  const fn = useServerFn(getMyReport);
  const q = useQuery({ queryKey: ["report", reportId], queryFn: () => fn({ data: { reportId } }) });
  if (q.isLoading) return <PageShell><p className="text-sm text-muted-foreground">Loading your report…</p></PageShell>;
  if (q.error || !q.data) return <PageShell><EmptyState title="Report not found" description="Please check the link." /></PageShell>;
  const d = q.data.data;
  return (
    <PageShell>
      <div className="space-y-10">
        <SectionHeading as="h1" eyebrow="Your style report" title={`${d.name ?? "Your"}'s style report`} />
        {d.summary && <p className="text-sm text-muted-foreground">{d.summary}</p>}
        {/* Other sections (face, hair, beard, skin, outfits…) are built separately; Eyewear sits between Beard and Skin tone. */}
        <EyewearSection eyewear={d.eyewear} renders={q.data.renderUrls} shop={q.data.shop} />
      </div>
    </PageShell>
  );
}
