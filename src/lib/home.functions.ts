import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function weekOf(publishedAt: string | null) {
  if (!publishedAt) return 1;
  return Math.min(12, Math.max(1, Math.floor((Date.now() - new Date(publishedAt).getTime()) / (7 * 86400_000)) + 1));
}

/** Everything the customer home needs in one call, read as the user (RLS applies). */
export const getHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: orders } = await sb.from("orders")
      .select("id, product, status, total_paise, invoice_number, invoice_url, paid_at, created_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
    const list = orders ?? [];
    const ids = list.map((o) => o.id);
    const { data: subs } = ids.length ? await sb.from("submissions").select("order_id, status").in("order_id", ids) : { data: [] as any[] };
    const { data: reps } = ids.length
      ? await sb.from("reports").select("id, order_id, data, pdf_path, published_at").in("order_id", ids).not("published_at", "is", null).order("published_at", { ascending: false })
      : { data: [] as any[] };

    const intake = list.find((o) => o.status === "paid" || o.status === "intake");
    const intakeCard = intake ? {
      orderId: intake.id, product: intake.product,
      step: (subs ?? []).find((s: any) => s.order_id === intake.id)?.status === "photos_pending" ? "photos" as const : "basics" as const,
    } : null;
    const processing = list.filter((o) => o.status === "processing" || o.status === "review").map((o) => o.id);

    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const reports = await Promise.all((reps ?? []).map(async (r: any) => {
      const { data: hero } = await admin.from("renders").select("storage_path, is_hero, look_key")
        .eq("order_id", r.order_id).eq("status", "done").eq("approved", true)
        .order("is_hero", { ascending: false }).order("look_key").limit(1).maybeSingle();
      let cover: string | null = null;
      if (hero?.storage_path) {
        const { data: s } = await admin.storage.from("renders").createSignedUrl(hero.storage_path, 3600);
        cover = s?.signedUrl ?? null;
      }
      return { id: r.id as string, orderId: r.order_id as string, publishedAt: r.published_at as string, hasPdf: !!r.pdf_path, cover,
        headline: (r.data?.stylist?.summary?.headline as string | undefined) ?? null };
    }));

    // Plan + checklist come from the latest report.
    const latest = (reps ?? [])[0];
    let plan: null | { reportId: string; week: number; focus: string; tasks: string[]; checked: Record<string, boolean>; essentials: { total: number; bought: number } } = null;
    if (latest) {
      const { data: ck } = await sb.from("report_checklist").select("checked").eq("report_id", latest.id).maybeSingle();
      const checked = (ck?.checked ?? {}) as Record<string, boolean>;
      const st = latest.data?.stylist ?? {};
      const week = weekOf(latest.published_at);
      const wk = (st.plan_90_days ?? []).find((p: any) => Number(p.week) === week) ?? {};
      const buy: any[] = st.wardrobe_essentials?.buy ?? [];
      plan = {
        reportId: latest.id, week, focus: String(wk.focus ?? ""),
        tasks: Array.isArray(wk.tasks) ? wk.tasks.map(String) : [], checked,
        essentials: { total: buy.length, bought: buy.filter((b) => checked[`buy:${b.item}`]).length },
      };
    }

    const owned = [...new Set(list.filter((o) => !["created", "failed", "cancelled", "refunded"].includes(o.status)).map((o) => o.product))];
    const { data: prices } = await sb.from("pricing").select("product, name, tagline, amount_paise").eq("active", true);
    return { intakeCard, processing, reports, plan, owned, prices: prices ?? [],
      orders: list.filter((o) => o.status !== "created").map(({ invoice_url, ...o }) => ({ ...o, hasInvoice: !!invoice_url })) };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    subject: z.string().trim().min(3).max(150), message: z.string().trim().min(5).max(4000),
    orderId: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.orderId) {
      const { data: o } = await context.supabase.from("orders").select("id").eq("id", data.orderId).maybeSingle();
      if (!o) throw new Error("Order not found");
    }
    const { error } = await context.supabase.from("tickets")
      .insert({ user_id: context.userId, order_id: data.orderId ?? null, subject: data.subject, message: data.message });
    if (error) throw new Error("Couldn't send your message. Please try again.");
    return { ok: true };
  });
