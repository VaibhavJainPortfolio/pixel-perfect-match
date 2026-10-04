// Face/hair, body and skin analysis agents: Claude via the Lovable AI Gateway Messages API,
// base64 photos, JSON-only answers validated with Zod (one retry with the validation error).
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const DEFAULT_CLAUDE = "anthropic/claude-sonnet-5";
const RUN_HEADER = "X-Lovable-AIG-Run-ID";

export class AgentError extends Error { constructor(msg: string, public retryable = true) { super(msg); } }

export function resolveClaudeModel(v: unknown) {
  return typeof v === "string" && v.startsWith("anthropic/") ? v : DEFAULT_CLAUDE;
}

const s = z.string();
const strs = z.array(z.string());
const conf = z.coerce.number();
const colour = z.object({ name: s, hex: s });

export const FaceHairSchema = z.object({
  face_shape: z.enum(["oval", "round", "square", "oblong", "heart", "diamond", "round_oval"]),
  confidence: conf, measurements_summary: s,
  features: z.object({ jaw: s, cheekbones: s, forehead: s, neck: s }),
  hair: z.object({ texture: s, density: s, hairline: s, greying: s, current_style_assessment: s }),
  beard: z.object({ current_state: s, density: s, growth_pattern: s, greying: s }),
  recommended_haircut: z.object({ name: s, why: s, barber_script: strs, products: strs, avoid: strs }),
  recommended_beard: z.object({
    style: s, why: s, cheek_line: s, neckline: s,
    lengths_cm: z.object({ cheeks: z.union([z.number(), s]), chin: z.union([z.number(), s]), moustache: z.union([z.number(), s]) }),
    grey_options: z.union([s, strs]),
  }),
  works_for_you: strs, avoid: strs,
});

export const BodySchema = z.object({
  body_type: z.enum(["rectangle", "triangle", "inverted_triangle", "oval", "trapezoid"]),
  frame: z.enum(["slim", "average", "broad"]),
  height_category: s, proportions_note: s,
  size_estimates: z.object({ shirt: s, trouser_waist_in: z.union([z.number(), s]), blazer: s }),
  fit_rules: z.array(z.object({ rule: s, why: s })),
  current_outfit_assessment: z.object({ works: strs, change: strs }),
  confidence: conf,
});

export const SkinSchema = z.object({
  skin_depth: z.enum(["fair", "light", "medium", "tan", "deep"]),
  undertone: z.enum(["warm", "cool", "neutral", "olive"]),
  contrast: z.enum(["low", "medium", "high"]),
  season: s, metals: strs,
  measured_swatches: z.array(z.object({ label: s, hex: s })),
  power_colours: z.array(colour),
  avoid_colours: z.array(colour.extend({ swap_to: s })),
  rules: strs, confidence: conf, lighting_note: s,
});

async function toImagePart(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new AgentError("Couldn't read a photo from storage");
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { type: "image" as const, image: btoa(bin), mediaType: res.headers.get("content-type")?.split(";")[0] || "image/jpeg" };
}

export async function runClaudeAgent<T extends z.ZodTypeAny>(opts: {
  model: string; system: string; schema: T; input: unknown; imageUrls: (string | null)[]; maxOutputTokens?: number;
}): Promise<{ output: z.infer<T>; model: string; tokensIn: number; tokensOut: number }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AgentError("AI is not configured", false);
  let runId: string | undefined;
  const anthropic = createAnthropic({
    baseURL: GATEWAY, apiKey,
    headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_HEADER)) headers.set(RUN_HEADER, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_HEADER)?.trim() || undefined;
      return res;
    },
  });
  const images = await Promise.all(opts.imageUrls.filter(Boolean).map((u) => toImagePart(u!)));
  const messages: any[] = [{ role: "user", content: [{ type: "text", text: "INPUT:\n" + JSON.stringify(opts.input) }, ...images] }];
  let tokensIn = 0, tokensOut = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = streamText({
      model: anthropic(opts.model), maxOutputTokens: opts.maxOutputTokens ?? 8000, maxRetries: 0,
      system: opts.system + "\nRespond with a single JSON object only — no markdown, no commentary.",
      messages,
    });
    const text = await result.text;
    const finish = await result.finishReason;
    const usage: any = await result.usage;
    tokensIn += usage?.inputTokens ?? 0; tokensOut += usage?.outputTokens ?? 0;
    if ((finish as string) === "content-filter" || (!text.trim() && finish !== "length")) throw new AgentError("The model declined this request", false);

    let problem: string;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) problem = "No JSON object found in your reply.";
    else {
      let raw: unknown;
      try { raw = JSON.parse(m[0]); } catch (e: any) { raw = undefined; problem = "Invalid JSON: " + e.message; }
      if (raw !== undefined) {
        const parsed = opts.schema.safeParse(raw);
        if (parsed.success) return { output: parsed.data, model: opts.model, tokensIn, tokensOut };
        problem = "Your JSON failed validation: " + parsed.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
      } else problem ??= "Invalid JSON.";
    }
    if (attempt === 0) {
      messages.push({ role: "assistant", content: text || "(empty)" });
      messages.push({ role: "user", content: `${problem!} Return the corrected complete JSON object only.` });
    } else throw new AgentError(problem!);
  }
  throw new AgentError("Unreachable");
}

const num = z.union([z.number(), s]);
export const EyewearSchema = z.object({
  face_shape_rule: s,
  measurements_mm: z.object({ face_width: num, pupillary_distance: num, bridge: num }),
  size_guide: z.object({ lens_width_mm: num, bridge_mm: num, temple_length_mm: num, label: s, how_to_read_it: s }),
  prescription_frames: z.array(z.object({
    rank: z.coerce.number(), shape: s, rim: s, material: s, colour_name: s, colour_hex: s, thickness: s, why_it_works: s, best_for: z.union([s, strs]),
    product_id: s.optional(),
  })).min(1),
  sunglasses: z.array(z.object({
    rank: z.coerce.number(), style: s, frame_colour_name: s, frame_colour_hex: s, lens: s, use_case: z.union([s, strs]), why_it_works: s,
    product_id: s.optional(),
  })),
  avoid: z.array(z.object({ style: s, why: s })),
  fit_check: strs,
  brands: z.array(z.object({ brand: s, price_band: s, best_for: s })),
  confidence: conf, measurement_note: s,
});

// ---------- head stylist ----------
const strOrList = z.union([s, strs, z.array(z.record(z.string(), z.any()))]);
export const StylistSchema = z.object({
  summary: z.object({ headline: s, three_biggest_wins: z.array(z.object({ title: s, detail: s })).length(3) }),
  outfits: z.array(z.object({
    id: z.coerce.string(), occasion: s, name: s, why_it_works: s,
    items: z.array(z.object({ category: s, description: s, colour_hex: s, fit_note: s, product_id: s.nullish(), price_band: s })).min(1),
    shoes: strOrList, accessories: strOrList, render_priority: z.coerce.number().int().min(1).max(16),
  })).length(16),
  accessories: z.object({
    watches: z.array(z.object({ use_case: s, model_suggestion: s, case_mm: num, dial: s, strap: s, price_band: s, wear_with: strOrList })).min(1),
    belts: strOrList, chain_jewellery: strOrList, sunglasses: strOrList, bags: strOrList, socks: strOrList,
  }),
  footwear: z.array(z.object({ type: s, colour: s, use: s })),
  fragrance: z.array(z.object({ occasion: s, name: s, notes: strOrList, price_band: s, how_to_wear: s })),
  wardrobe_essentials: z.object({ buy: z.array(z.object({ item: s, qty: z.coerce.number(), priority: z.union([s, z.number()]) })), retire: strs }),
  tailoring_tips: strs,
  plan_90_days: z.array(z.object({ week: z.coerce.number(), focus: s, tasks: strs })).length(12),
  daily_routine: z.object({ morning: strs, night: strs }),
});
export type StylistOutput = z.infer<typeof StylistSchema>;
