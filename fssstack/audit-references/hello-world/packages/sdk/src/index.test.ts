import { describe, expect, it } from "vitest";
import { slugify } from ".";

describe("slugify", () => {
  it("slugifies a string", () => {
    expect(slugify("  Hello, World! ")).toBe("hello-world");
  });
});
