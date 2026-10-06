// agent-render: renders ONE look per call with the configured image provider, saves it, then has the
// analysis model compare it with his real photos. Low likeness or a changed body → one regeneration;
// a second failure marks the render rejected (the pipeline carries on with the other looks).
import { z } from "zod";
import * as A from "../analysis-agents.server";
import { getImageProvider } from "./providers.server";
import { ProviderError, type RefImage } from "./types";

type Admin = any;

export const RenderCheckSchema = z.object({
  likeness_score: z.coerce.number(),
  body_preserved: z.boolean(),
  issues: z.array(z.string()),
});

const SETTINGS_FOR_OCCASION: [RegExp, string][] = [
  [/wedding|sangeet|reception|haldi|mehendi/i, "an elegant Indian wedding venue with warm fairy lights and marigold decor"],
  [/festiv|diwali|eid|puja|pooja/i, "a softly lit Indian home courtyard decorated for a festival"],
  [/client|meeting|board/i, "a modern glass-walled office lobby in an Indian city"],
  [/office|work/i, "a bright contemporary Indian office with plants"],
  [/date|dinner|evening/i, "a stylish rooftop restaurant at dusk"],
  [/weekend|casual|brunch|travel/i, "a sunny Indian city street café"],
];
export function settingFor(occasion: unknown) {
  const o = String(occasion ?? "");
  return SETTINGS_FOR_OCCASION.find(([r]) => r.test(o))?.[1] ?? "a clean, softly lit studio backdrop";
}

export function fillTemplate(tpl: string, vars: Record<string, unknown>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null || vars[k] === "" ? "as in the reference photos" : String(vars[k])));
}

export function heightText(cm: unknown) {
  const n = Number(cm);
  if (!n) return "his real height";
  const inches = Math.round(n / 2.54);
  return `${Math.floor(inches / 12)} ft ${inches % 12} in (${Math.round(n)} cm) tall`;
}

export async function loadRefs(admin: Admin, photos: { slot: string; storage_path: string }[], slots: string[]): Promise<RefImage[]> {
  const out: RefImage[] = [];
  for (const slot of slots) {
    const p = photos.find((x) => x.slot === slot);
    if (!p) continue;
    const { data, error } = await admin.storage.from("photos").download(p.storage_path);
    if (error || !data) continue;
    out.push({ bytes: new Uint8Array(await data.arrayBuffer()), mime: data.type || "image/jpeg", name: `${slot}.jpg` });
  }
  return out;
}

export type RenderJob = {
  key: string; prompt: string; size: "portrait" | "square"; isHero: boolean;
  checkBody: boolean;           // false for head-and-shoulders eyewear portraits
};

export async function renderLook(opts: {
  admin: Admin; order: { id: string; user_id: string }; runId: string; settings: Record<string, any>;
  job: RenderJob; refs: RefImage[]; faceUrl: string; bodyUrl: string | null;
  costFor: (model?: string, tin?: number, tout?: number) => Promise<number>;
}): Promise<{ status: "done" | "rejected"; costUsd: number; check: z.infer<typeof RenderCheckSchema> }> {
  const { admin, order, job, settings } = opts;
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new ProviderError("AI is not configured", false);
  const provider = getImageProvider(settings["image_provider"]);
  const costs = (settings["model_costs"] ?? {}) as Record<string, any>;
  const checkPrompt = String(settings["prompt_render_check"] ?? "Compare the render (last image) with his real photos. JSON: {\"likeness_score\": 0-10, \"body_preserved\": boolean, \"issues\": string[]}");
  const path = `${order.user_id}/${order.id}/${job.key}.png`;
  let total = 0;
  let check: z.infer<typeof RenderCheckSchema> = { likeness_score: 0, body_preserved: false, issues: [] };
  let model = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = attempt === 1 ? job.prompt
      : `${job.prompt} IMPORTANT: the previous attempt failed a likeness check (${check.issues.slice(0, 3).join("; ") || "face or body changed"}). Match his face and real body exactly.`;
    const img = await provider.generate({ prompt, refs: opts.refs, model: String(settings["image_model"] ?? ""), size: job.size }, apiKey);
    model = img.model;
    total += Number(costs[model]?.per_image ?? 0);
    const up = await admin.storage.from("renders").upload(path, img.bytes, { contentType: img.mime, upsert: true });
    if (up.error) throw new ProviderError(up.error.message, true);
    const { data: signed } = await admin.storage.from("renders").createSignedUrl(path, 900);

    try {
      const r = await A.runClaudeAgent({
        model: A.resolveClaudeModel(settings["analysis_model"]), system: checkPrompt, schema: RenderCheckSchema,
        input: { look: job.key, body_check_required: job.checkBody, images: job.checkBody && opts.bodyUrl ? ["real face", "real body", "render"] : ["real face", "render"] },
        imageUrls: [opts.faceUrl, job.checkBody ? opts.bodyUrl : null, signed?.signedUrl ?? null],
      });
      check = r.output;
      if (!job.checkBody) check.body_preserved = true;
      total += await opts.costFor(r.model, r.tokensIn, r.tokensOut);
    } catch (e: any) {
      if (e instanceof A.AgentError) throw new ProviderError("Likeness check failed: " + e.message, e.retryable);
      throw e;
    }

    const passed = check.likeness_score >= 6 && check.body_preserved;
    if (passed || attempt === 2) {
      const status = passed ? "done" : "rejected";
      await admin.from("renders").upsert({
        order_id: order.id, run_id: opts.runId, look_key: job.key, prompt: job.prompt, storage_path: path,
        provider: provider.name, model, status, approved: passed, is_hero: job.isHero, attempts: attempt,
        cost_usd: Math.round(total * 10000) / 10000, likeness_score: check.likeness_score,
        body_preserved: check.body_preserved, quality_issues: check.issues,
      }, { onConflict: "order_id,look_key" });
      const { data: run } = await admin.from("pipeline_runs").select("total_cost_usd").eq("id", opts.runId).single();
      await admin.from("pipeline_runs").update({ total_cost_usd: Number(run?.total_cost_usd ?? 0) + total }).eq("id", opts.runId);
      return { status, costUsd: total, check };
    }
  }
  throw new Error("unreachable");
}
