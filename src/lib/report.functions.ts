import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReportBundle } from "./report.server";

const SHARE_DAYS = 7;

/** Owner view of a report, plus his saved checklist ticks and whether a PDF exists. */
export const getMyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<ReportBundle & { checked: Record<string, boolean>; hasPdf: boolean; rated: boolean }> => {
    const { data: own } = await context.supabase.from("reports").select("id").eq("id", data.reportId).maybeSingle();
    if (!own) throw new Error("Report not found");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { loadReportBundle } = await import("./report.server");
    const { data: rep } = await admin.from("reports").select("id, order_id, user_id, data, published_at, pdf_path").eq("id", data.reportId).single();
    if (!rep || rep.user_id !== context.userId) throw new Error("Report not found");
    const bundle = await loadReportBundle(admin, rep);
    const { data: ck } = await context.supabase.from("report_checklist").select("checked").eq("report_id", rep.id).maybeSingle();
    const { count } = await context.supabase.from("report_feedback").select("id", { count: "exact", head: true }).eq("report_id", rep.id);
    return { ...bundle, checked: (ck?.checked as Record<string, boolean>) ?? {}, hasPdf: !!rep.pdf_path, rated: (count ?? 0) > 0 };
  });

/** Public, token-gated view used by shared links and the PDF print layout. */
export const getSharedReport = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ reportId: z.string().uuid(), token: z.string().min(16).max(128) }).parse(d))
  .handler(async ({ data }): Promise<ReportBundle | null> => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { loadReportBundle } = await import("./report.server");
    const { safeEqual } = await import("./payments.server");
    const { data: rep } = await admin.from("reports").select("id, order_id, data, published_at, share_token, share_expires_at").eq("id", data.reportId).maybeSingle();
    if (!rep?.share_token || !safeEqual(rep.share_token, data.token)) return null;
    if (rep.share_expires_at && new Date(rep.share_expires_at) < new Date()) return null;
    return loadReportBundle(admin, rep, 1800);
  });

/** Issues a fresh share link that expires in 7 days (any older link stops working). */
export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase.from("reports").select("id").eq("id", data.reportId).maybeSingle();
    if (!own) throw new Error("Report not found");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { randomToken } = await import("./report.server");
    const token = randomToken();
    const expires = new Date(Date.now() + SHARE_DAYS * 86400_000).toISOString();
    await admin.from("reports").update({ share_token: token, share_expires_at: expires }).eq("id", data.reportId);
    return { path: `/print/report/${data.reportId}?token=${token}`, expiresAt: expires };
  });

export const getPdfLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rep } = await context.supabase.from("reports").select("pdf_path").eq("id", data.reportId).maybeSingle();
    if (!rep?.pdf_path) throw new Error("Your PDF isn't ready yet.");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await admin.storage.from("reports").createSignedUrl(rep.pdf_path, 600, { download: "TheGent-Style-Report.pdf" });
    if (!s?.signedUrl) throw new Error("Couldn't prepare the PDF.");
    return { url: s.signedUrl };
  });

export const saveChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid(), checked: z.record(z.string().max(200), z.boolean()) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("report_checklist")
      .upsert({ report_id: data.reportId, user_id: context.userId, checked: data.checked }, { onConflict: "report_id,user_id" });
    if (error) throw new Error("Couldn't save your ticks.");
    return { ok: true };
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("report_feedback")
      .insert({ report_id: data.reportId, user_id: context.userId, rating: data.rating, comment: data.comment?.trim() || null });
    if (error) throw new Error("Couldn't save your rating.");
    return { ok: true };
  });
