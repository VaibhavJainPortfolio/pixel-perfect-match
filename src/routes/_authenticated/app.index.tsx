import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileDown, Loader2, MessageCircle, Share2, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/gent/PageShell";
import { Card, EmptyState, StatusBadge } from "@/components/gent/primitives";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { ProgressLines, useOrderProgress } from "@/components/gent/OrderProgress";
import { getHome, createTicket } from "@/lib/home.functions";
import { createShareLink, getPdfLink, saveChecklist } from "@/lib/report.functions";
import { getInvoiceLink } from "@/lib/payments.functions";
import { SITE } from "@/lib/site";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Your home — TheGent's Style Report" },
      { name: "description", content: "Your reports, this week's style plan, wardrobe progress, orders and help." },
      { property: "og:title", content: "Your home — TheGent's Style Report" },
      { property: "og:description", content: "Your reports, weekly plan and orders in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Home = Awaited<ReturnType<typeof getHome>>;
const rupees = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const PRODUCT: Record<string, string> = { style_report: "Style Report", style_report_plus: "Style Report Plus", occasion_pack: "Occasion Pack" };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

function Page() {
  const homeFn = useServerFn(getHome);
  const [h, setH] = useState<Home | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  useEffect(() => { homeFn().then(setH).catch(() => toast.error("Couldn't load your home. Please refresh.")); }, []);

  if (!h) return <PageShell width="max-w-2xl"><div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></PageShell>;
  const empty = !h.intakeCard && !h.processing.length && !h.reports.length;

  return (
    <PageShell width="max-w-2xl">
      <div className="space-y-10">
        <div className="space-y-1"><p className="eyebrow">Your home</p><h1 className="text-3xl">Welcome back</h1></div>

        {h.intakeCard && (
          <Card className="space-y-4 border-gold p-6">
            <p className="eyebrow">Next step</p>
            <h2 className="text-2xl">Continue your report</h2>
            <p className="text-muted-foreground">
              {h.intakeCard.step === "basics" ? "Tell us a few basics, then take 8 guided photos. About 10 minutes." : "Your basics are saved. Now take your guided photos."}
            </p>
            <GoldButton asChild size="lg" className="w-full">
              {h.intakeCard.step === "basics"
                ? <Link to="/app/order/$orderId/basics" params={{ orderId: h.intakeCard.orderId }}>Continue with basics</Link>
                : <Link to="/app/order/$orderId/photos" params={{ orderId: h.intakeCard.orderId }}>Continue with photos</Link>}
            </GoldButton>
          </Card>
        )}

        {h.processing.map((id) => <LiveProgress key={id} orderId={id} />)}

        {empty && (
          <EmptyState title="No reports yet" description="Get your personal style report: face shape, colours, 16 outfits and images of you in them."
            action={<GoldButton asChild><Link to="/app/checkout" search={{ product: "style_report" }}>Get my report</Link></GoldButton>} />
        )}

        {h.reports.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl">My reports</h2>
            {h.reports.map((r) => <ReportCard key={r.id} r={r} />)}
          </section>
        )}

        {h.plan && <PlanCard plan={h.plan} onChange={(checked) => setH({ ...h, plan: { ...h.plan!, checked } })} />}

        <Upsells owned={h.owned} prices={h.prices} />

        <section className="space-y-4">
          <h2 className="text-2xl">Orders & invoices</h2>
          {h.orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
            <Card className="divide-y divide-border p-0">{h.orders.map((o) => <OrderRow key={o.id} o={o} />)}</Card>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl">Help</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <GhostButton asChild><a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp us</a></GhostButton>
            <GhostButton asChild><Link to="/" hash="faq">FAQ</Link></GhostButton>
            <GhostButton onClick={() => setTicketOpen(true)}>Report a problem</GhostButton>
          </div>
        </section>
      </div>
      <TicketDialog open={ticketOpen} onOpenChange={setTicketOpen} orders={h.orders} />
    </PageShell>
  );
}

function LiveProgress({ orderId }: { orderId: string }) {
  const p = useOrderProgress(orderId);
  if (!p) return null;
  return (
    <Card className="space-y-4 p-6">
      <p className="eyebrow">In progress</p>
      <h2 className="text-2xl">{p.state === "review" ? "Our stylist is reviewing your report" : "Your report is being made"}</h2>
      {p.state === "review" ? <p className="text-muted-foreground">You'll get it within 24 hours on WhatsApp and email.</p>
        : p.state === "done" ? <GoldButton asChild className="w-full"><Link to="/app/report/$reportId" params={{ reportId: p.reportId! }}>Open my report</Link></GoldButton>
        : <>{p.etaSeconds > 0 && <p className="text-muted-foreground">About {Math.max(1, Math.ceil(p.etaSeconds / 60))} minutes left.</p>}<ProgressLines lines={p.lines} /></>}
    </Card>
  );
}

function ReportCard({ r }: { r: Home["reports"][number] }) {
  const pdfFn = useServerFn(getPdfLink);
  const shareFn = useServerFn(createShareLink);
  const pdf = async () => { try { window.open((await pdfFn({ data: { reportId: r.id } })).url, "_blank"); } catch (e: any) { toast.error(e.message); } };
  const share = async () => {
    try {
      const { path } = await shareFn({ data: { reportId: r.id } });
      const url = window.location.origin + path;
      if (navigator.share) await navigator.share({ title: "My style report", url }).catch(() => {});
      else { await navigator.clipboard.writeText(url); toast.success("Link copied. It works for 7 days."); }
    } catch { toast.error("Couldn't create a share link."); }
  };
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex">
        <div className="w-28 shrink-0 bg-muted sm:w-36">
          {r.cover ? <img src={r.cover} alt="You in your hero look" className="h-full w-full object-cover" /> : <div className="flex h-full min-h-36 items-center justify-center text-xs text-muted-foreground">No image</div>}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div><p className="text-xs text-muted-foreground">{fmt(r.publishedAt)}</p><p className="font-display text-lg leading-snug">{r.headline ?? "Your style report"}</p></div>
          <div className="mt-auto flex flex-wrap gap-2">
            <GoldButton asChild size="sm"><Link to="/app/report/$reportId" params={{ reportId: r.id }}>Open</Link></GoldButton>
            <GhostButton size="sm" onClick={pdf} disabled={!r.hasPdf}><FileDown className="h-4 w-4" /> PDF</GhostButton>
            <GhostButton size="sm" onClick={share}><Share2 className="h-4 w-4" /> Share</GhostButton>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PlanCard({ plan, onChange }: { plan: NonNullable<Home["plan"]>; onChange: (c: Record<string, boolean>) => void }) {
  const saveFn = useServerFn(saveChecklist);
  const toggle = async (key: string, v: boolean) => {
    const next = { ...plan.checked, [key]: v };
    onChange(next);
    try { await saveFn({ data: { reportId: plan.reportId, checked: next } }); } catch { toast.error("Couldn't save. Try again."); onChange(plan.checked); }
  };
  const { total, bought } = plan.essentials;
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">This week's plan</h2>
      <Card className="space-y-4 p-5">
        <div><p className="eyebrow">Week {plan.week} of 12</p><p className="text-lg">{plan.focus}</p></div>
        <ul className="space-y-2">{plan.tasks.map((t, i) => {
          const key = `plan:${plan.week}:${i}`;
          return (
            <li key={key}><label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--gold)]" checked={!!plan.checked[key]} onChange={(e) => toggle(key, e.target.checked)} />
              <span className={cn(plan.checked[key] && "text-muted-foreground line-through")}>{t}</span>
            </label></li>
          );
        })}</ul>
      </Card>
      {total > 0 && (
        <Card className="space-y-3 p-5">
          <div className="flex items-baseline justify-between"><p className="font-medium">Wardrobe checklist</p><p className="text-sm text-muted-foreground">{bought} of {total} essentials bought</p></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gold" style={{ width: `${(bought / total) * 100}%` }} /></div>
          <Link to="/app/report/$reportId" params={{ reportId: plan.reportId }} className="text-sm text-gold underline-offset-4 hover:underline">Open checklist</Link>
        </Card>
      )}
    </section>
  );
}

function Upsells({ owned, prices }: { owned: string[]; prices: Home["prices"] }) {
  const price = (p: string) => prices.find((x) => x.product === p);
  const cards = [
    { key: "occasion_pack", title: "Occasion Pack", body: "Looks for a wedding, interview or date night, built on your report." },
    { key: "style_report_plus", title: "Upgrade to Style Report Plus", body: "Add a one-on-one call with a TheGent stylist." },
  ]
   .filter((c) => !owned.includes(c.key));
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">More for you</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const p = price(c.key);
          return (
            <Card key={c.key} className="flex flex-col gap-3 p-5">
              <p className="font-display text-lg">{c.title}</p>
              <p className="flex-1 text-sm text-muted-foreground">{c.body}</p>
              <div className="flex items-center justify-between">
                {p && <span className="text-sm">{rupees(p.amount_paise)} + GST</span>}
                <GoldButton asChild size="sm"><Link to="/app/checkout" search={{ product: c.key as any }}>Get it</Link></GoldButton>
              </div>
            </Card>
          );
        })}
        <Card className="flex flex-col gap-3 p-5">
          <p className="font-display text-lg">Style Club</p>
          <p className="flex-1 text-sm text-muted-foreground">Monthly outfit drops and seasonal updates. Launching soon.</p>
          <GhostButton asChild size="sm"><a href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent("I'd like to join Style Club")}`} target="_blank" rel="noreferrer">Join the waitlist</a></GhostButton>
        </Card>
      </div>
    </section>
  );
}

function OrderRow({ o }: { o: Home["orders"][number] }) {
  const invFn = useServerFn(getInvoiceLink);
  const dl = async () => {
    const { url } = await invFn({ data: { orderId: o.id } });
    if (url) window.open(url, "_blank"); else toast.error("Invoice isn't ready yet.");
  };
  return (
    <div className="flex items-center gap-3 px-5 py-4 text-sm">
      <div className="flex-1">
        <p className="font-medium">{PRODUCT[o.product] ?? o.product}</p>
        <p className="text-xs text-muted-foreground">{fmt(o.paid_at ?? o.created_at)} · {rupees(o.total_paise)}{o.invoice_number ? ` · ${o.invoice_number}` : ""}</p>
      </div>
      <StatusBadge status={o.status} />
      {o.status === "failed" && <GhostButton asChild size="sm"><Link to="/app/checkout" search={{ product: o.product as any }}>Retry</Link></GhostButton>}
      {o.hasInvoice && <GhostButton size="sm" onClick={dl} aria-label="Download invoice"><ExternalLink className="h-4 w-4" /> Invoice</GhostButton>}
    </div>
  );
}

function TicketDialog({ open, onOpenChange, orders }: { open: boolean; onOpenChange: (v: boolean) => void; orders: Home["orders"] }) {
  const fn = useServerFn(createTicket);
  const [subject, setSubject] = useState(""); const [message, setMessage] = useState(""); const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await fn({ data: { subject, message, orderId: orderId || null } });
      toast.success("Thanks, we'll get back to you within 24 hours.");
      setSubject(""); setMessage(""); setOrderId(""); onOpenChange(false);
    } catch (e: any) { toast.error(e.message?.includes("too_small") ? "Please add a short subject and message." : "Couldn't send. Please try again."); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Report a problem</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {orders.length > 0 && (
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">Not about a specific order</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{PRODUCT[o.product] ?? o.product} · {fmt(o.paid_at ?? o.created_at)}</option>)}
            </select>
          )}
          <Input placeholder="Subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Tell us what happened" rows={5} value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} />
          <GoldButton className="w-full" disabled={busy || subject.trim().length < 3 || message.trim().length < 5} onClick={send}>{busy ? "Sending…" : "Send"}</GoldButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
