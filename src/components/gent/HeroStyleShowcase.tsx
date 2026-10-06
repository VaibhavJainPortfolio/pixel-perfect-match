import { Sparkle, Sparkles, Check, Shirt, Briefcase, Moon } from "lucide-react";
import afterImg from "@/assets/after.jpg";
import heroGentImg from "@/assets/hero-gent.jpg";

interface HeroStyleShowcaseProps {
  mainImage?: string;
}

export function HeroStyleShowcase({ mainImage }: HeroStyleShowcaseProps) {
  const activeImage = mainImage || afterImg || heroGentImg;

  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none">
      {/* Background Soft Lighting Glow */}
      <div className="pointer-events-none absolute -inset-4 bg-gradient-to-r from-gold/10 via-transparent to-gold/5 blur-3xl opacity-60 rounded-3xl" />

      {/* Main Editorial Layout Grid */}
      <div className="relative grid grid-cols-12 gap-4 items-center">
        {/* DOMINANT HERO PORTRAIT CARD (Spans 8 columns on desktop) */}
        <div className="col-span-12 lg:col-span-8 relative group">
          {/* Top Restrained Editorial Badge */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-gold/35 bg-card/90 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-2xl backdrop-blur-md">
            <Sparkle className="size-3.5 text-gold fill-gold" />
            <span>16 looks. Built around you.</span>
          </div>

          {/* Main Portrait Frame */}
          <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-card/80 shadow-2xl transition-all duration-500 hover:border-gold/50">
            <img
              src={activeImage}
              alt="AI Personal Style Transformation Render"
              className="w-full h-[440px] sm:h-[500px] lg:h-[540px] object-cover object-top filter brightness-[1.02] contrast-[1.03] transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-80" />

            {/* Bottom Caption Badge on Portrait */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between rounded-xl border border-gold/20 bg-background/80 p-3 backdrop-blur-md">
              <div>
                <p className="text-xs font-medium text-gold uppercase tracking-wider">AI Tailored Result</p>
                <p className="text-sm font-display text-foreground">Proportional Fit & Undertone Matched</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gold bg-gold/10 px-2.5 py-1 rounded-full border border-gold/30">
                <Check className="size-3" /> Styled Render
              </div>
            </div>
          </div>
        </div>

        {/* SUPPORTING OUTFIT CARDS COLUMN (Spans 4 columns on desktop) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3.5">
          {/* Bottom Restrained Tag */}
          <div className="hidden lg:flex items-center gap-2 rounded-xl border border-gold/25 bg-card/60 px-3.5 py-2 text-xs font-medium text-foreground/90 backdrop-blur-sm">
            <Sparkles className="size-4 text-gold shrink-0" />
            <span>Your face • Your build • Your colors</span>
          </div>

          {/* Supporting Look 1: Smart Casual */}
          <div className="group/card relative overflow-hidden rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all duration-300 hover:border-gold/40 hover:bg-card/90 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold shrink-0">
                <Shirt className="size-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gold tracking-widest uppercase">Look 01 • Casual</span>
                <h4 className="text-xs font-medium text-foreground">Textured Linen & Chinos</h4>
                <p className="text-[11px] text-muted-foreground">Relaxed weekend elegance</p>
              </div>
            </div>
          </div>

          {/* Supporting Look 2: Executive / Business */}
          <div className="group/card relative overflow-hidden rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all duration-300 hover:border-gold/40 hover:bg-card/90 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold shrink-0">
                <Briefcase className="size-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gold tracking-widest uppercase">Look 02 • Office</span>
                <h4 className="text-xs font-medium text-foreground">Structured Tailored Blazer</h4>
                <p className="text-[11px] text-muted-foreground">Leadership posture & shoulders</p>
              </div>
            </div>
          </div>

          {/* Supporting Look 3: Evening / Date Night */}
          <div className="group/card relative overflow-hidden rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all duration-300 hover:border-gold/40 hover:bg-card/90 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold shrink-0">
                <Moon className="size-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gold tracking-widest uppercase">Look 03 • Evening</span>
                <h4 className="text-xs font-medium text-foreground">Dark Navy Layered Styling</h4>
                <p className="text-[11px] text-muted-foreground">High-contrast dinner aesthetic</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
