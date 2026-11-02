import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "../config/loadConfig.js";
import { fillProductTemplate, readSettingOptions } from "../product/fillTemplate.js";
import { invokeGeneration } from "../product/invokeGeneration.js";
import { parseProductContent, readProductIdentity } from "../product/productContent.js";
import { assertInsideDirectory, buildDatedFileName, formatResearchDate } from "../output/fileName.js";

export async function generateProduct(
  configPath: string,
  dataPath: string,
  runDate = formatResearchDate(new Date()),
): Promise<void> {
  console.log("loadConfig(configPath)");
  const config = loadConfig(configPath);
  console.log("readFileSync(resolve(dataPath))");
  const dataText = readFileSync(resolve(dataPath), "utf8");
  console.log("readProductIdentity(dataText)");
  const identity = readProductIdentity(dataText);
  console.log("readFileSync(resolve(config.prompts.product_generation_prompt))");
  const prompt = readFileSync(resolve(config.prompts.product_generation_prompt), "utf8");
  console.log("readFileSync(resolve(config.template.partner_product_template))  ");
  const template = readFileSync(resolve(config.template.partner_product_template));
  console.log("readSettingOptions(template)");
  const options = await readSettingOptions(template);
  console.log("invokeGeneration(config, prompt, dataText, options)------");
  const generated = await invokeGeneration(config, prompt, dataText, options);
  console.log("parseProductContent(generated, options)");
  const content = parseProductContent(generated, options);
  console.log("fillProductTemplate(template, content)");
  const document = await fillProductTemplate(template, content);
  const directory = resolve(config.output.partner_product_path);
  await mkdir(directory, { recursive: true });
  const fileName = buildDatedFileName(identity.sku, runDate, "docx");
  const filePath = resolve(directory, fileName);
  assertInsideDirectory(directory, filePath);
  await writeFile(filePath, document);
  console.log("writeFile(filePath, document)");
}
