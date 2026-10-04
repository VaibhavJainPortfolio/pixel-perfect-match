import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LINES: { label: string; steps: string[]; secs: number[] }[] = [
  { label: "Checking your photos", steps: ["measurements"], secs: [10] },
  { label: "Measuring your face shape", steps: ["face_hair"], secs: [60] },
  { label: "Reading your body proportions", steps: ["body"], secs: [60] },
  { label: "Building your colour palette", steps: ["skin", "eyewear"], secs: [60, 45] },
  { label: "Your stylist is choosing 16 outfits", steps: ["stylist"], secs: [180] },
  { label: "Creating images of you in your best looks", steps: ["renders"], secs: [240] },
  { label: "Final quality check", steps: ["review"], secs: [60] },
  { label: "Preparing your report", steps: ["report_build", "pdf", "delivery"], secs: [10, 30, 10] },
];

/** Customer-safe progress: friendly labels only, never internal step names or errors. */
export const getOrderProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await admin.from("orders").select("id, user_id, status").eq("id", data.orderId).maybeSingle();
    if (!order || order.user_id !== context.userId) throw new Error("Order not found");
    const { data: run } = await admin.from("pipeline_runs").select("id, status").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: report } = await admin.from("reports").select("id, published_at").eq("order_id", order.id).maybeSingle();
    if (!run) return { runId: null, state: "not_started" as const, lines: [], etaSeconds: 0, reportId: null };
    const { data: steps } = await admin.from("pipeline_steps").select("step_key, status").eq("run_id", run.id);
    const st = Object.fromEntries((steps ?? []).map((s: any) => [s.step_key, s.status]));
    let eta = 0;
    const lines = LINES.map((l) => {
      const ss = l.steps.map((k) => st[k]);
      l.steps.forEach((k, i) => { if (st[k] !== "succeeded" && st[k] !== "skipped") eta += l.secs[i] ?? 0; });
      const state = ss.every((s) => s === "succeeded" || s === "skipped") ? "done" : ss.some((s) => s === "running" || s === "succeeded") ? "active" : "pending";
      return { label: l.label, state };
    });
    const state = run.status === "completed" && report?.published_at ? "done"
      : run.status === "failed" || run.status === "waiting_review" ? "review" : "running";
    return { runId: run.id as string, state, lines, etaSeconds: state === "running" ? eta : 0, reportId: report?.published_at ? report.id : null };
  });

async function requireStaff(context: any) {
  const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!data) throw new Error("Not allowed");
}

export const listReviewQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: tasks } = await admin.from("review_tasks").select("id, order_id, reason, notes, status, created_at")
      .in("status", ["open", "in_progress"]).order("created_at").limit(100);
    const ids = (tasks ?? []).map((t: any) => t.order_id);
    const { data: runs } = ids.length ? await admin.from("pipeline_runs").select("id, order_id, status, created_at").in("order_id", ids).order("created_at", { ascending: false }) : { data: [] };
    return (tasks ?? []).map((t: any) => {
      const run = (runs ?? []).find((r: any) => r.order_id === t.order_id);
      return { ...t, runId: run?.id ?? null, runStatus: run?.status ?? null };
    });
  });

export const approveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { resumeAfterApproval } = await import("./pipeline.server");
    const { data: task } = await admin.from("review_tasks").select("id, order_id").eq("id", data.taskId).maybeSingle();
    if (!task) throw new Error("Task not found");
    const { data: run } = await admin.from("pipeline_runs").select("id").eq("order_id", task.order_id).eq("status", "waiting_review").maybeSingle();
    if (!run) throw new Error("This report isn't waiting for approval. Failed runs need a manual fix.");
    await resumeAfterApproval(admin, run.id, context.userId);
    await admin.from("review_tasks").update({ status: "approved", assigned_to: context.userId }).eq("id", task.id);
    return { ok: true };
  });
