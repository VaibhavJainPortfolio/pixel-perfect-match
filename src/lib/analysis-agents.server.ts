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
  model: string; system: string; schema: T; input: unknown; imageUrls: (string | null)[];
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
      model: anthropic(opts.model), maxOutputTokens: 8000, maxRetries: 0,
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
