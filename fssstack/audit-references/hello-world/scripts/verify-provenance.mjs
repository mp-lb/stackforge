import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const value = (flag) => process.argv.at(process.argv.indexOf(flag) + 1);
const suppliedRoot = value("--stackforge-root");
if (!suppliedRoot || !process.argv.includes("--stackforge-root"))
  throw new Error("Pass --stackforge-root <absolute-path>.");
if (!suppliedRoot.startsWith("/"))
  throw new Error("--stackforge-root must be an absolute path.");
const root = resolve(suppliedRoot);
for (const marker of ["fssstack", "fssstack-cli/examples/hello-world.json"]) {
  if (!existsSync(resolve(root, marker)))
    throw new Error(`Not a Stackforge checkout: missing ${marker}.`);
}
try {
  execFileSync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"], {
    stdio: "ignore",
  });
} catch {
  throw new Error("--stackforge-root must be a Git Stackforge checkout.");
}

const reference = resolve(root, "fssstack/audit-references/hello-world");
const provenance = JSON.parse(
  await readFile(resolve(reference, "provenance/reference.json"), "utf8"),
);
const sha256 = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const verifyManifest = async (manifestPath, base, label) => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const item of manifest.files) {
    const file = resolve(base, item.path);
    if (!existsSync(file) || (await sha256(file)) !== item.sha256) {
      throw new Error(`${label} differs: ${item.path}`);
    }
  }
};

if (
  (await sha256(resolve(root, provenance.input.path))) !==
  provenance.input.sha256
) {
  throw new Error("HelloWorld input differs from this reference.");
}
await verifyManifest(
  resolve(reference, "provenance/stackforge-inputs.json"),
  root,
  "Stackforge source",
);
await verifyManifest(
  resolve(reference, "provenance/output-integrity.json"),
  reference,
  "Generated reference output",
);

for (const source of provenance.forumSource) {
  const snapshot = resolve(
    reference,
    "provenance/forum-content",
    source.path.replaceAll("/", "-"),
  );
  if ((await sha256(snapshot)) !== source.sha256) {
    throw new Error(`Captured Forum source changed: ${source.path}`);
  }
}
const validation = JSON.parse(
  await readFile(resolve(reference, "provenance/validation.json"), "utf8"),
);
if (validation.status !== "passed" || !validation.commands?.length) {
  throw new Error("Reference has no successful validation record.");
}

console.log(
  `HelloWorld audit reference provenance is valid (${relative(root, reference)}).`,
);
