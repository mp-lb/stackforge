import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";
import { setup } from "../setup.mjs";
import { loadManifest } from "@mp-lb/zapper/dist/arc/manifest.js";
import { loadNetwork } from "@mp-lb/zapper/dist/arc/network.js";
import { resolveModules } from "@mp-lb/zapper/dist/arc/modules.js";
import { renderDeployment } from "@mp-lb/zapper/dist/arc/render.js";
const home = dirname(dirname(fileURLToPath(import.meta.url)));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "arcnet-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // Synthetic cases extend hello-world names to exercise backend defaults and exclusions.
  writeFileSync(
    join(root, "zap.yaml"),
    "# Keep local services\nproject: hello-world\nnative:\n  backend:\n    cmd: pnpm --filter @hello-world/hello-world-api dev\n  web:\n    cmd: pnpm web\n  docs:\n    cmd: pnpm docs\n  myshop:\n    cmd: pnpm myshop\n",
  );
  writeFileSync(
    join(root, "Dockerfile"),
    "FROM node:22-alpine\n# Fixture only; not a real application image.\n",
  );
  writeFileSync(
    join(root, "package.json"),
    '{"packageManager":"pnpm@10.11.0"}\n',
  );
  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9.0\n");
  return root;
}
const args = ["hello-world", "--repository", "mp-lb/hello-world"];
test("dry-run is read-only and shows selected scope", (t) => {
  const root = fixture(t);
  const before = readFileSync(join(root, "zap.yaml"), "utf8");
  assert.match(setup([...args, "--dry-run"], root), /Dry run/);
  assert.equal(readFileSync(join(root, "zap.yaml"), "utf8"), before);
  assert.equal(existsSync(join(root, ".arcnet")), false);
});
test("Hello-world generation renders using published engine without cloud or shell commands", (t) => {
  const root = fixture(t);
  setup(args, root);
  assert.match(
    readFileSync(join(root, "zap.yaml"), "utf8"),
    /# Keep local services/,
  );
  const local = parse(readFileSync(join(root, "zap.yaml"), "utf8"));
  assert.deepEqual(Object.keys(local.native), [
    "backend",
    "web",
    "docs",
    "myshop",
  ]);
  assert.deepEqual(Object.keys(local.deploy.services), ["backend"]);
  assert.equal(
    JSON.parse(readFileSync(join(root, ".arcnet/project.json"))).approved,
    false,
  );
  const workflow = parse(
    readFileSync(join(root, ".github/workflows/deploy-arc.yaml"), "utf8"),
  );
  assert.deepEqual(workflow.on.push.branches, ["main"]);
  assert.match(workflow.jobs.deploy.if, /approved == 'true'/);
  assert.equal(workflow.concurrency["cancel-in-progress"], false);
  const before = process.env.ZAP_ARC_NETWORK_FILE;
  process.env.ZAP_ARC_NETWORK_FILE = join(root, ".arcnet/network.yaml");
  let network;
  try {
    network = loadNetwork();
  } finally {
    if (before === undefined) delete process.env.ZAP_ARC_NETWORK_FILE;
    else process.env.ZAP_ARC_NETWORK_FILE = before;
  }
  const manifest = loadManifest(root);
  const instances = resolveModules(manifest, network.modulesDir, root);
  const rendered = renderDeployment({
    manifest,
    network,
    instances,
    creds: { CLOUDFLARE_API_TOKEN: "TEST_ONLY" },
    envPool: {},
    imageTag: "test",
  });
  t.after(() => rmSync(rendered.dir, { recursive: true, force: true }));
  const tf = JSON.parse(readFileSync(join(rendered.dir, "main.tf.json")));
  assert.equal(rendered.containerBuilds.length, 1);
  assert.equal(rendered.containerBuilds[0].service, "backend");
  assert.match(
    rendered.containerBuilds[0].image,
    /arcnet-hello-world\/hello-world\/backend:test$/,
  );
  assert.equal(tf.terraform.backend.gcs.prefix, "terraform/state/hello-world");
  assert.deepEqual(Object.keys(tf.module).sort(), [
    "prj_ci",
    "prj_gcp",
    "prj_registry",
    "svc_backend",
  ]);
  assert.equal(tf.module.prj_ci.repository, "mp-lb/hello-world");
  assert.equal(tf.module.svc_backend.domain, "hello-world-api.mp-lb.dev");
  assert.equal(tf.module.svc_backend.min_instances, 0);
  assert.equal(tf.module.svc_backend.max_instances, 2);
});
test("rerun preserves user edits and fails when installation is incomplete", (t) => {
  const root = fixture(t);
  setup(args, root);
  const path = join(root, ".arcnet/project.json");
  const c = JSON.parse(readFileSync(path));
  c.approved = true;
  writeFileSync(path, JSON.stringify(c));
  const before = readFileSync(path, "utf8");
  assert.match(setup(args, root), /Already configured/);
  assert.equal(readFileSync(path, "utf8"), before);
  rmSync(join(root, ".arcnet/run.mjs"));
  assert.throws(() => setup(args, root), /Incomplete/);
});
test("invalid arguments fail before writes", (t) => {
  const root = fixture(t);
  for (const invalid of [
    [],
    ["Bad"],
    ["../../outside"],
    ["a".repeat(24)],
    [...args, "--unknown"],
    [...args, "--service"],
    [...args, "--service", "myshop"],
    [...args, "--dockerfile", "../Dockerfile"],
    [...args, "--repository", "bad\nrepo"],
    [...args, "--dry-run", "--dry-run"],
  ])
    assert.throws(() => setup(invalid, root));
  assert.equal(existsSync(join(root, ".arcnet")), false);
});
test("missing Dockerfile and conflicting workflow fail safely", (t) => {
  const root = fixture(t);
  rmSync(join(root, "Dockerfile"));
  assert.throws(() => setup(args, root), /Missing \.arcnet\/Dockerfile/);
  writeFileSync(join(root, "Dockerfile"), "FROM node:22");
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  writeFileSync(
    join(root, ".github/workflows/deploy-arc.yaml"),
    "# existing workflow",
  );
  assert.throws(() => setup(args, root), /Refusing to overwrite/);
  assert.equal(existsSync(join(root, ".arcnet")), false);
  assert.equal(
    parse(readFileSync(join(root, "zap.yaml"), "utf8")).deploy,
    undefined,
  );
});
test("self-contained service input and Dockerfile survive setup and reruns", (t) => {
  const root = fixture(t);
  mkdirSync(join(root, ".arcnet"));
  rmSync(join(root, "Dockerfile"));
  const dockerfile = "FROM node:22\nCOPY apps ./apps\n";
  writeFileSync(join(root, ".arcnet/Dockerfile"), dockerfile);
  const services = JSON.stringify({
    api: {
      module: "cloud-run-web",
      dockerfile: ".arcnet/Dockerfile",
      domain: "hello-world-api.example.com",
    },
  });
  writeFileSync(join(root, ".arcnet/services.json"), services);
  assert.match(setup([...args, "--dry-run"], root), /deploy.services \(api\)/);
  assert.equal(existsSync(join(root, ".arcnet/project.json")), false);
  setup(args, root);
  assert.equal(
    loadManifest(root).deploy.services.api.dockerfile,
    ".arcnet/Dockerfile",
  );
  assert.equal(
    readFileSync(join(root, ".arcnet/services.json"), "utf8"),
    services,
  );
  assert.equal(
    readFileSync(join(root, ".arcnet/Dockerfile"), "utf8"),
    dockerfile,
  );
  assert.match(setup(args, root), /Already configured/);
  symlinkSync(join(home, "node_modules"), join(root, ".arcnet/node_modules"));
  const checked = spawnSync(
    process.execPath,
    [join(root, ".arcnet/run.mjs"), "check"],
    { encoding: "utf8" },
  );
  assert.equal(checked.status, 0, checked.stderr);
});
test("default Dockerfile lives in .arcnet and duplicate service inputs require a choice", (t) => {
  const root = fixture(t);
  mkdirSync(join(root, ".arcnet"));
  writeFileSync(join(root, ".arcnet/Dockerfile"), "FROM node:22\n");
  setup(args, root);
  assert.equal(
    loadManifest(root).deploy.services.backend.dockerfile,
    ".arcnet/Dockerfile",
  );
  assert.match(setup(args, root), /Already configured/);

  const other = fixture(t);
  mkdirSync(join(other, ".arcnet"));
  const services = JSON.stringify({
    backend: {
      module: "cloud-run-web",
      dockerfile: "Dockerfile",
      domain: "hello-world-api.example.com",
    },
  });
  writeFileSync(join(other, ".arcnet/services.json"), services);
  writeFileSync(join(other, "arcnet.services.json"), services);
  assert.throws(() => setup(args, other), /Both .* exist/);
  assert.equal(existsSync(join(other, ".arcnet/project.json")), false);
  assert.match(
    setup([...args, "--services", ".arcnet/services.json", "--dry-run"], other),
    /Dry run/,
  );
});
test("symlink destinations and existing deployment are rejected", (t) => {
  const root = fixture(t);
  symlinkSync(tmpdir(), join(root, ".arcnet"));
  assert.throws(() => setup(args, root), /symlink/);
  rmSync(join(root, ".arcnet"));
  writeFileSync(
    join(root, "zap.yaml"),
    "project: hello-world\nnative: {backend: {cmd: node}}\ndeploy: {services: {}}",
  );
  assert.throws(() => setup(args, root), /Existing deploy/);
});
test("generated runner checks offline and refuses unapproved deployment without tools", (t) => {
  const root = fixture(t);
  setup(args, root);
  symlinkSync(join(home, "node_modules"), join(root, ".arcnet/node_modules"));
  const call = (command, env = {}) =>
    spawnSync(process.execPath, [join(root, ".arcnet/run.mjs"), command], {
      encoding: "utf8",
      env: { PATH: "", ...env },
    });
  const check = call("check");
  assert.equal(check.status, 0, check.stderr);
  const deploy = call("deploy");
  assert.equal(deploy.status, 1);
  assert.match(deploy.stderr, /Deployment disabled/);
  const plan = call("plan");
  assert.equal(plan.status, 1);
  assert.match(plan.stderr, /CLOUDFLARE_API_TOKEN/);
  const pool = call("check", { ARCNET_ENV_JSON: "[]" });
  assert.equal(pool.status, 1);
  assert.match(pool.stderr, /JSON objects/);
});
test("explicit web/docs and backend selection renders existing modules with pinned upload CLI", (t) => {
  const root = fixture(t);
  const selection = {
    backend: {
      module: "cloud-run-web",
      dockerfile: "Dockerfile",
      domain: "hello-world-api.mp-lb.dev",
    },
    web: {
      module: "vercel-static",
      domain: "hello-world-preview.mp-lb.dev",
      build: "pnpm --filter web build",
      "deploy-path": "apps/web/dist",
    },
    docs: {
      module: "vercel-static",
      domain: "hello-world-docs.mp-lb.dev",
      "remote-build": true,
      params: { framework: "nextjs", "root-directory": "apps/docs" },
    },
  };
  writeFileSync(join(root, "arcnet.services.json"), JSON.stringify(selection));
  setup([...args, "--services", "arcnet.services.json"], root);
  const manifest = loadManifest(root);
  assert.deepEqual(Object.keys(manifest.deploy.services), [
    "backend",
    "web",
    "docs",
  ]);
  assert.equal(
    manifest.deploy.services.docs.module,
    "./.arcnet/modules/vercel-static",
  );
  const modulesDir = join(home, "node_modules/@mp-lb/zapper/arc");
  const instances = resolveModules(manifest, modulesDir, root);
  assert.equal(
    instances.find((i) => i.key === "web").manifest["service-env"],
    true,
  );
  assert.match(
    instances.find((i) => i.key === "docs").manifest.hooks["post-apply"][0].run,
    /vercel@63\.1\.2 build/,
  );
  assert.equal(
    instances.some((i) => i.key === "myshop"),
    false,
  );
});
test("static-only setup needs no Dockerfile; local-only MyShop cannot be selected indirectly", (t) => {
  const root = fixture(t);
  rmSync(join(root, "Dockerfile"));
  const path = join(root, "arcnet.services.json");
  writeFileSync(
    path,
    JSON.stringify({
      docs: {
        module: "vercel-static",
        domain: "docs.example.com",
        "deploy-path": "apps/myshop/dist",
      },
    }),
  );
  assert.throws(
    () => setup([...args, "--services", "arcnet.services.json"], root),
    /MyShop/,
  );
  writeFileSync(
    path,
    JSON.stringify({
      docs: {
        module: "vercel-static",
        domain: "docs.example.com",
        "deploy-path": "apps/docs/out",
      },
    }),
  );
  assert.match(
    setup([...args, "--services", "arcnet.services.json"], root),
    /generated/,
  );
});
test("Hello-world sites-only example renders no application backend or MyShop", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "arcnet.services.json"),
    readFileSync(join(home, "examples/static-sites.services.json")),
  );
  setup(args, root);
  const manifest = loadManifest(root);
  const raw = parse(readFileSync(join(root, ".arcnet/network.yaml"), "utf8"));
  const network = {
    name: raw.name,
    dns: raw.dns,
    env: raw.env,
    backend: raw.backend,
    providers: raw.providers,
    moduleDefaults: raw["module-defaults"],
    registry: raw.registry,
    modulesDir: join(home, "node_modules/@mp-lb/zapper/arc"),
    vars: Object.fromEntries(
      Object.entries(raw).filter(
        ([k, v]) => typeof v === "string" && !["name", "registry"].includes(k),
      ),
    ),
  };
  const instances = resolveModules(manifest, network.modulesDir, root);
  const rendered = renderDeployment({
    manifest,
    network,
    instances,
    creds: { CLOUDFLARE_API_TOKEN: "TEST_ONLY", VERCEL_API_TOKEN: "TEST_ONLY" },
    envPool: {},
    imageTag: "test",
  });
  t.after(() => rmSync(rendered.dir, { recursive: true, force: true }));
  assert.equal(rendered.containerBuilds.length, 0);
  assert.equal(manifest.deploy.services.backend, undefined);
  assert.equal(rendered.hookParams.web["deploy-path"], "apps/web/dist");
  assert.deepEqual(Object.keys(raw.providers).sort(), [
    "cloudflare",
    "google",
    "vercel",
  ]);
  const tf = JSON.parse(readFileSync(join(rendered.dir, "main.tf.json")));
  assert.deepEqual(Object.keys(tf.module).sort(), [
    "prj_ci",
    "prj_gcp",
    "prj_registry",
    "svc_web",
  ]);
});
test("malformed secret JSON never appears in error output", (t) => {
  const root = fixture(t);
  setup(args, root);
  symlinkSync(join(home, "node_modules"), join(root, ".arcnet/node_modules"));
  const result = spawnSync(
    process.execPath,
    [join(root, ".arcnet/run.mjs"), "check"],
    { encoding: "utf8", env: { ARCNET_ENV_JSON: "PRIVATE_TEST_VALUE" } },
  );
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /PRIVATE_TEST_VALUE/);
});
test("unresolved network prerequisites stop before executable checks or cloud commands", (t) => {
  const root = fixture(t);
  setup(args, root);
  symlinkSync(join(home, "node_modules"), join(root, ".arcnet/node_modules"));
  const result = spawnSync(
    process.execPath,
    [join(root, ".arcnet/run.mjs"), "plan"],
    { encoding: "utf8", env: { PATH: "", CLOUDFLARE_API_TOKEN: "TEST_ONLY" } },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /REPLACE_ placeholders/);
});
