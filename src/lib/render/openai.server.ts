// OpenAI image edit endpoint (multipart, reference photos as image[] parts).
import { GATEWAY, ProviderError, b64ToBytes, failFrom, type ImageProvider } from "./types";

export const openaiProvider: ImageProvider = {
  name: "openai",
  defaultModel: "openai/gpt-image-2.5-sunburst",
  accepts: (m) => m.startsWith("openai/gpt-image"),
  async generate(req, apiKey) {
    const model = req.model && this.accepts(req.model) ? req.model : this.defaultModel;
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", req.prompt);
    form.append("size", req.size === "portrait" ? "1024x1536" : "1024x1024");
    for (const r of req.refs) form.append("image[]", new File([r.bytes as BlobPart], r.name, { type: r.mime }));
    const res = await fetch(`${GATEWAY}/images/edits`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    if (!res.ok) await failFrom(res, "OpenAI image");
    const b64 = ((await res.json()) as any)?.data?.[0]?.b64_json;
    if (!b64) throw new ProviderError("OpenAI image came back empty", true);
    return { bytes: b64ToBytes(b64), mime: "image/png", model };
  },
};
