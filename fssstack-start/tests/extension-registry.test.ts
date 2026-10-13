import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extensionRegistry, extensionSlugs } from "../app/extension-registry";
import { projectPromptSchema } from "../app/project-schema";

describe("extension registry", () => {
  it("has a published source document for every selectable extension", async () => {
    expect(new Set(extensionSlugs).size).toBe(extensionSlugs.length);

    for (const { slug } of extensionRegistry) {
      const path = fileURLToPath(
        new URL(`../../fssstack/extensions/${slug}.md`, import.meta.url),
      );
      await expect(access(path)).resolves.toBeUndefined();
      expect(
        projectPromptSchema.safeParse({
          description: "Example",
          extensions: [slug],
        }).success,
      ).toBe(true);
    }
  });
});
