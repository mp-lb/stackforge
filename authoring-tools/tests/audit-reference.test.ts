import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const reference = resolve(root, "fssstack/audit-references/hello-world");
const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

describe("HelloWorld audit reference", () => {
  it("has a verified input, source snapshots, and every selected surface", () => {
    const provenance = JSON.parse(
      readFileSync(resolve(reference, "provenance/reference.json"), "utf8"),
    );
    expect(provenance.input.sha256).toBe(
      sha256(resolve(root, "fssstack-cli/examples/hello-world.json")),
    );
    for (const source of provenance.forumSource) {
      expect(sha256(resolve(reference, "provenance/forum-content", source.path.replaceAll("/", "-")))).toBe(source.sha256);
    }
    for (const path of ["apps/api", "apps/worker", "apps/web", "apps/admin", "apps/docs", "packages/sdk", "packages/shared", "packages/core", "packages/server", "packages/trpc"]) {
      expect(existsSync(resolve(reference, path))).toBe(true);
    }
    expect(existsSync(resolve(reference, "apps/admin/AGENTS.md"))).toBe(false);
  });
});
