import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { buildManifestYaml } from "../app/project-manifest";
import { defaultProjectPromptConfig } from "../app/project-schema";

describe("buildManifestYaml", () => {
  it("renders YAML with the selected project values", () => {
    const manifest = buildManifestYaml({
      ...defaultProjectPromptConfig,
      slug: "my-app",
      backendServices: ["api", "worker"],
      frontendClients: [
        { slug: "web", type: "react-vite" },
        { slug: "admin", type: "react-nextjs" },
      ],
      libraryPackages: ["sdk", "ui"],
      extensions: ["mongodb", "s3"],
    });

    expect(parse(manifest)).toEqual({
      type: "fssstack",
      name: "My App",
      emoji: "🚀",
      description: "",
      projectSlug: "my-app",
      packagePrefix: "@fssstack",
      shadcnPreset: "b1VlIttI",
      frontends: [
        { name: "web", type: "react-vite" },
        { name: "admin", type: "react-nextjs" },
      ],
      backends: ["api", "worker"],
      libs: ["sdk", "ui"],
      extensions: ["mongodb", "s3"],
    });
  });

  it("preserves YAML-sensitive strings and empty selections", () => {
    const config = {
      ...defaultProjectPromptConfig,
      name: "true",
      description: "Details: # quoted 'text'\nSecond line",
      backendServices: [],
      frontendClients: [],
      libraryPackages: [],
      extensions: [],
    };
    const manifest = parse(buildManifestYaml(config));

    expect(manifest.name).toBe(config.name);
    expect(manifest.description).toBe(config.description);
    expect(manifest.packagePrefix).toBe(config.packagePrefix);
    expect(manifest.frontends).toEqual([]);
    expect(manifest.backends).toEqual([]);
    expect(manifest.libs).toEqual([]);
    expect(manifest.extensions).toEqual([]);
  });

  it.each([
    'Say "hello"',
    "C:\\temp\\new",
    "First line\nSecond line\twith a tab",
    "Details: # quoted 'text'",
    "true",
    "",
  ])("quotes and escapes description %j", (description) => {
    const manifest = buildManifestYaml({
      ...defaultProjectPromptConfig,
      description,
    });

    expect(manifest.split("\n")).toContain(
      `description: ${JSON.stringify(description)}`,
    );
    expect(parse(manifest).description).toBe(description);
  });
});
