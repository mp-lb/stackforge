import { describe, expect, it } from "vitest";
import { createContext, createLogger, NotFoundError } from ".";

describe("server", () => {
  it("builds a context with a logger", () => {
    const context = createContext(createLogger({ module: "test" }));

    expect(typeof context.logger.info).toBe("function");
  });

  it("maps NotFoundError to platform error codes", () => {
    const error = new NotFoundError();

    expect(error.appCode).toBe("NOT_FOUND");
    expect(error.trpcCode).toBe("NOT_FOUND");
  });
});
