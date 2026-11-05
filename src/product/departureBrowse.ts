import { chromium, type Browser, type Request, type Response } from "playwright";
import {
  explainBrowseRequest,
  explainDepartureUrlRejection,
  explainHostnameRejection,
} from "./departureFetch.js";

const MIN_BROWSE_TIMEOUT_MS = 60_000;
const MAX_RENDERED_CHARS = 40_000;
const MAX_JSON_CHARS = 120_000;
const MAX_JSON_RESPONSES = 8;
const MAX_RESPONSE_BYTES = 2_000_000;

export async function browseDepartureUrl(
  target: string,
  productUrl: string,
  timeoutMs: number,
): Promise<string> {
  const rejection = explainDepartureUrlRejection(target, productUrl);
  if (rejection) {
    return `Browse rejected: ${rejection}`;
  }

  const hostname = hostnameOf(target);
  if (!hostname) {
    return "Browse rejected: URL is invalid";
  }

  const dnsRejection = await explainHostnameRejection(hostname);
  if (dnsRejection) {
    return `Browse rejected: ${dnsRejection}`;
  }

  const browseTimeout = Math.max(timeoutMs, MIN_BROWSE_TIMEOUT_MS);
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    page.setDefaultTimeout(browseTimeout);
    page.on("download", (download) => {
      void download.cancel();
    });
    const dnsCache = new Map<string, Promise<string | undefined>>();
    const captures: CapturedJson[] = [];
    const pending: Promise<void>[] = [];

    await page.route("**/*", async (route) => {
      const request = route.request();
      const decision = await decideRequest(request, productUrl, dnsCache);
      if (decision) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    page.on("response", (response) => {
      pending.push(captureJsonResponse(response, productUrl, captures));
    });

    await page.goto(target, { waitUntil: "domcontentloaded", timeout: browseTimeout });
    await page.waitForLoadState("networkidle", { timeout: browseTimeout }).catch(() => undefined);
    await Promise.all(pending);

    const rendered = await page
      .locator("body")
      .innerText({ timeout: 5_000 })
      .catch(() => "");

    return formatBrowseResult(rendered, captures);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "request failed";
    return `Browse failed: ${detail}`;
  } finally {
    await browser?.close();
  }
}

async function decideRequest(
  request: Request,
  productUrl: string,
  dnsCache: Map<string, Promise<string | undefined>>,
): Promise<string | undefined> {
  const target = request.url();
  const rejection = explainBrowseRequest(target, productUrl, request.resourceType());
  if (rejection) {
    return rejection;
  }

  const hostname = hostnameOf(target);
  if (!hostname) {
    return undefined;
  }

  return cachedHostnameRejection(hostname, dnsCache);
}

function cachedHostnameRejection(
  hostname: string,
  dnsCache: Map<string, Promise<string | undefined>>,
): Promise<string | undefined> {
  const existing = dnsCache.get(hostname);
  if (existing) {
    return existing;
  }

  const pending = explainHostnameRejection(hostname);
  dnsCache.set(hostname, pending);
  return pending;
}

async function captureJsonResponse(
  response: Response,
  productUrl: string,
  captures: CapturedJson[],
): Promise<void> {
  try {
    if (captures.length >= MAX_JSON_RESPONSES) {
      return;
    }

    const resourceType = response.request().resourceType();
    if (resourceType !== "xhr" && resourceType !== "fetch") {
      return;
    }

    const url = response.url();
    if (explainDepartureUrlRejection(url, productUrl) || !response.ok()) {
      return;
    }

    const length = Number(response.headers()["content-length"] ?? "0");
    if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
      return;
    }

    const body = await response.text();
    if (!isJsonPayload(response.headers()["content-type"] ?? "", body)) {
      return;
    }

    if (captures.length >= MAX_JSON_RESPONSES) {
      return;
    }

    captures.push({
      url,
      body: capText(body, MAX_JSON_CHARS),
    });
  } catch {
    return;
  }
}

function formatBrowseResult(rendered: string, captures: CapturedJson[]): string {
  const parts = ["Rendered text:", capText(rendered.trim(), MAX_RENDERED_CHARS)];
  if (captures.length === 0) {
    parts.push("", "Same-host JSON responses: none");
    return parts.join("\n");
  }

  parts.push("", "Same-host JSON responses:");
  for (const capture of captures) {
    parts.push(`URL: ${capture.url}`, capture.body, "");
  }

  return parts.join("\n").trim();
}

function isJsonPayload(contentType: string, body: string): boolean {
  if (contentType.toLowerCase().includes("json")) {
    return true;
  }

  const trimmed = body.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function capText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

function hostnameOf(target: string): string | undefined {
  try {
    const hostname = new URL(target).hostname.toLowerCase();
    if (hostname === "") {
      return undefined;
    }

    return hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
  } catch {
    return undefined;
  }
}

interface CapturedJson {
  url: string;
  body: string;
}
