import { Agent, CursorAgentError } from "@cursor/sdk";
import type { AppConfig } from "../types.js";
import type { SettingOptions } from "./productContent.js";

export async function invokeGeneration(
  config: AppConfig,
  prompt: string,
  dataText: string,
  options: SettingOptions,
): Promise<string> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is required");
  }

  console.log("invokeGeneration(config, prompt, dataText, options)");
  try {
    const result = await Agent.prompt(buildUserMessage(prompt, dataText, options), {
      apiKey,
      model: { id: config.cursor.modelId },
      tools: [],
      local: { cwd: process.cwd(), settingSources: [] },
    });

    if (result.status === "error") {
      const detail = result.error?.message ?? result.id;
      throw new Error(`Cursor agent run failed for product generation: ${detail}`);
    }

    if (result.status !== "finished") {
      throw new Error(`Cursor agent run ${result.status} for product generation`);
    }

    const text = result.result?.trim() ?? "";
    if (text.length === 0) {
      throw new Error("Cursor agent returned no text for product generation");
    }

    return text;
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(`Cursor agent failed to start for product generation: ${error.message}`);
    }

    throw error;
  }
}

function buildUserMessage(prompt: string, dataText: string, options: SettingOptions): string {
  return [
    prompt,
    "",
    "Return one JSON object as your final answer and nothing else.",
    "Do not wrap it in Markdown.",
    "Do not create or edit files. The caller writes the document into the template.",
    "",
    "Do not include atAGlance. AT A GLANCE is produced by a separate task.",
    "tripHighlights may be an empty array when the approved data has no highlights.",
    "whatsIncluded may be an empty array when the approved data has no inclusions.",
    "",
    "Use this shape:",
    JSON.stringify(outputShape(), null, 2),
    "",
    "Controlled settings values must be copied exactly from these template lists. Use an empty string or an empty array when the data does not support a value.",
    JSON.stringify(options, null, 2),
    "",
    "Approved product data:",
    dataText,
  ].join("\n");
}

function outputShape(): Record<string, unknown> {
  return {
    header: {
      sku: "",
      url: "",
      uniteName: "",
      address: "",
    },
    settings: {
      maximumNumberOfPeople: "",
      minimumNumberOfPeople: "",
      whatToCarry: "",
      tripStyle: "",
      grading: [],
      accommodationType: [],
      interest: [],
    },
    tripHighlights: ["point"],
    whatsIncluded: ["point"],
    itinerary: [
      {
        title: "",
        activity: "",
        narrative: "",
        accommodation: "",
        meals: "",
      },
    ],
    meta: {
      title: "",
      description: "",
    },
    moreInfo: {
      gettingThere: "",
      weatherAndClimate: "",
      bikingLevel: "",
      bikeOptions: "",
      otherImportantInformation: "",
    },
  };
}
