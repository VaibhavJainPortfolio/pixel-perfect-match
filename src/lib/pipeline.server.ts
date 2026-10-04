// Report pipeline: run creation, step dispatch, agent implementations, retries and failure handling.
// Dispatch happens in the database (dispatch_ready_steps → pg_net → /api/public/pipeline/step), so every
// step runs in its own HTTP request and a closed browser never stops a run.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { resolveModel } from "./photo-check.server";

type Admin = any;
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const RUN_HEADER = "X-Lovable-AIG-Run-ID";
const DEFAULT_IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

export const STEP_KEYS = ["measurements", "face_hair", "body", "skin", "eyewear", "stylist", "renders", "review", "report_build", "pdf", "delivery"] as const;
export type StepKey = (typeof STEP_KEYS)[number];
const BACKOFF_MS = [30_000, 120_000, 600_000]; // retry delays after failures 1, 2, 3
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

class StepError extends Error { constructor(msg: string, public retryable = true) { super(msg); } }

// ---------- orchestration ----------

export async function startPipeline(admin: Admin, orderId: string) {
  const { data: existing } = await admin.from("pipeline_runs").select("id, status").eq("order_id", orderId)
    .in("status", ["queued", "running", "waiting_review"]).maybeSingle();
  if (existing) return existing.id as string;
  const { data: run, error } = await admin.from("pipeline_runs")
    .insert({ order_id: orderId, status: "running", started_at: new Date().toISOString() }).select("id").single();
  if (error) throw error;
  await admin.from("pipeline_steps").insert(STEP_KEYS.map((k) => ({ run_id: run.id, step_key: k, status: "pending" })));
  await admin.from("orders").update({ status: "processing" }).eq("id", orderId);
  await admin.rpc("arm_pipeline_tick");
  await runNextStep(admin, run.id);
  return run.id as string;
}

/** Claims every step whose dependencies have succeeded and fires its worker (non-blocking). */
export async function runNextStep(admin: Admin, runId: string) {
  const { error } = await admin.rpc("dispatch_ready_steps", { _run: runId });
  if (error) console.error("dispatch failed", error.message);
}

export async function verifyPipelineToken(admin: Admin, token: string) {
  const { data } = await admin.from("internal_config").select("value").eq("key", "pipeline_token").maybeSingle();
  const { safeEqual } = await import("./payments.server");
  return !!data?.value && !!token && safeEqual(token, data.value);
}

/** Resume after a stylist approves a run that the review step flagged. */
export async function resumeAfterApproval(admin: Admin, runId: string, actorId: string) {
  const { data: run } = await admin.from("pipeline_runs").select("id, order_id, status").eq("id", runId).maybeSingle();
  if (!run || run.status !== "waiting_review") throw new Error("This report isn't waiting for review.");
  const { data: rv } = await admin.from("pipeline_steps").select("output").eq("run_id", runId).eq("step_key", "review").maybeSingle();
  await admin.from("pipeline_steps").update({ status: "succeeded", finished_at: new Date().toISOString(), output: { ...(rv?.output ?? {}), approved_by: actorId } })
    .eq("run_id", runId).eq("step_key", "review");
  await admin.from("pipeline_runs").update({ status: "running" }).eq("id", runId);
  await admin.from("orders").update({ status: "processing" }).eq("id", run.order_id);
  await admin.from("audit_log").insert({ actor_id: actorId, action: "review_approved", entity: "pipeline_run", entity_id: runId });
  await admin.rpc("arm_pipeline_tick");
  await runNextStep(admin, runId);
}

/** Worker entry: executes one claimed step and records the result. */
export async function executeStep(admin: Admin, stepId: string) {
  const { data: step } = await admin.from("pipeline_steps").select("*").eq("id", stepId).maybeSingle();
  if (!step || step.status !== "running") return { skipped: true };
  const { data: run } = await admin.from("pipeline_runs").select("*").eq("id", step.run_id).single();
  if (run.status !== "running") return { skipped: true };
  const ctx = await loadContext(admin, run);
  try {
    const res = await AGENTS[step.step_key as StepKey](ctx);
    const cost = await costFor(admin, res.model, res.tokensIn, res.tokensOut);
    await admin.from("pipeline_steps").update({
      status: "succeeded", output: res.output, model_used: res.model ?? null, tokens_in: res.tokensIn ?? null,
      tokens_out: res.tokensOut ?? null, cost_usd: cost, finished_at: new Date().toISOString(), error: null, next_attempt_at: null,
    }).eq("id", stepId).eq("status", "running");
    await admin.from("pipeline_runs").update({ total_cost_usd: Number(run.total_cost_usd ?? 0) + cost }).eq("id", run.id);

    if (step.step_key === "review" && res.output?.needs_human) {
      await admin.from("pipeline_steps").update({ status: "pending" }).eq("id", stepId); // re-opened until a stylist approves
      await admin.from("pipeline_runs").update({ status: "waiting_review" }).eq("id", run.id);
      await admin.from("orders").update({ status: "review" }).eq("id", run.order_id);
      await admin.from("review_tasks").insert({ order_id: run.order_id, reason: "AI review flagged: " + (res.output.issues ?? []).slice(0, 3).join("; ") });
      return { waiting_review: true };
    }
    if (step.step_key === "delivery") return { done: true };
    await runNextStep(admin, run.id);
    return { ok: true };
  } catch (e: any) {
    const status = e?.statusCode ?? e?.status;
    const retryable = e instanceof StepError ? e.retryable : !(status && status >= 400 && status < 429);
    const msg = String(e?.message ?? e).slice(0, 1000);
    if (retryable && step.attempt < MAX_ATTEMPTS) {
      await admin.from("pipeline_steps").update({
        status: "pending", error: msg, attempt: step.attempt + 1,
        next_attempt_at: new Date(Date.now() + (BACKOFF_MS[step.attempt - 1] ?? 600_000)).toISOString(),
      }).eq("id", stepId);
      return { retry: true };
    }
    await failRun(admin, run, step.step_key, msg);
    return { failed: true };
  }
}

async function failRun(admin: Admin, run: any, stepKey: string, msg: string) {
  const now = new Date().toISOString();
  await admin.from("pipeline_steps").update({ status: "failed", error: msg, finished_at: now }).eq("run_id", run.id).eq("step_key", stepKey);
  await admin.from("pipeline_runs").update({ status: "failed", finished_at: now }).eq("id", run.id);
  await admin.from("orders").update({ status: "failed" }).eq("id", run.order_id);
  await admin.from("review_tasks").insert({ order_id: run.order_id, reason: `pipeline failure at ${stepKey}`, notes: msg });
  const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  if (admins?.length) await admin.from("notifications").insert(admins.map((a: any) => ({
    user_id: a.user_id, order_id: run.order_id, channel: "email", template: "admin_pipeline_failure", status: "queued",
    payload: { step: stepKey, run_id: run.id, error: msg.slice(0, 300) },
  })));
}

// ---------- shared context ----------

type Ctx = {
  admin: Admin; run: any; order: any; basics: any; settings: Record<string, any>;
  outputs: Partial<Record<StepKey, any>>; photos: any[]; photoUrl: (slot: string) => Promise<string | null>;
};

async function loadContext(admin: Admin, run: any): Promise<Ctx> {
  const { data: order } = await admin.from("orders").select("id, user_id, product").eq("id", run.order_id).single();
  const { data: sub } = await admin.from("submissions").select("id, basics").eq("order_id", order.id).single();
  const { data: photos } = await admin.from("photos").select("slot, storage_path, landmarks, quality_status").eq("submission_id", sub.id);
  const { data: steps } = await admin.from("pipeline_steps").select("step_key, output").eq("run_id", run.id).eq("status", "succeeded");
  const { data: rows } = await admin.from("ai_settings").select("key, value");
  const settings = Object.fromEntries((rows ?? []).map((r: any) => [r.key, r.value]));
  const outputs = Object.fromEntries((steps ?? []).map((s: any) => [s.step_key, s.output]));
  const photoUrl = async (slot: string) => {
    const p = (photos ?? []).find((x: any) => x.slot === slot);
    if (!p) return null;
    const { data } = await admin.storage.from("photos").createSignedUrl(p.storage_path, 1800);
    return data?.signedUrl ?? null;
  };
  return { admin, run, order, basics: sub.basics ?? {}, settings, outputs, photos: photos ?? [], photoUrl };
}

async function costFor(admin: Admin, model?: string, tin?: number, tout?: number) {
  if (!model || (!tin && !tout)) return 0;
  const { data } = await admin.from("ai_settings").select("value").eq("key", "model_costs").maybeSingle();
  const r = (data?.value as any)?.[model]; // { in: usd per 1M tokens, out: usd per 1M tokens }
  if (!r) return 0;
  return Math.round((((tin ?? 0) * Number(r.in ?? 0) + (tout ?? 0) * Number(r.out ?? 0)) / 1e6) * 10000) / 10000;
}

// ---------- AI helpers ----------

function provider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new StepError("AI is not configured", false);
  let runId: string | undefined;
  return createOpenAI({
    baseURL: GATEWAY, apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_HEADER)) headers.set(RUN_HEADER, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_HEADER)?.trim() || undefined;
      return res;
    },
  });
}

async function aiJson(ctx: Ctx, opts: { modelKey: string; promptKey: string; defaultPrompt: string; input: unknown; images?: (string | null)[] }) {
  const model = resolveModel(ctx.settings[opts.modelKey]);
  const custom = ctx.settings[opts.promptKey];
  const instructions = (typeof custom === "string" && custom.trim()) ? custom : opts.defaultPrompt;
  const images = (opts.images ?? []).filter(Boolean) as string[];
  const result = streamText({
    model: provider().responses(model),
    system: instructions + "\nReply with a single JSON object only, no markdown.",
    messages: [{ role: "user", content: [
      { type: "text", text: "INPUT:\n" + JSON.stringify(opts.input) },
      ...images.map((u) => ({ type: "image" as const, image: new URL(u) })),
    ] }],
    providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
  });
  const text = await result.text;
  const usage: any = await result.usage;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new StepError("Model returned no JSON");
  let output: any;
  try { output = JSON.parse(m[0]); } catch { throw new StepError("Model returned invalid JSON"); }
  return { output, model, tokensIn: usage?.inputTokens ?? 0, tokensOut: usage?.outputTokens ?? 0 };
}

type AgentResult = { output: any; model?: string; tokensIn?: number; tokensOut?: number };

async function rules(ctx: Ctx, category: string) {
  const { data } = await ctx.admin.from("style_rules").select("condition_key, rule_text").eq("category", category).eq("active", true).order("priority").limit(60);
  return data ?? [];
}

// ---------- agents ----------

const AGENTS: Record<StepKey, (ctx: Ctx) => Promise<AgentResult>> = {
  async measurements(ctx) {
    const landmarks = Object.fromEntries(ctx.photos.filter((p) => p.quality_status === "passed").map((p) => [p.slot, p.landmarks ?? {}]));
    const b = ctx.basics;
    const bmi = b.height_cm && b.weight_kg ? Math.round((b.weight_kg / (b.height_cm / 100) ** 2) * 10) / 10 : null;
    if (!landmarks.face_front) throw new StepError("Front face photo measurements are missing", false);
    return { output: { basics: b, bmi, slots: landmarks, merged_at: new Date().toISOString() } };
  },

  async face_hair(ctx) {
    return claude(ctx, "prompt_face_hair", A.FaceHairSchema, {
      basics: ctx.basics,
      measurements: { face_front: ctx.outputs.measurements?.slots?.face_front, face_left: ctx.outputs.measurements?.slots?.face_left, face_right: ctx.outputs.measurements?.slots?.face_right, face_45: ctx.outputs.measurements?.slots?.face_45 },
      house_rules: [...await rules(ctx, "face_shape"), ...await rules(ctx, "hair"), ...await rules(ctx, "beard")],
    }, ["face_front", "face_left", "face_right", "face_45"]);
  },

  async body(ctx) {
    return claude(ctx, "prompt_body", A.BodySchema, {
      basics: ctx.basics, bmi: ctx.outputs.measurements?.bmi,
      measurements: { body_front: ctx.outputs.measurements?.slots?.body_front, body_side: ctx.outputs.measurements?.slots?.body_side },
    }, ["body_front", "body_side", "outfit"]);
  },

  async skin(ctx) {
    return claude(ctx, "prompt_skin", A.SkinSchema, {
      basics: ctx.basics,
      measurements: { face_front: ctx.outputs.measurements?.slots?.face_front, wrist: ctx.outputs.measurements?.slots?.wrist },
    }, ["face_front", "wrist"]);
  },

  async eyewear(ctx) {
    return aiJson(ctx, {
      modelKey: "analysis_model", promptKey: "prompt_eyewear",
      defaultPrompt: `You recommend eyewear and sunglasses for men. Based on face shape analysis and skin palette, JSON: {"frames": [{"style": string, "why": string}] (3), "frame_colours": string[], "sunglasses": [{"style": string, "why": string}] (2), "avoid": string[]}.`,
      input: { face: ctx.outputs.face_hair, skin: { undertone: ctx.outputs.skin?.undertone, metals: ctx.outputs.skin?.metals, palette: ctx.outputs.skin?.palette } },
    });
  },

  async stylist(ctx) {
    return aiJson(ctx, {
      modelKey: "stylist_model", promptKey: "prompt_stylist",
      defaultPrompt: `You are TheGent's senior personal stylist for Indian men. Build a complete wardrobe plan from the analyses, the budget band and city climate. Use Indian brands and occasions (office, weekend, date night, wedding/festive, travel). JSON: {"summary": string, "outfits": [{"key": "look_01"...,"name": string, "occasion": string, "pieces": string[], "colours": string[], "why": string, "budget_inr": number, "render_prompt": string}] (exactly 16, render_prompt describes the full outfit visually), "accessories": [{"item": string, "why": string}], "watches": [{"style": string, "example": string, "budget_inr": number}], "fragrance": [{"name": string, "notes": string, "when": string}], "plan_90_day": [{"weeks": string, "focus": string, "actions": string[]}] (6 blocks)}.`,
      input: { basics: ctx.basics, face_hair: ctx.outputs.face_hair, body: ctx.outputs.body, skin: ctx.outputs.skin, eyewear: ctx.outputs.eyewear },
      images: [await ctx.photoUrl("outfit")],
    });
  },

  async renders(ctx) {
    const outfits: any[] = ctx.outputs.stylist?.outfits ?? [];
    const n = Math.max(0, Math.min(16, Number(ctx.settings["renders_per_report"] ?? 4) || 0));
    const setting = String(ctx.settings["image_model"] ?? "");
    const model = setting.startsWith("openai/gpt-image") ? setting : DEFAULT_IMAGE_MODEL;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new StepError("AI is not configured", false);
    const faceUrl = await ctx.photoUrl("face_front");
    const bodyUrl = await ctx.photoUrl("body_front");
    if (!faceUrl) throw new StepError("Face photo missing", false);
    const [face, body] = await Promise.all([faceUrl, bodyUrl].map(async (u) => (u ? await (await fetch(u)).blob() : null)));
    const done: string[] = [];
    for (const look of outfits.slice(0, n)) { // one image per call
      const key = String(look.key ?? `look_${done.length + 1}`);
      const { data: existing } = await ctx.admin.from("renders").select("status").eq("order_id", ctx.order.id).eq("look_key", key).maybeSingle();
      if (existing?.status === "done") { done.push(key); continue; }
      const prompt = `Photorealistic full-length fashion photo of the same man shown in the reference photos, keeping his exact face, skin tone, hair, beard and body shape. He is wearing: ${look.render_prompt ?? (look.pieces ?? []).join(", ")}. Setting suited to ${look.occasion ?? "everyday"}. Natural light, clean background, standing pose, head to shoes visible. No text.`;
      const form = new FormData();
      form.append("model", model); form.append("prompt", prompt); form.append("size", "1024x1536");
      form.append("image[]", new File([face!], "face.jpg", { type: "image/jpeg" }));
      if (body) form.append("image[]", new File([body], "body.jpg", { type: "image/jpeg" }));
      const res = await fetch(`${GATEWAY}/images/edits`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
      if (!res.ok) {
        const t = (await res.text()).slice(0, 300);
        throw new StepError(`Image ${key} failed (${res.status}): ${t}`, res.status === 429 || res.status >= 500);
      }
      const j: any = await res.json();
      const b64 = j?.data?.[0]?.b64_json;
      if (!b64) throw new StepError(`Image ${key} came back empty`);
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${ctx.order.user_id}/${ctx.order.id}/${key}.png`;
      const up = await ctx.admin.storage.from("renders").upload(path, bytes, { contentType: "image/png", upsert: true });
      if (up.error) throw new StepError(up.error.message);
      await ctx.admin.from("renders").upsert({ order_id: ctx.order.id, run_id: ctx.run.id, look_key: key, prompt, storage_path: path, provider: "lovable", model, status: "done", approved: true }, { onConflict: "order_id,look_key" });
      done.push(key);
    }
    return { output: { count: done.length, looks: done }, model };
  },

  async review(ctx) {
    const { count } = await ctx.admin.from("renders").select("id", { count: "exact", head: true }).eq("order_id", ctx.order.id).eq("status", "done");
    const r = await aiJson(ctx, {
      modelKey: "reviewer_model", promptKey: "prompt_review",
      defaultPrompt: `You are the final quality reviewer for a paid men's style report. Check internal consistency (palette vs outfit colours, face shape vs hairstyles/eyewear, body fit rules vs outfits, budget band respected, exactly 16 outfits, culturally appropriate for India, nothing offensive or unsafe). JSON: {"score": 0-100, "issues": string[], "needs_human": boolean}. Set needs_human true if score < 75 or any serious issue.`,
      input: { basics: ctx.basics, face_hair: ctx.outputs.face_hair, body: ctx.outputs.body, skin: ctx.outputs.skin, eyewear: ctx.outputs.eyewear, stylist: ctx.outputs.stylist, renders_done: count },
    });
    const outfits = ctx.outputs.stylist?.outfits ?? [];
    r.output.needs_human = r.output.needs_human === true || outfits.length < 16;
    return r;
  },

  async report_build(ctx) {
    const o = ctx.outputs;
    const data = {
      generated_at: new Date().toISOString(), name: ctx.basics.full_name, basics: ctx.basics,
      face_hair: o.face_hair, body: o.body, skin: o.skin, eyewear: o.eyewear,
      summary: o.stylist?.summary, outfits: o.stylist?.outfits, accessories: o.stylist?.accessories,
      watches: o.stylist?.watches, fragrance: o.stylist?.fragrance, plan_90_day: o.stylist?.plan_90_day,
      renders: o.renders?.looks ?? [], review: { score: o.review?.score },
    };
    const { data: existing } = await ctx.admin.from("reports").select("id, version").eq("order_id", ctx.order.id).maybeSingle();
    let id = existing?.id;
    if (existing) await ctx.admin.from("reports").update({ data, version: (existing.version ?? 1) + 1 }).eq("id", existing.id);
    else {
      const { data: row, error } = await ctx.admin.from("reports").insert({ order_id: ctx.order.id, user_id: ctx.order.user_id, data }).select("id").single();
      if (error) throw new StepError(error.message);
      id = row.id;
    }
    return { output: { report_id: id } };
  },

  async pdf(ctx) {
    const key = process.env["PDFSHIFT_API_KEY"];
    const reportId = ctx.outputs.report_build?.report_id;
    if (!key) return { output: { skipped: true, reason: "PDF service not set up" } };
    const { data: rep } = await ctx.admin.from("reports").select("data").eq("id", reportId).single();
    const d: any = rep.data ?? {};
    const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;color:#121726;padding:32px}h1,h2{color:#121726}h2{border-bottom:2px solid #D1AE6E;padding-bottom:4px;margin-top:28px}li{margin:4px 0}.sw{display:inline-block;width:28px;height:28px;border-radius:6px;margin:2px;border:1px solid #ccc}</style></head><body>
<h1>${esc(d.name)}'s Style Report</h1><p>${esc(d.summary)}</p>
<h2>Face & hair</h2><p>Face shape: <b>${esc(d.face_hair?.face_shape)}</b></p><ul>${(d.face_hair?.hairstyles ?? []).map((h: any) => `<li><b>${esc(h.name)}</b> — ${esc(h.why)}</li>`).join("")}</ul><p>Beard: ${esc(d.face_hair?.beard?.style)} — ${esc(d.face_hair?.beard?.why)}</p>
<h2>Body & fit</h2><p>${esc(d.body?.body_type)}</p><ul>${(d.body?.fit_rules ?? []).map((r: any) => `<li>${esc(r)}</li>`).join("")}</ul>
<h2>Your colours</h2><p>${esc(d.skin?.undertone)} undertone · ${esc(d.skin?.season)}</p><div>${(d.skin?.palette?.best ?? []).map((c: any) => `<span class="sw" style="background:${esc(c.hex)}"></span>`).join("")}</div>
<h2>Eyewear</h2><ul>${(d.eyewear?.frames ?? []).map((f: any) => `<li>${esc(f.style)} — ${esc(f.why)}</li>`).join("")}</ul>
<h2>16 outfits</h2><ol>${(d.outfits ?? []).map((o: any) => `<li><b>${esc(o.name)}</b> (${esc(o.occasion)}): ${esc((o.pieces ?? []).join(", "))}</li>`).join("")}</ol>
<h2>Accessories, watches & fragrance</h2><ul>${[...(d.accessories ?? []).map((a: any) => a.item), ...(d.watches ?? []).map((w: any) => w.style), ...(d.fragrance ?? []).map((f: any) => f.name)].map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<h2>Your 90-day plan</h2>${(d.plan_90_day ?? []).map((p: any) => `<p><b>${esc(p.weeks)} — ${esc(p.focus)}</b></p><ul>${(p.actions ?? []).map((a: any) => `<li>${esc(a)}</li>`).join("")}</ul>`).join("")}
</body></html>`;
    const res = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST", headers: { "content-type": "application/json", "X-API-Key": key },
      body: JSON.stringify({ source: html, format: "A4" }),
    });
    if (!res.ok) throw new StepError("PDF conversion failed: " + (await res.text()).slice(0, 200), res.status === 429 || res.status >= 500);
    const path = `${ctx.order.user_id}/${ctx.order.id}/style-report.pdf`;
    const up = await ctx.admin.storage.from("reports").upload(path, new Uint8Array(await res.arrayBuffer()), { contentType: "application/pdf", upsert: true });
    if (up.error) throw new StepError(up.error.message);
    await ctx.admin.from("reports").update({ pdf_path: path }).eq("id", reportId);
    return { output: { pdf_path: path } };
  },

  async delivery(ctx) {
    const reportId = ctx.outputs.report_build?.report_id;
    const now = new Date().toISOString();
    await ctx.admin.from("reports").update({ published_at: now }).eq("id", reportId);
    const { data: p } = await ctx.admin.from("profiles").select("full_name, phone, email, whatsapp_opt_in").eq("id", ctx.order.user_id).maybeSingle();
    const payload = { name: p?.full_name, report_id: reportId, pdf: !!ctx.outputs.pdf?.pdf_path };
    const rows: any[] = [];
    if (p?.whatsapp_opt_in && p.phone) rows.push({ user_id: ctx.order.user_id, order_id: ctx.order.id, channel: "whatsapp", template: "report_ready", status: "queued", payload: { ...payload, phone: p.phone } });
    if (p?.email) rows.push({ user_id: ctx.order.user_id, order_id: ctx.order.id, channel: "email", template: "report_ready", status: "queued", payload: { ...payload, email: p.email } });
    if (rows.length) await ctx.admin.from("notifications").insert(rows);
    await ctx.admin.from("orders").update({ status: "delivered" }).eq("id", ctx.order.id);
    await ctx.admin.from("pipeline_runs").update({ status: "completed", finished_at: now }).eq("id", ctx.run.id);
    return { output: { delivered_at: now, notified: rows.map((r) => r.channel) } };
  },
};
