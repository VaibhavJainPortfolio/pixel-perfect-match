import heroRefImg from "@/assets/hero-reference.jpg";

export function HeroStyleShowcase() {
  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none">
      {/* Background Soft Lighting Glow */}
      <div className="pointer-events-none absolute -inset-4 bg-gradient-to-r from-gold/15 via-transparent to-gold/10 blur-3xl opacity-70 rounded-3xl" />

      {/* Hero Visual Container */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-card/80 shadow-2xl backdrop-blur-md">
        {/* Render Reference Artwork composition with precision framing */}
        <div className="relative w-full h-[480px] sm:h-[580px] lg:h-[640px] xl:h-[680px]">
          <img
            src={heroRefImg}
            alt="TheGent AI Personal Style Transformation Showcase"
            className="w-full h-full object-cover object-right filter brightness-[1.02] contrast-[1.02]"
          />
          {/* Subtle gradient vignette to blend edges cleanly */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-background/40 lg:via-transparent lg:to-transparent" />
        </div>
      </div>
    </div>
  );
}
