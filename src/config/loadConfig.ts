import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AppConfig, PartnerSource } from "../types.js";

export function loadConfig(configPath: string): AppConfig {
  const absolutePath = resolve(configPath);
  const raw = readFileSync(absolutePath, "utf8");
  return parseConfig(JSON.parse(raw));
}

function parseConfig(value: unknown): AppConfig {
  const config = expectRecord(value, "config");
  const cursor = expectRecord(config.cursor, "cursor");
  const openai = expectRecord(config.openai, "openai");
  const browser = expectRecord(config.browser, "browser");
  const output = expectRecord(config.output, "output");
  const template = expectRecord(config.template, "template");
  const prompts = expectRecord(config.prompts, "prompts");

  return {
    partner_url: parsePartnerSources(config.partner_url),
    cursor: {
      modelId: expectNonEmptyString(cursor.modelId, "cursor.modelId"),
    },
    openai: {
      modelId: expectNonEmptyString(openai.modelId, "openai.modelId"),
    },
    browser: {
      timeoutMs: expectPositiveInteger(browser.timeoutMs, "browser.timeoutMs"),
    },
    output: {
      partner_data_path: expectNonEmptyString(
        output.partner_data_path,
        "output.partner_data_path",
      ),
      partner_product_path: expectNonEmptyString(
        output.partner_product_path,
        "output.partner_product_path",
      ),
    },
    template: {
      partner_product_template: expectNonEmptyString(
        template.partner_product_template,
        "template.partner_product_template",
      ),
    },
    prompts: {
      product_generation_prompt: expectNonEmptyString(
        prompts.product_generation_prompt,
        "prompts.product_generation_prompt",
      ),
      product_data_extraction_prompt: expectNonEmptyString(
        prompts.product_data_extraction_prompt,
        "prompts.product_data_extraction_prompt",
      ),
      at_a_glance_prompt: expectNonEmptyString(
        prompts.at_a_glance_prompt,
        "prompts.at_a_glance_prompt",
      ),
      departure_inventory_prompt: expectNonEmptyString(
        prompts.departure_inventory_prompt,
        "prompts.departure_inventory_prompt",
      ),
    },
  };
}

function parsePartnerSources(value: unknown): PartnerSource[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Config field partner_url must be a non-empty array");
  }

  return value.map((entry, index) => {
    const partner = expectRecord(entry, `partner_url[${index}]`);

    return {
      SKU: expectNonEmptyString(partner.SKU, `partner_url[${index}].SKU`),
      url: expectNonEmptyString(partner.url, `partner_url[${index}].url`),
    };
  });
}

function expectRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Config field ${field} must be an object`);
  }

  return value as Record<string, unknown>;
}

function expectNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Config field ${field} must be a non-empty string`);
  }

  return value;
}

function expectPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`Config field ${field} must be a positive integer`);
  }

  return value;
}
