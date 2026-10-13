/**
 * Assemble shell-owned HelloWorld surfaces before framework scaffolders run.
 * This never reads the committed hello-world reference.
 */
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

type Input = {
  slug: string;
  backendServices: string[];
  libraryPackages: string[];
};

const argument = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv.at(index + 1);
};
const root = argument("--stackforge-root");
if (!root?.startsWith("/") || !existsSync(resolve(root, ".git"))) {
  throw new Error("Pass an absolute Git checkout with --stackforge-root.");
}
const input = JSON.parse(
  readFileSync(resolve(root, "fssstack-cli/examples/hello-world.json"), "utf8"),
) as Input;
const destination =
  argument("--output") ??
  mkdtempSync(resolve(tmpdir(), "fssstack-hello-world-source-"));
if (existsSync(resolve(destination, "package.json"))) {
  throw new Error(`Destination already contains a project: ${destination}`);
}
cpSync(resolve(root, "fssstack/shell"), destination, {
  recursive: true,
  filter: (path) => !path.includes("node_modules"),
});

const replaceTree = (
  directory: string,
  replacements: ReadonlyArray<readonly [string, string]>,
) => {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) replaceTree(path, replacements);
    else if (/\.(json|ts|md|yaml|yml)$/.test(entry)) {
      let text = readFileSync(path, "utf8");
      for (const [from, to] of replacements) text = text.replaceAll(from, to);
      writeFileSync(path, text);
    }
  }
};
const copyPackage = (example: string, target: string) => {
  cpSync(
    resolve(destination, "packages", example),
    resolve(destination, "packages", target),
    { recursive: true },
  );
  replaceTree(resolve(destination, "packages", target), [
    ["@example/", "@hello-world/"],
    [example, target],
    ["fss-shell", input.slug],
  ]);
};
const copyBackend = (target: string) => {
  cpSync(
    resolve(destination, "apps/example-backend"),
    resolve(destination, "apps", target),
    { recursive: true },
  );
  replaceTree(resolve(destination, "apps", target), [
    ["@example/", "@hello-world/"],
    ["example-backend", target],
    ["EXAMPLE_BACKEND_PORT", `${target.toUpperCase()}_PORT`],
    ["fss-shell", input.slug],
  ]);
};

for (const backend of input.backendServices) copyBackend(backend);
for (const library of input.libraryPackages)
  copyPackage("example-lib", library);
// HelloWorld's selected shared package is a normal library, while the shell CLI
// example remains available only when an input explicitly requests a CLI package.
if (input.libraryPackages.includes("shared"))
  copyPackage("example-cli", "shared");
replaceTree(resolve(destination, "packages/core"), [
  ["@example/", "@hello-world/"],
  ["fss-shell", input.slug],
]);
replaceTree(resolve(destination, "packages/server"), [
  ["@example/", "@hello-world/"],
  ["fss-shell", input.slug],
]);
replaceTree(resolve(destination, "packages/trpc"), [
  ["@example/", "@hello-world/"],
  ["fss-shell", input.slug],
]);
rmSync(resolve(destination, "apps/example-backend"), {
  recursive: true,
  force: true,
});
rmSync(resolve(destination, "packages/example-lib"), {
  recursive: true,
  force: true,
});
rmSync(resolve(destination, "packages/example-cli"), {
  recursive: true,
  force: true,
});
console.log(destination);
