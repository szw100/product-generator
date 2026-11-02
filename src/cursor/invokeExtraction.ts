import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import type { AppConfig, PartnerSource, ProductExtractionResult } from "../types.js";

const INSTRUCTION_PATH = "requirement/requirements-data-extraction.md";
const DATA_SPEC_PATH = "requirement/partner-data-extraction-specification.md";

export async function invokeExtraction(
  config: AppConfig,
): Promise<ProductExtractionResult[]> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is required");
  }

  const instruction = readFileSync(resolve(INSTRUCTION_PATH), "utf8");
  const dataSpec = readFileSync(resolve(DATA_SPEC_PATH), "utf8");
  const results: ProductExtractionResult[] = [];

  for (const partner of config.partner_url) {
    const text = await promptForPartner(config.cursor.modelId, apiKey, instruction, partner, dataSpec);
    results.push({
      sku: partner.SKU,
      url: partner.url,
      text,
    });
  }

  return results;
}

async function promptForPartner(
  modelId: string,
  apiKey: string,
  instruction: string,
  partner: PartnerSource,
  dataSpec: string,
): Promise<string> {
  try {
    const result = await Agent.prompt(buildUserMessage(instruction, partner, dataSpec), {
      apiKey,
      model: { id: modelId },
      tools: ["webFetch"],
      local: { cwd: process.cwd(), settingSources: [] },
    });

    if (result.status === "error") {
      const detail = result.error?.message ?? result.id;
      throw new Error(`Cursor agent run failed for SKU ${partner.SKU}: ${detail}`);
    }

    if (result.status !== "finished") {
      throw new Error(`Cursor agent run ${result.status} for SKU ${partner.SKU}`);
    }

    const text = result.result?.trim() ?? "";
    if (text.length === 0) {
      throw new Error(`Cursor agent returned no text for SKU ${partner.SKU}`);
    }

    return text;
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(
        `Cursor agent failed to start for SKU ${partner.SKU}: ${error.message}`,
      );
    }

    throw error;
  }
}

function buildUserMessage(
  instruction: string,
  partner: PartnerSource,
  dataSpec: string,
): string {
  const configuration = JSON.stringify(
    {
      SKU: partner.SKU,
      url: partner.url,
    },
    null,
    2,
  );

  return [
    instruction,
    "",
    "Return one complete JSON object as your final answer and nothing else.",
    "Do not wrap it in Markdown.",
    "Do not create or edit files. The caller saves the document.",
    "",
    "Configuration:",
    configuration,
    "",
    "Data specification:",
    dataSpec,
  ].join("\n");
}
