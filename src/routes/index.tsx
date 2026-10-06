import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ScanFace, PersonStanding, Palette, Scissors, Sparkles, Shirt, Watch, Droplets, CalendarDays,
  ShieldCheck, Lock, Sparkle, ArrowRight, Check, X, Star, Layers, Eye, Sparkles as SparklesIcon
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

const TITLE = "TheGent — AI Personal Style Analysis for Indian Men";
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

const analysisGrid = [
  { title: "Face Shape", subtitle: "Facial geometry & structure", text: "Hairstyle and beard choices precisely matched to balance your jawline and forehead.", icon: ScanFace },
  { title: "Hairstyle", subtitle: "barber reference guide", text: "Exact cut names, length guidelines, styling products, and styles to avoid.", icon: Scissors },
  { title: "Beard Style", subtitle: "jawline definition", text: "Optimal length, cheek line, neckline, and density recommendations for your facial build.", icon: Sparkles },
  { title: "Skin Tone", subtitle: "undertone & contrast", text: "Your precise seasonal color palette, metallics, and power colors that brighten your face.", icon: Palette },
  { title: "Best Colors", subtitle: "swatches & contrast", text: "Tailored shade combinations to wear, along with specific dulling colors to avoid.", icon: Droplets },
  { title: "Body Build", subtitle: "frame & proportions", text: "Fit rules tailored to rectangle, trapezoid, triangle, or oval body types.", icon: PersonStanding },
  { title: "Fit & Proportions", subtitle: "shirt, trouser & blazer sizes", text: "Ideal collar shapes, jacket lengths, sleeve fits, and pant breaks for your height.", icon: Shirt },
  { title: "Outfit Combinations", subtitle: "16 complete looks", text: "Curated outfit pairings for work, dates, weekend brunches, and festive events.", icon: Layers },
  { title: "Accessories & Watches", subtitle: "proportional styling", text: "Watch dial mm diameter, leather straps, frame thickness, shoe colors, and belts.", icon: Watch },
  { title: "AI Try-On Previews", subtitle: "photorealistic renders", text: "AI preview images of you wearing your recommended outfits before buying anything.", icon: Eye },
];

const howSteps = [
  { number: "01", title: "Upload 8 guided photos", text: "Simple browser camera guide ensuring ideal lighting, pose, and distance." },
  { number: "02", title: "AI analyses your features", text: "Landmark geometry measurement of face shape, body build, and skin undertone." },
  { number: "03", title: "Expert-reviewed recommendations", text: "16 personalized outfit pairs, haircut guides, color swatches, and fit rules." },
  { number: "04", title: "Receive your personal style report", text: "Web report and PDF with AI visual previews delivered within 30 minutes." },
];

const faqs = [
  { q: "What happens to my photos?", a: "Your photos are stored privately, used only to make your report, and never shared or made public. You can ask us to delete them at any time." },
  { q: "How long does it take?", a: "Most reports are ready within 30 minutes of uploading your photos. If a stylist needs to review something, it can take a little longer — we'll message you on WhatsApp." },
  { q: "Can I get a refund?", a: "If we can't produce your report, you get a full refund. See our refund policy for the details." },
  { q: "How accurate is it?", a: "The analysis is based on your photos and proven styling guidelines. Good lighting and following the photo guide give the best results. It's advice to help you choose — not a rulebook." },
  { q: "Are the AI images really me?", a: "They're AI-generated previews made from your photos to show how an outfit could look on you. Treat them as a visual guide; small details may differ from real life." },
];

const occasionPreviews = [
  { tag: "Smart Casual", title: "Textured Linen & Tapered Chinos", desc: "Balanced proportions for informal meetings, cafe catchups, and weekend travel." },
  { tag: "Date Night", title: "Dark Navy Layering & Sleek Boots", desc: "High-contrast evening styling designed for low-light restaurant aesthetics." },
  { tag: "Office & Leadership", title: "Structured Blazer & Tailored Cut", desc: "Professional authority with clean lines tailored to your exact shoulder build." },
  { tag: "Weddings & Celebrations", title: "Rich Kurta & Layered Nehru Vest", desc: "Traditional elegance with metallic accents matching your skin undertone." },
];

function Index() {
  const heroRef = useRef<HTMLElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!!e && !e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ba = useQuery(beforeAfterQuery).data;
  const pricing = useQuery(pricingQuery);
  const reviews = useQuery(reviewsQuery);

  return (
    <PageShell>
      {/* -------------------------------------------------- */}
      {/* SECTION 1 — CINEMATIC HERO                          */}
      {/* -------------------------------------------------- */}
      <section ref={heroRef} className="relative py-6 lg:py-12">
        {/* Subtle Ambient Gold Backlight Glow */}
        <div className="pointer-events-none absolute -left-20 top-1/4 size-96 rounded-full bg-gold/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/3 size-96 rounded-full bg-gold/10 blur-3xl" />

        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          {/* LEFT COLUMN: Editorial Headline & Actions */}
          <div className="space-y-6 lg:col-span-6 xl:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold-soft px-3.5 py-1 text-xs tracking-widest text-gold uppercase font-medium">
              <SparklesIcon className="size-3.5" />
              <span>AI Personal Style Analysis For Indian Men</span>
            </div>

            <h1 className="font-display text-4xl leading-[1.08] text-foreground sm:text-5xl lg:text-5xl xl:text-6xl">
              You don’t need more clothes. <br className="hidden sm:inline" />
              You need <span className="text-gold italic">the right ones for you</span>.
            </h1>

            <p className="max-w-xl text-base text-muted-foreground leading-relaxed">
              Upload 8 photos and get a personalized style report covering haircut, beard, colors, fit and outfits — plus AI previews so you can see how better choices look on you before you buy anything.
            </p>

            <div className="flex flex-col gap-3.5 sm:flex-row pt-2">
              <GoldButton asChild size="lg" className="px-8 shadow-xl shadow-gold/10">
                <Link to="/app/checkout" search={{ product: "style_report" }}>Get My Style Report — ₹1,999</Link>
              </GoldButton>
              <GhostButton asChild size="lg">
                <Link to="/free-check">Try Free Face Analysis</Link>
              </GhostButton>
            </div>

            {/* Microcopy Trust Bar */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground/90 pt-2 border-t border-border/40">
              <span className="flex items-center gap-1.5"><Check className="size-3.5 text-gold" /> 8 guided photos</span>
              <span className="flex items-center gap-1.5"><Check className="size-3.5 text-gold" /> ~30 min report</span>
              <span className="flex items-center gap-1.5"><Lock className="size-3.5 text-gold" /> Private & secure</span>
            </div>

            {/* 3 Compact Proof / Value Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2 rounded-lg border border-gold/15 bg-card/40 px-3 py-2 text-xs font-medium text-foreground">
                <Check className="size-3.5 text-gold shrink-0" />
                <span>Face, body & color analysis</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gold/15 bg-card/40 px-3 py-2 text-xs font-medium text-foreground">
                <Check className="size-3.5 text-gold shrink-0" />
                <span>16 AI outfit previews</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gold/15 bg-card/40 px-3 py-2 text-xs font-medium text-foreground">
                <Check className="size-3.5 text-gold shrink-0" />
                <span>Built for Indian men</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Cinematic Before/After Visual */}
          <div className="relative lg:col-span-6 xl:col-span-6">
            {/* Callout 1: Top Left */}
            <div className="absolute -top-4 -left-2 z-20 flex items-center gap-2 rounded-full border border-gold/40 bg-card/95 px-4 py-1.5 text-xs font-medium text-foreground shadow-xl backdrop-blur">
              <Sparkle className="size-3.5 text-gold fill-gold" />
              <span>16 AI Outfit Previews</span>
            </div>

            {/* Callout 2: Bottom Right */}
            <div className="absolute -bottom-3 -right-2 z-20 flex items-center gap-2 rounded-full border border-gold/40 bg-card/95 px-4 py-1.5 text-xs font-medium text-foreground shadow-xl backdrop-blur">
              <ShieldCheck className="size-3.5 text-gold" />
              <span>Personalized for your face & body</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gold/30 bg-card/70 p-3 shadow-2xl backdrop-blur-md">
              <BeforeAfterSlider
                before={ba?.before_url || beforeImg}
                after={ba?.after_url || afterImg}
                beforeLabel={ba?.before_label || "Before"}
                afterLabel={ba?.after_label || "AI render of the same man"}
              />
            </div>

            {/* Elegant Caption below visual (not a card) */}
            <div className="mt-4 px-1 text-center sm:text-left">
              <h3 className="font-display text-lg text-foreground tracking-tight">Same man. Better choices.</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag to compare the original look with a personalized styled version.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 2 — PROBLEM / EMOTIONAL HOOK              */}
      {/* -------------------------------------------------- */}
      <section className="mt-28 relative py-12 rounded-3xl border border-border/60 bg-card/30 px-6 sm:px-12 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="eyebrow">The Core Problem</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Stop buying clothes by guesswork.<br /><span className="text-gold italic">Wear what actually suits you.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed pt-2">
            Most men buy shirts, shoes and hairstyles based on trends, brands or guesswork. The problem isn’t your wardrobe — it’s not knowing what actually works for your face geometry, proportions and skin tone.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-background/60 p-6 space-y-3">
            <span className="text-xs font-mono tracking-widest text-gold uppercase">01 / Colors</span>
            <h3 className="font-display text-xl text-foreground">Dull Skin From Wrong Colors</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wearing shades outside your natural skin undertone washes out your complexion and makes you look tired even in expensive outfits.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/60 p-6 space-y-3">
            <span className="text-xs font-mono tracking-widest text-gold uppercase">02 / Proportions</span>
            <h3 className="font-display text-xl text-foreground">Distorted Body Proportions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wearing shirt lengths, pant breaks, or shoulder cuts suited for a different frame distorts your height and build.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/60 p-6 space-y-3">
            <span className="text-xs font-mono tracking-widest text-gold uppercase">03 / Facial Balance</span>
            <h3 className="font-display text-xl text-foreground">Weakened Facial Structure</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A barber haircut or beard shape chosen without accounting for your jawline and forehead shape weakens your natural facial balance.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 3 — WHAT THEGENT ANALYZES (`#what-you-get`)*/}
      {/* -------------------------------------------------- */}
      <section id="what-you-get" className="mt-28 scroll-mt-24 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="eyebrow">Comprehensive Breakdown</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground">Your appearance, decoded.</h2>
          <p className="text-muted-foreground">Every analysis chapter is built directly from measurements of your 8 photos.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {analysisGrid.map((item) => (
            <div key={item.title} className="group relative rounded-2xl border border-border/80 bg-card/40 p-5 transition-all duration-300 hover:border-gold/50 hover:bg-card/80">
              <div className="flex size-10 items-center justify-center rounded-xl border border-gold/30 bg-gold-soft text-gold transition-transform group-hover:scale-110">
                <item.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-lg text-foreground">{item.title}</h3>
              <p className="text-xs font-medium text-gold/80 mt-0.5">{item.subtitle}</p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 4 — PERSONALIZED BLUEPRINT MOCKUP          */}
      {/* -------------------------------------------------- */}
      <section className="mt-28 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="eyebrow">Your Report Inside</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground">Not generic advice.<br /><span className="text-gold italic">A style blueprint built around you.</span></h2>
          <p className="text-muted-foreground">Look inside the 9 personalized report chapters before you order.</p>
        </div>

        <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-5 md:px-0">
          {samplePages.map((p, i) => (
            <Link key={p.title} to="/sample-report" className="w-44 shrink-0 snap-start transition-all hover:-translate-y-1 hover:[&>div]:border-gold md:w-auto">
              <SamplePageThumb page={p} index={i} blurred />
            </Link>
          ))}
        </div>

        <div className="flex justify-center">
          <GhostButton asChild size="lg"><Link to="/sample-report">Open Full Sample Preview</Link></GhostButton>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 5 — AI TRY-ON PREVIEWS (`#ai-try-on`)       */}
      {/* -------------------------------------------------- */}
      <section id="ai-try-on" className="mt-28 scroll-mt-24 rounded-3xl border border-gold/20 bg-card/40 p-8 sm:p-12 space-y-10 relative overflow-hidden">
        <div className="pointer-events-none absolute right-0 top-0 size-80 bg-gold/5 blur-3xl" />
        
        <div className="max-w-2xl space-y-3">
          <p className="eyebrow">AI Virtual Try-On Renders</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground">See the look before you buy the clothes.</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your report includes AI-generated preview images of you wearing recommended outfits, so you can visualize the transformation before spending a rupee on your wardrobe.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {occasionPreviews.map((occ) => (
            <div key={occ.tag} className="space-y-3 rounded-2xl border border-border/80 bg-background/80 p-5 transition-colors hover:border-gold/40">
              <span className="inline-block rounded-md border border-gold/30 bg-gold-soft px-2.5 py-1 text-xs font-mono tracking-wider text-gold uppercase">
                {occ.tag}
              </span>
              <h3 className="font-display text-lg text-foreground">{occ.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{occ.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 6 — HOW IT WORKS (`#how-it-works`)          */}
      {/* -------------------------------------------------- */}
      <section id="how-it-works" className="mt-28 scroll-mt-24 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="eyebrow">Simple 4-Step Process</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground">How it works.</h2>
          <p className="text-muted-foreground">About ten minutes of your time. No fashion knowledge required.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {howSteps.map((step) => (
            <div key={step.number} className="relative rounded-2xl border border-border/80 bg-card/40 p-6 space-y-4">
              <span className="font-display text-4xl text-gold">{step.number}</span>
              <h3 className="font-display text-xl text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-gold" />
            <span>No fashion knowledge required. Simple photo guide handles everything.</span>
          </span>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 7 — WHY THEGENT / DIFFERENTIATION          */}
      {/* -------------------------------------------------- */}
      <section className="mt-28 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="eyebrow">Personalized vs Generic</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground">Styling should be personal.</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Generic Fashion Advice */}
          <div className="rounded-2xl border border-border/60 bg-card/20 p-8 space-y-6">
            <h3 className="font-display text-xl text-muted-foreground/80">Generic Fashion Advice</h3>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3"><X className="size-4 shrink-0 text-destructive mt-0.5" /> Trend-based hype regardless of individual suitability</li>
              <li className="flex gap-3"><X className="size-4 shrink-0 text-destructive mt-0.5" /> One-size-fits-all rules for every body build</li>
              <li className="flex gap-3"><X className="size-4 shrink-0 text-destructive mt-0.5" /> No facial geometry or beard structure analysis</li>
              <li className="flex gap-3"><X className="size-4 shrink-0 text-destructive mt-0.5" /> Ignores skin undertones and contrast levels</li>
              <li className="flex gap-3"><X className="size-4 shrink-0 text-destructive mt-0.5" /> No visual try-on preview before purchasing</li>
            </ul>
          </div>

          {/* TheGent Solution */}
          <div className="rounded-2xl border border-gold/40 bg-card/70 p-8 space-y-6 shadow-xl relative">
            <div className="absolute top-4 right-4 rounded-full border border-gold/40 bg-gold-soft px-3 py-0.5 text-xs text-gold uppercase tracking-wider font-mono">
              TheGent
            </div>
            <h3 className="font-display text-xl text-foreground">Your Personal Blueprint</h3>
            <ul className="space-y-4 text-sm text-foreground">
              <li className="flex gap-3"><Check className="size-4 shrink-0 text-gold mt-0.5" /> Measured from your exact 8 photos</li>
              <li className="flex gap-3"><Check className="size-4 shrink-0 text-gold mt-0.5" /> Tailored to your facial shape, jawline & forehead</li>
              <li className="flex gap-3"><Check className="size-4 shrink-0 text-gold mt-0.5" /> Skin undertone color palette + shades to skip</li>
              <li className="flex gap-3"><Check className="size-4 shrink-0 text-gold mt-0.5" /> Proportions for your height & shoulder build</li>
              <li className="flex gap-3"><Check className="size-4 shrink-0 text-gold mt-0.5" /> AI visual previews of recommended outfits</li>
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 8 — BUILT FOR INDIAN MEN                   */}
      {/* -------------------------------------------------- */}
      <section className="mt-28 rounded-3xl border border-border/80 bg-card/30 p-8 sm:p-12 space-y-8">
        <div className="max-w-3xl space-y-3">
          <p className="eyebrow">Designed Specifically</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground">Built for Indian men.</h2>
          <p className="text-muted-foreground leading-relaxed">
            Most global style advice ignores Indian skin tone spectrums, weather, body diversity, grooming preferences and how Indian men actually dress across work, weddings, festive gatherings, and daily life.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/60 p-5 space-y-2">
            <h4 className="font-display text-base text-foreground">Indian Skin Tone Spectrum</h4>
            <p className="text-xs text-muted-foreground">Warm, olive, and deep undertone palettes specifically calibrated for Indian complexions.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-5 space-y-2">
            <h4 className="font-display text-base text-foreground">Office & Business Attire</h4>
            <p className="text-xs text-muted-foreground">Modern smart professional fits suited for Indian corporate and startup environments.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-5 space-y-2">
            <h4 className="font-display text-base text-foreground">Weddings & Festive Wear</h4>
            <p className="text-xs text-muted-foreground">Kurta lengths, Nehru vest layering, and festive embroidery styles matching your build.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-5 space-y-2">
            <h4 className="font-display text-base text-foreground">Climate & Fabric Selection</h4>
            <p className="text-xs text-muted-foreground">Breathable cottons, linens, and light wool blends suited for Indian tropical weather.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-5 space-y-2">
            <h4 className="font-display text-base text-foreground">Barber & Beard Culture</h4>
            <p className="text-xs text-muted-foreground">Barber reference scripts you can show directly to your barber for exact haircuts.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-5 space-y-2">
            <h4 className="font-display text-base text-foreground">Footwear & Watch Sizes</h4>
            <p className="text-xs text-muted-foreground">Loafers, sneakers, strap leather pairing, and watch case sizes suited for your wrist.</p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 9 — PRICING & VALUE (`#pricing`)          */}
      {/* -------------------------------------------------- */}
      <section id="pricing" className="mt-28 scroll-mt-24 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="eyebrow">Transparent Pricing</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground">One report. Years of better decisions.</h2>
          <p className="text-muted-foreground">One-time payment. No subscription.</p>
        </div>

        {pricing.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Card key={i} className="h-80 animate-pulse" />)}</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {(pricing.data ?? []).map((p) => {
              const gst = Math.round((p.amount_paise * Number(p.gst_rate)) / 100);
              return (
                <Card key={p.id} className={cn("flex flex-col justify-between gap-6 p-8 rounded-2xl relative transition-all", p.highlighted && "border-gold shadow-2xl shadow-gold/10 bg-card/80")}>
                  {p.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-gold/40 bg-gold px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      Most Chosen
                    </div>
                  )}
                  <div className="space-y-3">
                    <h3 className="font-display text-2xl text-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.tagline}</p>
                    <div className="pt-2">
                      <p className="font-display text-4xl text-foreground">{formatINR(p.amount_paise)}</p>
                      <p className="text-xs text-muted-foreground mt-1">+ {Number(p.gst_rate)}% GST · Total {formatINR(p.amount_paise + gst)}</p>
                    </div>
                    <ul className="space-y-2.5 text-sm pt-4 border-t border-border/60">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-2.5 text-foreground text-xs sm:text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    {p.highlighted ? (
                      <GoldButton asChild block size="lg" className="w-full">
                        <Link to="/app/checkout" search={{ product: p.product }}>Build My Style Report</Link>
                      </GoldButton>
                    ) : (
                      <GhostButton asChild block size="lg" className="w-full">
                        <Link to="/app/checkout" search={{ product: p.product }}>Choose {p.name}</Link>
                      </GhostButton>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* REVIEWS */}
      <section className="mt-20 space-y-8">
        <SectionHeading eyebrow="Verified Reviews" title="From men who've had theirs." />
        {reviews.data && reviews.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.data.map((r) => (
              <Card key={r.id} className="space-y-3 p-6 rounded-2xl border-border/70">
                <div className="flex gap-1 text-gold">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                </div>
                <p className="text-sm leading-relaxed text-foreground italic">"{r.body}"</p>
                <p className="text-xs text-muted-foreground font-medium">{r.display_name}{r.city ? `, ${r.city}` : ""}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Star />} title="Reviews coming soon" description="We only show reviews from real verified customers." />
        )}
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 10 — TRUST & PRIVACY                       */}
      {/* -------------------------------------------------- */}
      <section className="mt-28 rounded-3xl border border-border/80 bg-card/40 p-8 sm:p-12">
        <div className="grid gap-8 items-center md:grid-cols-12">
          <div className="space-y-3 md:col-span-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-gold uppercase tracking-widest">
              <ShieldCheck className="size-4" />
              <span>Privacy Guaranteed</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground">Your photos stay private.</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your uploaded photos are stored in encrypted private storage, accessed strictly for your style report generation, and never shared or made public. You maintain full ownership and can request photo deletion anytime.
            </p>
          </div>
          <div className="grid gap-3 md:col-span-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-1">
              <h4 className="text-sm font-medium text-foreground">Encrypted Storage</h4>
              <p className="text-xs text-muted-foreground">Private Supabase buckets with folder-level user isolation.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-1">
              <h4 className="text-sm font-medium text-foreground">No Public Gallery</h4>
              <p className="text-xs text-muted-foreground">Your photos are never posted or used in public marketing.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-1">
              <h4 className="text-sm font-medium text-foreground">7-Day Share Links</h4>
              <p className="text-xs text-muted-foreground">Report sharing links automatically rotate with safe expiry.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-1">
              <h4 className="text-sm font-medium text-foreground">One-Click Deletion</h4>
              <p className="text-xs text-muted-foreground">Delete your photos directly from your account settings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 11 — FINAL CINEMATIC CTA                   */}
      {/* -------------------------------------------------- */}
      <section className="mt-28 relative rounded-3xl border border-gold/40 bg-gradient-to-b from-card to-background p-10 sm:p-16 text-center space-y-8 overflow-hidden shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent" />

        <div className="relative max-w-3xl mx-auto space-y-4">
          <p className="eyebrow">Your Style Blueprint Awaits</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            You already have the face.<br />The body.<br />The wardrobe.<br />
            <span className="text-gold italic mt-2 block">Now make better choices.</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto pt-2">
            Get your 9-chapter personalized style report with AI visual try-on previews in 30 minutes.
          </p>
        </div>

        <div className="relative flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <GoldButton asChild size="lg" className="px-10 shadow-xl shadow-gold/15">
            <Link to="/app/checkout" search={{ product: "style_report" }}>Get My Style Report — ₹1,999</Link>
          </GoldButton>
          <GhostButton asChild size="lg">
            <Link to="/free-check">Try Free Face Analysis</Link>
          </GhostButton>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 12 — FAQ                                  */}
      {/* -------------------------------------------------- */}
      <section id="faq" className="mt-28 scroll-mt-24 space-y-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card/40 px-6">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-border/60">
              <AccordionTrigger className="text-left text-base text-foreground hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* STICKY MOBILE CTA */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 p-3 backdrop-blur transition-transform duration-300 md:hidden",
          showBar ? "translate-y-0" : "translate-y-full",
        )}
      >
        <GoldButton asChild block size="lg">
          <Link to="/app/checkout" search={{ product: "style_report" }}>Get My Style Report — ₹1,999</Link>
        </GoldButton>
      </div>
    </PageShell>
  );
}
