import { findDepartureInventory } from "./pipeline/findDepartureInventory.js";
import { generateAtAGlance } from "./pipeline/generateAtAGlance.js";
import { generateProduct } from "./pipeline/generateProduct.js";
import { run } from "./pipeline/run.js";

const USAGE =
  "Usage: product-generator --config <path> --sku <sku> | product-generator --config <path> --data <path> | product-generator --config <path> --at-a-glance <sku> | product-generator --config <path> --departure <sku>";

function readFlag(argv: readonly string[], flag: string): string {
  const flagIndex = argv.indexOf(flag);
  const value = flagIndex >= 0 ? argv[flagIndex + 1] : undefined;

  if (!value || value.startsWith("-")) {
    throw new Error(USAGE);
  }

  return value;
}

function hasFlag(argv: readonly string[], flag: string): boolean {
  return argv.includes(flag);
}

async function main(): Promise<void> {
  const argv = process.argv;
  const configPath = readFlag(argv, "--config");
  const hasSku = hasFlag(argv, "--sku");
  const hasData = hasFlag(argv, "--data");
  const hasAtAGlance = hasFlag(argv, "--at-a-glance");
  const hasDeparture = hasFlag(argv, "--departure");
  const modeCount = Number(hasSku) + Number(hasData) + Number(hasAtAGlance) + Number(hasDeparture);

  if (modeCount !== 1) {
    throw new Error(USAGE);
  }

  if (hasSku) {
    await run(configPath, readFlag(argv, "--sku"));
    return;
  }

  if (hasAtAGlance) {
    await generateAtAGlance(configPath, readFlag(argv, "--at-a-glance"));
    return;
  }

  if (hasDeparture) {
    await findDepartureInventory(configPath, readFlag(argv, "--departure"));
    return;
  }

  await generateProduct(configPath, readFlag(argv, "--data"));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exitCode = 1;
});
