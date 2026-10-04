// Gemini image generation (gemini-chat format) with reference photos as data-URL parts.
import { GATEWAY, ProviderError, b64ToBytes, bytesToB64, failFrom, type ImageProvider } from "./types";

export const geminiProvider: ImageProvider = {
  name: "gemini",
  defaultModel: "google/gemini-3.1-flash-image",
  accepts: (m) => m.startsWith("google/gemini") && m.includes("image") && !m.includes("lite"),
  async generate(req, apiKey) {
    const model = req.model && this.accepts(req.model) ? req.model : this.defaultModel;
    const aspect = req.size === "portrait" ? "Portrait 2:3 aspect ratio." : "Square 1:1 aspect ratio.";
    const content = [
      { type: "text", text: `${req.prompt} ${aspect}` },
      ...req.refs.map((r) => ({ type: "image_url", image_url: { url: `data:${r.mime};base64,${bytesToB64(r.bytes)}` } })),
    ];
    const res = await fetch(`${GATEWAY}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content }], modalities: ["image", "text"] }),
    });
    if (!res.ok) await failFrom(res, "Gemini image");
    const b64 = ((await res.json()) as any)?.data?.[0]?.b64_json;
    if (!b64) throw new ProviderError("Gemini image came back empty", true);
    return { bytes: b64ToBytes(b64), mime: "image/png", model };
  },
};
