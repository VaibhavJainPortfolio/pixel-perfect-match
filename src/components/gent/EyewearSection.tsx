import { Card, SectionHeading } from "./primitives";
import { GhostButton } from "./buttons";

type Frame = { rank: number; shape?: string; style?: string; rim?: string; colour_hex?: string; frame_colour_hex?: string; colour_name?: string; frame_colour_name?: string; why_it_works: string; product_id?: string; [k: string]: any };

/** Simple line drawing of a frame shape, in the recommended colour (dynamic per-report data, so inline colour). */
export function FrameSvg({ shape, colour, rim, sun }: { shape: string; colour: string; rim?: string; sun?: boolean }) {
  const t = shape.toLowerCase();
  const lens = (x: number) => {
    if (/round|oval|panto|circle/.test(t)) return <ellipse cx={x} cy={30} rx={22} ry={t.includes("oval") ? 16 : 20} />;
    if (/aviator|navigator|pilot/.test(t)) return <path d={`M${x - 24} 16 H${x + 24} Q${x + 24} 50 ${x} 50 Q${x - 24} 50 ${x - 24} 16 Z`} />;
    if (/cat|browline|clubmaster/.test(t)) return <path d={`M${x - 24} 14 H${x + 24} L${x + 20} 44 Q${x} 50 ${x - 20} 44 Z`} />;
    if (/hex|geometric|octa/.test(t)) return <polygon points={`${x - 12},10 ${x + 12},10 ${x + 24},30 ${x + 12},50 ${x - 12},50 ${x - 24},30`} />;
    const ry = /wayfarer/.test(t) ? 6 : 3;
    return <rect x={x - 24} y={/rect/.test(t) ? 16 : 12} width={48} height={/rect/.test(t) ? 30 : 38} rx={ry} />;
  };
  const sw = rim === "rimless" ? 1.2 : /half/.test(rim ?? "") ? 2 : 3.5;
  return (
    <svg viewBox="0 0 160 60" className="h-14 w-full" aria-hidden>
      <g fill={sun ? colour : "none"} fillOpacity={sun ? 0.35 : 0} stroke={colour} strokeWidth={sw} strokeDasharray={rim === "rimless" ? "3 3" : undefined}>
        {lens(46)}{lens(114)}
      </g>
      <path d="M68 26 Q80 18 92 26" fill="none" stroke={colour} strokeWidth={2.5} />
      <path d="M22 22 L4 18 M138 22 L156 18" stroke={colour} strokeWidth={2.5} />
    </svg>
  );
}

function ItemCard({ f, sun, shop }: { f: Frame; sun?: boolean; shop?: { name: string; url: string | null } }) {
  const name = sun ? f.style : f.shape;
  const colour = (sun ? f.frame_colour_hex : f.colour_hex) || "#9BA1B5";
  const query = encodeURIComponent(`${name} ${sun ? "sunglasses" : "eyeglasses"} ${sun ? f.frame_colour_name : f.colour_name}`);
  const url = shop?.url || `https://www.lenskart.com/search?q=${query}`;
  return (
    <Card className="space-y-2">
      <FrameSvg shape={name ?? ""} colour={colour} rim={f.rim} sun={sun} />
      <p className="text-xs text-gold">#{f.rank}</p>
      <h4 className="text-base">{name}</h4>
      <p className="text-xs text-muted-foreground">
        {sun ? `${f.frame_colour_name} · ${f.lens} · ${[f.use_case].flat().join(", ")}` : `${f.rim} rim · ${f.material} · ${f.colour_name} · ${[f.best_for].flat().join(", ")}`}
      </p>
      <p className="text-sm">{f.why_it_works}</p>
      <a href={url} target="_blank" rel="noopener noreferrer"><GhostButton size="sm" block>{shop ? `Shop ${shop.name}` : "Shop"}</GhostButton></a>
    </Card>
  );
}

export function EyewearSection({ eyewear, renders, shop }: { eyewear: any; renders: Record<string, string>; shop: Record<string, { name: string; url: string | null }> }) {
  if (!eyewear) return null;
  const g = eyewear.size_guide ?? {};
  const imgs = [["eyewear_frames", "Your best frames"], ["eyewear_sunglasses", "Your best sunglasses"]].filter(([k]) => renders[k!]);
  return (
    <section className="space-y-5">
      <SectionHeading eyebrow="Eyewear" title="Frames & sunglasses" />
      {eyewear.face_shape_rule && <p className="text-sm text-muted-foreground">{eyewear.face_shape_rule}</p>}
      {imgs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {imgs.map(([k, l]) => (
            <figure key={k} className="overflow-hidden rounded-xl border border-border">
              <img src={renders[k!]} alt={l} className="aspect-square w-full object-cover" loading="lazy" />
              <figcaption className="p-2 text-xs text-muted-foreground">{l}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <Card className="space-y-3">
        <h3 className="text-lg">Your size</h3>
        <p className="font-serif text-2xl text-gold">{g.label}</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div><p className="text-base">{g.lens_width_mm}</p><p className="text-muted-foreground">Lens width (mm)</p></div>
          <div><p className="text-base">{g.bridge_mm}</p><p className="text-muted-foreground">Bridge (mm)</p></div>
          <div><p className="text-base">{g.temple_length_mm}</p><p className="text-muted-foreground">Arm length (mm)</p></div>
        </div>
        <p className="text-sm text-muted-foreground">Look for {g.label} printed on the inside arm. {g.how_to_read_it}</p>
        {eyewear.measurement_note && <p className="text-xs text-muted-foreground">{eyewear.measurement_note} Measurements from photos are approximate.</p>}
      </Card>
      <h3 className="text-lg">Prescription frames</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(eyewear.prescription_frames ?? []).map((f: Frame) => <ItemCard key={f.rank} f={f} shop={f.product_id ? shop[f.product_id] : undefined} />)}
      </div>
      {(eyewear.sunglasses ?? []).length > 0 && <>
        <h3 className="text-lg">Sunglasses</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {eyewear.sunglasses.map((f: Frame) => <ItemCard key={f.rank} f={f} sun shop={f.product_id ? shop[f.product_id] : undefined} />)}
        </div>
      </>}
      {(eyewear.avoid ?? []).length > 0 && (
        <Card><h3 className="mb-2 text-lg">Avoid</h3><ul className="space-y-2 text-sm">
          {eyewear.avoid.map((a: any, i: number) => <li key={i}><span className="text-destructive">✕</span> <b>{a.style}</b> — <span className="text-muted-foreground">{a.why}</span></li>)}
        </ul></Card>
      )}
      {(eyewear.fit_check ?? []).length > 0 && (
        <Card><h3 className="mb-2 text-lg">In-store fit check</h3><ul className="space-y-2 text-sm">
          {eyewear.fit_check.map((c: string, i: number) => <li key={i}><span className="text-gold">✓</span> {c}</li>)}
        </ul></Card>
      )}
    </section>
  );
}
