# product-generator

Command-line tool that loads a JSON config and extracts partner product data with Cursor Grok 4.7 high fast.

The run loads the config, selects the `partner_url` entry for `--sku`, sends one local Cursor agent prompt for that URL, then writes the product as JSON. Files are saved under `output.partner_data_path` as `[SKU]-[YYYY-MM-DD].json`. A result that is not a complete extraction JSON object is rejected and no file is written. The instruction and field specification are read from `requirement/`. Set `CURSOR_API_KEY` in the environment. The key is not part of the config file. Node.js 22.13 or later is required.

## Run

Extract partner data:

```bash
npm install
npm run build
npm run extract-data -- ABCDEFG1111
```

Generate the product document from an extraction JSON file. The prompt is `prompts.product_generation_prompt` and the Word file is `template.partner_product_template`. The document is saved under `output.partner_product_path` as `[SKU]-[YYYY-MM-DD].docx`. The SKU comes from `product.sku` in the data file.

```bash
npm run gen-brochure -- output/partner-data/ABCDEFG1111-2026-09-27.json
```

Generate AT A GLANCE copy from the live partner URL for a SKU. The prompt is `prompts.at_a_glance_prompt`. The agent fetches the matched `partner_url` entry on each run and does not read local partner-data or previously generated at-a-glance files. The JSON is saved under `output.partner_product_path` as `at-a-glance-[SKU].json` and includes `atAGlance` plus a `report` with `brandVoice`, `dataAccuracy`, and `rulesFollowed`.

```bash
npm run gen-at-a-glance -- ABCDEFG1111
```

Extract departure inventory from the live partner URL for a SKU. The run first fetches the product page and, when a same-origin departure API is available (for example Intrepid), maps that JSON directly. Otherwise it uses `prompts.departure_inventory_prompt` with `webFetch` and `shell` so the agent can call dynamic dates-and-prices APIs. It does not read local partner-data or previously generated departure files. The CSV is saved under `output.partner_product_path` as `[SKU]-[YYYY-MM-DD]-departure.csv` with columns `SKU`, `Disable Days`, `Start Date`, `End Date`, `Status`, `Quantity`, `Price`, and `Promo`.

```bash
npm run gen-departure -- ABCDEFG2222
```
