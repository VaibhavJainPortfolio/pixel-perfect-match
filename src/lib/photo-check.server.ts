import { google } from "@ai-sdk/google";
import { streamText } from "ai";

const DEFAULT_MODEL = "gemini-2.5-flash";

export type PhotoCheck = { passed: boolean; issues: string[]; retake_tip: string };

const SLOT_WORDS: Record<string, string> = {
  face_front: "face front (looking straight, hair off forehead)",
  face_left: "face left profile", face_right: "face right profile", face_45: "face at 45 degrees",
  body_front: "full body front (head to feet, fitted t-shirt and jeans)", body_side: "full body side (head to feet, turned fully sideways)",
  wrist: "inner wrist in daylight", outfit: "current favourite outfit (full body)",
};

export function resolveModel(setting: unknown) {
  const v = typeof setting === "string" ? setting : "";
  return v.includes("gemini") ? v : DEFAULT_MODEL;
}

export async function runPhotoCheck(imageUrl: string, slot: string, model: string): Promise<PhotoCheck> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured (missing GEMINI_API_KEY)");
  const instruction = `You are a photo quality inspector for a styling service. Check this ${SLOT_WORDS[slot] ?? slot} photo. Return JSON only: {"passed": boolean, "issues": string[], "retake_tip": string}. Fail if blurry, too dark, heavily filtered, cropped (body shots must show head to feet), wrong pose for the slot, sunglasses or cap on face slots, more than one person, or the person appears under 18. Keep retake_tip to one short friendly sentence; use an empty string when passed.`;
  const result = streamText({
    model: google(resolveModel(model)),
    messages: [{ role: "user", content: [{ type: "text", text: instruction }, { type: "image", image: new URL(imageUrl) }] }],
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
