import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { decryptSecret } from "./providers";

/**
 * Web search for models that cannot search by themselves: the app runs the
 * search, reads the pages and hands their text to the model. (Claude through
 * Anthropic's API searches on its own — see `anthropicWebResearch`.)
 *
 * The engine is chosen in Settings › AI:
 *   duckduckgo  no key; reads DuckDuckGo's HTML results. Fine for occasional
 *               use, may be rate-limited.
 *   tavily      API key; made for this, returns page text with the results.
 *   brave       API key (Brave Search API).
 *   searxng     the URL of your own SearXNG instance (JSON format enabled).
 */

export const WEB_SEARCH_ENGINES = [
  "duckduckgo",
  "tavily",
  "brave",
  "searxng",
] as const;
export type WebSearchEngine = (typeof WEB_SEARCH_ENGINES)[number];

export type WebSearchConfig = {
  engine: WebSearchEngine;
  url?: string;
  apiKey?: string;
};

export type WebResult = {
  url: string;
  title: string;
  snippet: string;
  /** page text, when the engine returns it or the page was read */
  content?: string;
};

const SEARCH_TIMEOUT_MS = 15000;
const PAGE_TIMEOUT_MS = 12000;
const PAGE_MAX_BYTES = 1_500_000;
export const PAGE_MAX_CHARS = 6000;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export async function getWebSearchConfig(): Promise<WebSearchConfig> {
  const settings = await db.appSettings.findFirst({
    select: {
      webSearchEngine: true,
      webSearchUrl: true,
      webSearchApiKey: true,
    },
  });
  const engine = (WEB_SEARCH_ENGINES as readonly string[]).includes(
    settings?.webSearchEngine ?? "",
  )
    ? (settings!.webSearchEngine as WebSearchEngine)
    : "duckduckgo";
  return {
    engine,
    url: settings?.webSearchUrl?.trim().replace(/\/+$/, "") || undefined,
    apiKey: decryptSecret(settings?.webSearchApiKey),
  };
}

const getJson = async (url: string, init: RequestInit, what: string) => {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (init.signal?.aborted && (error as Error)?.name !== "TimeoutError") {
      throw error;
    }
    throw new Error(`Could not reach ${what}`);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `${what} responded ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return response.json();
};

const withTimeout = (signal: AbortSignal | undefined, ms: number) =>
  signal
    ? AbortSignal.any([signal, AbortSignal.timeout(ms)])
    : AbortSignal.timeout(ms);

/** DuckDuckGo wraps result links in a redirect; the real URL is in `uddg`. */
export const unwrapDuckDuckGoLink = (href: string) => {
  try {
    const url = new URL(href, "https://duckduckgo.com");
    const target = url.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : url.toString();
  } catch {
    return "";
  }
};

export const parseDuckDuckGoResults = (html: string): WebResult[] => {
  const $ = cheerio.load(html);
  const results: WebResult[] = [];
  $(".result").each((_, element) => {
    const link = $(element).find("a.result__a").first();
    const url = unwrapDuckDuckGoLink(link.attr("href") ?? "");
    const title = link.text().trim();
    // sponsored results point back at duckduckgo
    if (!url || !title || /duckduckgo\.com\/y\.js/.test(url)) return;
    results.push({
      url,
      title,
      snippet: $(element).find(".result__snippet").text().trim(),
    });
  });
  return results;
};

async function searchDuckDuckGo(query: string, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({ q: query }),
      signal: withTimeout(signal, SEARCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Could not reach DuckDuckGo");
  }
  if (!response.ok) {
    throw new Error(
      `DuckDuckGo responded ${response.status}. It limits automated searches; set up Tavily, Brave or SearXNG in Settings › AI for reliable results.`,
    );
  }
  return parseDuckDuckGoResults(await response.text());
}

async function searchTavily(
  config: WebSearchConfig,
  query: string,
  count: number,
  signal?: AbortSignal,
) {
  const json = await getJson(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: count,
        search_depth: "advanced",
        include_raw_content: true,
      }),
      signal: withTimeout(signal, SEARCH_TIMEOUT_MS * 2),
    },
    "Tavily",
  );
  return ((json?.results ?? []) as Record<string, unknown>[]).map(
    (r): WebResult => ({
      url: String(r.url ?? ""),
      title: String(r.title ?? r.url ?? ""),
      snippet: String(r.content ?? ""),
      content: typeof r.raw_content === "string" ? r.raw_content : undefined,
    }),
  );
}

async function searchBrave(
  config: WebSearchConfig,
  query: string,
  count: number,
  signal?: AbortSignal,
) {
  const json = await getJson(
    `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q: query, count: String(count) })}`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": config.apiKey ?? "",
      },
      signal: withTimeout(signal, SEARCH_TIMEOUT_MS),
    },
    "Brave Search",
  );
  return ((json?.web?.results ?? []) as Record<string, unknown>[]).map(
    (r): WebResult => ({
      url: String(r.url ?? ""),
      title: String(r.title ?? r.url ?? ""),
      snippet: cheerio
        .load(String(r.description ?? ""))
        .text()
        .trim(),
    }),
  );
}

async function searchSearxng(
  config: WebSearchConfig,
  query: string,
  signal?: AbortSignal,
) {
  const json = await getJson(
    `${config.url}/search?${new URLSearchParams({ q: query, format: "json" })}`,
    {
      headers: { Accept: "application/json" },
      signal: withTimeout(signal, SEARCH_TIMEOUT_MS),
    },
    "SearXNG",
  );
  return ((json?.results ?? []) as Record<string, unknown>[]).map(
    (r): WebResult => ({
      url: String(r.url ?? ""),
      title: String(r.title ?? r.url ?? ""),
      snippet: String(r.content ?? ""),
    }),
  );
}

/** Runs one search with the configured engine. */
export async function searchWeb(
  config: WebSearchConfig,
  query: string,
  count = 6,
  signal?: AbortSignal,
): Promise<WebResult[]> {
  if (config.engine === "tavily" || config.engine === "brave") {
    if (!config.apiKey) {
      throw new Error(
        `Web search is set to ${config.engine} but has no API key. Add it in Settings › AI.`,
      );
    }
  }
  if (config.engine === "searxng" && !config.url) {
    throw new Error(
      "Web search is set to SearXNG but has no URL. Add it in Settings › AI.",
    );
  }
  const results =
    config.engine === "tavily"
      ? await searchTavily(config, query, count, signal)
      : config.engine === "brave"
        ? await searchBrave(config, query, count, signal)
        : config.engine === "searxng"
          ? await searchSearxng(config, query, signal)
          : await searchDuckDuckGo(query, signal);
  return results.filter((r) => isPublicHttpUrl(r.url)).slice(0, count);
}

/**
 * Only public web pages are read: search results are outside input, and the
 * server must not be talked into fetching its own network.
 */
export const isPublicHttpUrl = (raw: string) => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !host.includes(":")) return false; // localhost, intranet names
  if (/\.(local|internal|lan|home|localhost)$/.test(host)) return false;
  if (host.includes(":")) return false; // IPv6 literals
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    ) {
      return false;
    }
  }
  return true;
};

/** A public-looking name can still point at a private address. */
const resolvesToPublicAddress = async (raw: string) => {
  try {
    const { address, family } = await lookup(new URL(raw).hostname);
    return family === 4 && isPublicHttpUrl(`http://${address}/`);
  } catch {
    return false;
  }
};

/** The readable text of an HTML page. */
export const pageText = (html: string, maxChars = PAGE_MAX_CHARS) => {
  const $ = cheerio.load(html);
  $(
    "script, style, noscript, nav, header, footer, aside, form, iframe, svg, button, select",
  ).remove();
  // .text() runs blocks together; keep paragraphs apart
  $("p, h1, h2, h3, h4, h5, h6, li, br, div, tr, blockquote, pre").after("\n");
  const root = $("article").first().length
    ? $("article").first()
    : $("main").first().length
      ? $("main").first()
      : $("body");
  const text = root
    .text()
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
};

/** Reads a page; an unreadable one is simply left out (empty string). */
export async function fetchPageText(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!isPublicHttpUrl(url)) return "";
  try {
    let current = url;
    let response: Response | null = null;
    // redirects are followed by hand so each hop is checked too
    for (let hop = 0; hop < 4; hop++) {
      if (!(await resolvesToPublicAddress(current))) return "";
      response = await fetch(current, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        redirect: "manual",
        signal: withTimeout(signal, PAGE_TIMEOUT_MS),
      });
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;
      current = new URL(location, current).toString();
      if (!isPublicHttpUrl(current)) return "";
    }
    if (!response?.ok) return "";
    if (!/html|text\/plain/.test(response.headers.get("content-type") ?? "")) {
      return "";
    }
    const reader = response.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < PAGE_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => undefined);
    return pageText(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (signal?.aborted) throw error;
    return "";
  }
}

/**
 * Searches for each query, merges the results and reads the top pages.
 * Returns pages that have some text, best first.
 */
export async function researchWeb(
  config: WebSearchConfig,
  queries: string[],
  options: { pages?: number; signal?: AbortSignal } = {},
): Promise<WebResult[]> {
  const { pages = 6, signal } = options;
  const merged = new Map<string, WebResult & { rank: number }>();
  let lastError: unknown = null;
  for (const query of queries) {
    try {
      const results = await searchWeb(config, query, 6, signal);
      results.forEach((result, i) => {
        const known = merged.get(result.url);
        // a page found by several queries moves up
        if (known) known.rank -= 3;
        else merged.set(result.url, { ...result, rank: i });
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  if (merged.size === 0) {
    if (lastError) throw lastError;
    return [];
  }
  const top = [...merged.values()]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, pages);
  const read = await Promise.all(
    top.map(async ({ rank: _rank, ...result }) => ({
      ...result,
      content: (
        result.content?.slice(0, PAGE_MAX_CHARS) ||
        (await fetchPageText(result.url, signal)) ||
        result.snippet
      ).trim(),
    })),
  );
  return read.filter((r) => r.content);
}
