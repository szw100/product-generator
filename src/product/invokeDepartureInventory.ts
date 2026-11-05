import OpenAI, { APIError } from "openai";
import type { AppConfig, PartnerSource } from "../types.js";
import type { DepartureSourceBundle } from "./collectDepartureSources.js";
import { browseDepartureUrl } from "./departureBrowse.js";
import { fetchDepartureUrl } from "./departureFetch.js";

const MAX_TOOL_ROUNDS = 8;
const MAX_OUTPUT_TOKENS = 100_000;
const PREFETCHED_API_CHAR_LIMIT = 500_000;
const PREFETCHED_PAGE_CHAR_LIMIT = 40_000;

const BROWSE_URL_TOOL: OpenAI.Responses.FunctionTool = {
  type: "function",
  name: "browse_url",
  description:
    "Open an https URL on the product host in a browser so the page's own JavaScript runs. Returns rendered text and same-host JSON responses. Does not run JavaScript supplied by the caller.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      url: {
        type: "string",
        description: "Absolute https URL on the product host.",
      },
    },
    required: ["url"],
  },
};

const FETCH_URL_TOOL: OpenAI.Responses.FunctionTool = {
  type: "function",
  name: "fetch_url",
  description:
    "Fetch an https URL on the product page host. Use this for the product page and same-host departure, availability, or dates-and-prices APIs. Every other host is refused.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      url: {
        type: "string",
        description: "Absolute https URL on the product host.",
      },
    },
    required: ["url"],
  },
};

export async function invokeDepartureInventory(
  config: AppConfig,
  prompt: string,
  partner: PartnerSource,
  sources?: DepartureSourceBundle,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const client = new OpenAI({ apiKey });
  let input: OpenAI.Responses.ResponseInput = [
    { role: "user", content: buildUserMessage(prompt, partner, sources) },
  ];

  try {
    for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
      const response = await client.responses.create({
        model: config.openai.modelId,
        store: false,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        include: ["reasoning.encrypted_content"],
        tools: [FETCH_URL_TOOL, BROWSE_URL_TOOL],
        input,
      });

      const functionCalls = response.output.filter((item) => item.type === "function_call");
      if (functionCalls.length === 0) {
        return requireFinalText(response, partner.SKU);
      }

      if (round === MAX_TOOL_ROUNDS) {
        throw new Error(
          `OpenAI departure inventory exceeded ${MAX_TOOL_ROUNDS} tool rounds for SKU ${partner.SKU}`,
        );
      }

      assertContinuable(response, partner.SKU);
      const toolOutputs = await Promise.all(
        functionCalls.map((call) => runFetchTool(call, partner, config.browser.timeoutMs)),
      );
      input = [...input, ...replayOutput(response.output), ...toolOutputs];
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(
        `OpenAI departure inventory failed for SKU ${partner.SKU}: ${error.message}`,
      );
    }

    throw error;
  }

  throw new Error(
    `OpenAI departure inventory exceeded ${MAX_TOOL_ROUNDS} tool rounds for SKU ${partner.SKU}`,
  );
}

function replayOutput(
  output: OpenAI.Responses.Response["output"],
): OpenAI.Responses.ResponseInput {
  // The Responses API replays output items, including reasoning, as the next input.
  // The SDK input union rejects an unused computer-call status that this tool never returns.
  return output as OpenAI.Responses.ResponseInput;
}

function requireFinalText(response: OpenAI.Responses.Response, sku: string): string {
  if (response.status === "failed" || response.status === "cancelled" || response.status === "incomplete") {
    throw new Error(
      `OpenAI departure inventory ${response.status} for SKU ${sku}: ${failureDetail(response)}`,
    );
  }

  const text = response.output_text.trim();
  if (text.length === 0) {
    throw new Error(`OpenAI returned no text for departure inventory SKU ${sku}`);
  }

  return text;
}

function assertContinuable(response: OpenAI.Responses.Response, sku: string): void {
  if (
    response.status === "failed" ||
    response.status === "cancelled" ||
    response.status === "incomplete"
  ) {
    throw new Error(
      `OpenAI departure inventory ${response.status} for SKU ${sku}: ${failureDetail(response)}`,
    );
  }
}

function failureDetail(response: OpenAI.Responses.Response): string {
  return response.error?.message ?? response.incomplete_details?.reason ?? response.status ?? "request failed";
}

async function runFetchTool(
  call: Extract<OpenAI.Responses.ResponseOutputItem, { type: "function_call" }>,
  partner: PartnerSource,
  timeoutMs: number,
): Promise<OpenAI.Responses.ResponseInputItem.FunctionCallOutput> {
  const url = readFetchUrl(call.arguments);
  const output = await runNamedTool(call.name, url, partner.url, timeoutMs);

  return {
    type: "function_call_output",
    call_id: call.call_id,
    output,
  };
}

async function runNamedTool(
  name: string,
  url: string,
  productUrl: string,
  timeoutMs: number,
): Promise<string> {
  if (name === "fetch_url") {
    return fetchDepartureUrl(url, productUrl, timeoutMs);
  }

  if (name === "browse_url") {
    return browseDepartureUrl(url, productUrl, timeoutMs);
  }

  return "Tool rejected: unsupported tool";
}

function readFetchUrl(argumentsText: string): string {
  try {
    const value: unknown = JSON.parse(argumentsText);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const url = (value as { url?: unknown }).url;
      if (typeof url === "string") {
        return url;
      }
    }
  } catch {
    return "";
  }

  return "";
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
    "If departure rows are missing because the page renders them with JavaScript, call browse_url on the product URL.",
    "browse_url runs the page's own scripts and returns rendered text plus same-host JSON. It does not run JavaScript you supply.",
    "If departure rows are still missing, find same-origin departure APIs and call them with fetch_url against the product host.",
    "fetch_url and browse_url accept only https URLs on the product host.",
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
    if (sources.apiUrl) {
      parts.push(`Departure API URL: ${sources.apiUrl}`);
    }
    if (sources.apiUrl && sources.apiText) {
      const apiText = truncate(sources.apiText, PREFETCHED_API_CHAR_LIMIT);
      parts.push("Departure API JSON:");
      parts.push(apiText.text);
      if (apiText.truncated) {
        parts.push(
          "The departure API JSON was truncated. Call fetch_url on the Departure API URL and include every published departure.",
        );
      }
    } else {
      const pageText = truncate(sources.pageText, PREFETCHED_PAGE_CHAR_LIMIT);
      parts.push(`Product page URL: ${sources.pageUrl}`);
      parts.push("Product page HTML excerpt:");
      parts.push(pageText.text);
      if (pageText.truncated) {
        parts.push(
          "The product page HTML was truncated or may omit departures rendered by JavaScript. Call browse_url on the product page URL.",
        );
      }
    }
  }

  return parts.join("\n");
}

function truncate(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }

  return {
    text: `${text.slice(0, maxChars)}\n...[truncated]`,
    truncated: true,
  };
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
