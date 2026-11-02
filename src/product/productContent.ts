export interface SettingOptions {
  whatToCarry: string[];
  tripStyle: string[];
  grading: string[];
  accommodationType: string[];
  interest: string[];
}

export interface ItineraryDay {
  title: string;
  activity: string;
  narrative: string;
  accommodation: string;
  meals: string;
}

export interface ProductContent {
  header: {
    sku: string;
    url: string;
    uniteName: string;
    address: string;
  };
  settings: {
    maximumNumberOfPeople: string;
    minimumNumberOfPeople: string;
    whatToCarry: string;
    tripStyle: string;
    grading: string[];
    accommodationType: string[];
    interest: string[];
  };
  tripHighlights: string[];
  whatsIncluded: string[];
  itinerary: ItineraryDay[];
  meta: {
    title: string;
    description: string;
  };
  moreInfo: {
    gettingThere: string;
    weatherAndClimate: string;
    bikingLevel: string;
    bikeOptions: string;
    otherImportantInformation: string;
  };
}

export interface ProductIdentity {
  sku: string;
}

export function readProductIdentity(dataText: string): ProductIdentity {
  let value: unknown;
  try {
    value = JSON.parse(dataText);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Data file is not valid JSON: ${detail}`);
  }

  const record = expectRecord(value, "data file", "Data file");
  const product = expectRecord(record.product, "product", "Data file");
  return {
    sku: expectNonEmptyString(product.sku, "product.sku", "Data file"),
  };
}

export function parseProductContent(text: string, options: SettingOptions): ProductContent {
  const jsonText = extractJsonObject(text);
  let value: unknown;
  try {
    value = JSON.parse(jsonText);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Product generation result is not valid JSON: ${detail}`);
  }

  const content = assertProductContent(value);
  assertControlledValue(content.settings.whatToCarry, options.whatToCarry, "settings.whatToCarry");
  assertControlledValue(content.settings.tripStyle, options.tripStyle, "settings.tripStyle");
  assertControlledList(content.settings.grading, options.grading, "settings.grading");
  assertControlledList(
    content.settings.accommodationType,
    options.accommodationType,
    "settings.accommodationType",
  );
  assertControlledList(content.settings.interest, options.interest, "settings.interest");
  return content;
}

function assertProductContent(value: unknown): ProductContent {
  const record = expectRecord(value, "product generation result");
  const header = expectRecord(record.header, "header");
  const settings = expectRecord(record.settings, "settings");
  const meta = expectRecord(record.meta, "meta");
  const moreInfo = expectRecord(record.moreInfo, "moreInfo");

  return {
    header: {
      sku: expectNonEmptyString(header.sku, "header.sku"),
      url: expectNonEmptyString(header.url, "header.url"),
      uniteName: expectString(header.uniteName, "header.uniteName"),
      address: expectString(header.address, "header.address"),
    },
    settings: {
      maximumNumberOfPeople: expectString(settings.maximumNumberOfPeople, "settings.maximumNumberOfPeople"),
      minimumNumberOfPeople: expectString(settings.minimumNumberOfPeople, "settings.minimumNumberOfPeople"),
      whatToCarry: expectString(settings.whatToCarry, "settings.whatToCarry"),
      tripStyle: expectString(settings.tripStyle, "settings.tripStyle"),
      grading: expectStringList(settings.grading, "settings.grading"),
      accommodationType: expectStringList(settings.accommodationType, "settings.accommodationType"),
      interest: expectStringList(settings.interest, "settings.interest"),
    },
    tripHighlights: expectStringList(record.tripHighlights ?? [], "tripHighlights"),
    whatsIncluded: expectStringList(record.whatsIncluded ?? [], "whatsIncluded"),
    itinerary: expectItinerary(record.itinerary),
    meta: {
      title: expectNonEmptyString(meta.title, "meta.title"),
      description: expectNonEmptyString(meta.description, "meta.description"),
    },
    moreInfo: {
      gettingThere: expectString(moreInfo.gettingThere, "moreInfo.gettingThere"),
      weatherAndClimate: expectString(moreInfo.weatherAndClimate, "moreInfo.weatherAndClimate"),
      bikingLevel: expectString(moreInfo.bikingLevel, "moreInfo.bikingLevel"),
      bikeOptions: expectString(moreInfo.bikeOptions, "moreInfo.bikeOptions"),
      otherImportantInformation: expectString(
        moreInfo.otherImportantInformation,
        "moreInfo.otherImportantInformation",
      ),
    },
  };
}

function expectItinerary(value: unknown): ItineraryDay[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Product generation result itinerary must be a non-empty array");
  }

  return value.map((entry, index) => {
    const day = expectRecord(entry, `itinerary[${index}]`);
    return {
      title: expectNonEmptyString(day.title, `itinerary[${index}].title`),
      activity: expectString(day.activity, `itinerary[${index}].activity`),
      narrative: expectString(day.narrative, `itinerary[${index}].narrative`),
      accommodation: expectString(day.accommodation, `itinerary[${index}].accommodation`),
      meals: expectString(day.meals, `itinerary[${index}].meals`),
    };
  });
}

function assertControlledValue(value: string, allowed: readonly string[], field: string): void {
  if (value.length === 0) {
    return;
  }

  if (!allowed.includes(value)) {
    throw new Error(`Product generation result ${field} must use a template value`);
  }
}

function assertControlledList(values: readonly string[], allowed: readonly string[], field: string): void {
  for (const value of values) {
    if (!allowed.includes(value)) {
      throw new Error(`Product generation result ${field} contains a value outside the template list`);
    }
  }
}

function expectStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Product generation result ${field} must be an array`);
  }

  return value.map((entry, index) => expectNonEmptyString(entry, `${field}[${index}]`));
}

function expectRecord(
  value: unknown,
  field: string,
  source = "Product generation result",
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${source} ${field} must be an object`);
  }

  return value as Record<string, unknown>;
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Product generation result ${field} must be a string`);
  }

  return value.trim();
}

function expectNonEmptyString(
  value: unknown,
  field: string,
  source = "Product generation result",
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${source} ${field} must be a non-empty string`);
  }

  return value.trim();
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Product generation result does not contain a JSON object");
  }

  return body.slice(start, end + 1);
}
