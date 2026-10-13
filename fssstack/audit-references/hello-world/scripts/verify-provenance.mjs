import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const value = (flag) => process.argv.at(process.argv.indexOf(flag) + 1);
const root = resolve(value("--stackforge-root") ?? "");
if (!root || !process.argv.includes("--stackforge-root")) {
  throw new Error("Pass --stackforge-root <absolute-path>.");
}

const reference = resolve(root, "fssstack/audit-references/hello-world");
const provenance = JSON.parse(
  await readFile(resolve(reference, "provenance/reference.json"), "utf8"),
);
const sha256 = async (path) =>
  createHash("sha256").update(await readFile(path)).digest("hex");

if (
  (await sha256(resolve(root, provenance.input.path))) !== provenance.input.sha256
) {
  throw new Error("HelloWorld input differs from this reference.");
}

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

console.log("HelloWorld audit reference provenance is valid.");
