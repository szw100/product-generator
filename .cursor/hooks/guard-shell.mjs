import process from "node:process";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function respond(permission, reason = "") {
  const body = {
    continue: true,
    permission,
    ...(reason ? { reason, user_message: reason, agent_message: reason } : {})
  };
  process.stdout.write(`${JSON.stringify(body)}\n`);
}

const blocked = [
  /(?:^|\s)sam\s+deploy(?:\s|$)/i,
  /(?:^|\s)cdk\s+deploy(?:\s|$)/i,
  /(?:^|\s)aws\s+cloudformation\s+deploy(?:\s|$)/i,
  /(?:^|\s)terraform\s+(?:apply|destroy)(?:\s|$)/i,
  /(?:^|\s)serverless\s+deploy(?:\s|$)/i,
  /(?:^|\s)amplify\s+publish(?:\s|$)/i,
  /(?:^|\s)(?:sf\s+project\s+deploy|sfdx\s+force:source:deploy)(?:\s|$)/i,
  /(?:^|\s)git\s+push\s+.*(?:--force|-f)(?:\s|$)/i,
  /(?:^|\s)git\s+push(?:\s+[^\s]+)?\s+(?:main|master|prod|production)(?:\s|$)/i,
  /(?:^|\s)(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:deploy|release|publish|prod|production)(?:\s|$)/i,
  /(?:^|\s)npm\s+publish(?:\s|$)/i,
  /(?:^|\s)gh\s+(?:pr\s+merge|release\s+create)(?:\s|$)/i,
  /(?:^|\s)git\s+reset\s+--hard(?:\s|$)/i,
  /(?:^|\s)git\s+clean\s+.*-[a-z]*f[a-z]*(?:\s|$)/i,
  /(?:^|\s)(?:rm\s+-rf|rmdir\s+\/s|del\s+\/f)(?:\s|$)/i,
  /(?:^|\s)aws\s+(?:iam|secretsmanager|ssm|route53|organizations|s3api)\s+(?:create|put|update|delete|remove|attach|detach|enable|disable|rotate)/i,
  /(?:^|\s)(?:sf|sfdx)\s+.*(?:delete|destroy|deploy|data\s+(?:create|update|delete|upsert|import))/i
];

try {
  const raw = await readStdin();
  // Strip UTF-8 BOM if present — Cursor may prefix hook stdin JSON with U+FEFF.
  const normalized = raw.replace(/^\uFEFF/, "").trim();
  const payload = normalized ? JSON.parse(normalized) : {};
  const command = String(payload.command ?? payload.tool_input?.command ?? "");

  if (!command) {
    respond("deny", "Shell command was empty or the hook payload could not identify it; blocked fail-closed.");
    process.exit(2);
  }

  const match = blocked.find(pattern => pattern.test(command));
  if (match) {
    respond("deny", `Blocked prohibited deployment, destructive, or external-state-changing command: ${command}`);
    process.exit(2);
  }

  respond("allow");
} catch (error) {
  respond("deny", `Shell guard failed closed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
