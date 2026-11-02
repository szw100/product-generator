export interface AtAGlanceRuleFollowed {
  rule: string;
  howApplied: string;
}

export interface AtAGlanceBrandVoice {
  followed: boolean;
  elegance: string;
  imagination: string;
  invitation: string;
  evidence: string[];
}

export interface AtAGlanceReport {
  brandVoice: AtAGlanceBrandVoice;
  dataAccuracy: string;
  rulesFollowed: AtAGlanceRuleFollowed[];
}

export interface AtAGlanceDocument {
  sku: string;
  url: string;
  heading: "AT A GLANCE";
  atAGlance: string[];
  report: AtAGlanceReport;
}

export function parseAtAGlanceDocument(
  text: string,
  expectedSku: string,
  expectedUrl: string,
): AtAGlanceDocument {
  const jsonText = extractJsonObject(text);
  let value: unknown;

  try {
    value = JSON.parse(jsonText);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`At-a-glance result is not valid JSON: ${detail}`);
  }

  return assertAtAGlanceDocument(value, expectedSku, expectedUrl);
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("At-a-glance result does not contain a JSON object");
  }

  return body.slice(start, end + 1);
}

function assertAtAGlanceDocument(
  value: unknown,
  expectedSku: string,
  expectedUrl: string,
): AtAGlanceDocument {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("At-a-glance result must be a JSON object");
  }

  const record = value as Record<string, unknown>;
  const sku = expectNonEmptyString(record.sku, "sku");
  const url = expectNonEmptyString(record.url, "url");
  const heading = expectNonEmptyString(record.heading, "heading");

  if (sku !== expectedSku) {
    throw new Error(`At-a-glance result sku must be ${expectedSku}`);
  }

  if (url !== expectedUrl) {
    throw new Error(`At-a-glance result url must be ${expectedUrl}`);
  }

  if (heading !== "AT A GLANCE") {
    throw new Error('At-a-glance result heading must be "AT A GLANCE"');
  }

  if (!Array.isArray(record.atAGlance) || record.atAGlance.length === 0) {
    throw new Error("At-a-glance result atAGlance must be a non-empty array");
  }

  const atAGlance = record.atAGlance.map((paragraph, index) =>
    expectNonEmptyString(paragraph, `atAGlance[${index}]`),
  );

  return {
    sku,
    url,
    heading: "AT A GLANCE",
    atAGlance,
    report: assertReport(record.report),
  };
}

function assertReport(value: unknown): AtAGlanceReport {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("At-a-glance result report must be an object");
  }

  const record = value as Record<string, unknown>;
  const brandVoice = assertBrandVoice(record.brandVoice);
  const dataAccuracy = expectNonEmptyString(record.dataAccuracy, "report.dataAccuracy");

  if (!Array.isArray(record.rulesFollowed) || record.rulesFollowed.length === 0) {
    throw new Error("At-a-glance result report.rulesFollowed must be a non-empty array");
  }

  const rulesFollowed = record.rulesFollowed.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`At-a-glance result report.rulesFollowed[${index}] must be an object`);
    }

    const ruleRecord = entry as Record<string, unknown>;
    return {
      rule: expectNonEmptyString(ruleRecord.rule, `report.rulesFollowed[${index}].rule`),
      howApplied: expectNonEmptyString(
        ruleRecord.howApplied,
        `report.rulesFollowed[${index}].howApplied`,
      ),
    };
  });

  if (!/brand\s*voice/i.test(rulesFollowed[0]?.rule ?? "")) {
    throw new Error(
      'At-a-glance result report.rulesFollowed[0].rule must be "Brand Voice"',
    );
  }

  return {
    brandVoice,
    dataAccuracy,
    rulesFollowed,
  };
}

function assertBrandVoice(value: unknown): AtAGlanceBrandVoice {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("At-a-glance result report.brandVoice must be an object");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.followed !== "boolean") {
    throw new Error("At-a-glance result report.brandVoice.followed must be a boolean");
  }

  if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
    throw new Error("At-a-glance result report.brandVoice.evidence must be a non-empty array");
  }

  return {
    followed: record.followed,
    elegance: expectNonEmptyString(record.elegance, "report.brandVoice.elegance"),
    imagination: expectNonEmptyString(record.imagination, "report.brandVoice.imagination"),
    invitation: expectNonEmptyString(record.invitation, "report.brandVoice.invitation"),
    evidence: record.evidence.map((quote, index) =>
      expectNonEmptyString(quote, `report.brandVoice.evidence[${index}]`),
    ),
  };
}

function expectNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`At-a-glance result ${field} must be a non-empty string`);
  }

  return value;
}
