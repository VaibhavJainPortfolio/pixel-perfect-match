import { useRef, useState, useCallback } from "react";

export function BeforeAfterSlider({
  before, after, beforeLabel, afterLabel,
}: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = useCallback((clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-lg border border-border bg-card sm:aspect-[4/5]"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) move(e.clientX); }}
    >
      <img src={after} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt={beforeLabel} className="h-full w-full object-cover" draggable={false} />
      </div>
      <span className="absolute left-3 top-3 rounded-full border border-border bg-background/90 px-3 py-1 text-xs font-semibold text-foreground">{beforeLabel}</span>
      <span className="absolute right-3 top-3 rounded-full border border-gold/40 bg-background/90 px-3 py-1 text-xs font-semibold text-gold">{afterLabel}</span>
      <div className="absolute inset-y-0 w-0.5 bg-gold" style={{ left: `${pos}%` }}>
        <button
          aria-label="Drag to compare"
          role="slider"
          aria-valuenow={Math.round(pos)} aria-valuemin={0} aria-valuemax={100}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
            if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
          }}
          className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gold bg-background text-gold"
        >
          ⇆
        </button>
      </div>
    </div>
  );
}
