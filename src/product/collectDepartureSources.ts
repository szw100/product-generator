import type { PartnerSource } from "../types.js";

export interface DepartureSourceBundle {
  pageUrl: string;
  pageText: string;
  apiUrl?: string;
  apiText?: string;
  notes: string[];
}

export async function collectDepartureSources(
  partner: PartnerSource,
  timeoutMs: number,
): Promise<DepartureSourceBundle> {
  const pageUrl = partner.url;
  const notes: string[] = [];
  const pageText = await fetchText(pageUrl, timeoutMs);
  const host = new URL(pageUrl).hostname.toLowerCase();

  if (!host.includes("intrepidtravel.com")) {
    return { pageUrl, pageText, notes };
  }

  const productId = readIntrepidProductId(pageUrl);
  const productCode = readIntrepidProductCode(pageText);
  if (!productId || !productCode) {
    notes.push("Intrepid product id or trip code was not found on the product page.");
    return { pageUrl, pageText, notes };
  }

  const locale = readIntrepidLocale(pageUrl);
  const currency = readIntrepidCurrency(pageUrl, pageText);
  const apiUrl = buildIntrepidDeparturesUrl({
    pageUrl,
    productId,
    productCode,
    locale,
    currency,
  });

  try {
    const apiText = await fetchText(apiUrl, timeoutMs);
    return { pageUrl, pageText, apiUrl, apiText, notes };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "request failed";
    notes.push(`Intrepid departures API request failed: ${detail}`);
    return { pageUrl, pageText, apiUrl, notes };
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "User-Agent": "product-generator/0.1",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function readIntrepidProductId(pageUrl: string): string | undefined {
  const match = pageUrl.match(/-(\d+)(?:\/)?(?:\?.*)?$/);
  return match?.[1];
}

function readIntrepidProductCode(pageText: string): string | undefined {
  const patterns = [
    /Trip code:\s*([A-Z0-9]+)/i,
    /"productCode"\s*:\s*"([A-Z0-9]+)"/i,
    /product_code=([A-Z0-9]+)/i,
  ];
  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return undefined;
}

function readIntrepidLocale(pageUrl: string): string {
  const path = new URL(pageUrl).pathname.toLowerCase();
  const match = path.match(/^\/([a-z]{2})(?:\/|$)/);
  return match?.[1] ?? "au";
}

function readIntrepidCurrency(pageUrl: string, pageText: string): string {
  const path = new URL(pageUrl).pathname.toLowerCase();
  const segments = path.split("/").filter(Boolean);
  const knownCurrencies = new Set(["aud", "usd", "cad", "eur", "gbp", "nzd", "zar"]);
  if (segments.length >= 2 && knownCurrencies.has(segments[1]!)) {
    return segments[1]!;
  }

  const textMatch = pageText.match(/\b(AUD|USD|CAD|EUR|GBP|NZD|ZAR)\b/);
  return (textMatch?.[1] ?? "AUD").toLowerCase();
}

function buildIntrepidDeparturesUrl(input: {
  pageUrl: string;
  productId: string;
  productCode: string;
  locale: string;
  currency: string;
}): string {
  const origin = new URL(input.pageUrl).origin;
  const startDate = formatIsoDate(new Date());
  const params = new URLSearchParams({
    product_code: input.productCode,
    product_id: input.productId,
    currency_code: input.currency,
    locale_code: input.locale,
    start_date: startDate,
    order_by: "from_date_asc",
    filter_deals: "false",
    page_number: "1",
    page_size: "500",
  });

  return `${origin}/api/product/available-years-months-and-departures?${params.toString()}`;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
