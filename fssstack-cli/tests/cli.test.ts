import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import example from "../examples/hello-world.json";
import { buildPrompt } from "../../fssstack-start/app/project-prompt";
import {
  defaultProjectPromptConfig,
  normalizeProjectPromptConfig,
  projectPromptSchema,
} from "../../fssstack-start/app/project-schema";

const binary = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const run = (args: string[], input?: string) =>
  spawnSync(process.execPath, [binary, ...args], { input, encoding: "utf8" });
const schema = JSON.parse(run(["schema"]).stdout);
const validate = new Ajv2020().compile(schema);

describe("JSON Schema", () => {
  it("is usable draft 2020-12 and accepts the complete example", () => {
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(validate(example)).toBe(true);
  });
  it("exposes exactly the defaults used by the web form", () => {
    for (const [key, value] of Object.entries(defaultProjectPromptConfig)) {
      if (key === "description") continue;
      expect(schema.properties[key].default).toEqual(value);
    }
    expect(schema.required).toEqual(["description"]);
    expect(projectPromptSchema.parse({ description: "Example" })).toEqual({
      ...defaultProjectPromptConfig,
      description: "Example",
    });
  });
  it.each([
    {},
    { ...example, packagePrefix: "bad" },
    { ...example, emoji: "no" },
    { ...example, description: "x".repeat(201) },
    { ...example, extra: true },
    { ...example, frontendClients: [{ slug: "web", type: "angular" }] },
    { ...example, extensions: ["unknown"] },
  ])("rejects structurally invalid JSON %j", (value) => {
    expect(validate(value)).toBe(false);
    expect(projectPromptSchema.safeParse(value).success).toBe(false);
  });
});

describe("prompt", () => {
  it.each([
    example,
    { description: "Defaults" },
    {
      ...example,
      backendServices: [],
      frontendClients: [],
      libraryPackages: [],
      extensions: [],
    },
    {
      ...example,
      description: 'Details: # "hello"\nSecond line',
      extensions: [
        "clerk",
        "clerk",
        "mongodb",
        "s3",
        "bull",
        "redis",
        "playwright",
      ],
    },
  ])(
    "matches the web prompt byte-for-byte for argument and stdin: %j",
    (value) => {
      const config = normalizeProjectPromptConfig(
        projectPromptSchema.parse(value),
      );
      const expected = `${buildPrompt(config)}\n`;
      for (const result of [
        run(["prompt", JSON.stringify(value)]),
        run(["prompt"], JSON.stringify(value)),
      ]) {
        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        expect(result.stdout).toBe(expected);
      }
    },
  );
  it.each([
    ["{", "Invalid JSON"],
    ["", "Invalid JSON"],
    ["null", "config"],
    ["[]", "config"],
    ['{"description":""}', "description"],
    [
      JSON.stringify({ ...example, backendServices: ["api", "api"] }),
      "must be unique",
    ],
    [
      JSON.stringify({ ...example, libraryPackages: ["api"] }),
      "must be unique",
    ],
    [
      JSON.stringify({
        ...example,
        frontendClients: [{ slug: "api", type: "react-vite" }],
      }),
      "must be unique",
    ],
    [
      JSON.stringify({ ...example, backendServices: [""] }),
      "backendServices.0",
    ],
    [JSON.stringify({ ...example, unknown: true }), "Unrecognized"],
  ])("rejects %s without stdout", (value, message) => {
    const result = run(["prompt"], value);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(message);
  });
});

describe("command surface", () => {
  it.each([[], ["--help"], ["-h"]])("shows help for %j", (...args: string[]) => {
    expect(run(args).stdout).toContain("fssstack prompt [JSON]");
  });
  it("shows version", () => expect(run(["--version"]).stdout).toBe("0.2.0\n"));
  it.each([
    ["--name", "HelloWorld"],
    ["schema", "extra"],
    ["prompt", "{}", "extra"],
    ["unknown"],
  ])("rejects unsupported command %j", (...args: string[]) => {
    const result = run(args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
  });
});
