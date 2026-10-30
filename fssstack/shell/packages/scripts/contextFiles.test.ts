import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("context build and copy respect selected outputs, extra files, and temporary cleanup", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "context-files-test-")));

  try {
    mkdirSync(join(root, "bin"));
    mkdirSync(join(root, "context"));
    writeFileSync(join(root, "context/index.md"), "Shared context\n");
    writeFileSync(join(root, "extra.md"), "Extra context\n");
    const log = join(root, "compiler-log");
    const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
    writeFileSync(
      join(root, "bin/npx"),
      `#!/bin/sh\nexec ${quote(process.execPath)} --experimental-strip-types ${quote(fileURLToPath(new URL("./mockMdcompile.ts", import.meta.url)))} "$@"\n`,
      { mode: 0o755 },
    );

    const run = (...args: string[]) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          import.meta.resolve("tsx"),
          fileURLToPath(new URL("./contextFiles.ts", import.meta.url)),
          ...args,
        ],
        {
          cwd: root,
          env: {
            ...process.env,
            PATH: `${join(root, "bin")}:${process.env.PATH}`,
            CONTEXT_TEST_LOG: log,
          },
          encoding: "utf8",
          timeout: 10000,
        },
      );

    assert.equal(run("build", "--agents").status, 0);
    assert.equal(
      readFileSync(join(root, "AGENTS.md"), "utf8"),
      "Shared context\n",
    );

    assert.equal(existsSync(join(root, "CLAUDE.md")), false);
    assert.equal(run("copy", "--claude").status, 0);
    assert.equal(
      readFileSync(join(root, "CLAUDE.md"), "utf8"),
      "Shared context\n",
    );

    const extra = run("build", "--claude", "extra.md");
    assert.equal(extra.status, 0, extra.stderr);
    assert.equal(
      readFileSync(join(root, "CLAUDE.md"), "utf8"),
      `@${join(root, "AGENTS.base.md")}\n\n@${join(root, "extra.md")}\n`,
    );

    const calls: string[][] = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    assert.ok(calls.every((args) => !args.includes("--optional")));
    const temporaryEntry = calls.at(-1)![2];
    assert.equal(existsSync(temporaryEntry), false);
    assert.notEqual(run("build", "missing.md").status, 0);
    assert.equal(run("build", "--optional-extra", "missing.md").status, 0);
    assert.notEqual(run("build", "--agents", "--agents").status, 0);
    assert.notEqual(run("copy", "extra.md").status, 0);
    assert.notEqual(run("build", "--unknown").status, 0);
    rmSync(join(root, "context/index.md"));
    assert.notEqual(run("build").status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("remote style expands and fetch failures preserve previous shared outputs", () => {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "context-remote-test-")),
  );

  try {
    mkdirSync(join(root, "bin"));
    mkdirSync(join(root, "context"));
    const link = "[Style](https://hyperdoc.forumlabs.net/test-style)\n";
    writeFileSync(join(root, "context/index.md"), link);
    const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
    writeFileSync(
      join(root, "bin/npx"),
      `#!/bin/sh\nexec ${quote(process.execPath)} --experimental-strip-types ${quote(fileURLToPath(new URL("./mockMdcompile.ts", import.meta.url)))} "$@"\n`,
      { mode: 0o755 },
    );

    writeFileSync(
      join(root, "bin/fm"),
      '#!/bin/sh\ncat > "$CONTEXT_TEST_INPUT"\nif [ "$CONTEXT_TEST_FAIL" = "1" ]; then exit 1; fi\nprintf "Remote style rules\\n"\n',
      { mode: 0o755 },
    );

    const run = (fail: boolean) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          import.meta.resolve("tsx"),
          fileURLToPath(new URL("./contextFiles.ts", import.meta.url)),
          "build",
        ],
        {
          cwd: root,
          encoding: "utf8",
          timeout: 10000,
          env: {
            ...process.env,
            PATH: `${join(root, "bin")}:${process.env.PATH}`,
            CONTEXT_TEST_LOG: join(root, "compiler-log"),
            CONTEXT_TEST_INPUT: join(root, "remote-input"),
            CONTEXT_TEST_FAIL: fail ? "1" : "0",
          },
        },
      );

    const success = run(false);
    assert.equal(success.status, 0, success.stderr);
    assert.equal(readFileSync(join(root, "remote-input"), "utf8"), link);

    for (const file of ["AGENTS.base.md", "AGENTS.md", "CLAUDE.md"]) {
      assert.equal(
        readFileSync(join(root, file), "utf8"),
        "Remote style rules\n",
      );
    }

    assert.notEqual(run(true).status, 0);

    for (const file of ["AGENTS.base.md", "AGENTS.md", "CLAUDE.md"]) {
      assert.equal(
        readFileSync(join(root, file), "utf8"),
        "Remote style rules\n",
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
