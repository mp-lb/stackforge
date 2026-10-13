import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";
import { setup } from "../setup.mjs";
import {
  apiClient,
  validateConfig,
  renderPlan,
  inspectReferences,
  createProject,
  stageSite,
  deploy,
} from "../templates/vercel-run.mjs";
const home = dirname(dirname(fileURLToPath(import.meta.url)));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "arcnet-vercel-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, "zap.yaml"),
    "project: example-app\nnative:\n  backend: {cmd: node server.js}\n  myshop: {cmd: local-only}\n",
  );
  writeFileSync(
    join(root, "package.json"),
    '{"packageManager":"pnpm@11.1.3"}\n',
  );
  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9.0\n");
  for (const site of ["frontend", "docs"]) {
    mkdirSync(join(root, `apps/${site}/dist`), { recursive: true });
    writeFileSync(
      join(root, `apps/${site}/dist/index.html`),
      `<h1>${site}</h1>`,
    );
  }
  return root;
}
function config(type = "team") {
  return {
    version: 1,
    mode: "vercel",
    slug: "example-app",
    repository: "mp-lb/example-app",
    approved: false,
    account: { type, id: type === "team" ? "team_fixture" : "user_fixture" },
    sites: {
      frontend: {
        mode: "existing",
        projectId: "prj_frontend",
        projectName: "example-app",
        build: ["pnpm", "--filter", "@mp-lb/example-app-frontend", "build"],
        output: "apps/frontend/dist",
        outputConfig: {
          version: 3,
          routes: [
            { handle: "filesystem" },
            { src: "/(.*)", dest: "/index.html" },
          ],
        },
      },
      docs: {
        mode: "existing",
        projectId: "prj_docs",
        projectName: "example-app-docs",
        build: ["pnpm", "--filter", "@mp-lb/example-app-docs", "build"],
        output: "apps/docs/dist",
        outputConfig: { version: 3 },
      },
    },
  };
}
function input(root, c) {
  writeFileSync(
    join(root, "arcnet.vercel.json"),
    JSON.stringify({
      repository: c.repository,
      account: c.account,
      sites: c.sites,
    }),
  );
}
function reads(c, calls = []) {
  return async (method, path, account, body) => {
    calls.push({ method, path, account, body });
    assert.equal(
      method,
      "GET",
      "Existing mode must never send a mutation request",
    );
    const site = Object.values(c.sites).find(
      (s) => path === `/v9/projects/${s.projectId}`,
    );
    return site
      ? { id: site.projectId, name: site.projectName, accountId: c.account.id }
      : null;
  };
}
test("Vercel-only slug CLI generates no Terraform/GCP and preserves zap, reruns and workflow boundaries", (t) => {
  const root = fixture(t),
    c = config();
  input(root, c);
  const before = readFileSync(join(root, "zap.yaml"), "utf8");
  assert.match(setup(["example-app", "--dry-run"], root), /Vercel-only/);
  assert.equal(existsSync(join(root, ".arcnet")), false);
  const result = spawnSync(
    process.execPath,
    [join(home, "setup.mjs"), "example-app"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(root, "zap.yaml"), "utf8"), before);
  assert.equal(existsSync(join(root, ".arcnet/network.yaml")), false);
  assert.equal(existsSync(join(root, ".arcnet/package.json")), false);
  assert.match(setup(["example-app"], root), /Already configured/);
  const savedPath = join(root, ".arcnet/project.json");
  const saved = JSON.parse(readFileSync(savedPath));
  writeFileSync(
    savedPath,
    JSON.stringify(Object.fromEntries(Object.entries(saved).reverse())),
  );
  assert.match(setup(["example-app"], root), /Already configured/);
  const raw = readFileSync(
    join(root, ".github/workflows/deploy-arc.yaml"),
    "utf8",
  );
  assert.doesNotMatch(
    raw,
    /gcloud|terraform|id-token|workload_identity|CLOUDFLARE/,
  );
  assert.deepEqual(parse(raw).on.push.branches, ["main"]);
  const plan = spawnSync(
    process.execPath,
    [join(root, ".arcnet/run.mjs"), "plan"],
    { cwd: root, env: { PATH: "" }, encoding: "utf8" },
  );
  assert.equal(plan.status, 0, plan.stderr);
  assert.equal(JSON.parse(plan.stdout).terraform, false);
  const blocked = spawnSync(
    process.execPath,
    [join(root, ".arcnet/run.mjs"), "deploy"],
    { env: { PATH: "" }, encoding: "utf8" },
  );
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /disabled/);
});
test("setup rejects mixed profiles, existing workflow, changed target IDs and local MyShop paths", (t) => {
  const root = fixture(t),
    c = config();
  input(root, c);
  assert.throws(
    () => setup(["example-app", "--service", "backend"], root),
    /cannot be combined/,
  );
  c.sites.frontend.output = "apps/myshop/dist";
  input(root, c);
  assert.throws(() => setup(["example-app"], root), /local-only/);
  input(root, config());
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  writeFileSync(join(root, ".github/workflows/deploy-arc.yaml"), "existing");
  assert.throws(() => setup(["example-app"], root), /overwrite/);
  assert.equal(existsSync(join(root, ".arcnet")), false);
  rmSync(join(root, ".github/workflows/deploy-arc.yaml"));
  setup(["example-app"], root);
  const changed = config();
  changed.sites.frontend.projectId = "prj_other";
  input(root, changed);
  assert.throws(() => setup(["example-app"], root), /differs/);
});
test("offline plan includes new and existing intent, no implicit ownership", (t) => {
  const root = fixture(t),
    c = config("personal");
  c.sites.docs.mode = "new";
  delete c.sites.docs.projectId;
  c.sites.docs.creationApproved = false;
  const plan = renderPlan(c, root);
  assert.deepEqual(
    plan.sites.map((s) => s.operation),
    ["reference-existing", "explicit-create-required-before-deploy"],
  );
  assert.equal(plan.changesProjectSettings, false);
  assert.equal(plan.changesDNS, false);
  assert.throws(
    () => validateConfig({ ...c, ownership: "import" }, root),
    /ownership\/import/,
  );
});
test("team and personal HTTP reads use explicit account scope; errors never echo token or response body", async () => {
  for (const type of ["team", "personal"]) {
    const c = config(type),
      urls = [];
    const api = apiClient("PRIVATE_TOKEN", async (url, opts) => {
      urls.push(url);
      assert.equal(opts.method, "GET");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "prj_frontend",
          name: "example-app",
          accountId: c.account.id,
        }),
      };
    });
    await api("GET", "/v9/projects/prj_frontend", c.account);
    assert.equal(
      urls[0].searchParams.get("teamId"),
      type === "team" ? "team_fixture" : null,
    );
  }
  const api = apiClient("PRIVATE_TOKEN", async () => ({
    ok: false,
    status: 403,
    json: async () => ({ secret: "PRIVATE_TOKEN" }),
  }));
  await assert.rejects(
    api("GET", "/v9/projects/prj_frontend", config().account),
    (e) => /HTTP 403/.test(e.message) && !e.message.includes("PRIVATE_TOKEN"),
  );
});
test("every existing identity is verified before any build/upload; scope/name/missing-ID conflicts abort", async (t) => {
  const root = fixture(t),
    c = config();
  c.approved = true;
  for (const wrong of [
    null,
    { id: "prj_frontend", name: "example-app", accountId: "team_wrong" },
    { id: "prj_frontend", name: "wrong", accountId: c.account.id },
  ]) {
    let runs = 0;
    await assert.rejects(
      deploy(
        c,
        root,
        async () => wrong,
        () => {
          runs++;
        },
        {},
      ),
      /identity\/scope mismatch/,
    );
    assert.equal(runs, 0);
  }
  await assert.rejects(
    deploy(c, root, reads(c), () => {}, {
      GITHUB_ACTIONS: "true",
      GITHUB_REPOSITORY: c.repository,
      GITHUB_REF: "refs/heads/feature",
    }),
    /main branch/,
  );
});
test("existing deployment only uploads staged static files to explicit project/account; all provider calls are reads", async (t) => {
  const root = fixture(t),
    c = config();
  c.approved = true;
  const calls = [],
    uploads = [];
  await deploy(
    c,
    root,
    reads(c, calls),
    (cmd, args, cwd, env) => {
      assert.equal(calls.length, 2);
      if (cmd === "pnpm") {
        assert.equal(env.VERCEL_TOKEN, undefined);
        return;
      }
      assert.equal(cmd, "npx");
      assert.ok(args.includes("--prebuilt"));
      assert.ok(args.includes("--prod"));
      assert.ok(args.includes("vercel@63.1.2"));
      const linked = JSON.parse(
        readFileSync(join(cwd, ".vercel/project.json")),
      );
      assert.equal(linked.orgId, c.account.id);
      assert.equal(linked.projectId, env.VERCEL_PROJECT_ID);
      assert.equal(existsSync(join(cwd, "apps")), false);
      assert.ok(existsSync(join(cwd, ".vercel/output/static/index.html")));
      uploads.push(cwd);
    },
    {
      VERCEL_TOKEN: "TEST_ONLY",
      VERCEL_PROJECT_ID: "prj_wrong",
      VERCEL_ORG_ID: "team_wrong",
    },
  );
  assert.equal(uploads.length, 2);
  assert.ok(uploads.every((p) => !existsSync(p)));
  assert.ok(calls.every((c) => c.method === "GET"));
});
test("new project is explicit, scoped, conflict-safe and promotes to idempotent existing reference", async (t) => {
  const root = fixture(t),
    c = config();
  c.sites.docs.mode = "new";
  delete c.sites.docs.projectId;
  c.sites.docs.creationApproved = false;
  await assert.rejects(
    createProject(c, "docs", () => assert.fail("must not call network")),
    /disabled/,
  );
  c.sites.docs.creationApproved = true;
  await assert.rejects(
    createProject(c, "docs", async () => ({ id: "prj_someone" })),
    /already exists/,
  );
  const calls = [];
  const next = await createProject(
    c,
    "docs",
    async (method, path, account, body) => {
      calls.push({ method, path, account, body });
      return method === "GET"
        ? null
        : {
            id: "prj_created",
            name: "example-app-docs",
            accountId: c.account.id,
          };
    },
  );
  assert.deepEqual(
    calls.map((c) => c.method),
    ["GET", "POST"],
  );
  assert.deepEqual(calls[1].body, { name: "example-app-docs", framework: null });
  assert.equal(next.sites.docs.mode, "existing");
  assert.equal(next.approved, false);
  assert.equal(await createProject(next, "docs", reads(next)), next);
  input(root, c);
  setup(["example-app"], root);
  writeFileSync(join(root, ".arcnet/project.json"), JSON.stringify(next));
  assert.match(setup(["example-app"], root), /Already configured/);
});
test("personal creation cannot target the token owner implicitly", async () => {
  const c = config("personal");
  c.sites.docs = { ...c.sites.docs, mode: "new", creationApproved: true };
  delete c.sites.docs.projectId;
  const calls = [];
  await assert.rejects(
    createProject(c, "docs", async (method, path) => {
      calls.push([method, path]);
      return { user: { id: "user_other" } };
    }),
    /personal account/,
  );
  assert.deepEqual(calls, [["GET", "/v2/user"]]);
});
test("static staging rejects symlinks/secrets and preserves explicit routing configuration", (t) => {
  const root = fixture(t),
    c = config();
  const site = c.sites.frontend;
  writeFileSync(join(root, site.output, ".env"), "PRIVATE");
  assert.throws(() => stageSite(root, site, c.account), /unsafe static/);
  rmSync(join(root, site.output, ".env"));
  symlinkSync(join(root, "package.json"), join(root, site.output, "linked"));
  assert.throws(() => stageSite(root, site, c.account), /unsafe static/);
  rmSync(join(root, site.output, "linked"));
  const stage = stageSite(root, site, c.account);
  t.after(() => rmSync(stage, { recursive: true, force: true }));
  assert.deepEqual(
    JSON.parse(readFileSync(join(stage, ".vercel/output/config.json"))),
    site.outputConfig,
  );
});
test("preview uploads never request production; new selections cannot deploy or create from CI", async (t) => {
  const root = fixture(t),
    c = config("personal");
  c.approved = true;
  const uploads = [];
  await deploy(
    c,
    root,
    reads(c),
    (cmd, args) => {
      if (cmd === "npx") uploads.push(args);
    },
    { VERCEL_TOKEN: "TEST_ONLY" },
    "preview",
  );
  assert.equal(uploads.length, 2);
  assert.ok(uploads.every((args) => !args.includes("--prod")));
  c.sites.docs.mode = "new";
  delete c.sites.docs.projectId;
  c.sites.docs.creationApproved = true;
  await assert.rejects(inspectReferences(c, reads(c)), /Create it explicitly/);
  input(root, c);
  setup(["example-app"], root);
  const ci = spawnSync(
    process.execPath,
    [join(root, ".arcnet/run.mjs"), "create", "docs"],
    { env: { GITHUB_ACTIONS: "true", PATH: "" }, encoding: "utf8" },
  );
  assert.equal(ci.status, 1);
  assert.match(ci.stderr, /never a CI side effect/);
});
test("new personal project verifies user before creation and uncertain POST is never retried", async () => {
  const c = config("personal");
  c.sites.docs.mode = "new";
  delete c.sites.docs.projectId;
  c.sites.docs.creationApproved = true;
  const requests = [];
  const next = await createProject(c, "docs", async (method, path) => {
    requests.push([method, path]);
    if (path === "/v2/user") return { user: { id: c.account.id } };
    return method === "GET"
      ? null
      : { id: "prj_created", name: "example-app-docs", accountId: c.account.id };
  });
  assert.equal(next.sites.docs.projectId, "prj_created");
  assert.equal(requests.length, 3);
  let calls = 0;
  const request = apiClient("TEST_ONLY", async () => {
    calls++;
    throw Error("network");
  });
  await assert.rejects(
    request("POST", "/v11/projects", c.account, {}),
    /outcome uncertain/,
  );
  assert.equal(calls, 1);
});
test("Example project reference template plans only landing/docs with no backend or project factory", (t) => {
  const root = fixture(t);
  const example = JSON.parse(
    readFileSync(join(home, "examples/static-sites.vercel.json")),
  );
  example.account.id = "team_fixture";
  example.sites.frontend.projectId = "prj_frontend";
  example.sites.frontend.projectName = "example-app";
  writeFileSync(join(root, "arcnet.vercel.json"), JSON.stringify(example));
  setup(["example-app"], root);
  const config = JSON.parse(readFileSync(join(root, ".arcnet/project.json")));
  const plan = renderPlan(config, root);
  assert.deepEqual(
    plan.sites.map((s) => s.name),
    ["frontend", "docs"],
  );
  assert.equal(plan.sites[1].output, "apps/docs/build/client");
  assert.deepEqual(plan.sites[1].outputConfig.routes[0], {
    handle: "filesystem",
  });
  assert.equal(plan.terraform, false);
  assert.equal(config.approved, false);
});
