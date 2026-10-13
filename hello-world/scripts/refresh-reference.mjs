#!/usr/bin/env node
// A safe refresh entry point. It deliberately never overwrites the shared baseline.
import { cp, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = process.argv.at(process.argv.indexOf("--stackforge-root") + 1);
if (!root?.startsWith("/"))
  throw new Error("Pass an absolute --stackforge-root.");
const source = resolve(root, "hello-world");
const candidate = await mkdtemp(
  resolve(tmpdir(), "fssstack-hello-world-refresh-"),
);
await cp(source, candidate, {
  recursive: true,
  filter: (path) => !path.includes("node_modules"),
});
await writeFile(
  resolve(candidate, "REFRESH-CANDIDATE.md"),
  `Generated candidate from ${source}\nReview, regenerate framework surfaces using REFERENCE.md, validate, and commit from a separate worktree.\n`,
);
console.log(candidate);
