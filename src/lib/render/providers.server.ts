// Registry: ai_settings.image_provider picks one. Add a provider by importing it here.
import type { ImageProvider } from "./types";
import { openaiProvider } from "./openai.server";
import { geminiProvider } from "./gemini.server";

const PROVIDERS: Record<string, ImageProvider> = {
  [openaiProvider.name]: openaiProvider,
  [geminiProvider.name]: geminiProvider,
};

export function getImageProvider(name: unknown): ImageProvider {
  return PROVIDERS[String(name ?? "").toLowerCase()] ?? openaiProvider;
}
