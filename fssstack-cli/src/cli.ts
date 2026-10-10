import { version } from "../package.json";
import {
  normalizeProjectPromptConfig,
  projectPromptJsonSchema,
  projectPromptSchema,
} from "../../fssstack-start/app/project-schema";
import { buildPrompt } from "../../fssstack-start/app/project-prompt";

const help = `Usage:
  fssstack schema          Print the JSON Schema
  fssstack prompt [JSON]   Validate JSON and print the setup prompt

With no JSON argument, prompt reads JSON from stdin:
  fssstack schema > schema.json
  fssstack prompt < project.json > prompt.md
  fssstack prompt '{"description":"My app"}'

Copy JSON from the website's JSON tab. Defaults and prompt text are shared
with the web app. Output goes to stdout; validation errors go to stderr.
App and library slugs must be unique across all lists (checked by Zod).
  --help, -h              Show help
  --version, -v           Show version
`;

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(help);
  } else if (command === "--version" || command === "-v") {
    process.stdout.write(`${version}\n`);
  } else if (command === "schema" && args.length === 0) {
    process.stdout.write(
      `${JSON.stringify(projectPromptJsonSchema(), null, 2)}\n`,
    );
  } else if (command === "prompt" && args.length <= 1) {
    let input = args[0];
    if (input === undefined) {
      if (process.stdin.isTTY)
        throw new Error("Provide a JSON argument or pipe JSON to stdin.");
      process.stdin.setEncoding("utf8");
      input = "";
      for await (const chunk of process.stdin) input += chunk;
    }
    let value: unknown;
    try {
      value = JSON.parse(input);
    } catch {
      throw new Error(
        "Invalid JSON. Pass a JSON object or pipe a JSON file to stdin.",
      );
    }
    const result = projectPromptSchema.safeParse(value);
    if (!result.success) {
      throw new Error(
        result.error.issues
          .map(
            (issue) => `${issue.path.join(".") || "config"}: ${issue.message}`,
          )
          .join("\n"),
      );
    }
    process.stdout.write(
      `${buildPrompt(normalizeProjectPromptConfig(result.data))}\n`,
    );
  } else {
    throw new Error(
      "Use 'fssstack schema' or 'fssstack prompt [JSON]'. See --help.",
    );
  }
} catch (error) {
  process.stderr.write(
    `fssstack: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
