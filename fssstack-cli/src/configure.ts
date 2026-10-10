import { parseArgs } from "node:util";
import { version } from "../package.json";
import {
  defaultProjectPromptConfig,
  defaultTheme,
  normalizeProjectPromptConfig,
  projectPromptSchema,
  toSlug,
} from "../../fssstack-start/app/project-schema";
import { buildManifestYaml } from "../../fssstack-start/app/project-manifest";
import { buildPrompt } from "../../fssstack-start/app/project-prompt";

export const help = `Usage: fssstack --name "My App" --description "What it does" [options]

Generate the same setup prompt as FSS Stack's web configurator.
This command only generates text; it does not scaffold or install a project.

Project:
  --name TEXT                Project name (default: My App)
  --description TEXT         Required; 1–200 characters
  --slug SLUG                Default: derived from name
  --emoji EMOJI              Default: 🚀
  --package-prefix @ORG      Default: @fssstack
  --shadcn-preset TOKEN      Default: ${defaultTheme}

Arrays (repeat each flag; explicit entries replace defaults):
  --backend NAME             Default: backend
  --frontend NAME:TYPE       Default: frontend:react-vite
                            Types: react-vite, react-nextjs, react-fumadocs
  --lib NAME                 Default: none
  --extension NAME           clerk, mongodb, s3, bull, playwright, redis
  --clerk                    Shorthand for --extension clerk
  --mongodb                  Shorthand for --extension mongodb
  --no-backends              Empty backend list; conflicts with --backend
  --no-frontends             Empty frontend list; conflicts with --frontend

Output:
  --format prompt|yaml|json  Default: prompt; json matches web Raw values
  --no-prerequisites         Omit prerequisite paragraph from prompt
  --output PATH              Write a new file (refuses to overwrite)
  --help, -h                 Show help
  --version, -v              Show version

Example:
  fssstack --name "Atlas" --description "Team workspace" \\
    --clerk --mongodb --backend api --backend worker \\
    --frontend web:react-vite --frontend admin:react-nextjs \\
    --frontend docs:react-fumadocs --lib sdk --format yaml

Names are normalized to slugs as in the web UI. Quote multiword values.
Array order is preserved; duplicate extensions are removed.
`;

export function render(args: string[]): { text: string; output?: string } {
  const { values, tokens } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    tokens: true,
    options: {
      name: { type: "string" },
      description: { type: "string" },
      slug: { type: "string" },
      emoji: { type: "string" },
      "package-prefix": { type: "string" },
      "shadcn-preset": { type: "string" },
      backend: { type: "string", multiple: true },
      frontend: { type: "string", multiple: true },
      lib: { type: "string", multiple: true },
      extension: { type: "string", multiple: true },
      clerk: { type: "boolean" },
      mongodb: { type: "boolean" },
      "no-backends": { type: "boolean" },
      "no-frontends": { type: "boolean" },
      "no-prerequisites": { type: "boolean" },
      format: { type: "string" },
      output: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.help || args.length === 0) return { text: help };
  if (values.version) return { text: `${version}\n` };
  for (const [empty, entries] of [
    ["no-backends", "backend"],
    ["no-frontends", "frontend"],
  ] as const) {
    if (values[empty] && values[entries]) {
      throw new Error(`--${empty} cannot be combined with --${entries}.`);
    }
  }
  const format = values.format ?? "prompt";
  if (!["prompt", "yaml", "json"].includes(format)) {
    throw new Error("--format must be prompt, yaml, or json.");
  }
  if (values.output !== undefined && !values.output.trim()) {
    throw new Error("--output requires a nonempty path.");
  }
  // Preserve selection order even when shorthand and repeated flags are mixed.
  const extensions = tokens.flatMap((token) => {
    if (token.kind !== "option") return [];
    if (token.name === "extension") return [token.value!];
    return token.name === "clerk" || token.name === "mongodb"
      ? [token.name]
      : [];
  });
  const name = values.name ?? defaultProjectPromptConfig.name;
  const input = {
    ...defaultProjectPromptConfig,
    name,
    description: values.description ?? defaultProjectPromptConfig.description,
    slug: toSlug(values.slug ?? name),
    emoji: values.emoji ?? defaultProjectPromptConfig.emoji,
    packagePrefix: (
      values["package-prefix"] ?? defaultProjectPromptConfig.packagePrefix
    )
      .trim()
      .toLowerCase(),
    shadcnPreset: values["shadcn-preset"] ?? defaultTheme,
    extensions,
    backendServices: values["no-backends"]
      ? []
      : (values.backend ?? defaultProjectPromptConfig.backendServices).map(
          toSlug,
        ),
    frontendClients: values["no-frontends"]
      ? []
      : (values.frontend?.map((entry) => {
          const parts = entry.split(":");
          if (parts.length !== 2 || !parts[0] || !parts[1]) {
            throw new Error(
              `Invalid --frontend ${JSON.stringify(entry)}; use NAME:TYPE, e.g. web:react-vite.`,
            );
          }
          return { slug: toSlug(parts[0]), type: parts[1] };
        }) ?? defaultProjectPromptConfig.frontendClients),
    libraryPackages: (values.lib ?? []).map(toSlug),
  };
  // Validate before normalization filters empty names, matching the web UI.
  const result = projectPromptSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    );
  }
  const config = normalizeProjectPromptConfig(result.data);
  const text =
    format === "yaml"
      ? buildManifestYaml(config)
      : format === "json"
        ? JSON.stringify(config, null, 2)
        : buildPrompt(config, !values["no-prerequisites"]);
  return { text: `${text}\n`, output: values.output };
}
