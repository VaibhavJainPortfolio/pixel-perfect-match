// Image provider contract for outfit renders. A new provider = one file implementing ImageProvider,
// registered in ./providers.server.ts.
export type RefImage = { bytes: Uint8Array; mime: string; name: string };

export type RenderRequest = {
  prompt: string;
  refs: RefImage[];          // ordered: face first, then body
  model?: string;            // ai_settings.image_model; provider falls back to its default when empty/invalid
  size: "portrait" | "square";
};

export type RenderResult = { bytes: Uint8Array; mime: string; model: string };

export interface ImageProvider {
  name: string;
  defaultModel: string;
  /** True when the id belongs to this provider (used to ignore a mismatched image_model setting). */
  accepts(model: string): boolean;
  generate(req: RenderRequest, apiKey: string): Promise<RenderResult>;
}

export class ProviderError extends Error {
  constructor(msg: string, public retryable: boolean) { super(msg); }
}

export const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export function b64ToBytes(b64: string) { return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }
export function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export async function failFrom(res: Response, label: string): Promise<never> {
  const t = (await res.text()).slice(0, 300);
  throw new ProviderError(`${label} failed (${res.status}): ${t}`, res.status === 429 || res.status >= 500);
}
