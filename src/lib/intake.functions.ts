import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SLOT = z.enum(["face_front", "face_left", "face_right", "face_45", "body_front", "body_side", "wrist", "outfit"]);
export const REQUIRED_SLOTS = ["face_front", "face_left", "face_right", "face_45", "body_front", "body_side", "wrist"] as const;
const OPEN_STATUSES = ["paid", "intake"];

async function ownedOrder(admin: any, orderId: string, userId: string) {
  const { data: o } = await admin.from("orders").select("id, user_id, status").eq("id", orderId).maybeSingle();
  if (!o || o.user_id !== userId) throw new Error("Order not found");
  const { data: s } = await admin.from("submissions").select("id, basics, status").eq("order_id", orderId).maybeSingle();
  return { order: o, submission: s };
}

export const getIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { order, submission } = await ownedOrder(admin, data.orderId, context.userId);
    const { data: profile } = await admin.from("profiles").select("full_name, city, age, height_cm, weight_kg, budget_band").eq("id", context.userId).maybeSingle();
    const { data: photos } = submission
      ? await admin.from("photos").select("slot, storage_path, quality_status, quality_feedback").eq("submission_id", submission.id)
      : { data: [] };
    const withUrls = await Promise.all((photos ?? []).map(async (p: any) => {
      const { data: s } = await admin.storage.from("photos").createSignedUrl(p.storage_path, 1800);
      return { ...p, url: s?.signedUrl ?? null };
    }));
    return { orderStatus: order.status as string, submission, profile, photos: withUrls };
  });

export const saveBasics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    orderId: z.string().uuid(),
    full_name: z.string().trim().min(1).max(80),
    age: z.number().int().min(18).max(90),
    city: z.string().trim().min(1).max(60),
    height_cm: z.number().min(120).max(230),
    weight_kg: z.number().min(35).max(250),
    budget_band: z.enum(["under_3000", "3000_7000", "7000_15000", "15000_plus"]),
    main_fix: z.string().trim().max(140).optional().default(""),
    consent: z.literal(true),
    user_agent: z.string().max(400).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { order, submission } = await ownedOrder(admin, data.orderId, context.userId);
    if (!OPEN_STATUSES.includes(order.status)) throw new Error("This order can't be edited now.");
    const basics = { full_name: data.full_name, age: data.age, city: data.city, height_cm: data.height_cm, weight_kg: data.weight_kg, budget_band: data.budget_band, main_fix: data.main_fix };
    if (submission) await admin.from("submissions").update({ basics, status: "photos_pending" }).eq("id", submission.id);
    else await admin.from("submissions").insert({ order_id: order.id, user_id: context.userId, basics, status: "photos_pending" });
    await admin.from("profiles").update({ full_name: data.full_name, age: data.age, city: data.city, height_cm: data.height_cm, weight_kg: data.weight_kg, budget_band: data.budget_band }).eq("id", context.userId);
    await context.supabase.from("consents").insert({ user_id: context.userId, consent_type: "photo_processing", granted: true, version: "2026-10-photos-30d", user_agent: data.user_agent ?? null });
    if (order.status === "paid") await admin.from("orders").update({ status: "intake" }).eq("id", order.id);
    return { ok: true };
  });

export const checkPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    orderId: z.string().uuid(), slot: SLOT,
    landmarks: z.record(z.string(), z.unknown()).refine((v) => JSON.stringify(v).length < 20000),
    width: z.number().int().min(1).max(4000), height: z.number().int().min(1).max(4000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { runPhotoCheck, resolveModel } = await import("./photo-check.server");
    const { order, submission } = await ownedOrder(admin, data.orderId, context.userId);
    if (!submission || !OPEN_STATUSES.includes(order.status)) throw new Error("Please complete the basics first.");
    const path = `${context.userId}/${order.id}/${data.slot}.jpg`;
    const { data: signed, error } = await admin.storage.from("photos").createSignedUrl(path, 600);
    if (error || !signed) throw new Error("Photo upload not found. Please try again.");

    await admin.from("photos").upsert({
      submission_id: submission.id, user_id: context.userId, slot: data.slot, storage_path: path,
      quality_status: "pending", quality_feedback: null, landmarks: data.landmarks as any, width: data.width, height: data.height,
    }, { onConflict: "submission_id,slot" });

    const { data: setting } = await admin.from("ai_settings").select("value").eq("key", "analysis_model").maybeSingle();
    let result;
    try {
      result = await runPhotoCheck(signed.signedUrl, data.slot, resolveModel(setting?.value));
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      const msg = status === 402 ? "Photo checking is paused right now. Please try again later."
        : status === 429 ? "Lots of people are checking photos. Please try again in a minute."
        : "We couldn't check this photo. Please try again.";
      return { passed: false, issues: [], retake_tip: msg, error: true };
    }
    await admin.from("photos").update({
      quality_status: result.passed ? "passed" : "failed",
      quality_feedback: result.passed ? null : [result.retake_tip, ...result.issues].filter(Boolean).join(" · "),
    }).eq("submission_id", submission.id).eq("slot", data.slot);
    return { ...result, error: false };
  });

export const submitForAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { order, submission } = await ownedOrder(admin, data.orderId, context.userId);
    if (!submission || !OPEN_STATUSES.includes(order.status)) throw new Error("This order can't be submitted.");
    const { data: photos } = await admin.from("photos").select("slot, quality_status").eq("submission_id", submission.id);
    const passed = new Set((photos ?? []).filter((p: any) => p.quality_status === "passed").map((p: any) => p.slot));
    if (!REQUIRED_SLOTS.every((s) => passed.has(s))) throw new Error("Some required photos haven't passed yet.");
    await admin.from("submissions").update({ status: "submitted" }).eq("id", submission.id);
    await admin.from("orders").update({ status: "processing" }).eq("id", order.id);
    await admin.from("audit_log").insert({ actor_id: context.userId, action: "submission_submitted", entity: "order", entity_id: order.id });
    // start-pipeline hook: built in the next step
    return { ok: true };
  });
