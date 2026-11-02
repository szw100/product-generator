import type { AppConfig, PartnerSource } from "../types.js";

export function findPartner(config: AppConfig, sku: string): PartnerSource {
  const matches = config.partner_url.filter((partner) => partner.SKU === sku);

  if (matches.length === 0) {
    throw new Error(`No partner_url entry matches SKU ${sku}`);
  }

  if (matches.length > 1) {
    throw new Error(`More than one partner_url entry matches SKU ${sku}`);
  }

  const match = matches[0];
  if (match === undefined) {
    throw new Error(`No partner_url entry matches SKU ${sku}`);
  }

  return match;
}
