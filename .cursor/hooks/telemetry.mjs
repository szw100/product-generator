import { createHash } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hookDir = dirname(fileURLToPath(import.meta.url));
const debugFile = join(hookDir, "cursor-telemetry.jsonl");

function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(value ?? null))
    .digest("hex");
}

const MAX_TEXT_CHARS = 32_000;
const MAX_PROMPT_CHARS = 10_000;

function clip(value, maxChars) {
  if (typeof value !== "string") {
    return undefined;
  }
  return {
    length: value.length,
    text:
      value.length > maxChars
        ? `${value.slice(0, maxChars)}\n…[truncated]`
        : value,
  };
}

function readStdin(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function writeEvent(event) {
  try {
    await appendFile(debugFile, `${JSON.stringify(event)}\n`, "utf8");
  } catch {
    // Observability should fail open.
  }
}

function respond(payload) {
  process.stdout.write(JSON.stringify(payload));
}

let response = {};

try {
  const raw = await readStdin();
  // Cursor may prefix hook stdin JSON with a UTF-8 BOM.
  const normalized = raw.replace(/^\uFEFF/, "").trim();
  const input = normalized ? JSON.parse(normalized) : {};

  const responseClip =
    input.hook_event_name === "afterAgentResponse" ||
    input.hook_event_name === "afterAgentThought"
      ? clip(input.text, MAX_TEXT_CHARS)
      : undefined;
  const promptClip =
    input.hook_event_name === "beforeSubmitPrompt"
      ? clip(input.prompt, MAX_PROMPT_CHARS)
      : undefined;

  const event = {
    schema_version: "1.0",
    observed_at: new Date().toISOString(),
    event_name: input.hook_event_name,
    conversation_id: input.conversation_id,
    run_id: input.generation_id,
    tool_call_id: input.tool_use_id ?? input.tool_call_id,
    model: input.model ?? input.model_id,
    model_id: input.model_id,
    tool_name: input.tool_name,
    duration_ms: input.duration ?? input.duration_ms,
    status:
      input.status ??
      input.failure_type ??
      (input.hook_event_name === "postToolUse" ? "completed" : undefined),
    transcript_path: input.transcript_path ?? process.env.CURSOR_TRANSCRIPT_PATH ?? null,
    input_digest: digest(input.tool_input ?? input.prompt),
    output_digest: digest(
      input.tool_output ?? input.text ?? input.error_message
    ),
    ...(responseClip
      ? { text_length: responseClip.length, text: responseClip.text }
      : {}),
    ...(promptClip
      ? { prompt_length: promptClip.length, prompt: promptClip.text }
      : {}),
    debug: {
      agent_telemetry_debug: process.env.AGENT_TELEMETRY_DEBUG ?? null,
      has_telemetry_url: Boolean(process.env.AGENT_TELEMETRY_URL),
      cursor_project_dir: process.env.CURSOR_PROJECT_DIR ?? null,
    },
  };

  await writeEvent(event);

  const endpoint = process.env.AGENT_TELEMETRY_URL;
  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.AGENT_TELEMETRY_TOKEN ?? ""}`,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(1000),
      });
    } catch {
      // Observability should normally fail open.
    }
  }

  if (input.hook_event_name === "beforeSubmitPrompt") {
    response = { continue: true };
  } else if (
    input.hook_event_name === "preToolUse" ||
    input.hook_event_name === "subagentStart"
  ) {
    response = { permission: "allow" };
  }
} catch (error) {
  await writeEvent({
    schema_version: "1.0",
    observed_at: new Date().toISOString(),
    error: "hook_failed",
    message: error instanceof Error ? error.message : String(error),
  });
}

respond(response);
