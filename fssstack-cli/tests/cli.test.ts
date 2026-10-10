import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { render } from "../src/configure";
import { buildPrompt } from "../../fssstack-start/app/project-prompt";
import { buildManifestYaml } from "../../fssstack-start/app/project-manifest";
import {
  defaultProjectPromptConfig,
  normalizeProjectPromptConfig,
  type ProjectPromptConfig,
} from "../../fssstack-start/app/project-schema";

const binary = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const base = ["--description", "Team workspace"];
const selected = [
  "--name",
  "Atlas",
  ...base,
  "--emoji",
  "🧭",
  "--package-prefix",
  "@MAP-LAB",
  "--shadcn-preset",
  "custom-preset",
  "--backend",
  "API",
  "--backend",
  "Job Worker",
  "--frontend",
  "Web:react-vite",
  "--frontend",
  "Admin:react-nextjs",
  "--frontend",
  "Docs:react-fumadocs",
  "--lib",
  "SDK",
  "--lib",
  "UI",
  "--clerk",
  "--extension",
  "s3",
  "--mongodb",
  "--extension",
  "clerk",
  "--extension",
  "bull",
  "--extension",
  "redis",
  "--extension",
  "playwright",
];
const selectedConfig = normalizeProjectPromptConfig({
  ...defaultProjectPromptConfig,
  name: "Atlas",
  slug: "atlas",
  description: "Team workspace",
  emoji: "🧭",
  packagePrefix: "@map-lab",
  shadcnPreset: "custom-preset",
  backendServices: ["API", "Job Worker"],
  frontendClients: [
    { slug: "Web", type: "react-vite" },
    { slug: "Admin", type: "react-nextjs" },
    { slug: "Docs", type: "react-fumadocs" },
  ],
  libraryPackages: ["SDK", "UI"],
  extensions: [
    "clerk",
    "s3",
    "mongodb",
    "clerk",
    "bull",
    "redis",
    "playwright",
  ],
});

describe("web parity through the built executable", () => {
  for (const [label, args, config] of [
    [
      "defaults",
      base,
      { ...defaultProjectPromptConfig, description: "Team workspace" },
    ],
    ["all selections", selected, selectedConfig],
    [
      "empty arrays and YAML-sensitive description",
      [
        "--name",
        "true",
        "--description",
        'Details: # "quote"\nSecond line',
        "--no-backends",
        "--no-frontends",
      ],
      {
        ...defaultProjectPromptConfig,
        name: "true",
        slug: "true",
        description: 'Details: # "quote"\nSecond line',
        backendServices: [],
        frontendClients: [],
      },
    ],
  ] satisfies [string, string[], ProjectPromptConfig][]) {
    it.each(["prompt", "yaml", "json"])(
      `${label}: exact %s output`,
      (format) => {
        const actual = execFileSync(
          process.execPath,
          [binary, ...args, "--format", format],
          { encoding: "utf8" },
        );
        const expected =
          format === "prompt"
            ? buildPrompt(config, true)
            : format === "yaml"
              ? buildManifestYaml(config)
              : JSON.stringify(config, null, 2);
        expect(actual).toBe(`${expected}\n`);
      },
    );
  }
  it("matches prompt with prerequisites disabled", () => {
    expect(render([...selected, "--no-prerequisites"]).text).toBe(
      `${buildPrompt(selectedConfig, false)}\n`,
    );
  });
  it("honors explicit slug and trims text like the UI", () => {
    const config = JSON.parse(
      render([
        "--name",
        " Another App ",
        "--slug",
        "Custom Name",
        "--description",
        " Details ",
        "--format",
        "json",
      ]).text,
    );
    expect(config).toMatchObject({
      name: "Another App",
      slug: "custom-name",
      description: "Details",
    });
  });
});

describe("argument validation", () => {
  it.each([
    [["--name", "Atlas"], "Description is required"],
    [[...base, "--description", "x".repeat(201)], "200 characters"],
    [[...base, "--unknown"], "Unknown option"],
    [[...base, "extra"], "Unexpected argument"],
    [[...base, "--backend"], "argument missing"],
    [[...base, "--frontend", "web"], "NAME:TYPE"],
    [[...base, "--frontend", "web:react-vite:extra"], "NAME:TYPE"],
    [[...base, "--frontend", "web:angular"], "frontendClients.0.type"],
    [[...base, "--extension", "unknown"], "extensions.0"],
    [[...base, "--backend", "123"], "backendServices.0"],
    [[...base, "--frontend", "123:react-vite"], "frontendClients.0.slug"],
    [[...base, "--lib", ""], "libraryPackages.0"],
    [[...base, "--backend", "api", "--lib", "API"], "must be unique"],
    [[...base, "--frontend", "backend:react-vite"], "must be unique"],
    [[...base, "--backend", "api", "--backend", "API"], "must be unique"],
    [[...base, "--no-backends", "--backend", "api"], "cannot be combined"],
    [
      [...base, "--no-frontends", "--frontend", "web:react-vite"],
      "cannot be combined",
    ],
    [[...base, "--format", "toml"], "--format must"],
    [[...base, "--output", ""], "nonempty path"],
    [[...base, "--emoji", "hello"], "emoji"],
    [[...base, "--package-prefix", "bad"], "packagePrefix"],
  ])("rejects %j", (args, error) => {
    expect(() => render(args)).toThrow(error);
    const result = spawnSync(process.execPath, [binary, ...args], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(error);
  });
  it("provides help and version without required fields", () => {
    expect(render([]).text).toContain("Usage: fssstack");
    expect(render(["-h"]).text).toContain("--frontend NAME:TYPE");
    expect(render(["-v"]).text.trim()).toBe("0.1.0");
  });
});

describe("file output", () => {
  it("writes exact output, refuses overwrite, and leaves existing bytes intact", () => {
    const dir = mkdtempSync(join(tmpdir(), "fssstack-cli-"));
    try {
      const output = join(dir, "fssstack.yaml");
      const args = [
        binary,
        ...selected,
        "--format",
        "yaml",
        "--output",
        output,
      ];
      const first = spawnSync(process.execPath, args, { encoding: "utf8" });
      expect(first.status).toBe(0);
      expect(first.stdout).toBe("");
      expect(readFileSync(output, "utf8")).toBe(
        `${buildManifestYaml(selectedConfig)}\n`,
      );
      const second = spawnSync(process.execPath, args, { encoding: "utf8" });
      expect(second.status).toBe(1);
      expect(second.stderr).toContain("EEXIST");
      expect(readFileSync(output, "utf8")).toBe(
        `${buildManifestYaml(selectedConfig)}\n`,
      );
      const invalid = spawnSync(
        process.execPath,
        [binary, "--name", "Atlas", "--output", join(dir, "invalid.yaml")],
        { encoding: "utf8" },
      );
      expect(invalid.status).toBe(1);
      expect(() => readFileSync(join(dir, "invalid.yaml"))).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
