import { invokeExtraction } from "../cursor/invokeExtraction.js";
import { findPartner } from "../config/findPartner.js";
import { loadConfig } from "../config/loadConfig.js";
import { writeResult } from "../output/writeResult.js";

export async function run(configPath: string, sku: string): Promise<void> {
  const config = loadConfig(configPath);
  const partner = findPartner(config, sku);
  const results = await invokeExtraction({ ...config, partner_url: [partner] });
  const writtenPaths = await writeResult(config, results);
  for (const writtenPath of writtenPaths) {
    console.log(writtenPath);
  }
}
