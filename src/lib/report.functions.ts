import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: rep } = await admin.from("reports").select("id, order_id, user_id, data, published_at").eq("id", data.reportId).maybeSingle();
    if (!rep || rep.user_id !== context.userId) throw new Error("Report not found");
    const d: any = rep.data ?? {};
    const { data: renders } = await admin.from("renders").select("look_key, storage_path").eq("order_id", rep.order_id).eq("status", "done");
    const renderUrls: Record<string, string> = {};
    for (const r of renders ?? []) {
      if (!r.storage_path) continue;
      const { data: s } = await admin.storage.from("renders").createSignedUrl(r.storage_path, 3600);
      if (s?.signedUrl) renderUrls[r.look_key] = s.signedUrl;
    }
    const ids = [...(d.eyewear?.prescription_frames ?? []), ...(d.eyewear?.sunglasses ?? [])].map((x: any) => x.product_id).filter(Boolean);
    const { data: products } = ids.length
      ? await admin.from("products_catalog").select("id, name, brand, url, affiliate_url").in("id", ids)
      : { data: [] as any[] };
    const shop = Object.fromEntries((products ?? []).map((p: any) => [p.id, { name: `${p.brand ?? ""} ${p.name}`.trim(), url: p.affiliate_url || p.url }]));
    return { id: rep.id, data: d, renderUrls, shop: shop as Record<string, { name: string; url: string | null }> };
  });
