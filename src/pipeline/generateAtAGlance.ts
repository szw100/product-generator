import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findPartner } from "../config/findPartner.js";
import { loadConfig } from "../config/loadConfig.js";
import { assertInsideDirectory } from "../output/fileName.js";
import { invokeAtAGlance } from "../product/invokeAtAGlance.js";
import { parseAtAGlanceDocument } from "../product/parseAtAGlance.js";

const UNSAFE_SKU_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]/;

export async function generateAtAGlance(configPath: string, sku: string): Promise<void> {
  const safeSku = assertSafeSku(sku);
  const config = loadConfig(configPath);
  const partner = findPartner(config, sku);
  const prompt = readFileSync(resolve(config.prompts.at_a_glance_prompt), "utf8");
  const generated = await invokeAtAGlance(config, prompt, partner);
  const document = parseAtAGlanceDocument(generated, partner.SKU, partner.url);
  const directory = resolve(config.output.partner_product_path);
  await mkdir(directory, { recursive: true });
  const fileName = `at-a-glance-${safeSku}.json`;
  const filePath = resolve(directory, fileName);
  assertInsideDirectory(directory, filePath);
  await writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  console.log(filePath);
}

function assertSafeSku(sku: string): string {
  if (UNSAFE_SKU_CHARACTERS.test(sku) || sku.includes("..")) {
    throw new Error("SKU cannot be used as a filename");
  }

  return sku;
}
