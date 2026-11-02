const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const STATUSES = ["Available", "On request", "Unavailable"] as const;

export type DepartureStatus = (typeof STATUSES)[number];

export interface DepartureRow {
  disableDays: string;
  startDate: string;
  endDate: string;
  status: DepartureStatus;
  statusLabel: string;
  quantity: number | null;
  price: number;
  listPrice: number | null;
  promo: string;
  sourceUrl: string;
}

export interface DepartureInventoryDocument {
  sku: string;
  url: string;
  currency: string;
  priceBasis: string;
  departures: DepartureRow[];
  notes: string;
}

export function parseDepartureInventoryDocument(
  text: string,
  expectedSku: string,
  expectedUrl: string,
): DepartureInventoryDocument {
  const jsonText = extractJsonObject(text);
  let value: unknown;

  try {
    value = JSON.parse(jsonText);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Departure inventory result is not valid JSON: ${detail}`);
  }

  return assertDepartureInventoryDocument(value, expectedSku, expectedUrl);
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("Departure inventory result does not contain a JSON object");
  }

  return body.slice(start, end + 1);
}

function assertDepartureInventoryDocument(
  value: unknown,
  expectedSku: string,
  expectedUrl: string,
): DepartureInventoryDocument {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Departure inventory result must be a JSON object");
  }

  const record = value as Record<string, unknown>;
  const sku = expectNonEmptyString(record.sku, "sku");
  const url = expectNonEmptyString(record.url, "url");

  if (sku !== expectedSku) {
    throw new Error(`Departure inventory result sku must be ${expectedSku}`);
  }

  if (url !== expectedUrl) {
    throw new Error(`Departure inventory result url must be ${expectedUrl}`);
  }

  if (!Array.isArray(record.departures) || record.departures.length === 0) {
    throw new Error("Departure inventory result departures must be a non-empty array");
  }

  return {
    sku,
    url,
    currency: expectNonEmptyString(record.currency, "currency"),
    priceBasis: expectString(record.priceBasis, "priceBasis"),
    departures: record.departures.map((entry, index) => assertDeparture(entry, index)),
    notes: expectString(record.notes, "notes"),
  };
}

function assertDeparture(value: unknown, index: number): DepartureRow {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Departure inventory result departures[${index}] must be an object`);
  }

  const record = value as Record<string, unknown>;
  const status = expectNonEmptyString(record.status, `departures[${index}].status`);
  if (!STATUSES.includes(status as DepartureStatus)) {
    throw new Error(
      `Departure inventory result departures[${index}].status must be Available, On request, or Unavailable`,
    );
  }

  const startDate = expectNonEmptyString(record.startDate, `departures[${index}].startDate`);
  const endDate = expectNonEmptyString(record.endDate, `departures[${index}].endDate`);
  assertDate(startDate, `departures[${index}].startDate`);
  assertDate(endDate, `departures[${index}].endDate`);

  return {
    disableDays: expectString(record.disableDays, `departures[${index}].disableDays`),
    startDate,
    endDate,
    status: status as DepartureStatus,
    statusLabel: expectString(record.statusLabel, `departures[${index}].statusLabel`),
    quantity: expectNullableNonNegativeInteger(record.quantity, `departures[${index}].quantity`),
    price: expectPositiveNumber(record.price, `departures[${index}].price`),
    listPrice: expectNullablePositiveNumber(record.listPrice, `departures[${index}].listPrice`),
    promo: expectString(record.promo, `departures[${index}].promo`),
    sourceUrl: expectNonEmptyString(record.sourceUrl, `departures[${index}].sourceUrl`),
  };
}

function assertDate(value: string, field: string): void {
  if (!DATE_PATTERN.test(value)) {
    throw new Error(`Departure inventory result ${field} must use DD/MM/YYYY`);
  }
}

function expectNullableNonNegativeInteger(value: unknown, field: string): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Departure inventory result ${field} must be a non-negative integer or null`);
  }

  return value;
}

function expectPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Departure inventory result ${field} must be a positive number`);
  }

  return value;
}

function expectNullablePositiveNumber(value: unknown, field: string): number | null {
  if (value === null) {
    return null;
  }

  return expectPositiveNumber(value, field);
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Departure inventory result ${field} must be a string`);
  }

  return value.trim();
}

function expectNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Departure inventory result ${field} must be a non-empty string`);
  }

  return value.trim();
}
