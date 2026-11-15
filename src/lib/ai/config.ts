/**
 * Which chat model an AI request goes to.
 *
 * Any number of providers can be configured in Settings › AI (stored in the
 * database, keys encrypted — see `providers.ts`). The environment still
 * works and shows up as one more provider:
 *
 *   AI_BASE_URL  e.g. https://api.openai.com/v1  or  http://localhost:11434/v1
 *   AI_MODEL     model name as the server knows it
 *   AI_API_KEY   optional for local servers
 *
 * This file holds only what the browser may also import: types and presets.
 */

/** How a provider is spoken to. */
export const AI_PROVIDER_KINDS = ["openai", "anthropic"] as const;
export type AiProviderKind = (typeof AI_PROVIDER_KINDS)[number];

/** A resolved provider + model, with its key. Server-side only. */
export type AiConfig = {
  kind: AiProviderKind;
  /** empty for anthropic = the official endpoint */
  baseUrl: string;
  model: string;
  apiKey?: string;
  providerId: string;
  /** "OpenAI · gpt-4o", for messages and for labelling what the AI wrote */
  label: string;
};

/** The provider set through the environment. */
export const ENV_PROVIDER_ID = "env";

/** What a request names to choose its model. */
export type AiSelection = { providerId: string; model: string };

/** A provider as the browser sees it: no URL, no key. */
export type AiProviderOption = {
  id: string;
  name: string;
  kind: AiProviderKind;
  models: string[];
  defaultModel: string;
};

export type AiOptions = {
  providers: AiProviderOption[];
  /** what a request without a selection uses; null when nothing is set up */
  default: AiSelection | null;
  /** the signed-in user's own default, if they chose one */
  userDefault: AiSelection | null;
  /** the app-wide default, if an admin chose one */
  appDefault: AiSelection | null;
};

export const AI_NOT_CONFIGURED =
  "No AI provider is set up. An admin can add one in Settings › AI, or set AI_BASE_URL and AI_MODEL in the server environment.";

/** Starting points offered when adding a provider. */
export const AI_PROVIDER_PRESETS: {
  label: string;
  kind: AiProviderKind;
  baseUrl: string;
  models: string[];
  keyHint: string;
}[] = [
  {
    label: "Anthropic (Claude)",
    kind: "anthropic",
    baseUrl: "",
    models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"],
    keyHint: "sk-ant-…",
  },
  {
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: [],
    keyHint: "sk-…",
  },
  {
    label: "Google Gemini",
    kind: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: [],
    keyHint: "Gemini API key",
  },
  {
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [],
    keyHint: "sk-or-…",
  },
  {
    label: "Ollama (local)",
    kind: "openai",
    baseUrl: "http://localhost:11434/v1",
    models: [],
    keyHint: "not needed",
  },
  {
    label: "Other OpenAI-compatible",
    kind: "openai",
    baseUrl: "",
    models: [],
    keyHint: "if the server needs one",
  },
];

export const selectionKey = (s: AiSelection) => `${s.providerId}::${s.model}`;

export const parseSelectionKey = (key: string): AiSelection | null => {
  const at = key.indexOf("::");
  if (at <= 0 || at + 2 >= key.length) return null;
  return { providerId: key.slice(0, at), model: key.slice(at + 2) };
};
