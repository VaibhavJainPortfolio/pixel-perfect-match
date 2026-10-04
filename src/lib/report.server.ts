// Server-only: turns a reports row into a render-ready bundle (signed image URLs + shop links).
type Admin = any;

export type ShopLink = { name: string; url: string | null; price?: string | null };
export type ReportBundle = {
  id: string; data: any; reference: string; publishedAt: string | null;
  renderUrls: Record<string, string>; photoUrls: Record<string, string>; shop: Record<string, ShopLink>;
};

export function reportReference(orderId: string) {
  return `TG-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function collectProductIds(d: any): string[] {
  const ids = new Set<string>();
  for (const o of d?.outfits ?? []) for (const it of o?.items ?? []) if (it?.product_id) ids.add(String(it.product_id));
  for (const f of [...(d?.eyewear?.prescription_frames ?? []), ...(d?.eyewear?.sunglasses ?? [])]) if (f?.product_id) ids.add(String(f.product_id));
  return [...ids].filter((x) => /^[0-9a-f-]{36}$/i.test(x));
}

export async function loadReportBundle(admin: Admin, rep: { id: string; order_id: string; data: any; published_at: string | null }, ttl = 3600): Promise<ReportBundle> {
  const d: any = rep.data ?? {};
  const renderUrls: Record<string, string> = {};
  const { data: renders } = await admin.from("renders").select("look_key, storage_path").eq("order_id", rep.order_id).eq("status", "done").eq("approved", true);
  await Promise.all((renders ?? []).map(async (r: any) => {
    if (!r.storage_path) return;
    const { data: s } = await admin.storage.from("renders").createSignedUrl(r.storage_path, ttl);
    if (s?.signedUrl) renderUrls[r.look_key] = s.signedUrl;
  }));
  const photoUrls: Record<string, string> = {};
  await Promise.all(Object.entries(d.photos ?? {}).map(async ([slot, p]: [string, any]) => {
    if (!p?.path) return;
    const { data: s } = await admin.storage.from("photos").createSignedUrl(p.path, ttl);
    if (s?.signedUrl) photoUrls[slot] = s.signedUrl;
  }));
  const ids = collectProductIds(d);
  const { data: products } = ids.length
    ? await admin.from("products_catalog").select("id, name, brand, url, affiliate_url, price_min, price_max").in("id", ids)
    : { data: [] as any[] };
  const shop = Object.fromEntries((products ?? []).map((p: any) => [p.id, {
    name: `${p.brand ?? ""} ${p.name}`.trim(), url: p.affiliate_url || p.url || null,
    price: p.price_min ? `₹${p.price_min}${p.price_max ? `–${p.price_max}` : ""}` : null,
  }]));
  return { id: rep.id, data: d, reference: d.reference ?? reportReference(rep.order_id), publishedAt: rep.published_at, renderUrls, photoUrls, shop };
}

export function randomToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
