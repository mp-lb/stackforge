import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig } from "./templates/vercel-run.mjs";
const home = dirname(fileURLToPath(import.meta.url));
const json = (value) => JSON.stringify(value, null, 2) + "\n";
export function setupVercel({ root, slug, safe, file, dry, hasDeploy }) {
  if (hasDeploy)
    throw new Error(
      "Existing Terraform deploy block found. Vercel-only reference mode cannot silently replace it.",
    );
  const input = JSON.parse(readFileSync(safe(file), "utf8"));
  const config = {
    version: 1,
    mode: "vercel",
    slug,
    repository: input.repository,
    approved: false,
    account: input.account,
    sites: input.sites,
  };
  if (
    Object.keys(input).some(
      (k) => !["repository", "account", "sites"].includes(k),
    )
  )
    throw new Error(
      "Vercel input supports only repository, account and sites; ownership/import is separate.",
    );
  validateConfig(config, root);
  const path = safe(".arcnet/project.json");
  const files = new Map([
    [".arcnet/project.json", json(config)],
    [
      ".arcnet/run.mjs",
      readFileSync(join(home, "templates/vercel-run.mjs"), "utf8"),
    ],
    [".arcnet/.gitignore", "project.json.new\n"],
    [
      ".github/workflows/deploy-arc.yaml",
      readFileSync(join(home, "templates/deploy-vercel.yaml"), "utf8"),
    ],
  ]);
  if (existsSync(path)) {
    const old = JSON.parse(readFileSync(path, "utf8"));
    const { approved, ...previous } = old;
    const { approved: ignored, ...expected } = config;
    // Creation promotes a planned new site to an explicit reference; a setup rerun must preserve that receipt.
    for (const [name, site] of Object.entries(expected.sites)) {
      if (site.mode === "new" && previous.sites?.[name]?.mode === "existing") {
        expected.sites[name] = {
          ...site,
          mode: "existing",
          projectId: previous.sites[name].projectId,
        };
        delete expected.sites[name].creationApproved;
      }
    }
    if (!isDeepStrictEqual(previous, expected))
      throw new Error(
        "Existing ArcNet configuration differs. Review committed config instead of overwriting it. After explicit creation, update the source input to the returned existing reference.",
      );
    for (const name of files.keys())
      if (!existsSync(safe(name)))
        throw new Error(`Incomplete installation: restore ${name} from Git.`);
    return "Already configured; preserved all settings and files.";
  }
  for (const name of files.keys())
    if (existsSync(safe(name)))
      throw new Error(`Refusing to overwrite ${name}. No files changed.`);
  if (dry)
    return `Dry run: Vercel-only references for ${Object.keys(config.sites).join(", ")}. No files or cloud resources changed; no GCP/WIF/Terraform.`;
  for (const [name, content] of files) {
    mkdirSync(dirname(safe(name)), { recursive: true });
    writeFileSync(safe(name), content, { flag: "wx" });
  }
  return "Generated Vercel-only config and GitHub workflow (approved=false). No zap.yaml changes, GCP, Terraform, DNS or project settings ownership. Offline plan: node .arcnet/run.mjs plan";
}
