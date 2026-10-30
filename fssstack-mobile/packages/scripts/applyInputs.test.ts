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

test("mobile input replacement preserves empty values, skipped folders, and binary assets", () => {
  const root = mkdtempSync(join(tmpdir(), "mobile-inputs-test-"));

  try {
    const target = join(root, "app");
    mkdirSync(target);
    const input = join(root, "inputs.env");
    writeFileSync(input, "# Inputs\nNAME=Example\nPROJECT_ID=\n");
    writeFileSync(
      join(target, "app.json"),
      '{"name":"REPLACE_WITH_NAME","id":"REPLACE_WITH_PROJECT_ID"}',
    );

    writeFileSync(join(target, "image.png"), Buffer.from([0, 1, 2, 255]));

    for (const dir of [".git", "node_modules", ".expo", "ios", "android"]) {
      mkdirSync(join(target, dir));
      writeFileSync(join(target, dir, "keep.txt"), "REPLACE_WITH_NAME");
    }

    const run = () =>
      spawnSync(
        process.execPath,
        [
          "--import",
          import.meta.resolve("tsx"),
          fileURLToPath(new URL("./applyInputs.ts", import.meta.url)),
          input,
          target,
        ],
        { cwd: tmpdir(), encoding: "utf8", timeout: 10000 },
      );

    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.deepEqual(
      JSON.parse(readFileSync(join(target, "app.json"), "utf8")),
      { name: "Example", id: "REPLACE_WITH_PROJECT_ID" },
    );

    assert.match(
      first.stdout,
      /unfilled tokens remaining: REPLACE_WITH_PROJECT_ID/,
    );

    for (const dir of [".git", "node_modules", ".expo", "ios", "android"])
      assert.equal(
        readFileSync(join(target, dir, "keep.txt"), "utf8"),
        "REPLACE_WITH_NAME",
      );
    assert.deepEqual(
      readFileSync(join(target, "image.png")),
      Buffer.from([0, 1, 2, 255]),
    );

    writeFileSync(input, "PROJECT_ID=abc123\n");
    assert.equal(run().status, 0);
    assert.equal(
      JSON.parse(readFileSync(join(target, "app.json"), "utf8")).id,
      "abc123",
    );

    assert.match(run().stdout, /0 file\(s\) updated/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
