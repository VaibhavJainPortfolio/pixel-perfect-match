// The 16-section style report. Shared by the in-app page and the print/PDF layout (print = everything expanded,
// no interactive controls, page break before each section). Per-report colours are data, so they're inline styles.
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "../primitives";
import { GhostButton } from "../buttons";
import { EyewearSection } from "../EyewearSection";
import type { ReportBundle } from "@/lib/report.server";

export const AI_LABEL = "AI render of you – likeness approximate";
const DISCLOSURE = "Some shop links are affiliate links: we may earn a small commission at no extra cost to you. Prices are approximate.";

type Props = {
  bundle: ReportBundle; print?: boolean;
  checked?: Record<string, boolean>; onToggle?: (key: string, v: boolean) => void;
};

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : Object.values(x ?? {}).filter(Boolean).join(" — "))) : v ? [String(v)] : [];
const title = (s?: string) => (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Section({ n, eyebrow, heading, children, print }: { n: number; eyebrow: string; heading: string; children: ReactNode; print?: boolean }) {
  return (
    <section className={cn("report-section", print && "break-before-page")} id={`s${n}`}>
      <Card className="space-y-5 p-5 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">{String(n).padStart(2, "0")} · {eyebrow}</p>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl">{heading}</h2>
        </div>
        {children}
      </Card>
    </section>
  );
}

function AiImage({ src, alt, className }: { src?: string | undefined; alt: string; className?: string }) {
  if (!src) return null;
  return (
    <figure className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <img src={src} alt={alt} className="w-full object-cover" loading="lazy" />
      <figcaption className="p-2 text-[11px] text-muted-foreground">{AI_LABEL}</figcaption>
    </figure>
  );
}

function Swatch({ hex, size = "h-8 w-8" }: { hex?: string; size?: string }) {
  return <span className={cn("inline-block shrink-0 rounded-md border border-border", size)} style={{ background: hex || "transparent" }} />;
}

function Ticks({ items, good }: { items: string[]; good: boolean }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className={good ? "text-success" : "text-destructive"} aria-hidden>{good ? "✓" : "✕"}</span><span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

type Pt = [number, number];
function FaceOverlay({ src, p }: { src?: string | undefined; p: any }) {
  if (!src) return null;
  const o = p?.landmarks?.overlay;
  const w = Number(p?.width) || 1000, h = Number(p?.height) || 1333;
  const X = (pt: Pt) => pt[0] * w, Y = (pt: Pt) => pt[1] * h;
  const line = (a: Pt, b: Pt, label: string, key: string) => (
    <g key={key}>
      <line x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} className="stroke-gold" strokeWidth={w / 250} />
      <text x={X(b) + w / 80} y={Y(b)} className="fill-gold" fontSize={w / 32}>{label}</text>
    </g>
  );
  const ratio = p?.landmarks?.ratios?.length_to_cheek;
  return (
    <figure className="relative overflow-hidden rounded-xl border border-border">
      <img src={src} alt="Your front photo" className="w-full" />
      {o && (
        <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" aria-hidden>
          <ellipse cx={(X(o.top) + X(o.chin)) / 2} cy={(Y(o.top) + Y(o.chin)) / 2} rx={Math.abs(X(o.cheek[1]) - X(o.cheek[0])) / 2}
            ry={Math.abs(Y(o.chin) - Y(o.top)) / 2} fill="none" className="stroke-gold" strokeWidth={w / 300} strokeDasharray={`${w / 60} ${w / 90}`} />
          {line(o.forehead[0], o.forehead[1], "Forehead", "f")}
          {line(o.cheek[0], o.cheek[1], "Cheekbones", "c")}
          {line(o.jaw[0], o.jaw[1], "Jaw", "j")}
          {ratio && <text x={w / 30} y={h - h / 30} className="fill-gold" fontSize={w / 22}>Length : width = {Number(ratio).toFixed(2)}</text>}
        </svg>
      )}
    </figure>
  );
}

function BodyOverlay({ src, p }: { src?: string | undefined; p: any }) {
  if (!src) return null;
  const o = p?.landmarks?.overlay;
  const w = Number(p?.width) || 1000, h = Number(p?.height) || 1333;
  const seg = (a: Pt | null, b: Pt | null, label: string) => a && b && (
    <g key={label}>
      <line x1={0.05 * w} x2={0.95 * w} y1={((a[1] + b[1]) / 2) * h} y2={((a[1] + b[1]) / 2) * h} className="stroke-gold" strokeWidth={w / 300} strokeDasharray={`${w / 50} ${w / 80}`} />
      <line x1={a[0] * w} y1={a[1] * h} x2={b[0] * w} y2={b[1] * h} className="stroke-gold" strokeWidth={w / 160} />
      <text x={0.05 * w} y={((a[1] + b[1]) / 2) * h - w / 60} className="fill-gold" fontSize={w / 28}>{label}</text>
    </g>
  );
  return (
    <figure className="relative overflow-hidden rounded-xl border border-border">
      <img src={src} alt="Your full-length photo" className="w-full" />
      {o && <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" aria-hidden>{seg(o.shoulders?.[0], o.shoulders?.[1], "Shoulders")}{seg(o.hips?.[0], o.hips?.[1], "Hips")}</svg>}
    </figure>
  );
}

function shopUrl(it: any, shop: ReportBundle["shop"]) {
  const p = it.product_id ? shop[it.product_id] : undefined;
  return { url: p?.url || `https://www.myntra.com/${encodeURIComponent(String(it.description ?? it.category ?? "").slice(0, 60).replace(/\s+/g, "-"))}`, name: p?.name };
}

function OutfitCard({ o, print }: { o: any; print?: boolean }) {
  const [open, setOpen] = useState(false);
  const show = print || open;
  return (
    <Card className="space-y-3 p-3">
      <button type="button" className="w-full space-y-3 text-left" onClick={() => setOpen(!open)} aria-expanded={show} disabled={print}>
        <div className="flex h-20 overflow-hidden rounded-lg border border-border">
          {(o.items ?? []).map((it: any, i: number) => <div key={i} className="flex-1" style={{ background: it.colour_hex }} />)}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gold">{o.occasion}</p>
          <p className="text-sm font-medium">{o.name}</p>
        </div>
      </button>
      {show && (
        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground">{o.why_it_works}</p>
          <ul className="space-y-1">{(o.items ?? []).map((it: any, i: number) => <li key={i} className="flex items-center gap-2"><Swatch hex={it.colour_hex} size="h-3 w-3" />{it.description}</li>)}</ul>
          <p><span className="text-muted-foreground">Shoes:</span> {list(o.shoes).join(", ")}</p>
          <p><span className="text-muted-foreground">Accessories:</span> {list(o.accessories).join(", ")}</p>
        </div>
      )}
    </Card>
  );
}

export function currentWeek(publishedAt: string | null) {
  if (!publishedAt) return 1;
  return Math.min(12, Math.max(1, Math.floor((Date.now() - new Date(publishedAt).getTime()) / (7 * 86400_000)) + 1));
}

export function ReportView({ bundle, print, checked = {}, onToggle }: Props) {
  const { data: d, renderUrls, photoUrls, shop } = bundle;
  const st = d.stylist ?? {};
  const fh = d.face_hair ?? {}, body = d.body ?? {}, skin = d.skin ?? {};
  const outfits: any[] = st.outfits ?? d.outfits ?? [];
  const lookKey = (o: any, i: number) => `look_${String(o.id ?? i + 1).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const heroKey = d.hero_render ?? (d.renders ?? [])[0];
  const hero = heroKey ? renderUrls[heroKey] : undefined;
  const acc = st.accessories ?? {};
  const week = currentWeek(bundle.publishedAt);
  const date = new Date(bundle.publishedAt ?? d.generated_at ?? Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const signature = outfits.map((o, i) => ({ o, key: lookKey(o, i) })).filter((x) => renderUrls[x.key]);
  const ba = d.before_after ?? {};

  const results = [
    ["Face shape", title(fh.face_shape)], ["Body type", title(body.body_type)],
    ["Skin tone", [title(skin.skin_depth), skin.undertone && `${skin.undertone} undertone`].filter(Boolean).join(", ")],
    ["Hair", fh.recommended_haircut?.name], ["Beard", fh.recommended_beard?.style],
    ["Size", [body.size_estimates?.shirt && `Shirt ${body.size_estimates.shirt}`, body.size_estimates?.trouser_waist_in && `Waist ${body.size_estimates.trouser_waist_in}"`].filter(Boolean).join(" · ")],
  ];

  return (
    <div className="space-y-6">
      {/* 1 Cover */}
      <section className="report-section">
        <Card className="space-y-5 p-5 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">TheGent's Style Report</p>
          <h1 className="font-serif text-4xl">{d.name ?? "Your"}'s style report</h1>
          <p className="text-sm text-muted-foreground">{date} · Ref {bundle.reference}</p>
          {hero && <AiImage src={hero} alt="You in your hero look" className="mx-auto max-w-sm" />}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</p>
                <p className="mt-1 text-sm text-gold">{v || "—"}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 2 Before & after */}
      <Section n={2} eyebrow="Before & after" heading="The same man, better dressed" print={print}>
        <div className="grid grid-cols-2 gap-3">
          {photoUrls["body_front"] && (
            <figure className="overflow-hidden rounded-xl border border-border">
              <img src={photoUrls["body_front"]} alt="Before: your photo" className="w-full object-cover" />
              <figcaption className="p-2 text-[11px] text-muted-foreground">Before — your photo</figcaption>
            </figure>
          )}
          {hero && (
            <figure className="overflow-hidden rounded-xl border border-border">
              <img src={hero} alt="After: outfit 1" className="w-full object-cover" />
              <figcaption className="p-2 text-[11px] text-muted-foreground">After — {AI_LABEL}</figcaption>
            </figure>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><h3 className="mb-2 text-base">What changes</h3><Ticks items={list(ba.crosses).slice(0, 3)} good={false} /></div>
          <div><h3 className="mb-2 text-base">What works now</h3><Ticks items={list(ba.ticks).slice(0, 3)} good /></div>
        </div>
      </Section>

      {/* 3 Face shape */}
      <Section n={3} eyebrow="Face shape" heading={`${title(fh.face_shape)} face`} print={print}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FaceOverlay src={photoUrls["face_front"]} p={d.photos?.face_front} />
          <div className="space-y-4">
            {fh.measurements_summary && <p className="text-sm text-muted-foreground">{fh.measurements_summary}</p>}
            <div><h3 className="mb-2 text-base">Works for you</h3><Ticks items={list(fh.works_for_you)} good /></div>
            <div><h3 className="mb-2 text-base">Avoid</h3><Ticks items={list(fh.avoid)} good={false} /></div>
          </div>
        </div>
      </Section>

      {/* 4 Hairstyle */}
      <Section n={4} eyebrow="Hairstyle" heading={fh.recommended_haircut?.name ?? "Your haircut"} print={print}>
        <div className="grid gap-4 sm:grid-cols-2">
          {photoUrls["face_45"] || photoUrls["face_front"] ? (
            <figure className="overflow-hidden rounded-xl border border-border">
              <img src={photoUrls["face_45"] ?? photoUrls["face_front"]} alt="Your current hair" className="w-full" />
              <figcaption className="p-2 text-[11px] text-muted-foreground">Now: {fh.hair?.current_style_assessment}</figcaption>
            </figure>
          ) : null}
          <div className="space-y-4">
            <p className="text-sm">{fh.recommended_haircut?.why}</p>
            <BarberCard lines={list(fh.recommended_haircut?.barber_script)} print={print} />
            <div><h3 className="mb-2 text-base">Products</h3><Ticks items={list(fh.recommended_haircut?.products)} good /></div>
            {list(fh.recommended_haircut?.avoid).length > 0 && <div><h3 className="mb-2 text-base">Avoid</h3><Ticks items={list(fh.recommended_haircut?.avoid)} good={false} /></div>}
          </div>
        </div>
      </Section>

      {/* 5 Beard */}
      <Section n={5} eyebrow="Beard" heading={fh.recommended_beard?.style ?? "Your beard"} print={print}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4"><p className="text-[11px] uppercase text-muted-foreground">Now</p><p className="text-sm">{[fh.beard?.current_state, fh.beard?.density, fh.beard?.growth_pattern].filter(Boolean).join(" · ")}</p></div>
          <div className="rounded-xl border border-gold p-4"><p className="text-[11px] uppercase text-gold">Recommended</p><p className="text-sm">{fh.recommended_beard?.why}</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {(["cheeks", "chin", "moustache"] as const).map((k) => (
            <div key={k} className="rounded-xl border border-border p-3"><p className="font-serif text-xl text-gold">{fh.recommended_beard?.lengths_cm?.[k] ?? "—"}<span className="text-xs"> cm</span></p><p className="text-[11px] text-muted-foreground">{title(k)}</p></div>
          ))}
        </div>
        <ul className="space-y-1 text-sm">
          <li><span className="text-muted-foreground">Cheek line:</span> {fh.recommended_beard?.cheek_line}</li>
          <li><span className="text-muted-foreground">Neckline:</span> {fh.recommended_beard?.neckline}</li>
          <li><span className="text-muted-foreground">Grey options:</span> {list(fh.recommended_beard?.grey_options).join("; ")}</li>
        </ul>
      </Section>

      {/* 6 Skin tone */}
      <Section n={6} eyebrow="Skin tone" heading={`${title(skin.skin_depth)}, ${skin.undertone ?? ""} undertone · ${skin.season ?? ""}`} print={print}>
        <div><h3 className="mb-2 text-base">Measured from your photos</h3>
          <div className="flex flex-wrap gap-3">{(skin.measured_swatches ?? []).map((s: any, i: number) => <div key={i} className="text-center text-[11px]"><Swatch hex={s.hex} size="h-12 w-12" /><p className="mt-1 text-muted-foreground">{s.label}</p></div>)}</div>
        </div>
        <div><h3 className="mb-2 text-base">Your power colours</h3>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{(skin.power_colours ?? []).map((c: any, i: number) => <div key={i} className="text-center text-[11px]"><div className="h-14 rounded-lg border border-border" style={{ background: c.hex }} /><p className="mt-1">{c.name}</p></div>)}</div>
        </div>
        <div><h3 className="mb-2 text-base">Wear with care</h3>
          <div className="grid gap-2 sm:grid-cols-2">{(skin.avoid_colours ?? []).map((c: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-2 text-xs"><Swatch hex={c.hex} /><span>{c.name}</span><span className="text-muted-foreground">→ swap to</span><span className="text-gold">{c.swap_to}</span></div>
          ))}</div>
        </div>
        {list(skin.metals).length > 0 && <p className="text-sm"><span className="text-muted-foreground">Metals:</span> {list(skin.metals).join(", ")}</p>}
      </Section>

      {/* 7 Body type */}
      <Section n={7} eyebrow="Body type" heading={`${title(body.body_type)}, ${body.frame ?? ""} frame`} print={print}>
        <div className="grid gap-4 sm:grid-cols-2">
          <BodyOverlay src={photoUrls["body_front"]} p={d.photos?.body_front} />
          <div className="space-y-4">
            {body.proportions_note && <p className="text-sm text-muted-foreground">{body.proportions_note}</p>}
            <div><h3 className="mb-2 text-base">Your fit rules</h3>
              <ul className="space-y-2 text-sm">{(body.fit_rules ?? []).map((r: any, i: number) => <li key={i}><span className="text-gold">✓</span> <b>{r.rule ?? r}</b>{r.why && <span className="text-muted-foreground"> — {r.why}</span>}</li>)}</ul>
            </div>
            <div><h3 className="mb-2 text-base">Your current outfit, decoded</h3>
              <Ticks items={list(body.current_outfit_assessment?.works)} good />
              <div className="mt-2"><Ticks items={list(body.current_outfit_assessment?.change)} good={false} /></div>
            </div>
          </div>
        </div>
      </Section>

      {/* 8 Signature looks */}
      {signature.map(({ o, key }, i) => (
        <Section key={key} n={8} eyebrow={`Signature look ${i + 1} of ${signature.length}`} heading={o.name} print={print}>
          <div className="grid gap-4 sm:grid-cols-2">
            <AiImage src={renderUrls[key]} alt={`You in ${o.name}`} />
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-gold">{o.occasion}</p>
              <p className="text-sm">{o.why_it_works}</p>
              <ul className="space-y-3">
                {(o.items ?? []).map((it: any, j: number) => {
                  const s = shopUrl(it, shop);
                  return (
                    <li key={j} className="flex items-start gap-3 rounded-xl border border-border p-3">
                      <Swatch hex={it.colour_hex} />
                      <div className="min-w-0 flex-1 text-sm">
                        <p>{it.description}</p>
                        <p className="text-xs text-muted-foreground">{it.fit_note} · {it.price_band}</p>
                      </div>
                      <a href={s.url} target="_blank" rel="noopener noreferrer sponsored" className="shrink-0"><GhostButton size="sm">Shop</GhostButton></a>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[11px] text-muted-foreground">{DISCLOSURE}</p>
            </div>
          </div>
        </Section>
      ))}

      {/* 9 All outfits */}
      <Section n={9} eyebrow="Your wardrobe" heading={`All ${outfits.length} outfits`} print={print}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{outfits.map((o, i) => <OutfitCard key={i} o={o} print={print} />)}</div>
      </Section>

      {/* 10 Eyewear */}
      {d.eyewear && (
        <section className={cn("report-section", print && "break-before-page")}>
          <Card className="p-5 sm:p-8">
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-gold">10 · Eyewear</p>
            <EyewearSection eyewear={d.eyewear} renders={renderUrls} shop={shop} />
            <p className="mt-3 text-[11px] text-muted-foreground">Eyewear images: {AI_LABEL}. {DISCLOSURE}</p>
          </Card>
        </section>
      )}

      {/* 11 Watches & accessories */}
      <Section n={11} eyebrow="Watches & accessories" heading="Finishing pieces" print={print}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(acc.watches ?? d.watches ?? []).map((w: any, i: number) => (
            <div key={i} className="space-y-1 rounded-xl border border-border p-4 text-sm">
              <p className="text-[11px] uppercase text-gold">{w.use_case}</p>
              <p className="font-medium">{w.model_suggestion}</p>
              <p className="text-xs text-muted-foreground">{w.case_mm} mm · {w.dial} dial · {w.strap} · {w.price_band}</p>
              <p className="text-xs">Wear with: {list(w.wear_with).join(", ")}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {(["belts", "chain_jewellery", "sunglasses", "bags", "socks"] as const).map((k) => list(acc[k]).length > 0 && (
            <div key={k}><h3 className="mb-1 text-base">{title(k)}</h3><ul className="list-disc space-y-1 pl-5 text-muted-foreground">{list(acc[k]).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          ))}
        </div>
      </Section>

      {/* 12 Footwear */}
      <Section n={12} eyebrow="Footwear" heading="Shoes that do the work" print={print}>
        <div className="grid gap-3 sm:grid-cols-2">{(st.footwear ?? []).map((f: any, i: number) => (
          <div key={i} className="rounded-xl border border-border p-4 text-sm"><p className="font-medium">{f.type}</p><p className="text-xs text-muted-foreground">{f.colour} · {f.use}</p></div>
        ))}</div>
      </Section>

      {/* 13 Fragrance */}
      <Section n={13} eyebrow="Fragrance" heading="Your scent wardrobe" print={print}>
        <div className="grid gap-3 sm:grid-cols-2">{(st.fragrance ?? d.fragrance ?? []).map((f: any, i: number) => (
          <div key={i} className="space-y-1 rounded-xl border border-border p-4 text-sm">
            <p className="text-[11px] uppercase text-gold">{f.occasion}</p><p className="font-medium">{f.name}</p>
            <p className="text-xs text-muted-foreground">{list(f.notes).join(", ")} · {f.price_band}</p><p className="text-xs">{f.how_to_wear}</p>
          </div>
        ))}</div>
      </Section>

      {/* 14 Wardrobe essentials */}
      <Section n={14} eyebrow="Wardrobe essentials" heading="Your shopping checklist" print={print}>
        <ul className="space-y-2">{(st.wardrobe_essentials?.buy ?? []).map((b: any, i: number) => {
          const key = `buy:${b.item}`;
          return (
            <li key={i}>
              <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-[var(--gold)]" checked={!!checked[key]} disabled={print || !onToggle} onChange={(e) => onToggle?.(key, e.target.checked)} />
                <span className={cn("flex-1", checked[key] && "text-muted-foreground line-through")}>{b.item} × {b.qty}</span>
                <span className="text-[11px] uppercase text-gold">{String(b.priority)}</span>
              </label>
            </li>
          );
        })}</ul>
        {list(st.wardrobe_essentials?.retire).length > 0 && <div><h3 className="mb-2 text-base">Retire these</h3><Ticks items={list(st.wardrobe_essentials?.retire)} good={false} /></div>}
        {list(st.tailoring_tips).length > 0 && <div><h3 className="mb-2 text-base">Tailoring tips</h3><Ticks items={list(st.tailoring_tips)} good /></div>}
      </Section>

      {/* 15 90-day plan */}
      <Section n={15} eyebrow="90-day plan" heading="Twelve weeks, one step at a time" print={print}>
        <div className="grid gap-3 sm:grid-cols-2">{(st.plan_90_days ?? d.plan_90_days ?? []).map((p: any, i: number) => {
          const now = !print && Number(p.week) === week;
          return (
            <div key={i} className={cn("rounded-xl border p-4 text-sm", now ? "border-gold bg-gold-soft" : "border-border")}>
              <p className="text-[11px] uppercase text-gold">Week {p.week}{now ? " · this week" : ""}</p>
              <p className="font-medium">{p.focus}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{list(p.tasks).map((t, j) => <li key={j}>{t}</li>)}</ul>
            </div>
          );
        })}</div>
        {st.daily_routine && (
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><h3 className="mb-1 text-base">Morning</h3><Ticks items={list(st.daily_routine.morning)} good /></div>
            <div><h3 className="mb-1 text-base">Night</h3><Ticks items={list(st.daily_routine.night)} good /></div>
          </div>
        )}
      </Section>

      {/* 16 Three biggest wins */}
      <Section n={16} eyebrow="Start here" heading={st.summary?.headline ?? "Your three biggest wins"} print={print}>
        <ol className="space-y-3">{(st.summary?.three_biggest_wins ?? []).map((w: any, i: number) => (
          <li key={i} className="flex gap-3"><span className="font-serif text-3xl text-gold">{i + 1}</span><div><p className="font-medium">{w.title}</p><p className="text-sm text-muted-foreground">{w.detail}</p></div></li>
        ))}</ol>
      </Section>
    </div>
  );
}

function BarberCard({ lines, print }: { lines: string[]; print?: boolean | undefined }) {
  const [copied, setCopied] = useState(false);
  const text = lines.join("\n");
  return (
    <div className="space-y-2 rounded-xl border border-gold p-4">
      <p className="text-[11px] uppercase tracking-wider text-gold">Show this to your barber</p>
      <ul className="space-y-1 text-sm">{lines.map((l, i) => <li key={i}>• {l}</li>)}</ul>
      {!print && <GhostButton size="sm" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copied" : "Copy"}</GhostButton>}
    </div>
  );
}
