import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findPartner } from "../config/findPartner.js";
import { loadConfig } from "../config/loadConfig.js";
import { assertInsideDirectory, formatResearchDate } from "../output/fileName.js";
import { collectDepartureSources } from "../product/collectDepartureSources.js";
import { invokeDepartureInventory } from "../product/invokeDepartureInventory.js";
import { mapIntrepidDepartures } from "../product/mapIntrepidDepartures.js";
import {
  parseDepartureInventoryDocument,
  type DepartureInventoryDocument,
} from "../product/parseDepartureInventory.js";
import type { AppConfig, PartnerSource } from "../types.js";

const UNSAFE_SKU_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]/;
const CSV_HEADER = "SKU,Disable Days,Start Date,End Date,Status,Quantity,Price,Promo";

export async function findDepartureInventory(
  configPath: string,
  sku: string,
  runDate = formatResearchDate(new Date()),
): Promise<void> {
  const safeSku = assertSafeSku(sku);
  const config = loadConfig(configPath);
  const partner = findPartner(config, sku);
  const document = await resolveDepartureInventory(config, partner);
  const directory = resolve(config.output.partner_product_path);
  await mkdir(directory, { recursive: true });
  const fileName = `${safeSku}-${runDate}-departure.csv`;
  const filePath = resolve(directory, fileName);
  assertInsideDirectory(directory, filePath);
  await writeFile(filePath, buildDepartureCsv(document), "utf8");
  console.log(filePath);
}

async function resolveDepartureInventory(
  config: AppConfig,
  partner: PartnerSource,
): Promise<DepartureInventoryDocument> {
  const sources = await collectDepartureSources(partner, config.browser.timeoutMs);
  if (sources.apiText && sources.apiUrl) {
    try {
      return mapIntrepidDepartures(sources.apiText, partner.SKU, partner.url, sources.apiUrl);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "mapping failed";
      console.warn(`Direct departure API mapping failed; falling back to agent: ${detail}`);
    }
  }

  const prompt = readFileSync(resolve(config.prompts.departure_inventory_prompt), "utf8");
  const generated = await invokeDepartureInventory(config, prompt, partner, sources);
  return parseDepartureInventoryDocument(generated, partner.SKU, partner.url);
}

export function buildDepartureCsv(document: DepartureInventoryDocument): string {
  const rows = document.departures.map((departure) =>
    [
      document.sku,
      departure.disableDays,
      departure.startDate,
      departure.endDate,
      departure.status,
      departure.quantity === null ? "" : String(departure.quantity),
      String(departure.price),
      departure.promo,
    ]
      .map(escapeCsvField)
      .join(","),
  );

  return `${[CSV_HEADER, ...rows].join("\n")}\n`;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function assertSafeSku(sku: string): string {
  if (UNSAFE_SKU_CHARACTERS.test(sku) || sku.includes("..")) {
    throw new Error("SKU cannot be used as a filename");
  }

  return sku;
}
