import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Placeholder } from "@/components/gent/PageShell";
import { Card, EmptyState, StatusBadge } from "@/components/gent/primitives";
import { GoldButton } from "@/components/gent/buttons";
import { approveReview, listReviewQueue } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/_authenticated/admin/review-queue")({
  component: Page,
});

type Task = Awaited<ReturnType<typeof listReviewQueue>>[number];

function Page() {
  const listFn = useServerFn(listReviewQueue);
  const approveFn = useServerFn(approveReview);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => listFn().then(setTasks).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setBusy(id);
    try { await approveFn({ data: { taskId: id } }); toast.success("Approved — the report will continue."); load(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  return (
    <Placeholder eyebrow="Admin" title="Review queue" description="Reports waiting for a stylist.">
      {!tasks ? null : tasks.length === 0 ? (
        <EmptyState title="Nothing to review" description="Flagged and failed reports will appear here." />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to="/admin/orders/$id" params={{ id: t.order_id }} className="font-mono text-xs text-gold">{t.order_id.slice(0, 8)}</Link>
                <StatusBadge status={t.runStatus ?? t.status} tone={t.runStatus === "failed" ? "error" : "warning" as any} />
              </div>
              <p className="text-sm text-foreground">{t.reason}</p>
              {t.notes && <p className="break-words text-xs text-muted-foreground">{t.notes}</p>}
              {t.runStatus === "waiting_review" && (
                <GoldButton size="sm" disabled={busy === t.id} onClick={() => approve(t.id)}>Approve and continue</GoldButton>
              )}
            </Card>
          ))}
        </div>
      )}
    </Placeholder>
  );
}
