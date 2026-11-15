"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  AI_PROVIDER_KINDS,
  AiConfig,
  AiProviderKind,
  AiSelection,
  ENV_PROVIDER_ID,
} from "@/lib/ai/config";
import {
  decryptSecret,
  encryptSecret,
  listAiOptions,
  resolveAiConfig,
} from "@/lib/ai/providers";
import { chatComplete, listModels } from "@/lib/ai/client";
import { anthropicModels } from "@/lib/ai/anthropic";
import {
  getWebSearchConfig,
  searchWeb,
  WEB_SEARCH_ENGINES,
  WebSearchEngine,
} from "@/lib/ai/web-search";

type Response<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

const fail = (error: unknown, fallback: string): Response<never> => ({
  status: "error",
  error: error instanceof Error ? error.message : fallback,
});

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Admin access required");
  return user;
}

/** A provider as the settings page shows it: the key itself never leaves. */
export type AiProviderSettings = {
  id: string;
  name: string;
  kind: AiProviderKind;
  baseUrl: string;
  hasKey: boolean;
  models: string[];
  defaultModel: string;
  enabled: boolean;
};

export type AiAdminSettings = {
  providers: AiProviderSettings[];
  /** whether AI_BASE_URL / AI_MODEL are set on the server */
  environment: boolean;
  webSearch: { engine: WebSearchEngine; url: string; hasKey: boolean };
};

const cleanUrl = (url: string) => url.trim().replace(/\/+$/, "");

export async function getAiAdminSettings(): Promise<Response<AiAdminSettings>> {
  try {
    await requireAdmin();
    const [rows, web] = await Promise.all([
      db.aiProvider.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
      getWebSearchConfig(),
    ]);
    return {
      status: "success",
      data: {
        providers: rows.map((row) => ({
          id: row.id,
          name: row.name,
          kind: row.kind === "anthropic" ? "anthropic" : "openai",
          baseUrl: row.baseUrl,
          hasKey: !!row.apiKey,
          models: row.models,
          defaultModel: row.defaultModel,
          enabled: row.enabled,
        })),
        environment: !!(
          process.env.AI_BASE_URL?.trim() && process.env.AI_MODEL?.trim()
        ),
        webSearch: {
          engine: web.engine,
          url: web.url ?? "",
          hasKey: !!web.apiKey,
        },
      },
    };
  } catch (error) {
    return fail(error, "Could not load the AI settings");
  }
}

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);

const connectionSchema = z.object({
  /** an existing provider, whose saved key is used when none is typed */
  id: objectId.optional(),
  kind: z.enum(AI_PROVIDER_KINDS),
  baseUrl: z.string().trim().max(500),
  /** omitted = keep the saved key; empty = no key */
  apiKey: z.string().trim().max(500).optional(),
});

const providerSchema = connectionSchema.extend({
  name: z.string().trim().min(1, "Give the provider a name").max(60),
  models: z
    .array(z.string().trim().min(1).max(200))
    .min(1, "Add at least one model")
    .max(100),
  defaultModel: z.string().trim().max(200),
  enabled: z.boolean(),
});

const checkUrl = (kind: AiProviderKind, baseUrl: string) => {
  if (!baseUrl) {
    if (kind === "anthropic") return;
    throw new Error("Enter the base URL of the server, e.g. https://api.openai.com/v1");
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("The base URL is not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The base URL must start with http:// or https://");
  }
};

/** The connection a form describes, with the saved key when none was typed. */
async function connection(
  input: z.infer<typeof connectionSchema>,
): Promise<Omit<AiConfig, "model">> {
  const baseUrl = cleanUrl(input.baseUrl);
  checkUrl(input.kind, baseUrl);
  let apiKey = input.apiKey || undefined;
  if (input.apiKey === undefined && input.id) {
    const saved = await db.aiProvider.findUnique({
      where: { id: input.id },
      select: { apiKey: true },
    });
    apiKey = decryptSecret(saved?.apiKey);
  }
  return {
    kind: input.kind,
    baseUrl,
    apiKey,
    providerId: input.id ?? "new",
    label: "",
  };
}

export async function saveAiProvider(
  input: z.input<typeof providerSchema>,
): Promise<Response<{ id: string }>> {
  try {
    await requireAdmin();
    const parsed = providerSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid provider");
    }
    const { id, apiKey, ...rest } = parsed.data;
    const baseUrl = cleanUrl(rest.baseUrl);
    checkUrl(rest.kind, baseUrl);
    const models = [...new Set(rest.models)];
    const data = {
      name: rest.name,
      kind: rest.kind,
      baseUrl,
      models,
      defaultModel: models.includes(rest.defaultModel)
        ? rest.defaultModel
        : models[0],
      enabled: rest.enabled,
      ...(apiKey === undefined
        ? {}
        : { apiKey: apiKey ? encryptSecret(apiKey) : null }),
    };
    if (id) {
      await db.aiProvider.update({ where: { id }, data });
      return { status: "success", data: { id } };
    }
    const last = await db.aiProvider.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const created = await db.aiProvider.create({
      data: { ...data, order: last ? last.order + 1 : 0 },
    });
    return { status: "success", data: { id: created.id } };
  } catch (error) {
    return fail(error, "Could not save the provider");
  }
}

export async function deleteAiProvider(
  id: string,
): Promise<Response<{ id: string }>> {
  try {
    await requireAdmin();
    if (!objectId.safeParse(id).success) throw new Error("Invalid provider");
    await db.aiProvider.delete({ where: { id } });
    return { status: "success", data: { id } };
  } catch (error) {
    return fail(error, "Could not delete the provider");
  }
}

/** Asks the server which models it offers, to fill the model list. */
export async function fetchAiProviderModels(
  input: z.input<typeof connectionSchema>,
): Promise<Response<string[]>> {
  try {
    await requireAdmin();
    const config = await connection(connectionSchema.parse(input));
    const models =
      config.kind === "anthropic"
        ? await anthropicModels(config)
        : await listModels(config);
    if (models.length === 0) {
      throw new Error("The server listed no models. Type the model names in.");
    }
    return { status: "success", data: models };
  } catch (error) {
    return fail(error, "Could not list the models");
  }
}

/** Sends one tiny request to check the URL, key and model work together. */
export async function testAiProvider(
  input: z.input<typeof connectionSchema> & { model: string },
): Promise<Response<{ reply: string }>> {
  try {
    await requireAdmin();
    const model = z.string().trim().min(1).max(200).parse(input.model);
    const config = await connection(connectionSchema.parse(input));
    const reply = await chatComplete(
      { ...config, model, label: model },
      [{ role: "user", content: "Reply with the single word: ready" }],
      AbortSignal.timeout(60000),
    );
    return { status: "success", data: { reply: reply.trim().slice(0, 200) } };
  } catch (error) {
    return fail(error, "The test request failed");
  }
}

const selectionSchema = z
  .object({
    providerId: z.string().min(1).max(64),
    model: z.string().min(1).max(200),
  })
  .nullable();

/** Checks a default names a model that exists; null clears the default. */
async function checkedSelection(input: unknown): Promise<AiSelection | null> {
  const selection = selectionSchema.parse(input);
  if (!selection) return null;
  if (
    selection.providerId !== ENV_PROVIDER_ID &&
    !objectId.safeParse(selection.providerId).success
  ) {
    throw new Error("Unknown provider");
  }
  await resolveAiConfig(selection); // throws when it is not available
  return selection;
}

/** The model used by everyone who has not chosen their own. Admin only. */
export async function setAppAiDefault(
  input: AiSelection | null,
): Promise<Response<null>> {
  try {
    await requireAdmin();
    const selection = await checkedSelection(input);
    const data = {
      aiProviderId: selection?.providerId ?? null,
      aiModel: selection?.model ?? null,
    };
    const settings = await db.appSettings.findFirst({ select: { id: true } });
    if (settings) await db.appSettings.update({ where: { id: settings.id }, data });
    else await db.appSettings.create({ data });
    return { status: "success", data: null };
  } catch (error) {
    return fail(error, "Could not save the default");
  }
}

/** The signed-in user's own default model; null goes back to the app's. */
export async function setUserAiDefault(
  input: AiSelection | null,
): Promise<Response<null>> {
  try {
    const user = await requireUser();
    const selection = await checkedSelection(input);
    await db.user.update({
      where: { id: user.id },
      data: {
        aiProviderId: selection?.providerId ?? null,
        aiModel: selection?.model ?? null,
      },
    });
    return { status: "success", data: null };
  } catch (error) {
    return fail(error, "Could not save your default");
  }
}

const webSearchSchema = z.object({
  engine: z.enum(WEB_SEARCH_ENGINES),
  url: z.string().trim().max(500),
  /** omitted = keep the saved key; empty = no key */
  apiKey: z.string().trim().max(500).optional(),
});

export async function saveWebSearchSettings(
  input: z.input<typeof webSearchSchema>,
): Promise<Response<null>> {
  try {
    await requireAdmin();
    const { engine, url, apiKey } = webSearchSchema.parse(input);
    if (engine === "searxng") checkUrl("openai", cleanUrl(url));
    const data = {
      webSearchEngine: engine,
      webSearchUrl: cleanUrl(url) || null,
      ...(apiKey === undefined
        ? {}
        : { webSearchApiKey: apiKey ? encryptSecret(apiKey) : null }),
    };
    const settings = await db.appSettings.findFirst({ select: { id: true } });
    if (settings) await db.appSettings.update({ where: { id: settings.id }, data });
    else await db.appSettings.create({ data });
    return { status: "success", data: null };
  } catch (error) {
    return fail(error, "Could not save the web search settings");
  }
}

/** Runs one search with the saved settings and returns the first titles. */
export async function testWebSearch(): Promise<Response<string[]>> {
  try {
    await requireAdmin();
    const results = await searchWeb(
      await getWebSearchConfig(),
      "Bhagavad Gita 2.47 commentary Shankara Ramanuja",
      5,
    );
    if (results.length === 0) throw new Error("The search returned nothing.");
    return { status: "success", data: results.map((r) => r.title) };
  } catch (error) {
    return fail(error, "The test search failed");
  }
}

/** Providers and defaults for the settings page of any signed-in user. */
export async function getAiOptions() {
  try {
    const user = await requireUser();
    return { status: "success" as const, data: await listAiOptions(user.id) };
  } catch (error) {
    return fail(error, "Could not load the AI models");
  }
}
