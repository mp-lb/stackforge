#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { parse } from "yaml";
import { loadManifest } from "@mp-lb/zapper/dist/arc/manifest.js";
import { resolveModules } from "@mp-lb/zapper/dist/arc/modules.js";
import {
  deployBlockSchema,
  networkConfigSchema,
} from "@mp-lb/zapper/dist/arc/schemas.js";
const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (name) => readFileSync(join(here, name), "utf8");
try {
  const command = process.argv[2];
  if (
    !["check", "plan", "deploy"].includes(command) ||
    process.argv.length !== 3
  )
    throw new Error("Usage: node .arcnet/run.mjs check|plan|deploy");
  const config = JSON.parse(read("project.json"));
  const zap = parse(readFileSync(join(root, "zap.yaml"), "utf8"));
  const network = networkConfigSchema.parse(parse(read("network.yaml")));
  deployBlockSchema.parse(zap.deploy);
  if (config.version !== 1 || zap.project !== config.slug)
    throw new Error("Project config does not match zap.yaml.");
  const services = Object.keys(zap.deploy?.services ?? {});
  if (
    JSON.stringify(services.sort()) !==
      JSON.stringify([...config.services].sort()) ||
    /myshop/i.test(JSON.stringify(zap.deploy.services))
  )
    throw new Error(
      "Service selection differs or includes local-only MyShop. Review scope before deployment.",
    );
  const blocks = Object.values(zap.deploy.services);
  for (const service of blocks)
    if (
      ["cloud-run-web", "gce-worker"].includes(service.module) &&
      (!service.dockerfile || !existsSync(join(root, service.dockerfile)))
    )
      throw new Error("Container Dockerfile is missing.");
  if (zap.deploy.project?.ci?.params?.repository !== config.repository)
    throw new Error(
      "Deployment manifest repository differs from project config.",
    );
  const publicEnv = JSON.parse(read("env.production.json"));
  let secretEnv;
  try {
    secretEnv = JSON.parse(process.env.ARCNET_ENV_JSON || "{}");
  } catch {
    throw new Error("ARCNET_ENV_JSON must be valid JSON (value omitted).");
  }
  for (const pool of [publicEnv, secretEnv])
    if (
      !pool ||
      Array.isArray(pool) ||
      typeof pool !== "object" ||
      Object.entries(pool).some(
        ([k, v]) => !/^[A-Z_][A-Z0-9_]*$/.test(k) || typeof v !== "string",
      )
    )
      throw new Error(
        "Environment pools must be JSON objects mapping environment names to strings.",
      );
  const envPool = { ...publicEnv, ...secretEnv };
  if (command === "check") {
    console.log(
      "Offline config check passed. Cloud access, image runtime and live deployment have NOT been verified.",
    );
    process.exit(0);
  }
  if (command === "deploy" && config.approved !== true)
    throw new Error(
      "Deployment disabled. Complete prerequisites and obtain target/cost/IAM/DNS approval before committing approved=true.",
    );
  if (process.env.GITHUB_ACTIONS === "true") {
    if (
      process.env.GITHUB_REPOSITORY !== config.repository ||
      process.env.GITHUB_REF !== "refs/heads/main"
    )
      throw new Error(
        "CI deployment is restricted to the configured repository main branch.",
      );
    if (
      !/^projects\/\d+\/locations\/global\/workloadIdentityPools\/github\/providers\/github-actions$/.test(
        config.workloadIdentityProvider,
      )
    )
      throw new Error(
        "Set workloadIdentityProvider from the approved first deployment.",
      );
  }
  const modulesDir = resolve(
    dirname(require.resolve("@mp-lb/zapper")),
    "../arc",
  );
  const instances = resolveModules(loadManifest(root), modulesDir, root);
  for (const instance of instances)
    for (const credential of instance.manifest.credentials)
      if (!process.env[credential.name])
        throw new Error(
          `${credential.name} is required for ${instance.key}; supply a scoped operator credential through environment, never commit it.`,
        );
  if (JSON.stringify(network).includes("REPLACE_"))
    throw new Error(
      "Network contains REPLACE_ placeholders. Commit reviewed network/billing settings before planning or deployment.",
    );
  const missing = blocks
    .flatMap((service) => service.env ?? [])
    .filter((key) => !key.includes("=") && !Object.hasOwn(envPool, key));
  if (missing.length)
    throw new Error(
      `Missing app environment keys: ${missing.join(", ")}. Supply ARCNET_ENV_JSON or committed public env.`,
    );
  for (const tool of [
    "terraform",
    "gcloud",
    ...(blocks.some((s) => ["cloud-run-web", "gce-worker"].includes(s.module))
      ? ["docker"]
      : []),
  ])
    if (spawnSync(tool, ["--version"], { stdio: "ignore" }).status !== 0)
      throw new Error(
        `Required executable unavailable: ${tool}. See StackForge ArcNet prerequisites.`,
      );
  const executable = require.resolve("@mp-lb/zapper");
  const result = spawnSync(process.execPath, [executable, "arc", command], {
    cwd: root,
    input: JSON.stringify(envPool),
    stdio: ["pipe", "inherit", "inherit"],
    env: {
      ...process.env,
      ZAP_ARC_NETWORK_FILE: join(here, "network.yaml"),
      ZAP_ARC_CONFIG: join(here, "operator.json"),
    },
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `Zap Arc ${command} failed (${result.status ?? "could not start"}). Inspect output; partial cloud changes are possible. Do not rerun blindly.`,
    );
} catch (error) {
  console.error(`ArcNet: ${error.message}`);
  process.exitCode = 1;
}
