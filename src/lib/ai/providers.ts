import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/auth/totp";
import {
  AI_NOT_CONFIGURED,
  AI_PROVIDER_KINDS,
  AiConfig,
  AiOptions,
  AiProviderKind,
  AiProviderOption,
  AiSelection,
  ENV_PROVIDER_ID,
} from "./config";

/**
 * Server side of the provider settings: reads the providers, decrypts their
 * keys and decides which one a request uses. Keys are encrypted at rest with
 * the same secret as the TOTP secrets (TOTP_ENCRYPTION_KEY) and never leave
 * the server.
 */

export const encryptSecret = (value: string) => encrypt(value);

export const decryptSecret = (value: string | null | undefined) => {
  if (!value) return undefined;
  try {
    return decrypt(value) || undefined;
  } catch {
    // encrypted with another TOTP_ENCRYPTION_KEY: the key has to be re-entered
    console.error("An AI secret could not be decrypted; enter it again.");
    return undefined;
  }
};

const cleanUrl = (url: string | undefined | null) =>
  url?.trim().replace(/\/+$/, "") ?? "";

const asKind = (kind: string): AiProviderKind =>
  (AI_PROVIDER_KINDS as readonly string[]).includes(kind)
    ? (kind as AiProviderKind)
    : "openai";

type ProviderRecord = {
  id: string;
  name: string;
  kind: AiProviderKind;
  baseUrl: string;
  apiKey?: string;
  models: string[];
  defaultModel: string;
};

/** The provider described by AI_BASE_URL / AI_MODEL, if set. */
const envProvider = (): ProviderRecord | null => {
  const baseUrl = cleanUrl(process.env.AI_BASE_URL);
  const model = process.env.AI_MODEL?.trim();
  if (!baseUrl || !model) return null;
  const ragModel = process.env.AI_RAG_MODEL?.trim();
  return {
    id: ENV_PROVIDER_ID,
    name: "Server environment",
    kind: "openai",
    baseUrl,
    apiKey: process.env.AI_API_KEY?.trim() || undefined,
    models: [...new Set([model, ...(ragModel ? [ragModel] : [])])],
    defaultModel: model,
  };
};

/** Enabled providers that have at least one model, the environment's last. */
async function loadProviders(): Promise<ProviderRecord[]> {
  const rows = await db.aiProvider.findMany({
    where: { enabled: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  const providers: ProviderRecord[] = rows
    .filter((row) => row.models.length > 0)
    .map((row) => ({
      id: row.id,
      name: row.name,
      kind: asKind(row.kind),
      baseUrl: cleanUrl(row.baseUrl),
      apiKey: decryptSecret(row.apiKey),
      models: row.models,
      defaultModel: row.models.includes(row.defaultModel)
        ? row.defaultModel
        : row.models[0],
    }));
  const env = envProvider();
  return env ? [...providers, env] : providers;
}

const toConfig = (provider: ProviderRecord, model: string): AiConfig => ({
  kind: provider.kind,
  baseUrl: provider.baseUrl,
  model,
  apiKey: provider.apiKey,
  providerId: provider.id,
  label: `${provider.name} · ${model}`,
});

const pick = (
  providers: ProviderRecord[],
  selection: { providerId?: string | null; model?: string | null } | null,
): { provider: ProviderRecord; model: string } | null => {
  if (!selection?.providerId) return null;
  const provider = providers.find((p) => p.id === selection.providerId);
  if (!provider) return null;
  const model =
    selection.model && provider.models.includes(selection.model)
      ? selection.model
      : null;
  // a default whose model was since removed still means "this provider"
  return { provider, model: model ?? provider.defaultModel };
};

async function loadDefaults(userId?: string | null) {
  const [user, app] = await Promise.all([
    userId
      ? db.user.findUnique({
          where: { id: userId },
          select: { aiProviderId: true, aiModel: true },
        })
      : null,
    db.appSettings.findFirst({
      select: { aiProviderId: true, aiModel: true },
    }),
  ]);
  const stored = (
    row: { aiProviderId: string | null; aiModel: string | null } | null,
  ) => (row ? { providerId: row.aiProviderId, model: row.aiModel } : null);
  return { user: stored(user), app: stored(app) };
}

/**
 * The provider and model a request uses: what the request names, else the
 * user's default, else the app's, else the environment, else the first
 * provider there is. Null when nothing is configured.
 *
 * A request can only name a model an admin listed for the provider.
 */
export async function resolveAiConfig(
  selection?: AiSelection | null,
  userId?: string | null,
): Promise<AiConfig | null> {
  const providers = await loadProviders();
  if (providers.length === 0) return null;
  if (selection) {
    const provider = providers.find((p) => p.id === selection.providerId);
    if (!provider || !provider.models.includes(selection.model)) {
      throw new Error(
        "The selected AI model is no longer available. Pick another one.",
      );
    }
    return toConfig(provider, selection.model);
  }
  const { user, app } = await loadDefaults(userId);
  const chosen =
    pick(providers, user) ??
    pick(providers, app) ??
    pick(providers, { providerId: ENV_PROVIDER_ID }) ??
    { provider: providers[0], model: providers[0].defaultModel };
  return toConfig(chosen.provider, chosen.model);
}

/** Like `resolveAiConfig`, but an unconfigured app is an error. */
export async function requireAiConfig(
  selection?: AiSelection | null,
  userId?: string | null,
): Promise<AiConfig> {
  const config = await resolveAiConfig(selection, userId);
  if (!config) throw new Error(AI_NOT_CONFIGURED);
  return config;
}

/** True when at least one provider can take requests. */
export async function aiConfigured() {
  return (await loadProviders()).length > 0;
}

/** What the model picker shows: providers and models, never URLs or keys. */
export async function listAiOptions(userId?: string | null): Promise<AiOptions> {
  const providers = await loadProviders();
  const { user, app } = await loadDefaults(userId);
  const asSelection = (
    hit: ReturnType<typeof pick>,
  ): AiSelection | null =>
    hit ? { providerId: hit.provider.id, model: hit.model } : null;
  const userDefault = asSelection(pick(providers, user));
  const appDefault = asSelection(pick(providers, app));
  const fallback =
    pick(providers, { providerId: ENV_PROVIDER_ID }) ??
    (providers[0]
      ? { provider: providers[0], model: providers[0].defaultModel }
      : null);
  return {
    providers: providers.map(
      (p): AiProviderOption => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        models: p.models,
        defaultModel: p.defaultModel,
      }),
    ),
    default: userDefault ?? appDefault ?? asSelection(fallback),
    userDefault,
    appDefault,
  };
}
