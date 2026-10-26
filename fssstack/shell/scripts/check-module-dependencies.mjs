import { readdir, readFile } from "node:fs/promises";
import console from "node:console";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const root = path.resolve(
  process.argv.slice(2).find((argument) => argument !== "--map") ?? defaultRoot,
);

const mapOnly = process.argv.includes("--map");
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const testDirectories = new Set(["__tests__", "test", "tests"]);
const skippedDirectories = new Set(["node_modules", "dist", "build", ".turbo"]);

async function readPackages() {
  const packages = [];

  for (const group of ["apps", "packages"]) {
    let entries;

    try {
      entries = await readdir(path.join(root, group), { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const directory = path.join(root, group, entry.name);

      try {
        const manifest = JSON.parse(
          await readFile(path.join(directory, "package.json"), "utf8"),
        );

        packages.push({ directory, manifest });
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
    }
  }

  return packages;
}

async function* sourceFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (
        !testDirectories.has(entry.name) &&
        !skippedDirectories.has(entry.name)
      ) {
        yield* sourceFiles(path.join(directory, entry.name));
      }
    } else if (
      entry.isFile() &&
      sourceExtensions.has(path.extname(entry.name)) &&
      !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
    ) {
      yield path.join(directory, entry.name);
    }
  }
}

function importsIn(source, filename) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
  );

  const imports = [];

  function visit(node) {
    const specifier =
      ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : ts.isCallExpression(node) &&
            (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
              (ts.isIdentifier(node.expression) &&
                node.expression.text === "require"))
          ? node.arguments[0]
          : undefined;

    if (specifier && ts.isStringLiteralLike(specifier)) {
      imports.push({
        specifier: specifier.text,
        line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(file);
  return imports;
}

function ownsPath(directory, filename) {
  return filename.startsWith(`${directory}${path.sep}`);
}

function declaredWorkspaceDependencies(manifest) {
  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]);
}

const packages = await readPackages();

if (mapOnly) {
  for (const owner of packages.sort((left, right) =>
    left.manifest.name.localeCompare(right.manifest.name),
  )) {
    const dependencies = [...declaredWorkspaceDependencies(owner.manifest)]
      .filter((name) =>
        packages.some((candidate) => candidate.manifest.name === name),
      )
      .sort();

    console.log(
      `${owner.manifest.name}: ${dependencies.join(", ") || "(none)"}`,
    );
  }

  process.exit(0);
}

const violations = new Map();

for (const owner of packages) {
  const sourceDirectory = path.join(owner.directory, "src");

  try {
    await readdir(sourceDirectory);
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }

  for await (const filename of sourceFiles(sourceDirectory)) {
    for (const { specifier, line } of importsIn(
      await readFile(filename, "utf8"),
      filename,
    )) {
      const target = specifier.startsWith(".")
        ? packages.find(
            (candidate) =>
              candidate !== owner &&
              ownsPath(
                candidate.directory,
                path.resolve(path.dirname(filename), specifier),
              ),
          )
        : packages.find(
            (candidate) =>
              candidate !== owner &&
              (specifier === candidate.manifest.name ||
                specifier.startsWith(`${candidate.manifest.name}/`)),
          );

      if (!target) continue;

      const message = specifier.startsWith(".")
        ? `crosses into ${target.manifest.name}; import through its package name`
        : !declaredWorkspaceDependencies(owner.manifest).has(
              target.manifest.name,
            )
          ? `uses ${target.manifest.name} without listing it in dependencies or devDependencies`
          : null;

      if (message) {
        const key = `${owner.manifest.name} -> ${target.manifest.name}: ${message}`;
        const occurrence = `${path.relative(root, filename)}:${line}`;
        const existing = violations.get(key);
        violations.set(
          key,
          existing
            ? { ...existing, count: existing.count + 1 }
            : { count: 1, occurrence },
        );
      }
    }
  }
}

if (violations.size) {
  const report = [...violations].map(
    ([message, { count, occurrence }]) =>
      `${message} (${count} import${count === 1 ? "" : "s"}; e.g. ${occurrence})`,
  );

  console.error(`Module dependency check failed:\n${report.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Module dependency check passed (${packages.length} workspace packages).`,
  );
}
