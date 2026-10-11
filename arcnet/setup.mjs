#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  realpathSync,
} from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parse, parseDocument, stringify } from "yaml";
import { serviceDeploySchema } from "@mp-lb/zapper/dist/arc/schemas.js";

const home = dirname(fileURLToPath(import.meta.url));
const fail = (message) => {
  throw new Error(message);
};
const read = (p) => readFileSync(p, "utf8");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const usage =
  "node ~/Work/stackforge/arcnet/setup.mjs <slug> [--dry-run] [--service backend] [--dockerfile Dockerfile] [--repository owner/repo] [--services arcnet.services.json]";

export function setup(args, root = process.cwd()) {
  if (args.length === 1 && args[0] === "--help") return usage;
  const slug = args[0];
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug ?? "") || slug.length > 23)
    fail(
      `Slug must be lowercase, start with a letter and contain at most 23 letters, digits or single hyphens.\n${usage}`,
    );
  const options = { service: "backend", dockerfile: "Dockerfile" };
  let dry = false;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--dry-run" && !dry) {
      dry = true;
      continue;
    }
    const key = args[i].slice(2);
    if (
      !["service", "dockerfile", "repository", "services"].includes(key) ||
      !args[i].startsWith("--") ||
      !args[i + 1] ||
      args[i + 1].startsWith("--") ||
      options[`seen-${key}`]
    )
      fail(`Unknown, duplicate or incomplete option: ${args[i]}`);
    options[key] = args[++i];
    options[`seen-${key}`] = true;
  }
  root = realpathSync(root);
  const safe = (name) => {
    const target = resolve(root, name);
    if (
      !name ||
      isAbsolute(name) ||
      relative(root, target) === ".." ||
      relative(root, target).startsWith("../")
    )
      fail(`Path must stay within the project: ${name}`);
    let at = root;
    for (const part of relative(root, target).split("/")) {
      at = join(at, part);
      let stat;
      try {
        stat = lstatSync(at);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (stat?.isSymbolicLink()) fail(`Refusing symlink: ${name}`);
      if (stat && at !== target && !stat.isDirectory())
        fail(`Parent path is not a directory: ${name}`);
    }
    return target;
  };
  if (!options.services && existsSync(safe("arcnet.services.json")))
    options.services = "arcnet.services.json";
  const zapPath = safe("zap.yaml");
  if (!existsSync(zapPath))
    fail("Run setup from a target repository containing zap.yaml.");
  const doc = parseDocument(read(zapPath));
  if (doc.errors.length) fail("zap.yaml is invalid YAML; fix it before setup.");
  const project = doc.toJS();
  if (project.project !== slug)
    fail(
      `Slug must equal zap.yaml project (${project.project}). No files changed.`,
    );
  if (
    !/^[a-z][a-z0-9-]*$/.test(options.service) ||
    ["gcp", "registry", "ci"].includes(options.service) ||
    /myshop/i.test(`${options.service} ${options.dockerfile}`)
  )
    fail("Invalid or reserved service name; MyShop must remain local-only.");
  if (
    !options.services &&
    !Object.hasOwn(project.native ?? {}, options.service) &&
    !Object.hasOwn(project.docker ?? {}, options.service) &&
    !Object.hasOwn(project.containers ?? {}, options.service)
  )
    fail(`No local service named ${options.service} in zap.yaml.`);
  if (
    !options.services &&
    (!existsSync(safe(options.dockerfile)) ||
      !lstatSync(safe(options.dockerfile)).isFile())
  )
    fail(
      `Missing ${options.dockerfile}. Add and test a backend-only Dockerfile listening on PORT=8080 with GET /health; use --dockerfile for another path.`,
    );
  if (!existsSync(safe("pnpm-lock.yaml")) || !existsSync(safe("package.json")))
    fail(
      "A pnpm project with committed package.json and pnpm-lock.yaml is required.",
    );
  const packageManager = JSON.parse(read(safe("package.json"))).packageManager;
  if (
    !/^pnpm@\d+\.\d+\.\d+(?:\+sha\d+\.[a-f0-9]+)?$/.test(packageManager ?? "")
  )
    fail(
      "package.json must pin an exact pnpm packageManager version for reproducible CI.",
    );
  let repository = options.repository;
  if (!repository) {
    let origin;
    try {
      origin = execFileSync("git", ["remote", "get-url", "origin"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      fail("Cannot read Git origin. Pass --repository owner/repo.");
    }
    repository =
      /^(?:git@github\.com:|https:\/\/github\.com\/)([^/]+\/[^/]+?)(?:\.git)?$/.exec(
        origin,
      )?.[1];
  }
  if (
    !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(
      repository ?? "",
    )
  )
    fail(
      "Repository must be an explicit GitHub owner/repo (or a GitHub origin).",
    );
  let selection;
  if (options.services) {
    if (options["seen-service"] || options["seen-dockerfile"])
      fail("--services cannot be combined with --service or --dockerfile.");
    selection = JSON.parse(read(safe(options.services)));
    if (
      !selection ||
      Array.isArray(selection) ||
      typeof selection !== "object" ||
      Object.keys(selection).length === 0
    )
      fail("Services file must be a nonempty JSON object.");
    const supported = [
      "cloud-run-web",
      "gce-worker",
      "vercel-static",
      "shared-mongo-atlas",
      "upstash-redis",
      "aws-s3",
    ];
    for (const [name, block] of Object.entries(selection)) {
      if (
        !/^[a-z][a-z0-9-]*$/.test(name) ||
        ["gcp", "registry", "ci", "myshop"].includes(name) ||
        /myshop/i.test(JSON.stringify(block))
      )
        fail(
          "Invalid service selection: MyShop is local-only and project module names are reserved.",
        );
      serviceDeploySchema.parse(block);
      if (!supported.includes(block.module))
        fail(
          `Unsupported starter module: ${block.module}. Use a reviewed custom Arc manifest.`,
        );
      if (
        ["cloud-run-web", "gce-worker"].includes(block.module) &&
        (!block.dockerfile || !existsSync(safe(block.dockerfile)))
      )
        fail(`Service ${name} requires an existing explicit Dockerfile.`);
      if (
        ["cloud-run-web", "vercel-static"].includes(block.module) &&
        (!block.domain || !/^[a-z0-9.-]+$/.test(block.domain))
      )
        fail(`Service ${name} requires an explicit domain.`);
      if (block["deploy-path"]) safe(block["deploy-path"]);
      if (block["local-config"]) safe(block["local-config"]);
    }
  }
  const configPath = safe(".arcnet/project.json");
  if (existsSync(configPath)) {
    const old = JSON.parse(read(configPath));
    if (
      old.slug !== slug ||
      old.repository !== repository ||
      old.service !== options.service ||
      old.dockerfile !== options.dockerfile ||
      JSON.stringify(old.selection) !== JSON.stringify(selection)
    )
      fail(
        "Existing ArcNet setup differs. Edit/review its committed config; setup never overwrites it.",
      );
    const required = [
      ".arcnet/network.yaml",
      ".arcnet/run.mjs",
      ".arcnet/package.json",
      ".arcnet/pnpm-lock.yaml",
      ".arcnet/env.production.json",
      ".arcnet/.gitignore",
      ".arcnet/operator.json",
      ".arcnet/.npmrc",
      ".github/workflows/deploy-arc.yaml",
    ];
    if (
      Object.values(selection ?? {}).some((s) => s.module === "vercel-static")
    )
      required.push(
        ".arcnet/modules/vercel-static/main.tf",
        ".arcnet/modules/vercel-static/module.yaml",
      );
    if (!project.deploy || required.some((p) => !existsSync(safe(p))))
      fail(
        "Incomplete ArcNet installation. Restore missing files from Git before rerunning.",
      );
    return "Already configured; preserved all existing files and edits.";
  }
  if (project.deploy)
    fail(
      "Existing deploy block detected. Migrate it explicitly; no files changed.",
    );
  const network = parse(
    read(
      existsSync(safe("arcnet.network.yaml"))
        ? safe("arcnet.network.yaml")
        : join(home, "network.yaml"),
    ),
  );
  const selectedModules = selection
    ? Object.values(selection).map((s) => s.module)
    : ["cloud-run-web"];
  const providerMap = {
    "cloud-run-web": ["google", "cloudflare"],
    "gce-worker": ["google"],
    "vercel-static": ["vercel", "cloudflare"],
    "shared-mongo-atlas": ["mongodbatlas"],
    "upstash-redis": ["upstash"],
    "aws-s3": ["aws"],
  };
  const providers = new Set([
    "google",
    ...selectedModules.flatMap((m) => providerMap[m]),
  ]);
  network.providers = Object.fromEntries(
    [...providers].map((k) => [k, network.providers[k]]),
  );
  const defaults = new Set([
    "github-ci",
    "gcp-project",
    "project-base",
    ...selectedModules,
  ]);
  network["module-defaults"] = Object.fromEntries(
    Object.entries(network["module-defaults"]).filter(([k]) => defaults.has(k)),
  );
  network.env = { resolver: "false", "public-file": ".arcnet/unused.env" };
  const gcpProject = network["gcp-project"]?.replaceAll("{slug}", slug);
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(gcpProject ?? ""))
    fail(
      "Network gcp-project must resolve to a valid 6–30 character project ID using {slug}.",
    );
  const config = {
    version: 1,
    slug,
    repository,
    service: options.service,
    dockerfile: options.dockerfile,
    selection,
    services: selection ? Object.keys(selection) : [options.service],
    approved: false,
    workloadIdentityProvider: "",
    serviceAccount: `arc-deploy@${gcpProject}.iam.gserviceaccount.com`,
  };
  const deployedSelection = selection && structuredClone(selection);
  for (const block of Object.values(deployedSelection ?? {}))
    if (block.module === "vercel-static")
      block.module = "./.arcnet/modules/vercel-static";
  doc.set("deploy", {
    project: {
      gcp: { module: "gcp-project" },
      registry: { module: "project-base", "depends-on": ["gcp"] },
      ci: {
        module: "github-ci",
        "depends-on": ["gcp"],
        params: { repository },
      },
    },
    services: deployedSelection ?? {
      [options.service]: {
        module: "cloud-run-web",
        domain: `${slug}-api.${network.dns.zone}`,
        dockerfile: options.dockerfile,
        env: [],
        params: {
          port: 8080,
          "health-path": "/health",
          "min-instances": 0,
          "max-instances": 2,
        },
      },
    },
  });
  const files = new Map([
    [".arcnet/project.json", json(config)],
    [".arcnet/network.yaml", stringify(network)],
    [".arcnet/.npmrc", "ignore-workspace=true\n"],
    [".arcnet/env.production.json", "{}\n"],
    [".arcnet/operator.json", json({ credentials: ".arcnet/credentials.env" })],
    [
      ".arcnet/.gitignore",
      "node_modules/\n.terraform/\n*.tfstate*\n*.tfplan\ncredentials.env\n",
    ],
    [".arcnet/run.mjs", read(join(home, "templates/run.mjs"))],
    [".arcnet/package.json", read(join(home, "package.json"))],
    [".arcnet/pnpm-lock.yaml", read(join(home, "pnpm-lock.yaml"))],
    [
      ".github/workflows/deploy-arc.yaml",
      read(join(home, "templates/deploy-arc.yaml")),
    ],
  ]);
  if (
    Object.values(selection ?? {}).some((s) => s.module === "vercel-static")
  ) {
    for (const name of ["main.tf", "module.yaml"])
      files.set(
        `.arcnet/modules/vercel-static/${name}`,
        read(join(home, "templates/vercel-static", name)),
      );
  }
  for (const name of files.keys())
    if (existsSync(safe(name)))
      fail(`Refusing to overwrite ${name}. No files changed.`);
  if (dry)
    return `Dry run: would add deploy.services (${config.services.join(", ")}), ${[...files.keys()].join(", ")}. No files written; no cloud commands run.`;
  // Validate every destination before writing; preserve unrelated files and YAML comments.
  for (const [name, content] of files) {
    mkdirSync(dirname(safe(name)), { recursive: true });
    writeFileSync(safe(name), content, { flag: "wx" });
  }
  writeFileSync(zapPath, doc.toString());
  return "ArcNet files generated. Deployment is disabled (approved=false). Review the StackForge ArcNet prerequisites, network REPLACE_ placeholders, Dockerfile, domain, env whitelist and Git diff. Install: pnpm -C .arcnet install --ignore-workspace --frozen-lockfile. Offline check: node .arcnet/run.mjs check. Only the selected services are included; no existing Vercel project is automatically adopted. MyShop stays local-only.";
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(setup(process.argv.slice(2)));
  } catch (error) {
    console.error(`ArcNet setup: ${error.message}`);
    process.exitCode = 1;
  }
}
