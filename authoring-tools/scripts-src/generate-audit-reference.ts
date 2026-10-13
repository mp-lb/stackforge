/**
 * Source-driven refresher for the HelloWorld audit baseline.
 *
 * This never reads the committed reference. It copies the current shell into an
 * empty temporary directory, then invokes the pinned upstream scaffolders.
 * Keep local overlays here as the reference evolves; candidates are reviewed in
 * a separate worktree before any replacement commit.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = process.argv.at(process.argv.indexOf("--stackforge-root") + 1);
if (!root?.startsWith("/") || !existsSync(resolve(root, ".git"))) {
  throw new Error("Pass an absolute Git checkout with --stackforge-root.");
}
const candidate = mkdtempSync(
  resolve(tmpdir(), "fssstack-hello-world-source-"),
);
cpSync(resolve(root, "fssstack/shell"), candidate, {
  recursive: true,
  filter: (path) => !path.includes("node_modules"),
});
const run = (command: string, args: string[]) =>
  execFileSync(command, args, { cwd: candidate, stdio: "inherit" });

// Exact external inputs are recorded in the reference provenance.
run("npx", [
  "-y",
  "shadcn@4.21.4",
  "init",
  "--preset",
  "b1a1M7Tvs",
  "--template",
  "vite",
  "--cwd",
  "apps",
  "--name",
  "web",
  "--yes",
]);
run("npx", [
  "-y",
  "shadcn@4.21.4",
  "init",
  "--preset",
  "b1a1M7Tvs",
  "--template",
  "next",
  "--cwd",
  "apps",
  "--name",
  "admin",
  "--no-monorepo",
  "--base",
  "radix",
  "--yes",
]);
run("npx", [
  "-y",
  "create-fumadocs-app@16.2.18",
  "apps/docs",
  "--template",
  "react-router",
  "--search",
  "orama",
  "--pm",
  "pnpm",
  "--no-git",
  "--yes",
]);
console.log(candidate);
