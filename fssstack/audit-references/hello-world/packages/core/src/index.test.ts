import { describe, expect, it } from "vitest";
import { createGreeting, greetingInputSchema } from ".";

describe("core", () => {
  it("creates a greeting", () => {
    expect(createGreeting({ name: "Ada" })).toEqual({
      message: "Hello, Ada.",
    });
  });

  it("rejects an empty name", () => {
    expect(greetingInputSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
