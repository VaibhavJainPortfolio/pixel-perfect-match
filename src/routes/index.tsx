import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ScanFace, PersonStanding, Palette, Scissors, Sparkles, Shirt, Watch, Droplets, CalendarDays,
  CreditCard, Camera, MessageCircle, Star, Check,
} from "lucide-react";
import { PageShell } from "@/components/gent/PageShell";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { Card, SectionHeading, EmptyState } from "@/components/gent/primitives";
import { BeforeAfterSlider } from "@/components/gent/BeforeAfterSlider";
import { SamplePageThumb, samplePages } from "@/components/gent/SamplePages";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { beforeAfterQuery, formatINR, pricingQuery, reviewsQuery } from "@/lib/public-content";
import { cn } from "@/lib/utils";
import beforeImg from "@/assets/before.jpg";
import afterImg from "@/assets/after.jpg";

const TITLE = "TheGent's Style Report — personal style analysis for Indian men";
const DESC = "A personal stylist's analysis of your face, body and skin tone, built from 8 photos. Report in 30 minutes. ₹1,999 + GST.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Index,
});

const reportItems = [
  { icon: ScanFace, title: "Face shape", text: "Which cuts, frames and collars balance your face." },
  { icon: PersonStanding, title: "Body type", text: "Fits and proportions that work with your build." },
  { icon: Palette, title: "Skin tone & colours", text: "Your colour palette, and the shades to skip." },
  { icon: Scissors, title: "Hairstyle", text: "Cuts to ask your barber for, with references." },
  { icon: Sparkles, title: "Beard", text: "The beard shape and length that suits your jaw." },
  { icon: Shirt, title: "16 outfits", text: "Office, weekend, festive and evening looks." },
  { icon: Watch, title: "Accessories & watches", text: "Watch size, straps, belts, shoes and frames." },
  { icon: Droplets, title: "Fragrance", text: "Scent families for day, night and occasions." },
  { icon: CalendarDays, title: "90-day plan", text: "What to buy and change, week by week." },
];

const howSteps = [
  { icon: CreditCard, title: "Pay and add basics", text: "Age, height, weight, city and budget. Two minutes." },
  { icon: Camera, title: "Take 8 guided photos", text: "Our camera guide tells you exactly how to stand." },
  { icon: MessageCircle, title: "Get your report on WhatsApp", text: "Web report and PDF, usually within 30 minutes." },
];

const faqs = [
  { q: "What happens to my photos?", a: "Your photos are stored privately, used only to make your report, and never shared or made public. You can ask us to delete them at any time." },
  { q: "How long does it take?", a: "Most reports are ready within 30 minutes of uploading your photos. If a stylist needs to review something, it can take a little longer — we'll message you on WhatsApp." },
  { q: "Can I get a refund?", a: "If we can't produce your report, you get a full refund. See our refund policy for the details." },
  { q: "How accurate is it?", a: "The analysis is based on your photos and proven styling guidelines. Good lighting and following the photo guide give the best results. It's advice to help you choose — not a rulebook." },
  { q: "Are the AI images really me?", a: "They're AI-generated previews made from your photos to show how an outfit could look on you. Treat them as a visual guide; small details may differ from real life." },
];

function Index() {
  const heroRef = useRef<HTMLElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ba = useQuery(beforeAfterQuery).data;
  const pricing = useQuery(pricingQuery);
  const reviews = useQuery(reviewsQuery);

  return (
    <PageShell>
      {/* 1. Hero */}
      <section ref={heroRef} className="space-y-6 pb-4">
        <p className="eyebrow">Personal style analysis</p>
        <h1 className="text-4xl leading-[1.08] text-foreground sm:text-6xl">
          Why you still look average, <span className="text-gold">even after spending on better clothes</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          A personal stylist's analysis of your face, body and skin tone, built from 8 photos. Report in 30 minutes.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <GoldButton asChild size="lg"><Link to="/app/checkout">Get my style report – ₹1,999</Link></GoldButton>
          <GhostButton asChild size="lg"><Link to="/free-check">Try a free face check</Link></GhostButton>
        </div>
      </section>

      {/* 2. Before / after */}
      <section className="mt-12 grid items-center gap-8 md:grid-cols-2">
        <BeforeAfterSlider
          before={ba?.before_url || beforeImg}
          after={ba?.after_url || afterImg}
          beforeLabel={ba?.before_label || "Before"}
          afterLabel={ba?.after_label || "AI render of the same man"}
        />
        <SectionHeading
          eyebrow="See the difference"
          title="Same man. Better choices."
          description="Drag the divider. Your report includes AI images of you wearing your recommended outfits, so you can see them before you buy anything."
        />
      </section>

      {/* 3. What's in the report */}
      <section className="mt-20 space-y-8">
        <SectionHeading eyebrow="What's in the report" title="Nine chapters, all about you." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reportItems.map((it) => (
            <Card key={it.title} className="flex items-start gap-4 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold-soft text-gold">
                <it.icon className="size-5" />
              </span>
              <div>
                <h3 className="text-lg text-foreground">{it.title}</h3>
                <p className="text-sm text-muted-foreground">{it.text}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. How it works */}
      <section className="mt-20 space-y-8">
        <SectionHeading eyebrow="How it works" title="Three steps. About ten minutes of your time." />
        <ol className="grid gap-3 md:grid-cols-3">
          {howSteps.map((s, i) => (
            <Card key={s.title} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl text-gold">0{i + 1}</span>
                <s.icon className="size-5 text-muted-foreground" />
              </div>
              <h3 className="text-xl text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </Card>
          ))}
        </ol>
      </section>

      {/* 5. Sample report */}
      <section className="mt-20 space-y-8">
        <SectionHeading eyebrow="Sample report" title="Look inside before you pay." />
        <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-5 md:px-0">
          {samplePages.map((p, i) => (
            <Link key={p.title} to="/sample-report" className="w-40 shrink-0 snap-start transition-colors hover:[&>div]:border-gold md:w-auto">
              <SamplePageThumb page={p} index={i} blurred />
            </Link>
          ))}
        </div>
        <GhostButton asChild><Link to="/sample-report">Open sample preview</Link></GhostButton>
      </section>

      {/* 6. Pricing */}
      <section className="mt-20 space-y-8">
        <SectionHeading eyebrow="Pricing" title="One-time payment. No subscription." />
        {pricing.isLoading ? (
          <div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((i) => <Card key={i} className="h-72 animate-pulse" />)}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {(pricing.data ?? []).map((p) => {
              const gst = Math.round((p.amount_paise * Number(p.gst_rate)) / 100);
              return (
                <Card key={p.id} className={cn("flex flex-col gap-4", p.highlighted && "border-gold")}>
                  <div className="space-y-1">
                    {p.highlighted && <p className="eyebrow">Most chosen</p>}
                    <h3 className="text-2xl text-foreground">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.tagline}</p>
                  </div>
                  <div>
                    <p className="font-display text-4xl text-foreground">{formatINR(p.amount_paise)}</p>
                    <p className="text-xs text-muted-foreground">+ {Number(p.gst_rate)}% GST · Total {formatINR(p.amount_paise + gst)}</p>
                  </div>
                  <ul className="flex-1 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2 text-foreground"><Check className="mt-0.5 size-4 shrink-0 text-gold" />{f}</li>
                    ))}
                  </ul>
                  {p.highlighted ? (
                    <GoldButton asChild block><Link to="/app/checkout">Choose {p.name}</Link></GoldButton>
                  ) : (
                    <GhostButton asChild block><Link to="/app/checkout">Choose {p.name}</Link></GhostButton>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. Reviews */}
      <section className="mt-20 space-y-8">
        <SectionHeading eyebrow="Reviews" title="From men who've had theirs." />
        {reviews.data && reviews.data.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {reviews.data.map((r) => (
              <Card key={r.id} className="space-y-3">
                <div className="flex gap-0.5 text-gold">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                </div>
                <p className="text-sm leading-relaxed text-foreground">"{r.body}"</p>
                <p className="text-xs text-muted-foreground">{r.display_name}{r.city ? `, ${r.city}` : ""}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Star />} title="Reviews coming soon" description="We only show reviews from real customers. Check back after our first reports go out." />
        )}
      </section>

      {/* 8. FAQ */}
      <section className="mt-20 space-y-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-5">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-border">
              <AccordionTrigger className="text-left text-base text-foreground hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Sticky mobile CTA */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur transition-transform duration-300 md:hidden",
          showBar ? "translate-y-0" : "translate-y-full",
        )}
      >
        <GoldButton asChild block size="lg"><Link to="/app/checkout">Get my style report – ₹1,999</Link></GoldButton>
      </div>
    </PageShell>
  );
}
