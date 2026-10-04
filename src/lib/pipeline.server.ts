// Report pipeline: run creation, step dispatch, agent implementations, retries and failure handling.
// Dispatch happens in the database (dispatch_ready_steps → pg_net → /api/public/pipeline/step), so every
// step runs in its own HTTP request and a closed browser never stops a run.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { resolveModel } from "./photo-check.server";
import * as A from "./analysis-agents.server";
import * as R from "./render/agent-render.server";
import { getImageProvider } from "./render/providers.server";
import { ProviderError } from "./render/types";

type Admin = any;
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const RUN_HEADER = "X-Lovable-AIG-Run-ID";

export const STEP_KEYS = ["measurements", "face_hair", "body", "skin", "eyewear", "stylist", "renders", "review", "report_build", "pdf", "delivery"] as const;
export type StepKey = (typeof STEP_KEYS)[number];
// Max price (₹) of a single catalogue item per monthly budget band; no cap for 15000_plus.
const BUDGET_ITEM_CAP: Record<string, number> = { under_3000: 2500, "3000_7000": 5000, "7000_15000": 10000 };
const BACKOFF_MS = [30_000, 120_000, 600_000]; // retry delays after failures 1, 2, 3
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

/** Thrown by multi-call steps (renders) to re-queue themselves immediately without using a retry. */
class ContinueStep extends Error {}
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
      await admin.from("review_tasks").insert({ order_id: run.order_id, reason: "AI review flagged: " + [...(res.output.hard_rule_reasons ?? []), ...(res.output.issues ?? []).filter((i: any) => i.severity !== "low").map((i: any) => `${i.area}: ${i.detail}`)].slice(0, 4).join("; "),
        notes: JSON.stringify({ score: res.output.score, issues: res.output.issues, proposed_fixes: res.output.auto_fixes }).slice(0, 8000) });
      return { waiting_review: true };
    }
    if (step.step_key === "delivery") return { done: true };
    await runNextStep(admin, run.id);
    return { ok: true };
  } catch (e: any) {
    if (e instanceof ContinueStep) {
      await admin.from("pipeline_steps").update({ status: "pending", next_attempt_at: null, error: null }).eq("id", stepId).eq("status", "running");
      await runNextStep(admin, run.id);
      return { continued: true };
    }
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

async function claude(ctx: Ctx, promptKey: string, schema: any, input: unknown, slots: string[]): Promise<AgentResult> {
  const system = ctx.settings[promptKey];
  if (typeof system !== "string" || !system.trim()) throw new StepError(`Missing prompt ${promptKey} in AI settings`, false);
  try {
    return await A.runClaudeAgent({ model: A.resolveClaudeModel(ctx.settings["analysis_model"]), system, schema, input, imageUrls: await Promise.all(slots.map((sl) => ctx.photoUrl(sl))) });
  } catch (e: any) {
    if (e instanceof A.AgentError) throw new StepError(e.message, e.retryable);
    throw e;
  }
}

// Applies reviewer auto_fixes ("stylist.outfits.3.name") to succeeded step outputs; only existing leaf values
// in analysis/stylist outputs can be replaced, so a fix can't add structure or touch other steps.
const FIXABLE = new Set(["face_hair", "body", "skin", "eyewear", "stylist"]);
async function applyAutoFixes(ctx: Ctx, fixes: { path: string; new_value: unknown }[]) {
  const applied: string[] = [];
  const touched = new Set<string>();
  for (const f of fixes ?? []) {
    const [root, ...rest] = String(f.path ?? "").replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
    const target: any = root && ctx.outputs[root as StepKey];
    if (!root || !FIXABLE.has(root) || !rest.length || !target) continue;
    let node = target;
    for (const k of rest.slice(0, -1)) { node = node?.[k]; if (node == null || typeof node !== "object") break; }
    const leaf = rest[rest.length - 1]!;
    if (node == null || typeof node !== "object" || !(leaf in node)) continue;
    const old = node[leaf];
    if (old !== null && typeof old === "object") continue; // leaf values only
    if (old !== null && f.new_value !== null && typeof old !== typeof f.new_value) continue;
    node[leaf] = f.new_value;
    touched.add(root); applied.push(f.path);
  }
  for (const root of touched) {
    await ctx.admin.from("pipeline_steps").update({ output: ctx.outputs[root as StepKey] })
      .eq("run_id", ctx.run.id).eq("step_key", root).eq("status", "succeeded");
  }
  return applied;
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
    const fh = ctx.outputs.face_hair ?? {}, sk = ctx.outputs.skin ?? {};
    const { data: catalog } = await ctx.admin.from("products_catalog")
      .select("id, category, brand, name, shape, rim, lens_width_mm, bridge_mm, temple_mm, colour, colour_hex, price_min, price_max")
      .in("category", ["eyewear_frames", "sunglasses"]).eq("active", true).limit(80);
    const r = await claude(ctx, "prompt_eyewear", A.EyewearSchema, {
      basics: { age: ctx.basics.age, profession: ctx.basics.profession ?? ctx.basics.main_fix ?? null, wears_glasses: ctx.basics.wears_glasses ?? "no", wants_sunglasses: ctx.basics.wants_sunglasses !== false },
      eyewear_mm: ctx.outputs.measurements?.slots?.face_front?.eyewear_mm ?? null,
      face_hair: { face_shape: fh.face_shape, hairline: fh.hair?.hairline, beard: fh.recommended_beard?.style ?? fh.beard?.current_state, features: fh.features },
      skin: { undertone: sk.undertone, season: sk.season, metals: sk.metals, power_colours: sk.power_colours },
      catalog: catalog ?? [],
      catalog_note: "If a catalog item fits a recommendation, set product_id to its id.",
    }, ["face_front", "face_45"]);
    if (ctx.basics.wants_sunglasses === false) r.output.sunglasses = [];
    return r;
  },

  async stylist(ctx) {
    const fh = ctx.outputs.face_hair ?? {}, bd = ctx.outputs.body ?? {}, sk = ctx.outputs.skin ?? {};
    const keys = [`face:${fh.face_shape}`, `body:${bd.body_type}`, `season:${String(sk.season ?? "").toLowerCase()}`, "all"];
    const { data: houseRules } = await ctx.admin.from("style_rules").select("category, condition_key, rule_text, priority")
      .eq("active", true).in("condition_key", keys).order("priority").limit(200);
    const cap = BUDGET_ITEM_CAP[String(ctx.basics.budget_band ?? "")];
    let q = ctx.admin.from("products_catalog").select("id, category, name, brand, colour, colour_hex, fit_notes, price_min, price_max, tags").eq("active", true);
    if (cap) q = q.or(`price_min.is.null,price_min.lte.${cap}`);
    const { data: raw } = await q.limit(500);
    const size = bd.size_estimates ?? {};
    const sizeTags = [`size:${String(size.shirt ?? "").toLowerCase()}`, `waist:${String(size.trouser_waist_in ?? "")}`];
    const catalog = (raw ?? []).filter((p: any) => {
      const st = (p.tags ?? []).map((t: string) => t.toLowerCase()).filter((t: string) => t.startsWith("size:") || t.startsWith("waist:"));
      return !st.length || st.some((t: string) => sizeTags.includes(t));
    }).slice(0, 150).map(({ tags, ...p }: any) => p);
    const system = ctx.settings["prompt_stylist"];
    if (typeof system !== "string" || !system.trim()) throw new StepError("Missing prompt prompt_stylist in AI settings", false);
    try {
      const r = await A.runClaudeAgent({
        model: A.resolveClaudeModel(ctx.settings["stylist_model"]), system, schema: A.StylistSchema, maxOutputTokens: 32000, imageUrls: [],
        input: {
          customer: { age: ctx.basics.age, city: ctx.basics.city, budget_band: ctx.basics.budget_band, main_fix: ctx.basics.main_fix },
          face_hair: fh, body: bd, skin: sk, house_rulebook: houseRules ?? [], catalogue: catalog,
        },
      });
      const ids = new Set(catalog.map((p: any) => p.id));
      for (const o of r.output.outfits) for (const it of o.items) if (it.product_id && !ids.has(it.product_id)) it.product_id = null; // drop invented ids
      return r;
    } catch (e: any) {
      if (e instanceof A.AgentError) throw new StepError(e.message, e.retryable);
      throw e;
    }
  },

  async renders(ctx) {
    // One look per invocation (stays inside the request time limit); ContinueStep re-dispatches for the next.
    const st = ctx.outputs.stylist ?? {}, bd = ctx.outputs.body ?? {}, fh = ctx.outputs.face_hair ?? {}, ew = ctx.outputs.eyewear ?? {};
    const all: any[] = st.outfits ?? [];
    const n = Math.max(1, Math.min(16, Number(ctx.settings["renders_per_report"] ?? 4) || 1));
    const hero = all[0];
    const picked = hero ? [hero, ...[...all.slice(1)].sort((a, b) => (a.render_priority ?? 99) - (b.render_priority ?? 99))].slice(0, n) : [];
    const lookKey = (o: any, i: number) => `look_${String(o.id ?? i + 1).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const tpl = String(ctx.settings["prompt_render"] ?? "");
    if (!tpl.trim()) throw new StepError("Missing prompt_render in AI settings", false);
    const base = {
      age: ctx.basics.age, height: R.heightText(ctx.basics.height_cm), frame: bd.frame,
      body_type_note: [bd.body_type?.replace(/_/g, " ") + " body type", bd.proportions_note].filter(Boolean).join(", "),
      haircut: fh.recommended_haircut?.name, beard: fh.recommended_beard?.style,
    };
    const jobs: R.RenderJob[] = picked.map((o, i) => ({
      key: lookKey(o, i), isHero: i === 0, size: "portrait", checkBody: true,
      prompt: R.fillTemplate(tpl, { ...base,
        outfit_items: [...(o.items ?? []).map((x: any) => `${x.description} (${x.colour_hex}, ${x.fit_note})`), `shoes: ${typeof o.shoes === "string" ? o.shoes : JSON.stringify(o.shoes)}`].join("; "),
        setting_for_occasion: R.settingFor(o.occasion) }),
    }));
    const etpl = String(ctx.settings["prompt_render_eyewear"] ?? "Photorealistic head-and-shoulders portrait of the same man in the reference photo. Keep his exact face, skin tone, hair and beard: {haircut}, {beard}. He is wearing {frame_description} in {colour}, correctly sized for his face. Neutral background, soft daylight, no text, no logos.");
    const pf = (ew.prescription_frames ?? []).find((x: any) => x.rank === 1) ?? ew.prescription_frames?.[0];
    const sg = (ew.sunglasses ?? []).find((x: any) => x.rank === 1) ?? ew.sunglasses?.[0];
    for (const j of [
      pf && { key: "eyewear_frames", desc: `${pf.rim} ${pf.shape} ${pf.material} prescription glasses with clear lenses`, colour: pf.colour_name },
      sg && { key: "eyewear_sunglasses", desc: `${sg.style} sunglasses with ${sg.lens} lenses`, colour: sg.frame_colour_name },
    ].filter(Boolean) as any[]) jobs.push({ key: j.key, isHero: false, size: "square", checkBody: false,
      prompt: R.fillTemplate(etpl, { haircut: base.haircut, beard: base.beard, frame_description: j.desc, colour: j.colour }) });

    const { data: rows } = await ctx.admin.from("renders").select("look_key, status").eq("order_id", ctx.order.id).in("status", ["done", "rejected"]);
    const finished = new Map((rows ?? []).map((r: any) => [r.look_key, r.status]));
    const next = jobs.find((j) => !finished.has(j.key));
    if (next) {
      const faceUrl = await ctx.photoUrl("face_front");
      if (!faceUrl) throw new StepError("Face photo missing", false);
      const refs = await R.loadRefs(ctx.admin, ctx.photos, next.checkBody ? ["face_front", "body_front"] : ["face_front"]);
      try {
        const r = await R.renderLook({ admin: ctx.admin, order: ctx.order, runId: ctx.run.id, settings: ctx.settings, job: next, refs,
          faceUrl, bodyUrl: await ctx.photoUrl("body_front"), costFor: (m, a, b) => costFor(ctx.admin, m, a, b) });
        finished.set(next.key, r.status);
      } catch (e: any) {
        if (e instanceof ProviderError) throw new StepError(e.message, e.retryable);
        throw e;
      }
      if (jobs.some((j) => !finished.has(j.key))) throw new ContinueStep();
    }
    const isDone = (k: string) => finished.get(k) === "done";
    return { output: {
      looks: jobs.filter((j) => j.size === "portrait" && isDone(j.key)).map((j) => j.key),
      eyewear: jobs.filter((j) => j.size === "square" && isDone(j.key)).map((j) => j.key),
      rejected: jobs.filter((j) => finished.get(j.key) === "rejected").map((j) => j.key),
      hero: jobs[0] && isDone(jobs[0].key) ? jobs[0].key : null,
      count: jobs.filter((j) => isDone(j.key)).length,
      provider: getImageProvider(ctx.settings["image_provider"]).name,
    } };
  },

  async review(ctx) {
    const { data: renderRows } = await ctx.admin.from("renders")
      .select("look_key, status, approved, is_hero, likeness_score, body_preserved, quality_issues").eq("order_id", ctx.order.id);
    const renders = renderRows ?? [];
    const approvedRenders = renders.filter((r: any) => r.status === "done" && r.approved).length;
    const o = ctx.outputs;
    const agents = { face_hair: o.face_hair, body: o.body, skin: o.skin, eyewear: o.eyewear, stylist: o.stylist };
    const system = ctx.settings["prompt_review"];
    if (typeof system !== "string" || !system.trim()) throw new StepError("Missing prompt prompt_review in AI settings", false);
    let r: AgentResult;
    try {
      r = await A.runClaudeAgent({
        model: A.resolveClaudeModel(ctx.settings["reviewer_model"]), system, schema: A.ReviewSchema, maxOutputTokens: 16000, imageUrls: [],
        input: { customer: { age: ctx.basics.age, city: ctx.basics.city, budget_band: ctx.basics.budget_band }, ...agents, renders, approved_render_count: approvedRenders },
      });
    } catch (e: any) {
      if (e instanceof A.AgentError) throw new StepError(e.message, e.retryable);
      throw e;
    }
    const out = r.output;
    // Hard rules enforced in code regardless of what the model said.
    const norm = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? (n > 1 ? n / 100 : n) : null; };
    const lowConf = (["face_hair", "body", "skin", "eyewear"] as const)
      .map((k) => [k, norm((o as any)[k]?.confidence)] as const).filter(([, v]) => v !== null && v < 0.6).map(([k]) => k);
    const reasons: string[] = [];
    if (out.issues.some((i: any) => i.severity === "high")) reasons.push("high-severity issue");
    if (lowConf.length) reasons.push(`low confidence: ${lowConf.join(", ")}`);
    if (approvedRenders < 3) reasons.push(`only ${approvedRenders} approved renders`);
    out.needs_human = out.needs_human || reasons.length > 0;
    out.approved = out.approved && !out.needs_human;
    out.hard_rule_reasons = reasons;
    out.applied_fixes = out.needs_human ? [] : await applyAutoFixes(ctx, out.auto_fixes);
    return r;
  },

  async report_build(ctx) {
    const o = ctx.outputs;
    const data = {
      generated_at: new Date().toISOString(), name: ctx.basics.full_name, basics: ctx.basics,
      face_hair: o.face_hair, body: o.body, skin: o.skin, eyewear: o.eyewear,
      stylist: o.stylist, summary: o.stylist?.summary, outfits: o.stylist?.outfits, accessories: o.stylist?.accessories,
      watches: o.stylist?.accessories?.watches, fragrance: o.stylist?.fragrance, plan_90_days: o.stylist?.plan_90_days,
      renders: o.renders?.looks ?? [], hero_render: o.renders?.hero ?? null, eyewear_renders: o.renders?.eyewear ?? [], review: { score: o.review?.score },
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
<h1>${esc(d.name)}'s Style Report</h1><p><b>${esc(d.summary?.headline ?? d.summary)}</b></p><ul>${(d.summary?.three_biggest_wins ?? []).map((w: any) => `<li><b>${esc(w.title)}</b> — ${esc(w.detail)}</li>`).join("")}</ul>
<h2>Face & hair</h2><p>Face shape: <b>${esc(d.face_hair?.face_shape)}</b></p><ul>${[d.face_hair?.recommended_haircut].filter(Boolean).map((h: any) => `<li><b>${esc(h.name)}</b> — ${esc(h.why)}</li>`).join("")}</ul><p>Beard: ${esc(d.face_hair?.recommended_beard?.style)} — ${esc(d.face_hair?.recommended_beard?.why)}</p>
<h2>Body & fit</h2><p>${esc(d.body?.body_type)}</p><ul>${(d.body?.fit_rules ?? []).map((r: any) => `<li>${esc(r.rule ?? r)} — ${esc(r.why)}</li>`).join("")}</ul>
<h2>Your colours</h2><p>${esc(d.skin?.undertone)} undertone · ${esc(d.skin?.season)}</p><div>${(d.skin?.power_colours ?? []).map((c: any) => `<span class="sw" style="background:${esc(c.hex)}"></span>`).join("")}</div>
<h2>Eyewear</h2><p>Size guide: <b>${esc(d.eyewear?.size_guide?.label)}</b> — ${esc(d.eyewear?.size_guide?.how_to_read_it)}</p><h3>Frames</h3><ul>${(d.eyewear?.prescription_frames ?? []).map((f: any) => `<li><span class="sw" style="width:14px;height:14px;background:${esc(f.colour_hex)}"></span> <b>${esc(f.shape)}</b> (${esc(f.rim)}, ${esc(f.colour_name)}) — ${esc(f.why_it_works)}</li>`).join("")}</ul>${(d.eyewear?.sunglasses ?? []).length ? `<h3>Sunglasses</h3><ul>${d.eyewear.sunglasses.map((g: any) => `<li><b>${esc(g.style)}</b> (${esc(g.frame_colour_name)}, ${esc(g.lens)}) — ${esc(g.why_it_works)}</li>`).join("")}</ul>` : ""}<h3>Avoid</h3><ul>${(d.eyewear?.avoid ?? []).map((a: any) => `<li>${esc(a.style)} — ${esc(a.why)}</li>`).join("")}</ul>
<h2>16 outfits</h2><ol>${(d.outfits ?? []).map((o: any) => `<li><b>${esc(o.name)}</b> (${esc(o.occasion)}): ${esc((o.items ?? []).map((i: any) => i.description).join(", "))}</li>`).join("")}</ol>
<h2>Accessories, watches & fragrance</h2><ul>${[...(d.watches ?? []).map((w: any) => `${w.model_suggestion} (${w.use_case})`), ...(d.fragrance ?? []).map((f: any) => `${f.name} — ${f.occasion}`)].map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<h2>Your 90-day plan</h2>${(d.plan_90_days ?? []).map((p: any) => `<p><b>Week ${esc(p.week)} — ${esc(p.focus)}</b></p><ul>${(p.tasks ?? []).map((a: any) => `<li>${esc(a)}</li>`).join("")}</ul>`).join("")}
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
