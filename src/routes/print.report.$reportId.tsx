import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ReportView } from "@/components/gent/report/ReportView";
import { getSharedReport } from "@/lib/report.functions";

export const Route = createFileRoute("/print/report/$reportId")({
  validateSearch: (s) => z.object({ token: z.string().catch("") }).parse(s),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ params, deps }) =>
    deps.token.length >= 16 ? getSharedReport({ data: { reportId: params.reportId, token: deps.token } }) : null,
  head: () => ({
    meta: [
      { title: "Style report — TheGent's Style Report" },
      { name: "description", content: "A personal style report shared from TheGent's." },
      { property: "og:title", content: "A TheGent's Style Report" },
      { property: "og:description", content: "A personal style report shared from TheGent's." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  const bundle = Route.useLoaderData();
  if (!bundle) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <h1 className="font-serif text-2xl">This link has expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ask the owner to share a fresh link from their report.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <ReportView bundle={bundle} print />
    </main>
  );
}
