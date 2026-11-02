import { Agent, CursorAgentError } from "@cursor/sdk";
import type { AppConfig, PartnerSource } from "../types.js";

export async function invokeAtAGlance(
  config: AppConfig,
  prompt: string,
  partner: PartnerSource,
): Promise<string> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is required");
  }

  try {
    const result = await Agent.prompt(buildUserMessage(prompt, partner), {
      apiKey,
      model: { id: config.cursor.modelId },
      tools: ["webFetch"],
      local: { cwd: process.cwd(), settingSources: [] },
    });

    if (result.status === "error") {
      const detail = result.error?.message ?? result.id;
      throw new Error(`Cursor agent run failed for at-a-glance SKU ${partner.SKU}: ${detail}`);
    }

    if (result.status !== "finished") {
      throw new Error(`Cursor agent run ${result.status} for at-a-glance SKU ${partner.SKU}`);
    }

    const text = result.result?.trim() ?? "";
    if (text.length === 0) {
      throw new Error(`Cursor agent returned no text for at-a-glance SKU ${partner.SKU}`);
    }

    return text;
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(
        `Cursor agent failed to start for at-a-glance SKU ${partner.SKU}: ${error.message}`,
      );
    }

    throw error;
  }
}

function buildUserMessage(prompt: string, partner: PartnerSource): string {
  const configuration = JSON.stringify(
    {
      SKU: partner.SKU,
      url: partner.url,
    },
    null,
    2,
  );

  return [
    prompt,
    "",
    "Explore the product URL in Configuration on this run using webFetch.",
    "Do not read local files, previously generated at-a-glance JSON, or partner-data JSON.",
    "Return one JSON object as your final answer and nothing else.",
    "Do not wrap it in Markdown.",
    "Do not create or edit files. The caller saves the document.",
    "",
    "Use this shape:",
    JSON.stringify(outputShape(), null, 2),
    "",
    "Set sku and url to the Configuration values exactly.",
    "Set heading to AT A GLANCE.",
    "Put each AT A GLANCE paragraph in atAGlance as a separate non-empty string.",
    "Brand Voice is the primary writing rule. Every atAGlance paragraph must follow it.",
    "Fill report.brandVoice with how the copy meets Brand Voice: set followed to true only when Elegance, Imagination, and Invitation are all present; explain each value; and quote short evidence from atAGlance.",
    "Fill report.dataAccuracy with how well the copy matches facts from the explored URL, including any gaps or unsupported claims.",
    "Fill report.rulesFollowed with one entry per requirements rule that the copy follows. The first entry must be Brand Voice. Name each rule and briefly state how it was applied.",
    "",
    "Configuration:",
    configuration,
  ].join("\n");
}

function outputShape(): Record<string, unknown> {
  return {
    sku: "",
    url: "",
    heading: "AT A GLANCE",
    atAGlance: ["paragraph"],
    report: {
      brandVoice: {
        followed: true,
        elegance: "",
        imagination: "",
        invitation: "",
        evidence: ["short quote from atAGlance"],
      },
      dataAccuracy: "",
      rulesFollowed: [
        {
          rule: "Brand Voice",
          howApplied: "",
        },
      ],
    },
  };
}
