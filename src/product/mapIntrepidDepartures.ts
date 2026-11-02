import type { DepartureInventoryDocument, DepartureRow } from "./parseDepartureInventory.js";

interface IntrepidPrice {
  currencyCode?: string;
  price?: number;
  discountedPrice?: number;
}

interface IntrepidRoom {
  availability?: number;
  isOnRequest?: boolean;
  roomOptions?: Array<{
    roomOptionPrices?: Array<{
      currencyCode?: string;
      price?: number;
      discountedPrice?: number;
    }>;
  }>;
}

interface IntrepidDeparture {
  startDate?: string;
  endDate?: string;
  totalAvailability?: number;
  lowestPrice?: IntrepidPrice;
  styles?: Array<{
    rooms?: IntrepidRoom[];
  }>;
}

interface IntrepidDeparturesResponse {
  departures?: Record<string, IntrepidDeparture>;
  totalRecords?: number;
  totalDeals?: number;
}

export function mapIntrepidDepartures(
  apiText: string,
  expectedSku: string,
  expectedUrl: string,
  sourceUrl: string,
): DepartureInventoryDocument {
  let payload: IntrepidDeparturesResponse;
  try {
    payload = JSON.parse(apiText) as IntrepidDeparturesResponse;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Intrepid departures API response is not valid JSON: ${detail}`);
  }

  const entries = Object.values(payload.departures ?? {});
  if (entries.length === 0) {
    throw new Error("Intrepid departures API returned no departures");
  }

  const departures = entries.map((entry) => mapDeparture(entry, sourceUrl));

  return {
    sku: expectedSku,
    url: expectedUrl,
    currency: readCurrency(entries),
    priceBasis: "adult twin share",
    departures,
    notes: buildNotes(payload, departures.length),
  };
}

function mapDeparture(entry: IntrepidDeparture, sourceUrl: string): DepartureRow {
  const room = entry.styles?.[0]?.rooms?.[0];
  const priceRow = room?.roomOptions?.[0]?.roomOptionPrices?.[0] ?? entry.lowestPrice;
  const listPrice = expectPositive(priceRow?.price, "list price");
  const discounted = priceRow?.discountedPrice;
  const hasSale =
    typeof discounted === "number" && Number.isFinite(discounted) && discounted !== listPrice;
  const bookable = Math.round(hasSale ? discounted : listPrice);
  const quantity = room?.availability ?? entry.totalAvailability;
  const isOnRequest = Boolean(room?.isOnRequest);
  const status =
    quantity === 0 ? "Unavailable" : isOnRequest ? "On request" : "Available";

  return {
    disableDays: "",
    startDate: toDisplayDate(entry.startDate, "startDate"),
    endDate: toDisplayDate(entry.endDate, "endDate"),
    status,
    statusLabel: status,
    quantity: typeof quantity === "number" && Number.isInteger(quantity) ? quantity : null,
    price: expectPositive(bookable, "bookable price"),
    listPrice: hasSale ? listPrice : null,
    promo: hasSale ? "Sale, LAST MINUTE" : "",
    sourceUrl,
  };
}

function readCurrency(entries: IntrepidDeparture[]): string {
  for (const entry of entries) {
    const room = entry.styles?.[0]?.rooms?.[0];
    const code =
      room?.roomOptions?.[0]?.roomOptionPrices?.[0]?.currencyCode ??
      entry.lowestPrice?.currencyCode;
    if (typeof code === "string" && code.trim().length > 0) {
      return code.trim().toUpperCase();
    }
  }

  return "AUD";
}

function buildNotes(payload: IntrepidDeparturesResponse, mappedCount: number): string {
  const parts = [
    "Mapped from Intrepid available-years-months-and-departures API.",
    `Disable Days is not published.`,
  ];
  if (typeof payload.totalRecords === "number") {
    parts.push(`API totalRecords=${payload.totalRecords}; mapped=${mappedCount}.`);
  }
  if (typeof payload.totalDeals === "number") {
    parts.push(`API totalDeals=${payload.totalDeals}.`);
  }
  parts.push(
    "Promo Sale, LAST MINUTE is set when a discountedPrice differs from the list price.",
  );
  return parts.join(" ");
}

function toDisplayDate(value: string | undefined, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Intrepid departure ${field} must use YYYY-MM-DD`);
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function expectPositive(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Intrepid departure ${field} must be a positive number`);
  }

  return value;
}
