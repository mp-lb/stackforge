#!/usr/bin/env node
// ArcNet static-site adapter. No Terraform state, project settings, domains or DNS ownership.
import {
  existsSync,
  realpathSync,
  lstatSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  cpSync,
  rmSync,
  renameSync,
} from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
const fail = (message) => {
  throw new Error(message);
};
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
function keys(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((k) => !allowed.includes(k)))
    fail(
      `Invalid ${label} fields. Terraform ownership/import is not part of Vercel reference mode.`,
    );
}
export function safePath(root, name) {
  if (
    typeof name !== "string" ||
    !name ||
    isAbsolute(name) ||
    name.includes("\\")
  )
    fail("Expected a project-relative path.");
  const target = resolve(root, name),
    rel = relative(root, target);
  if (
    !rel ||
    rel === ".." ||
    rel.startsWith("../") ||
    rel
      .split("/")
      .some((p) => [".git", "node_modules", ".arcnet"].includes(p)) ||
    /^apps\/myshop(?:\/|$)/i.test(rel)
  )
    fail(`Unsafe or local-only artifact path: ${name}`);
  let at = root;
  for (const part of rel.split("/")) {
    at = join(at, part);
    let stat;
    try {
      stat = lstatSync(at);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (stat?.isSymbolicLink()) fail(`Symlink not allowed: ${name}`);
  }
  return target;
}
export function validateConfig(config, root) {
  keys(
    config,
    ["version", "mode", "slug", "repository", "approved", "account", "sites"],
    "Vercel config",
  );
  if (
    config.version !== 1 ||
    config.mode !== "vercel" ||
    typeof config.approved !== "boolean" ||
    !/^[a-z][a-z0-9-]{0,22}$/.test(config.slug) ||
    !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(
      config.repository,
    )
  )
    fail("Invalid project identity or approval flag.");
  keys(config.account, ["type", "id"], "account");
  if (
    !["team", "personal"].includes(config.account.type) ||
    !/^[A-Za-z0-9_]{3,128}$/.test(config.account.id) ||
    (config.account.type === "team" &&
      !config.account.id.startsWith("team_")) ||
    /REPLACE/i.test(config.account.id)
  )
    fail("Supply the exact Vercel account ID and type (team or personal).");
  if (!object(config.sites) || !Object.keys(config.sites).length)
    fail("Select at least one static site.");
  const identities = new Set();
  for (const [name, site] of Object.entries(config.sites)) {
    if (!/^[a-z][a-z0-9-]*$/.test(name) || /myshop/i.test(name))
      fail("Invalid site name; MyShop is local-only.");
    keys(
      site,
      [
        "mode",
        "projectId",
        "projectName",
        "creationApproved",
        "build",
        "output",
        "outputConfig",
      ],
      `site ${name}`,
    );
    if (
      !["existing", "new"].includes(site.mode) ||
      !/^[a-z0-9][a-z0-9-]{0,99}$/.test(site.projectName ?? "") ||
      /REPLACE/i.test(site.projectName)
    )
      fail(`Site ${name} requires an exact projectName and existing/new mode.`);
    if (
      site.mode === "existing" &&
      (!/^prj_[A-Za-z0-9]+$/.test(site.projectId ?? "") ||
        /REPLACE/i.test(site.projectId) ||
        "creationApproved" in site)
    )
      fail(
        `Site ${name} requires an existing project ID; it cannot authorize creation.`,
      );
    if (
      site.mode === "new" &&
      ("projectId" in site || typeof site.creationApproved !== "boolean")
    )
      fail(
        `New site ${name} requires creationApproved and cannot include projectId.`,
      );
    for (const id of [site.projectName, site.projectId].filter(Boolean)) {
      if (identities.has(id)) fail("Duplicate Vercel project selection.");
      identities.add(id);
    }
    if (
      !Array.isArray(site.build) ||
      !site.build.length ||
      site.build.some(
        (a) => typeof a !== "string" || !a || /myshop|[\n\r\0]/i.test(a),
      ) ||
      site.build[0] !== "pnpm"
    )
      fail(
        `Site ${name} build must be an explicit pnpm argument array excluding MyShop.`,
      );
    safePath(root, site.output);
    keys(
      site.outputConfig,
      ["version", "routes", "overrides"],
      `Build Output config for ${name}`,
    );
    if (
      site.outputConfig.version !== 3 ||
      ("routes" in site.outputConfig &&
        !Array.isArray(site.outputConfig.routes)) ||
      ("overrides" in site.outputConfig && !object(site.outputConfig.overrides))
    )
      fail("Static Build Output config must use version 3.");
  }
  return config;
}
export function renderPlan(config, root) {
  validateConfig(config, root);
  return {
    mode: "vercel",
    account: config.account,
    approved: config.approved,
    terraform: false,
    changesProjectSettings: false,
    changesDNS: false,
    sites: Object.entries(config.sites).map(([name, site]) => ({
      name,
      operation:
        site.mode === "new"
          ? "explicit-create-required-before-deploy"
          : "reference-existing",
      projectId: site.projectId ?? null,
      projectName: site.projectName,
      build: site.build,
      output: site.output,
      outputConfig: site.outputConfig,
      deployment: "prebuilt-static",
    })),
  };
}
export function apiClient(token, fetcher = fetch) {
  if (!token)
    fail(
      "VERCEL_TOKEN is required for remote operations; check and plan remain offline.",
    );
  return async (method, path, account, body) => {
    const url = new URL(path, "https://api.vercel.com");
    if (account.type === "team") url.searchParams.set("teamId", account.id);
    let response;
    try {
      response = await fetcher(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      fail(
        method === "POST"
          ? "Creation outcome uncertain. Inspect the named project before retrying; no automatic retry was attempted."
          : "Vercel read failed; no changes attempted.",
      );
    }
    if (response.status === 404 && method === "GET") return null;
    if (!response.ok)
      fail(
        `Vercel ${method} failed (HTTP ${response.status}). Check scope/access; response content omitted.`,
      );
    try {
      return await response.json();
    } catch {
      fail(
        "Vercel returned an invalid response; inspect the project before retrying.",
      );
    }
  };
}
function checkIdentity(project, site, account) {
  if (
    !project ||
    project.id !== site.projectId ||
    project.name !== site.projectName ||
    project.accountId !== account.id
  )
    fail(
      `Project identity/scope mismatch for ${site.projectName}. No deployment attempted.`,
    );
}
export async function inspectReferences(config, request) {
  for (const site of Object.values(config.sites)) {
    if (site.mode !== "existing")
      fail(
        `Project ${site.projectName} is new. Create it explicitly, review and commit the returned reference before deployment.`,
      );
    checkIdentity(
      await request("GET", `/v9/projects/${site.projectId}`, config.account),
      site,
      config.account,
    );
  }
}
export async function createProject(config, name, request) {
  const site = config.sites[name];
  if (!site) fail("Choose a configured site.");
  if (site.mode === "existing") {
    checkIdentity(
      await request("GET", `/v9/projects/${site.projectId}`, config.account),
      site,
      config.account,
    );
    return config;
  }
  if (site.creationApproved !== true)
    fail(
      "Project creation disabled. Obtain explicit target/cost approval and set creationApproved=true for this site.",
    );
  if (config.account.type === "personal") {
    const who = await request("GET", "/v2/user", config.account);
    if (who?.user?.id !== config.account.id)
      fail(
        "Token personal account does not match configured account; no project created.",
      );
  }
  if (
    await request(
      "GET",
      `/v9/projects/${encodeURIComponent(site.projectName)}`,
      config.account,
    )
  )
    fail(
      `Project name ${site.projectName} already exists. Set an explicit existing reference after verifying its ID; no duplicate project was created.`,
    );
  const created = await request("POST", "/v11/projects", config.account, {
    name: site.projectName,
    framework: null,
  });
  if (
    !created ||
    !/^prj_[A-Za-z0-9]+$/.test(created.id ?? "") ||
    created.accountId !== config.account.id ||
    created.name !== site.projectName
  )
    fail(
      "Creation response identity mismatch. Inspect the account before retrying.",
    );
  const next = structuredClone(config);
  next.approved = false;
  next.sites[name] = { ...site, mode: "existing", projectId: created.id };
  delete next.sites[name].creationApproved;
  return next;
}
function inspectStaticTree(path) {
  for (const name of readdirSync(path)) {
    const p = join(path, name),
      stat = lstatSync(p);
    if (
      stat.isSymbolicLink() ||
      [".git", ".env", "node_modules"].includes(name) ||
      name.startsWith(".env.")
    )
      fail(`Refusing unsafe static artifact entry: ${name}`);
    if (stat.isDirectory()) inspectStaticTree(p);
    else if (!stat.isFile()) fail("Static output contains a non-regular file.");
  }
}
export function stageSite(root, site, account) {
  const output = safePath(root, site.output);
  if (
    !existsSync(output) ||
    !lstatSync(output).isDirectory() ||
    !existsSync(join(output, "index.html"))
  )
    fail(`Static output needs index.html: ${site.output}`);
  inspectStaticTree(output);
  const stage = mkdtempSync(join(tmpdir(), "arcnet-static-"));
  try {
    mkdirSync(join(stage, ".vercel/output"), { recursive: true });
    cpSync(output, join(stage, ".vercel/output/static"), { recursive: true });
    writeFileSync(
      join(stage, ".vercel/output/config.json"),
      JSON.stringify(site.outputConfig),
    );
    writeFileSync(
      join(stage, ".vercel/project.json"),
      JSON.stringify({
        projectId: site.projectId,
        orgId: account.id,
        projectName: site.projectName,
      }),
    );
    return stage;
  } catch (e) {
    rmSync(stage, { recursive: true, force: true });
    throw e;
  }
}
export async function deploy(
  config,
  root,
  request,
  run,
  environment,
  target = "production",
) {
  validateConfig(config, root);
  if (config.approved !== true)
    fail(
      "Deployment disabled. Review account, project references, routing and production-trigger ownership before setting approved=true.",
    );
  if (!["production", "preview"].includes(target))
    fail("Target must be production or preview.");
  if (
    environment.GITHUB_ACTIONS === "true" &&
    (environment.GITHUB_REPOSITORY !== config.repository ||
      environment.GITHUB_REF !== "refs/heads/main")
  )
    fail(
      "CI deployment is restricted to the configured repository main branch.",
    );
  await inspectReferences(config, request); // Check every identity before building or uploading any site.
  const stages = [];
  try {
    for (const site of Object.values(config.sites)) {
      const buildEnv = Object.fromEntries(
        Object.entries(environment).filter(([k]) => !k.startsWith("VERCEL_")),
      );
      await run(site.build[0], site.build.slice(1), root, buildEnv);
      stages.push([site, stageSite(root, site, config.account)]);
    }
    for (const [site, stage] of stages) {
      const args = [
        "--yes",
        "vercel@63.1.2",
        "deploy",
        "--prebuilt",
        "--yes",
        ...(target === "production" ? ["--prod"] : []),
        "--token",
        environment.VERCEL_TOKEN,
      ];
      await run("npx", args, stage, {
        ...environment,
        VERCEL_PROJECT_ID: site.projectId,
        VERCEL_ORG_ID: config.account.id,
      });
    }
  } finally {
    for (const [, stage] of stages)
      rmSync(stage, { recursive: true, force: true });
  }
}
async function main() {
  const here = dirname(fileURLToPath(import.meta.url)),
    root = resolve(here, "..");
  const path = join(here, "project.json"),
    original = readFileSync(path, "utf8");
  const config = validateConfig(JSON.parse(original), root);
  const [command, argument, ...extra] = process.argv.slice(2);
  if (
    extra.length ||
    !["check", "plan", "inspect", "create", "deploy", "preview"].includes(
      command,
    ) ||
    (command !== "create" && argument) ||
    (command === "create" && !argument)
  )
    fail(
      "Usage: node .arcnet/run.mjs check|plan|inspect|create <site>|deploy|preview",
    );
  if (command === "check" || command === "plan") {
    console.log(JSON.stringify(renderPlan(config, root), null, 2));
    return;
  }
  if (command === "create" && process.env.GITHUB_ACTIONS === "true")
    fail(
      "Project creation is a separate local operator step, never a CI side effect.",
    );
  if (["deploy", "preview"].includes(command) && !config.approved)
    fail("Deployment disabled (approved=false). No remote calls made.");
  const request = apiClient(process.env.VERCEL_TOKEN);
  if (command === "inspect") {
    await inspectReferences(config, request);
    console.log(
      "All existing project IDs, names and account scopes match. No settings or DNS changed.",
    );
    return;
  }
  if (command === "create") {
    const next = await createProject(config, argument, request);
    if (next === config) {
      console.log(
        "Already an existing reference; identity verified, nothing created.",
      );
      return;
    }
    if (readFileSync(path, "utf8") !== original)
      fail(
        `Config changed during creation. Recover the created project ID ${next.sites[argument].projectId} manually; no local settings overwritten.`,
      );
    const temp = `${path}.new`;
    writeFileSync(temp, JSON.stringify(next, null, 2) + "\n", { flag: "wx" });
    renameSync(temp, path);
    console.log(
      `Created ${next.sites[argument].projectId}; config now references it, approved=false. Review and commit project.json before CI. No deployment performed.`,
    );
    return;
  }
  const run = (cmd, args, cwd, env) => {
    const result = spawnSync(cmd, args, { cwd, env, stdio: "inherit" });
    if (result.error || result.status !== 0)
      fail(
        `${cmd} failed; no automatic retry. Earlier uploads, if any, may have succeeded.`,
      );
  };
  await deploy(
    config,
    root,
    request,
    run,
    process.env,
    command === "preview" ? "preview" : "production",
  );
}
if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(`ArcNet Vercel: ${error.message}`);
    process.exitCode = 1;
  });
