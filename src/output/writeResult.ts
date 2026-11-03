import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AppConfig, ProductExtractionResult } from "../types.js";
import { assertInsideDirectory, buildDatedFileName, formatResearchDate } from "./fileName.js";
import { parseExtractionDocument } from "./parseExtraction.js";

export async function writeResult(
  config: AppConfig,
  results: ProductExtractionResult[],
  researchDate = formatResearchDate(new Date()),
): Promise<string[]> {
  const directory = resolve(config.output.partner_data_path);
  await mkdir(directory, { recursive: true });
  const writtenPaths: string[] = [];

  for (const result of results) {
    const document = parseExtractionDocument(result.text);
    const fileName = buildExtractionFileName(result.sku, researchDate);
    const filePath = resolve(directory, fileName);
    assertInsideDirectory(directory, filePath);
    await writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    writtenPaths.push(filePath);
  }

  return writtenPaths;
}

export function buildExtractionFileName(sku: string, researchDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(researchDate)) {
    throw new Error("Research date must use YYYY-MM-DD");
  }

  return buildDatedFileName(sku, researchDate, "json");
}
