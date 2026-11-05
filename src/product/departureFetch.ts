import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 2_000_000;
const LOCAL_HOSTS = new Set(["localhost", "localhost.localdomain"]);

const blockedAddresses = new BlockList();
blockedAddresses.addSubnet("0.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("10.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("100.64.0.0", 10, "ipv4");
blockedAddresses.addSubnet("127.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("169.254.0.0", 16, "ipv4");
blockedAddresses.addSubnet("172.16.0.0", 12, "ipv4");
blockedAddresses.addSubnet("192.168.0.0", 16, "ipv4");
blockedAddresses.addSubnet("224.0.0.0", 4, "ipv4");
blockedAddresses.addSubnet("240.0.0.0", 4, "ipv4");
blockedAddresses.addAddress("::", "ipv6");
blockedAddresses.addAddress("::1", "ipv6");
blockedAddresses.addSubnet("fc00::", 7, "ipv6");
blockedAddresses.addSubnet("fe80::", 10, "ipv6");
blockedAddresses.addSubnet("fec0::", 10, "ipv6");
blockedAddresses.addSubnet("ff00::", 8, "ipv6");

export function explainDepartureUrlRejection(
  target: string,
  productUrl: string,
): string | undefined {
  const product = parseUrl(productUrl);
  if (!product) {
    return "product URL is invalid";
  }

  const url = parseUrl(target);
  if (!url) {
    return "URL is invalid";
  }

  if (url.protocol !== "https:") {
    return "only https URLs are allowed";
  }

  if (url.username !== "" || url.password !== "") {
    return "URL userinfo is not allowed";
  }

  const hostname = normalizeHostname(url.hostname);
  if (hostname === "") {
    return "URL host is missing";
  }

  if (LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost")) {
    return "localhost is not allowed";
  }

  if (hostname !== normalizeHostname(product.hostname)) {
    return "URL host must match the product host";
  }

  if (portOf(url) !== portOf(product)) {
    return "URL port must match the product URL";
  }

  if (isIP(hostname) !== 0 && !isPublicIpAddress(hostname)) {
    return "URL address is not public";
  }

  return undefined;
}

const BROWSE_PAGE_DATA_TYPES = new Set(["document", "xhr", "fetch", "eventsource", "websocket"]);
const BROWSE_ASSET_TYPES = new Set([
  "stylesheet",
  "image",
  "media",
  "font",
  "script",
  "texttrack",
  "manifest",
  "other",
]);

export function explainBrowseRequest(
  target: string,
  productUrl: string,
  resourceType: string,
): string | undefined {
  if (target === "about:blank") {
    return undefined;
  }

  if (BROWSE_PAGE_DATA_TYPES.has(resourceType)) {
    return explainDepartureUrlRejection(target, productUrl);
  }

  if (!BROWSE_ASSET_TYPES.has(resourceType)) {
    return "request type is not allowed";
  }

  return explainPublicAssetUrl(target);
}

function explainPublicAssetUrl(target: string): string | undefined {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return "URL is invalid";
  }

  if (url.protocol === "data:" || url.protocol === "blob:") {
    return undefined;
  }

  if (url.protocol !== "https:") {
    return "only https URLs are allowed";
  }

  if (url.username !== "" || url.password !== "") {
    return "URL userinfo is not allowed";
  }

  const hostname = normalizeHostname(url.hostname);
  if (hostname === "") {
    return "URL host is missing";
  }

  if (LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost")) {
    return "localhost is not allowed";
  }

  if (isIP(hostname) !== 0 && !isPublicIpAddress(hostname)) {
    return "URL address is not public";
  }

  return undefined;
}

export function isPublicIpAddress(address: string): boolean {
  const candidate = unwrapIpv4Mapped(address) ?? address;
  const family = isIP(candidate);
  if (family === 0) {
    return false;
  }

  return !blockedAddresses.check(candidate, family === 4 ? "ipv4" : "ipv6");
}

export async function fetchDepartureUrl(
  target: string,
  productUrl: string,
  timeoutMs: number,
): Promise<string> {
  let current = target;

  for (let redirectCount = 0; ; redirectCount += 1) {
    const rejection = explainDepartureUrlRejection(current, productUrl);
    if (rejection) {
      return `Fetch rejected: ${rejection}`;
    }

    const hostname = normalizeHostname(new URL(current).hostname);
    const dnsRejection = await explainHostnameRejection(hostname);
    if (dnsRejection) {
      return `Fetch rejected: ${dnsRejection}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
          "User-Agent": "product-generator/0.1",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) {
          return "Fetch failed: redirect missing location";
        }
        if (redirectCount >= MAX_REDIRECTS) {
          return "Fetch rejected: too many redirects";
        }
        current = new URL(location, current).href;
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        return `Fetch failed: HTTP ${response.status}`;
      }

      return await readCappedText(response, MAX_BODY_BYTES);
    } catch (error) {
      if (controller.signal.aborted) {
        return "Fetch failed: timed out";
      }

      const detail = error instanceof Error ? error.message : "request failed";
      return `Fetch failed: ${detail}`;
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function explainHostnameRejection(hostname: string): Promise<string | undefined> {
  if (isIP(hostname) !== 0) {
    return isPublicIpAddress(hostname) ? undefined : "URL address is not public";
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "lookup failed";
    return `DNS lookup failed: ${detail}`;
  }

  if (records.length === 0) {
    return "DNS lookup returned no addresses";
  }

  for (const record of records) {
    if (!isPublicIpAddress(record.address)) {
      return "resolved address is not public";
    }
  }

  return undefined;
}

async function readCappedText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  let cancelled = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value || value.byteLength === 0) {
        continue;
      }

      const remaining = maxBytes - total;
      if (value.byteLength > remaining) {
        if (remaining > 0) {
          chunks.push(value.subarray(0, remaining));
          total += remaining;
        }
        truncated = true;
        cancelled = true;
        await reader.cancel();
        break;
      }

      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    if (!cancelled) {
      reader.releaseLock();
    }
  }

  const text = new TextDecoder().decode(concatBytes(chunks, total));
  if (!truncated) {
    return text;
  }

  return `${text}\n...[truncated]`;
}

function concatBytes(chunks: Uint8Array[], total: number): Uint8Array {
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function normalizeHostname(hostname: string): string {
  const normalized = hostname.toLowerCase();
  return normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
}

function portOf(url: URL): string {
  if (url.port !== "") {
    return url.port;
  }

  return url.protocol === "https:" ? "443" : "";
}

function unwrapIpv4Mapped(address: string): string | undefined {
  const lower = address.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    if (isIP(mapped) === 4) {
      return mapped;
    }
  }

  return undefined;
}
