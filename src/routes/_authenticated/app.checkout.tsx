import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/gent/PageShell";
import { Card, SectionHeading } from "@/components/gent/primitives";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/public-content";
import { createRazorpayOrder, getQuote, markPaymentFailed, verifyRazorpayPayment } from "@/lib/payments.functions";

const search = z.object({
  product: z.enum(["style_report", "style_report_plus", "occasion_pack"]).catch("style_report"),
  retry: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/app/checkout")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Checkout — TheGent's Style Report" },
      { name: "description", content: "Pay securely with UPI, cards or netbanking to start your style report." },
      { property: "og:title", content: "Checkout — TheGent's" },
      { property: "og:description", content: "Pay securely to start your style report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"];

type Quote = Awaited<ReturnType<typeof getQuote>>;

declare global { interface Window { Razorpay?: any } }

function loadCheckoutJs() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function Page() {
  const { product, retry } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const quoteFn = useServerFn(getQuote);
  const createFn = useServerFn(createRazorpayOrder);
  const verifyFn = useServerFn(verifyRazorpayPayment);
  const failFn = useServerFn(markPaymentFailed);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(retry ?? null);

  useEffect(() => {
    quoteFn({ data: { product } }).then(setQuote).catch((e) => toast.error(e.message));
    supabase.from("profiles").select("state").eq("id", user.id).maybeSingle().then(({ data }) => data?.state && setState(data.state));
  }, [product]);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    const q = await quoteFn({ data: { product, coupon } });
    if (q.coupon_error) { toast.error(q.coupon_error); return; }
    setQuote(q); setApplied(q.coupon_code); toast.success("Code applied.");
  };
  const removeCoupon = async () => { setApplied(null); setCoupon(""); setQuote(await quoteFn({ data: { product } })); };

  const pay = async () => {
    if (!state) { toast.error("Please choose your state (needed for the GST invoice)."); return; }
    setBusy(true);
    try {
      const ok = await loadCheckoutJs();
      if (!ok) throw new Error("Couldn't load the payment window. Check your connection.");
      const o = await createFn({ data: { product, coupon: applied, state, retryOrderId: failed } });
      let settled = false;
      const rzp = new window.Razorpay({
        key: o.keyId, order_id: o.razorpayOrderId, amount: o.amount, currency: "INR",
        name: "TheGent's", description: quote?.name,
        prefill: { name: o.name, email: o.email, contact: o.phone },
        theme: { color: "#D1AE6E" },
        config: { display: { preferences: { show_default_blocks: true }, sequence: ["block.upi"], blocks: { upi: { name: "Pay with UPI", instruments: [{ method: "upi" }] } } } },
        handler: async (r: any) => {
          settled = true;
          try {
            await verifyFn({ data: { orderId: o.orderId, ...r } });
            navigate({ to: "/app/order/$orderId/basics", params: { orderId: o.orderId } });
          } catch {
            toast.error("We received your payment but couldn't confirm it yet. It will update shortly.");
            navigate({ to: "/app" });
          }
        },
        modal: {
          ondismiss: async () => {
            if (settled) return;
            setBusy(false); setFailed(o.orderId);
            await failFn({ data: { orderId: o.orderId, reason: "Closed payment window" } });
          },
        },
      });
      rzp.on("payment.failed", async (r: any) => {
        settled = true;
        setBusy(false); setFailed(o.orderId);
        toast.error(r?.error?.description ?? "Payment failed.");
        await failFn({ data: { orderId: o.orderId, reason: r?.error?.description } });
      });
      rzp.open();
    } catch (e: any) {
      setBusy(false);
      toast.error(e.message ?? "Something went wrong.");
    }
  };

  return (
    <PageShell width="max-w-lg">
      <SectionHeading as="h1" eyebrow="Checkout" title="Your order" />
      {failed && (
        <Card className="mt-6 border-destructive/60">
          <p className="text-sm">Your payment didn't go through. No money was taken — or if it was, it will be refunded automatically.</p>
        </Card>
      )}
      <Card className="mt-6 space-y-4">
        {!quote ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div>
              <h2 className="font-display text-2xl">{quote.name}</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {quote.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
            </div>
            <dl className="space-y-2 border-t border-border pt-4 text-sm">
              <Line k="Price" v={formatINR(quote.amount_paise)} />
              {quote.discount_paise > 0 && <Line k={`Discount (${quote.coupon_code})`} v={`− ${formatINR(quote.discount_paise)}`} />}
              <Line k={`GST ${quote.gst_rate}%`} v={formatINR(quote.gst_paise)} />
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd className="text-gold">{formatINR(quote.total_paise)}</dd></div>
            </dl>
            <div className="space-y-2">
              <Label>Coupon code</Label>
              {applied ? (
                <div className="flex items-center justify-between text-sm"><span className="text-gold">{applied} applied</span><button className="text-muted-foreground hover:text-gold" onClick={removeCoupon}>Remove</button></div>
              ) : (
                <div className="flex gap-2"><Input value={coupon} maxLength={40} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Enter code" /><GhostButton onClick={applyCoupon}>Apply</GhostButton></div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Your state</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="Choose your state" /></SelectTrigger>
                <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <GoldButton block size="lg" disabled={busy} onClick={pay}>
              {busy ? "Opening payment…" : failed ? `Retry payment ${formatINR(quote.total_paise)}` : `Pay ${formatINR(quote.total_paise)}`}
            </GoldButton>
            <p className="text-center text-xs text-muted-foreground">Secure payment by Razorpay · UPI, cards, netbanking</p>
          </>
        )}
      </Card>
    </PageShell>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>;
}
