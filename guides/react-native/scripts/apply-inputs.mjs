#!/usr/bin/env node
// Interpolate REPLACE_WITH_<KEY> tokens from an inputs env file into a repo.
//
//   node apply-inputs.mjs <inputs.env> [target-dir]
//
// Replaces tokens in every text file under target-dir (default: cwd),
// skipping .git, node_modules, and binary-ish files. Keys with empty values
// are left as tokens so the script can be re-run after e.g. `eas init`.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [inputsPath, targetDir = process.cwd()] = process.argv.slice(2);
if (!inputsPath) {
  console.error("usage: apply-inputs.mjs <inputs.env> [target-dir]");
  process.exit(1);
}

const inputs = Object.fromEntries(
  readFileSync(inputsPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const eq = line.indexOf("=");
      return [line.slice(0, eq), line.slice(eq + 1).trim()];
    })
    .filter(([, value]) => value !== ""),
);

const SKIP_DIRS = new Set([".git", "node_modules", ".expo", "ios", "android"]);
const TEXT_EXT = /\.(json|json5|js|mjs|cjs|ts|tsx|yml|yaml|md|env|example|txt|xml|plist|gradle|properties|html)$|^[^.]+$/;

let changed = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(path);
      continue;
    }
    if (!TEXT_EXT.test(name)) continue;

    const before = readFileSync(path, "utf8");
    let after = before;
    for (const [key, value] of Object.entries(inputs)) {
      after = after.replaceAll(`REPLACE_WITH_${key}`, value);
    }
    if (after !== before) {
      writeFileSync(path, after);
      changed += 1;
      console.log(`updated ${path}`);
    }
  }
};

walk(targetDir);

const leftovers = new Set();
const scan = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) scan(path);
      continue;
    }
    if (!TEXT_EXT.test(name)) continue;
    for (const match of readFileSync(path, "utf8").matchAll(/REPLACE_WITH_[A-Z_]+/g)) {
      leftovers.add(match[0]);
    }
  }
};
scan(targetDir);

console.log(`${changed} file(s) updated`);
if (leftovers.size) {
  console.log(`unfilled tokens remaining: ${[...leftovers].join(", ")}`);
}
