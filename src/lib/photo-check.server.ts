import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const DEFAULT_MODEL = "openai/gpt-6-astra";
const RUN_HEADER = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_HEADER)) headers.set(RUN_HEADER, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_HEADER)?.trim() || undefined;
    return res;
  };
}

export type PhotoCheck = { passed: boolean; issues: string[]; retake_tip: string };

const SLOT_WORDS: Record<string, string> = {
  face_front: "face front (looking straight, hair off forehead)",
  face_left: "face left profile", face_right: "face right profile", face_45: "face at 45 degrees",
  body_front: "full body front (head to feet, fitted t-shirt and jeans)", body_side: "full body side (head to feet, turned fully sideways)",
  wrist: "inner wrist in daylight", outfit: "current favourite outfit (full body)",
};

/** Resolve the analysis model from ai_settings; only exact gateway openai/* ids are used, otherwise the default. */
export function resolveModel(setting: unknown) {
  const v = typeof setting === "string" ? setting : "";
  return v.startsWith("openai/") ? v : DEFAULT_MODEL;
}

export async function runPhotoCheck(imageUrl: string, slot: string, model: string): Promise<PhotoCheck> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const provider = createOpenAI({
    baseURL: GATEWAY, apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  const instruction = `You are a photo quality inspector for a styling service. Check this ${SLOT_WORDS[slot] ?? slot} photo. Return JSON only: {"passed": boolean, "issues": string[], "retake_tip": string}. Fail if blurry, too dark, heavily filtered, cropped (body shots must show head to feet), wrong pose for the slot, sunglasses or cap on face slots, more than one person, or the person appears under 18. Keep retake_tip to one short friendly sentence; use an empty string when passed.`;
  const result = streamText({
    model: provider.responses(model),
    messages: [{ role: "user", content: [{ type: "text", text: instruction }, { type: "image", image: new URL(imageUrl) }] }],
    providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
  });
  const text = await result.text;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("The checker didn't return a result");
  const j = JSON.parse(m[0]);
  return {
    passed: j.passed === true,
    issues: Array.isArray(j.issues) ? j.issues.map(String).slice(0, 6) : [],
    retake_tip: typeof j.retake_tip === "string" ? j.retake_tip : "",
  };
}
