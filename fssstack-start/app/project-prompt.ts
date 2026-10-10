import type { ProjectPromptConfig } from "./project-schema";
import { buildManifestYaml } from "./project-manifest";

export const defaultIncludePrerequisites = true;

export const buildPrompt = (
  config: ProjectPromptConfig,
  includePrerequisites: boolean = defaultIncludePrerequisites,
) => `${
  includePrerequisites
    ? `Before starting, make sure the \`npx\`, \`git\`, \`docker\`, \`node\`, \`pnpm\`, and \`zap\` commands are available. Install anything missing before continuing. Default to installing with Homebrew on macOS. For Zap, install globally with npm using package name \`@mp-lb/zapper\`. Bootstrap Forum CLI with \`npx -y @mp-lb/forum-cli\`; the setup process installs it as a local project dev dependency and then uses \`pnpm exec fm\`.

`
    : ""
}To start setup:

1. Start in an empty folder.
2. Create \`fssstack.yaml\` from the YAML configuration shown below.
3. Create \`forum.yaml\` with \`npx -y @mp-lb/forum-cli read --store mp-lb/fssstack forum.example.yaml > forum.yaml\`.
4. Follow \`npx -y @mp-lb/forum-cli read SETUP_PROCESS.md\`.

\`\`\`yaml
${buildManifestYaml(config)}
\`\`\``;
