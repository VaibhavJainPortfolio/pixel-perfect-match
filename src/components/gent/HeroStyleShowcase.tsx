import heroVisualImg from "@/assets/hero-visual.jpg";

export function HeroStyleShowcase() {
  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none">
      {/* Background Soft Lighting Glow */}
      <div className="pointer-events-none absolute -inset-4 bg-gradient-to-r from-gold/15 via-transparent to-gold/10 blur-3xl opacity-70 rounded-3xl" />

      {/* Hero Visual Showcase Frame */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-card/40 shadow-2xl backdrop-blur-md p-2">
        <img
          src={heroVisualImg}
          alt="TheGent AI Personal Style Transformation Showcase"
          className="w-full h-auto max-h-[680px] object-contain rounded-xl filter brightness-[1.02] contrast-[1.02]"
        />
      </div>
    </div>
  );
}
