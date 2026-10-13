import { describe, expect, it } from "vitest";
import { createContext, NotFoundError } from ".";

describe("server", () => {
  it("builds a context with a logger", () => {
    const context = createContext();

    expect(typeof context.logger.info).toBe("function");
  });

  it("maps NotFoundError to platform error codes", () => {
    const error = new NotFoundError();

    expect(error.appCode).toBe("NOT_FOUND");
    expect(error.trpcCode).toBe("NOT_FOUND");
  });
});
