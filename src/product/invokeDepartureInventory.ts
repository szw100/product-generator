import { Agent, CursorAgentError } from "@cursor/sdk";
import type { AppConfig, PartnerSource } from "../types.js";
import type { DepartureSourceBundle } from "./collectDepartureSources.js";

export async function invokeDepartureInventory(
  config: AppConfig,
  prompt: string,
  partner: PartnerSource,
  sources?: DepartureSourceBundle,
): Promise<string> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is required");
  }

  try {
    const result = await Agent.prompt(buildUserMessage(prompt, partner, sources), {
      apiKey,
      model: { id: config.cursor.modelId },
      tools: ["webFetch", "shell"],
      local: { cwd: process.cwd(), settingSources: [] },
    });

    if (result.status === "error") {
      const detail = result.error?.message ?? result.id;
      throw new Error(
        `Cursor agent run failed for departure inventory SKU ${partner.SKU}: ${detail}`,
      );
    }

    if (result.status !== "finished") {
      throw new Error(
        `Cursor agent run ${result.status} for departure inventory SKU ${partner.SKU}`,
      );
    }

    const text = result.result?.trim() ?? "";
    if (text.length === 0) {
      throw new Error(
        `Cursor agent returned no text for departure inventory SKU ${partner.SKU}`,
      );
    }

    return text;
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(
        `Cursor agent failed to start for departure inventory SKU ${partner.SKU}: ${error.message}`,
      );
    }

    throw error;
  }
}

function buildUserMessage(
  prompt: string,
  partner: PartnerSource,
  sources?: DepartureSourceBundle,
): string {
  const configuration = JSON.stringify(
    {
      SKU: partner.SKU,
      url: partner.url,
    },
    null,
    2,
  );

  const parts = [
    prompt,
    "",
    "Explore the product URL in Configuration using webFetch and shell.",
    "If departure rows are missing from HTML, find same-origin departure, availability, or dates-and-prices JSON APIs in the page or scripts, then call them with shell curl against the product host.",
    "Page through or raise page size until every published departure is included.",
    "Do not read local files, previously generated departure CSV, or partner-data JSON.",
    "Return one JSON object as your final answer and nothing else.",
    "Do not wrap it in Markdown.",
    "Do not create or edit files. The caller saves the document.",
    "",
    "Use this shape:",
    JSON.stringify(outputShape(), null, 2),
    "",
    "Set sku and url to the Configuration values exactly.",
    "Include every published departure once in departures.",
    "Use DD/MM/YYYY for startDate and endDate.",
    "Set status to Available, On request, or Unavailable only.",
    "Set quantity to remaining spots, or null when the site gives no number.",
    "Set price to the current bookable amount. Put the higher amount in listPrice when both are shown.",
    "Set promo to the published offer labels joined with ', ', or an empty string when there is no offer.",
    "",
    "Configuration:",
    configuration,
  ];

  if (sources) {
    parts.push("", "Prefetched sources from the caller:");
    if (sources.notes.length > 0) {
      parts.push(`Notes: ${sources.notes.join(" ")}`);
    }
    if (sources.apiUrl && sources.apiText) {
      parts.push(`Departure API URL: ${sources.apiUrl}`);
      parts.push("Departure API JSON:");
      parts.push(truncate(sources.apiText, 120_000));
    } else {
      parts.push(`Product page URL: ${sources.pageUrl}`);
      parts.push("Product page HTML excerpt:");
      parts.push(truncate(sources.pageText, 40_000));
    }
  }

  return parts.join("\n");
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

function outputShape(): Record<string, unknown> {
  return {
    sku: "",
    url: "",
    currency: "AUD",
    priceBasis: "adult twin share",
    departures: [
      {
        disableDays: "",
        startDate: "DD/MM/YYYY",
        endDate: "DD/MM/YYYY",
        status: "Available",
        statusLabel: "",
        quantity: 0,
        price: 0,
        listPrice: null,
        promo: "",
        sourceUrl: "https://exact-page",
      },
    ],
    notes: "",
  };
}
