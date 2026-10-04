import { cn } from "@/lib/utils";

export const samplePages = [
  { title: "Face & hair", lines: ["Face shape: Oval", "Best cuts: textured quiff, side part", "Beard: short boxed"] },
  { title: "Colours", lines: ["Season: Deep Autumn", "Wear: olive, rust, navy", "Avoid: icy pastels"] },
  { title: "Outfits", lines: ["Look 1: Office smart", "Look 2: Weekend casual", "Look 3: Wedding guest"] },
  { title: "Accessories", lines: ["Watch: 38–40mm, leather strap", "Frames: rectangular acetate", "Fragrance: woody, citrus"] },
  { title: "90-day plan", lines: ["Week 1: haircut + beard shape", "Month 1: 5 core pieces", "Month 3: occasion wear"] },
];

export function SamplePageThumb({ page, index, blurred }: { page: (typeof samplePages)[number]; index: number; blurred?: boolean }) {
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card p-4">
      <p className="eyebrow">Page {index + 1}</p>
      <h3 className="mt-2 text-lg leading-tight text-foreground">{page.title}</h3>
      <div className={cn("mt-4 space-y-2.5", blurred && "blur-[3px]")}>
        {page.lines.map((l) => (
          <p key={l} className="text-xs leading-snug text-muted-foreground">{l}</p>
        ))}
        <div className="h-16 rounded-md border border-border bg-gold-soft" />
      </div>
    </div>
  );
}
