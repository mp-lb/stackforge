import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("docs augmentation pins dependencies and writes configuration for the selected app", () => {
  const root = mkdtempSync(join(tmpdir(), "docs-augmentation-test-"));

  try {
    const docs = join(root, "apps/manual");
    mkdirSync(docs, { recursive: true });
    writeFileSync(
      join(docs, "package.json"),
      JSON.stringify({
        name: "fixture",
        scripts: { existing: "keep" },
        dependencies: { first: "^1.2.3", second: "~4.5.6" },
      }),
    );

    const run = (name: string) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          import.meta.resolve("tsx"),
          fileURLToPath(new URL("./augmentDocsSite.ts", import.meta.url)),
          root,
          name,
        ],
        { encoding: "utf8", timeout: 10000 },
      );

    const result = run("manual");
    assert.equal(result.status, 0, result.stderr);

    const manifest = JSON.parse(
      readFileSync(join(docs, "package.json"), "utf8"),
    );

    assert.deepEqual(manifest.dependencies, {
      first: "1.2.3",
      second: "4.5.6",
    });

    assert.equal(manifest.scripts.existing, "keep");
    assert.match(manifest.scripts.dev, /MANUAL_PORT/);
    assert.equal(manifest.devDependencies.serve, "14.2.6");
    assert.equal(
      JSON.parse(readFileSync(join(docs, "tsconfig.json"), "utf8")).extends,
      "../../etc/tsconfig.frontend.json",
    );

    assert.deepEqual(
      JSON.parse(readFileSync(join(docs, "serve.json"), "utf8")).rewrites,
      [{ source: "/**", destination: "/__spa-fallback.html" }],
    );

    writeFileSync(
      join(root, "etc/tsconfig.frontend.json"),
      '{"extends":"custom"}',
    );

    assert.equal(run("manual").status, 0);
    assert.equal(
      readFileSync(join(root, "etc/tsconfig.frontend.json"), "utf8"),
      '{"extends":"custom"}',
    );

    assert.notEqual(run("../outside").status, 0);
    assert.notEqual(run("missing").status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
