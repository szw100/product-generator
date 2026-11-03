const REQUIRED_KEYS = ["product", "summary", "fields", "issues", "sources", "confidence"] as const;

export interface ExtractionDocument {
  product: Record<string, unknown>;
  summary: Record<string, unknown>;
  fields: unknown[];
  issues: unknown[];
  sources: unknown[];
  confidence: Record<string, unknown>;
}

export function parseExtractionDocument(text: string): ExtractionDocument {
  const jsonText = extractJsonObject(text);
  let value: unknown;

  try {
    value = JSON.parse(jsonText);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Extraction result is not valid JSON: ${detail}`);
  }

  assertExtractionDocument(value);
  return value;
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("Extraction result does not contain a JSON object");
  }

  return body.slice(start, end + 1);
}

function assertExtractionDocument(value: unknown): asserts value is ExtractionDocument {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Extraction result must be a JSON object");
  }

  const record = value as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in record)) {
      throw new Error(`Extraction result is missing ${key}`);
    }
  }

  const product = record.product;
  if (product === null || typeof product !== "object" || Array.isArray(product)) {
    throw new Error("Extraction result product must be an object");
  }

  if (!Array.isArray(record.fields) || !Array.isArray(record.issues) || !Array.isArray(record.sources)) {
    throw new Error("Extraction result fields, issues, and sources must be arrays");
  }

  if (!isRecord(record.summary) || !isRecord(record.confidence)) {
    throw new Error("Extraction result summary and confidence must be objects");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
