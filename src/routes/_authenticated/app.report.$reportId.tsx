import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Share2, Star } from "lucide-react";
import { PageShell } from "@/components/gent/PageShell";
import { EmptyState } from "@/components/gent/primitives";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { ReportView } from "@/components/gent/report/ReportView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createShareLink, getMyReport, getPdfLink, saveChecklist, submitFeedback } from "@/lib/report.functions";

export const Route = createFileRoute("/_authenticated/app/report/$reportId")({
  head: () => ({
    meta: [
      { title: "Your style report — TheGent's Style Report" },
      { name: "description", content: "Your face, hair, colours, fits, 16 outfits and 90-day plan." },
      { property: "og:title", content: "Your style report — TheGent's" },
      { property: "og:description", content: "Your face, hair, colours, fits, 16 outfits and 90-day plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { reportId } = Route.useParams();
  const fn = useServerFn(getMyReport);
  const saveFn = useServerFn(saveChecklist);
  const pdfFn = useServerFn(getPdfLink);
  const shareFn = useServerFn(createShareLink);
  const q = useQuery({ queryKey: ["report", reportId], queryFn: () => fn({ data: { reportId } }) });
  const [checked, setChecked] = useState<Record<string, boolean> | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (q.isLoading) return <PageShell><p className="text-sm text-muted-foreground">Loading your report…</p></PageShell>;
  if (q.error || !q.data) return <PageShell><EmptyState title="Report not found" description="Please check the link." /></PageShell>;
  const ticks = checked ?? q.data.checked;

  const toggle = (key: string, v: boolean) => {
    const next = { ...ticks, [key]: v };
    setChecked(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { saveFn({ data: { reportId, checked: next } }).catch(() => toast.error("Couldn't save your ticks.")); }, 600);
  };
  const download = async () => {
    try { const { url } = await pdfFn({ data: { reportId } }); window.location.href = url; }
    catch (e: any) { toast.error(e?.message ?? "PDF isn't ready yet."); }
  };
  const share = async () => {
    try {
      const { path, expiresAt } = await shareFn({ data: { reportId } });
      const url = window.location.origin + path;
      const until = new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      if (navigator.share) await navigator.share({ title: "My TheGent's Style Report", url }).catch(() => {});
      else { await navigator.clipboard.writeText(url); }
      toast.success(`Share link ready — works until ${until}.`);
    } catch { toast.error("Couldn't create a share link."); }
  };

  return (
    <PageShell>
      <div className="pb-28">
        <ReportView bundle={q.data} checked={ticks} onToggle={toggle} />
      </div>
      <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-2 p-3">
          <GoldButton className="flex-1" onClick={download} disabled={!q.data.hasPdf}><Download />{q.data.hasPdf ? "PDF" : "PDF soon"}</GoldButton>
          <GhostButton className="flex-1" onClick={share}><Share2 />Share</GhostButton>
          <GhostButton className="flex-1" onClick={() => setRateOpen(true)} disabled={q.data.rated}><Star />{q.data.rated ? "Rated" : "Rate"}</GhostButton>
        </div>
      </div>
      <RateDialog open={rateOpen} onOpenChange={setRateOpen} reportId={reportId} onDone={() => q.refetch()} />
    </PageShell>
  );
}

function RateDialog({ open, onOpenChange, reportId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; reportId: string; onDone: () => void }) {
  const fn = useServerFn(submitFeedback);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!rating) { toast.error("Pick 1 to 5 stars."); return; }
    setBusy(true);
    try { await fn({ data: { reportId, rating, comment } }); toast.success("Thank you for the feedback."); onOpenChange(false); onDone(); }
    catch (e: any) { toast.error(e?.message ?? "Couldn't save your rating."); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Rate this report</DialogTitle></DialogHeader>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}>
              <Star className={cn("h-9 w-9", n <= rating ? "fill-gold text-gold" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
        <Textarea placeholder="What did you like? What could be better?" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={2000} />
        <DialogFooter><GoldButton onClick={send} disabled={busy}>Send</GoldButton></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
