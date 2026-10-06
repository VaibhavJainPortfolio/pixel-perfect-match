import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ScanFace, PersonStanding, Palette, Scissors, Sparkles, Shirt, Watch, Droplets, CalendarDays,
  ShieldCheck, Lock, Sparkle, ArrowRight, Check, X, Star, Layers, Eye, Camera, Clock, User, MapPin,
  CheckCircle2, AlertCircle, RefreshCw, HelpCircle, FileText, Sparkles as SparklesIcon
} from "lucide-react";
import { PageShell } from "@/components/gent/PageShell";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { Card, SectionHeading, EmptyState } from "@/components/gent/primitives";
import { BeforeAfterSlider } from "@/components/gent/BeforeAfterSlider";
import { HeroStyleShowcase } from "@/components/gent/HeroStyleShowcase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { beforeAfterQuery, formatINR, pricingQuery, reviewsQuery } from "@/lib/public-content";
import { cn } from "@/lib/utils";
import beforeImg from "@/assets/before.jpg";
import afterImg from "@/assets/after.jpg";

const TITLE = "TheGent — AI Personal Style Analysis for Indian Men";
const DESC = "Upload 8 photos. Get a personal style report covering haircut, beard, skin tone, colors, fit and 16 AI outfit previews. ₹1,999 + GST.";

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

const analysisFeatures = [
  { title: "Face Shape", subtitle: "Facial geometry & proportions", desc: "Hairstyle and beard choices matched to balance your jawline, cheekbones, and forehead.", icon: ScanFace },
  { title: "Haircut Guide", subtitle: "Exact barber references", desc: "Specific cut names, length guidelines, texture recommendations, and styles to avoid.", icon: Scissors },
  { title: "Beard Style", subtitle: "Jawline definition & density", desc: "Optimal beard length, cheek line height, neckline, and density recommendations.", icon: Sparkles },
  { title: "Skin Undertone", subtitle: "Warm, cool, or neutral", desc: "Your precise undertone classification so clothing colors complement your natural complexion.", icon: Palette },
  { title: "Best Power Colors", subtitle: "Seasonal color swatches", desc: "Exact clothing shades that brighten your face and elevate your overall presence.", icon: Droplets },
  { title: "Colors to Avoid", subtitle: "Complexion flatteners", desc: "Specific dulling shades that wash out your skin or make you look tired.", icon: AlertCircle },
  { title: "Body Build Fit", subtitle: "Proportional frame rules", desc: "Tailored fit rules designed for rectangle, trapezoid, oval, or athletic builds.", icon: PersonStanding },
  { title: "Fit & Silhouette", subtitle: "Collar, sleeve & trouser break", desc: "Ideal collar spreads, shoulder seams, jacket lengths, and pant breaks for your height.", icon: Shirt },
  { title: "Outfit Pairings", subtitle: "16 complete curated looks", desc: "Curated outfit pairings for work, dates, weekend brunches, and festive events.", icon: Layers },
  { title: "Accessories & Watches", subtitle: "Proportional watch & shoes", desc: "Watch dial diameter mm, belt widths, frame thickness, and leather shoe shades.", icon: Watch },
  { title: "Occasion Styling", subtitle: "Work, dates & weddings", desc: "Context-aware outfit recommendations for professional, social, and formal Indian events.", icon: CalendarDays },
  { title: "16 AI Outfit Renders", subtitle: "Photorealistic previews", desc: "Photorealistic preview renders of you wearing your recommended looks before buying.", icon: Eye },
];

const howSteps = [
  { number: "01", title: "Take 8 guided photos", text: "Simple browser camera guide ensuring ideal lighting, pose, and distance." },
  { number: "02", title: "We analyze your features", text: "Landmark geometry measurement of face shape, body build, and skin undertone." },
  { number: "03", title: "We build your style blueprint", text: "16 personalized outfit pairs, haircut guides, color swatches, and fit rules." },
  { number: "04", title: "Receive your report & previews", text: "Web report and downloadable PDF with AI visual previews delivered within 30 minutes." },
];

const faqs = [
  { q: "What photos do I need to upload?", a: "You need 8 simple photos: front face, side profiles, full body front/side, outfit sample, and wrist. Our browser camera guide ensures ideal lighting and pose." },
  { q: "How long does the report take?", a: "Most reports are generated within 30 minutes of photo upload. If an expert review is needed, we'll notify you promptly on WhatsApp." },
  { q: "Do I need any prior fashion knowledge?", a: "None at all. TheGent provides straightforward, human recommendations with exact barber names, clothing swatches, and visual AI outfit previews." },
  { q: "Will this work for Indian skin tones & body types?", a: "Yes. TheGent's styling model is calibrated specifically for Indian skin undertones, climate fabrics, grooming preferences, and cultural attire." },
  { q: "Can I download my report?", a: "Yes. Your report is available both as an interactive web page and as a beautifully formatted PDF report." },
  { q: "Are my photos kept private?", a: "100% private. Your photos are stored in encrypted private buckets, used strictly for your analysis, and never made public." },
  { q: "Is this a recurring subscription?", a: "No. TheGent style report is a one-time purchase of ₹1,999 (+ GST). You get lifetime access to your web report and PDF." },
  { q: "Can I try something free first?", a: "Yes. You can use our Free Face Analysis tool anytime to get instant facial structure insights before getting the full report." },
  { q: "What if the report cannot be generated?", a: "If our team cannot produce your report due to unreadable photos, we will promptly request new photos or offer a full refund per our policy." },
];

const occasionPreviews = [
  { tag: "Smart Casual", title: "Textured Linen & Tapered Chinos", desc: "Balanced proportions for informal meetings, cafe catchups, and weekend travel." },
  { tag: "Office & Leadership", title: "Structured Blazer & Tailored Cut", desc: "Professional authority with clean lines tailored to your shoulder build." },
  { tag: "Date Night", title: "Dark Navy Layering & Sleek Boots", desc: "High-contrast evening styling designed for low-light restaurant aesthetics." },
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
    <PageShell width="max-w-[1640px]">
      {/* -------------------------------------------------- */}
      {/* SECTION 1 — HERO                                   */}
      {/* -------------------------------------------------- */}
      <section ref={heroRef} className="relative pt-2 pb-8 lg:pt-4 lg:pb-14 w-full">
        <div className="pointer-events-none absolute -left-20 top-1/4 size-96 rounded-full bg-gold/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/3 size-96 rounded-full bg-gold/10 blur-3xl" />

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-6 lg:col-span-5 xl:col-span-5">
            <div className="flex items-center gap-3">
              <span className="text-xs tracking-widest text-gold uppercase font-medium">
                Personal Style, Built Around You
              </span>
              <div className="h-px w-12 bg-gold/50 shrink-0" />
            </div>

            <h1 className="font-display text-5xl leading-[0.98] text-[#EEE8DC] sm:text-6xl lg:text-7xl xl:text-[76px] tracking-tight">
              Look better. <br />
              <span className="text-[#D1AE6E] font-serif italic">Without guessing.</span>
            </h1>

            <p className="max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
              Upload 8 photos. TheGent analyzes your face, build and skin tone, then shows you the hair, beard, colors, fits and outfits that actually suit you — including 16 AI outfit previews.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row pt-1 items-stretch sm:items-center">
              <GoldButton asChild size="lg" className="px-8 shadow-xl shadow-gold/10 text-base font-medium rounded-full">
                <Link to="/app/checkout" search={{ product: "style_report" }} className="flex items-center gap-2.5">
                  <span>Get My Style Report — ₹1,999</span>
                  <ArrowRight className="size-4" />
                </Link>
              </GoldButton>
              <GhostButton asChild size="lg" className="rounded-full border border-border/80 px-7 text-base font-medium">
                <Link to="/free-check">Try Free Face Analysis</Link>
              </GhostButton>
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground/90 pt-3">
              <span className="flex items-center gap-2">
                <Camera className="size-4 text-gold shrink-0" />
                <span>8 guided photos</span>
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-gold shrink-0" />
                <span>~30 min report</span>
              </span>
              <span className="flex items-center gap-2">
                <Lock className="size-4 text-gold shrink-0" />
                <span>Private & secure</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border/40">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/5 text-gold shrink-0">
                  <User className="size-4" />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">Face, body & color analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/5 text-gold shrink-0">
                  <Shirt className="size-4" />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">16 personalized outfit previews</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/5 text-gold shrink-0">
                  <MapPin className="size-4" />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">Built for Indian men</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 xl:col-span-7">
            <HeroStyleShowcase />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 2 — PAIN / PROBLEM                         */}
      {/* -------------------------------------------------- */}
      <section className="mt-16 lg:mt-24 relative py-14 rounded-3xl border border-border/60 bg-card/30 px-6 sm:px-12 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="eyebrow">The Reason You Still Guess</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            You’re probably not dressing badly.<br />
            <span className="text-[#D1AE6E] font-serif italic">You’re just choosing without enough information.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed pt-1">
            More clothes do not automatically mean better style. Most men buy garments because they look great on runway models or influencers — without realizing their facial structure, undertone, and shoulder build require completely different choices.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-background/60 p-6 space-y-3">
            <span className="text-xs font-mono tracking-widest text-gold uppercase">01 / Complexion</span>
            <h3 className="font-display text-xl text-foreground">Dull Skin From Wrong Colors</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wearing shades outside your natural skin undertone washes out your complexion and makes you look tired even in expensive garments.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/60 p-6 space-y-3">
            <span className="text-xs font-mono tracking-widest text-gold uppercase">02 / Proportions</span>
            <h3 className="font-display text-xl text-foreground">Unmatched Proportions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wearing shirt collars or blazer shoulder seam cuts that conflict with your neck length and body frame throws off your natural height.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/60 p-6 space-y-3">
            <span className="text-xs font-mono tracking-widest text-gold uppercase">03 / Facial Balance</span>
            <h3 className="font-display text-xl text-foreground">Haircut & Beard Misalignment</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Getting trending haircut names at the barber without considering your jawline shape or forehead ratio accentuates asymmetry.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <GoldButton asChild size="lg" className="px-8 rounded-full">
            <Link to="/app/checkout" search={{ product: "style_report" }}>Find What Actually Suits Me — ₹1,999</Link>
          </GoldButton>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 3 — TRANSFORMATION PROOF (BEFORE/AFTER)     */}
      {/* -------------------------------------------------- */}
      <section className="mt-20 lg:mt-28 relative py-12 rounded-3xl border border-border/60 bg-card/30 px-6 sm:px-12 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-10">
          <p className="eyebrow">See The Difference</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Same man. <span className="text-[#D1AE6E] font-serif italic">Better choices.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Drag to compare the original look with a personalized styled version.
          </p>
        </div>

        <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-gold/30 bg-card/70 p-3 shadow-2xl backdrop-blur-md">
          <BeforeAfterSlider
            before={ba?.before_url || beforeImg}
            after={ba?.after_url || afterImg}
            beforeLabel={ba?.before_label || "Before"}
            afterLabel={ba?.after_label || "AI render of the same man"}
          />
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 4 — WHY GENERIC STYLE ADVICE FAILS          */}
      {/* -------------------------------------------------- */}
      <section className="mt-20 lg:mt-28 relative py-14 px-6 sm:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <p className="eyebrow">Personalization Matters</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Style advice isn’t personal<br />
            <span className="text-[#D1AE6E] font-serif italic">until it knows you.</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Generic styling guides give the exact same tips to millions of men. Here is how personal style changes when measured against your actual face geometry, build, and skin tone.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
          {/* Generic Advice */}
          <div className="rounded-2xl border border-border/60 bg-card/20 p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <X className="size-4" />
              </div>
              <h3 className="font-display text-2xl text-foreground">Generic Style Advice</h3>
            </div>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Trend-focused tips built for fashion models</li>
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Ignores your specific skin undertone & contrast</li>
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Recommends generic haircuts without jawline context</li>
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Standard sizing rules ignoring shoulder/pant break ratios</li>
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Zero visual previews before you spend money on clothes</li>
            </ul>
          </div>

          {/* TheGent Analysis */}
          <div className="rounded-2xl border border-gold/30 bg-card/70 p-8 space-y-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-gold/10 text-gold">
                <Check className="size-4" />
              </div>
              <h3 className="font-display text-2xl text-foreground">TheGent Analysis</h3>
            </div>
            <ul className="space-y-4 text-sm text-foreground/90 font-medium">
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> Measured against your 8 uploaded photo landmarks</li>
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> Precise warm/cool skin undertone & power color swatches</li>
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> Exact barber cut names & beard lines for your jawline</li>
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> Fit rules tailored to rectangle, trapezoid or athletic frames</li>
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> 16 photorealistic AI previews of you wearing recommended outfits</li>
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 5 — WHAT THEGENT ANALYZES                   */}
      {/* -------------------------------------------------- */}
      <section id="what-you-get" className="mt-20 lg:mt-28 relative py-12 rounded-3xl border border-border/60 bg-card/20 px-6 sm:px-12 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <p className="eyebrow">Decoding Your Features</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Your appearance,<br />
            <span className="text-[#D1AE6E] font-serif italic">decoded.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            We break down your image into 12 actionable analysis areas, giving you complete clarity on grooming, colors, fits, and outfits.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {analysisFeatures.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div key={idx} className="group relative rounded-2xl border border-border/70 bg-background/50 p-6 transition-all duration-300 hover:border-gold/40 hover:bg-background/80">
                <div className="flex size-11 items-center justify-center rounded-xl border border-gold/20 bg-gold/5 text-gold mb-4 group-hover:bg-gold/10 transition-colors">
                  <IconComp className="size-5" />
                </div>
                <p className="text-[10px] font-mono tracking-widest text-gold uppercase">{item.subtitle}</p>
                <h3 className="font-display text-xl text-foreground mt-1 mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 6 — AI OUTFIT PREVIEWS                     */}
      {/* -------------------------------------------------- */}
      <section id="ai-try-on" className="mt-20 lg:mt-28 relative py-14 px-6 sm:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <p className="eyebrow">Photorealistic Visualization</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            See yourself in better choices<br />
            <span className="text-[#D1AE6E] font-serif italic">before you buy.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Your report includes AI-generated outfit previews so you can visualize how recommended looks could work on you.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {occasionPreviews.map((card, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-card/60 p-6 transition-all duration-300 hover:border-gold/50 backdrop-blur-md">
              <span className="inline-block rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-medium text-gold mb-4">
                {card.tag}
              </span>
              <h3 className="font-display text-xl text-foreground mb-2">{card.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-gold">
                <Sparkle className="size-3.5 fill-gold" />
                <span>Rendered for your build</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <GoldButton asChild size="lg" className="px-8 rounded-full">
            <Link to="/app/checkout" search={{ product: "style_report" }}>Show Me My Looks — ₹1,999</Link>
          </GoldButton>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 7 — HOW IT WORKS                           */}
      {/* -------------------------------------------------- */}
      <section id="how-it-works" className="mt-20 lg:mt-28 relative py-14 rounded-3xl border border-border/60 bg-card/20 px-6 sm:px-12 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <p className="eyebrow">The Process</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            8 photos.<br />
            <span className="text-[#D1AE6E] font-serif italic">One personal style blueprint.</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            No fashion knowledge required. Upload your guided photos in 2 minutes and receive your comprehensive report.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {howSteps.map((step, idx) => (
            <div key={idx} className="relative space-y-3 rounded-2xl border border-border/70 bg-background/50 p-6">
              <span className="font-display text-4xl text-gold/40">{step.number}</span>
              <h3 className="font-display text-xl text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 8 — WHAT YOU GET (DELIVERABLE STACK)      */}
      {/* -------------------------------------------------- */}
      <section className="mt-20 lg:mt-28 relative py-14 px-6 sm:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <p className="eyebrow">The Deliverable</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Everything you need to<br />
            <span className="text-[#D1AE6E] font-serif italic">stop guessing.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Your personal report includes complete chapter breakdowns, exact swatches, barber reference guides, and AI outfit previews.
          </p>
        </div>

        <div className="max-w-4xl mx-auto rounded-3xl border border-gold/30 bg-card/60 p-8 sm:p-12 shadow-2xl backdrop-blur-md grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-4">
            <h3 className="font-display text-2xl text-foreground">Your 9-Chapter Style Report</h3>
            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-gold shrink-0" /> Face Shape & Geometry Breakdown</li>
              <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-gold shrink-0" /> Barber Reference Haircut & Beard Guide</li>
              <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-gold shrink-0" /> Personal Seasonal Color Palette Swatches</li>
              <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-gold shrink-0" /> Dulling Colors to Avoid Checklist</li>
              <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-gold shrink-0" /> Body Build Frame & Fit Rules</li>
              <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-gold shrink-0" /> 16 Photorealistic AI Outfit Previews</li>
              <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-gold shrink-0" /> Accessories, Watch Dial & Leather Guide</li>
              <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-gold shrink-0" /> Downloadable & Shareable PDF Report</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gold/20 bg-background/80 p-6 space-y-4 text-center">
            <FileText className="size-12 text-gold mx-auto" />
            <h4 className="font-display text-xl text-foreground">Interactive Web + PDF Report</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Access your report anytime on your phone or computer, or download the printable PDF version for your barber and tailor.
            </p>
            <GoldButton asChild size="md" className="w-full rounded-full mt-2">
              <Link to="/app/checkout" search={{ product: "style_report" }}>Get My Report — ₹1,999</Link>
            </GoldButton>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 9 — COMPARISON (BUYING MORE VS BETTER)     */}
      {/* -------------------------------------------------- */}
      <section className="mt-20 lg:mt-28 relative py-14 rounded-3xl border border-border/60 bg-card/20 px-6 sm:px-12 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <p className="eyebrow">The Rational Choice</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Buying more<br />
            <span className="text-[#D1AE6E] font-serif italic">vs choosing better.</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Compare the cost of trial-and-error shopping with a single personalized style report.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border/60 bg-card/30 p-8 space-y-6">
            <h3 className="font-display text-2xl text-foreground">Without TheGent</h3>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Buying clothes by trial and error</li>
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Wasting ₹10,000+ on garments that sit unworn</li>
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Getting barber cuts that don't balance your jawline</li>
              <li className="flex items-start gap-3"><X className="size-4 text-destructive shrink-0 mt-0.5" /> Wearing colors that make your skin look dull</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold/40 bg-card/80 p-8 space-y-6 shadow-xl backdrop-blur-md">
            <h3 className="font-display text-2xl text-foreground">With TheGent</h3>
            <ul className="space-y-4 text-sm text-foreground/90 font-medium">
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> Exact color swatches that brighten your skin</li>
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> Precise fit rules tailored to your shoulder frame</li>
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> Barber cut reference guide for your facial structure</li>
              <li className="flex items-start gap-3"><Check className="size-4 text-gold shrink-0 mt-0.5" /> 16 AI visual renders before you buy anything</li>
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 10 — BUILT FOR INDIAN MEN                  */}
      {/* -------------------------------------------------- */}
      <section className="mt-20 lg:mt-28 relative py-14 px-6 sm:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <p className="eyebrow">Cultural & Fabric Fit</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Built around how Indian men<br />
            <span className="text-[#D1AE6E] font-serif italic">actually dress.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Designed specifically for Indian skin undertones, climate fabrics, grooming preferences, and occasion attire.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          <div className="rounded-2xl border border-border/70 bg-card/40 p-6 space-y-2">
            <h3 className="font-display text-lg text-foreground">Skin Tone Diversity</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Calibrated for wheatish, dusky, deep brown, and fair undertones across India.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/40 p-6 space-y-2">
            <h3 className="font-display text-lg text-foreground">Tropical Climates</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Fabric guidance featuring linen, breathable cottons, and tropical wool blends.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/40 p-6 space-y-2">
            <h3 className="font-display text-lg text-foreground">Indian Grooming</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Beard density, cheek line height, and hairline geometry styling rules.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/40 p-6 space-y-2">
            <h3 className="font-display text-lg text-foreground">Festive & Wedding Wear</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Kurtas, Nehru jackets, sherwanis, and metallic accent pairing guidelines.</p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 11 — PRICING & REVIEWS                     */}
      {/* -------------------------------------------------- */}
      <section id="pricing" className="mt-20 lg:mt-28 relative py-14 px-6 sm:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <p className="eyebrow">Invest In Your Look</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            One report.<br />
            <span className="text-[#D1AE6E] font-serif italic">Years of better choices.</span>
          </h2>
        </div>

        <div className="max-w-lg mx-auto rounded-3xl border border-gold/40 bg-card/80 p-8 sm:p-10 shadow-2xl backdrop-blur-md text-center space-y-6">
          <span className="inline-block rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-xs font-medium text-gold uppercase tracking-wider">
            Complete Style Analysis
          </span>
          <div>
            <div className="font-display text-5xl text-foreground">₹1,999 <span className="text-xs text-muted-foreground font-sans font-normal">+ GST</span></div>
            <p className="text-xs text-muted-foreground mt-1">One-time payment. No subscription.</p>
          </div>
          <ul className="text-left space-y-3 text-sm text-foreground/90 border-t border-b border-border/60 py-6">
            <li className="flex items-center gap-2.5"><Check className="size-4 text-gold shrink-0" /> Full 9-chapter personalized style report</li>
            <li className="flex items-center gap-2.5"><Check className="size-4 text-gold shrink-0" /> 16 photorealistic AI outfit renders</li>
            <li className="flex items-center gap-2.5"><Check className="size-4 text-gold shrink-0" /> Barber reference haircut & beard card</li>
            <li className="flex items-center gap-2.5"><Check className="size-4 text-gold shrink-0" /> Seasonal color swatches & dulling colors guide</li>
            <li className="flex items-center gap-2.5"><Check className="size-4 text-gold shrink-0" /> Interactive web report + printable PDF</li>
          </ul>
          <GoldButton asChild size="lg" className="w-full rounded-full text-base font-medium">
            <Link to="/app/checkout" search={{ product: "style_report" }}>Get My Style Report — ₹1,999</Link>
          </GoldButton>
        </div>

        {/* Live Customer Reviews */}
        {reviews.data && reviews.data.length > 0 && (
          <div className="mt-16 max-w-5xl mx-auto">
            <h3 className="font-display text-2xl text-foreground text-center mb-8">What Indian Men Say</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.data.map((r, i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-card/40 p-6 space-y-3">
                  <div className="flex items-center gap-1 text-gold">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="size-3.5 fill-gold" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">"{r.comment}"</p>
                  <p className="text-xs font-medium text-foreground">{r.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 12 — PRIVACY & TRUST                       */}
      {/* -------------------------------------------------- */}
      <section className="mt-20 lg:mt-28 relative py-14 rounded-3xl border border-border/60 bg-card/20 px-6 sm:px-12 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <p className="eyebrow">Your Data Is Safe</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Your photos stay private.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We maintain strict data privacy controls for all uploaded photos and generated style reports.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border/70 bg-background/50 p-6 space-y-3 text-center">
            <Lock className="size-8 text-gold mx-auto" />
            <h3 className="font-display text-lg text-foreground">Encrypted Storage</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Photos are stored in private encrypted cloud buckets accessible only during analysis.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/50 p-6 space-y-3 text-center">
            <ShieldCheck className="size-8 text-gold mx-auto" />
            <h3 className="font-display text-lg text-foreground">Zero Public Sharing</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Your photos and reports are never published, shared, or added to public galleries.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/50 p-6 space-y-3 text-center">
            <CheckCircle2 className="size-8 text-gold mx-auto" />
            <h3 className="font-display text-lg text-foreground">Full Data Control</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">You can request photo deletion at any time after receiving your style report.</p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 13 — FAQ & OBJECTION HANDLING              */}
      {/* -------------------------------------------------- */}
      <section className="mt-20 lg:mt-28 relative py-14 px-6 sm:px-12 max-w-4xl mx-auto">
        <div className="text-center space-y-4 mb-12">
          <p className="eyebrow">Common Questions</p>
          <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight">
            Frequently asked questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="rounded-2xl border border-border/70 bg-card/40 px-6 py-2">
              <AccordionTrigger className="font-display text-lg text-foreground hover:text-gold text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* -------------------------------------------------- */}
      {/* SECTION 14 — FINAL CTA                             */}
      {/* -------------------------------------------------- */}
      <section className="mt-20 lg:mt-28 relative py-16 px-6 sm:px-12 rounded-3xl border border-gold/30 bg-card/60 text-center shadow-2xl backdrop-blur-md max-w-5xl mx-auto">
        <div className="space-y-6 max-w-2xl mx-auto">
          <p className="eyebrow">Take The First Step</p>
          <h2 className="font-display text-4xl sm:text-6xl text-foreground leading-tight">
            You don’t need a bigger wardrobe.<br />
            <span className="text-[#D1AE6E] font-serif italic">You need better decisions.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Start with 8 photos and discover what actually works for your face geometry, build, and skin tone.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row justify-center pt-4">
            <GoldButton asChild size="lg" className="px-8 rounded-full text-base font-medium">
              <Link to="/app/checkout" search={{ product: "style_report" }}>Get My Style Report — ₹1,999</Link>
            </GoldButton>
            <GhostButton asChild size="lg" className="rounded-full border border-border/80 px-7 text-base font-medium">
              <Link to="/free-check">Try Free Face Analysis</Link>
            </GhostButton>
          </div>
          <p className="text-xs text-muted-foreground/80 pt-2">
            8 guided photos &nbsp;•&nbsp; ~30 min report &nbsp;•&nbsp; Private & secure
          </p>
        </div>
      </section>
    </PageShell>
  );
}
