export interface PartnerSource {
  SKU: string;
  url: string;
}

export interface AppConfig {
  partner_url: PartnerSource[];
  cursor: {
    modelId: string;
  };
  browser: {
    timeoutMs: number;
  };
  output: {
    partner_data_path: string;
    partner_product_path: string;
  };
  template: {
    partner_product_template: string;
  };
  prompts: {
    product_generation_prompt: string;
    product_data_extraction_prompt: string;
    at_a_glance_prompt: string;
    departure_inventory_prompt: string;
  };
}

export interface PageContent {
  url: string;
  html: string;
}

export interface ProductExtractionResult {
  sku: string;
  url: string;
  text: string;
}
