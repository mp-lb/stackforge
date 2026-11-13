import {
  createCallerFactory,
  createContext,
  createLogger,
  t,
} from "@example/fss-shell-server";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "./createAppRouter";

const createCaller = createCallerFactory(createAppRouter(t));

describe("appRouter", () => {
  it("greets and reads the greeting back", async () => {
    const caller = createCaller(
      createContext(createLogger({ module: "test" })),
    );

    await caller.greet({ name: "Ada" });

    expect(await caller.greeting({ name: "Ada" })).toEqual({
      message: "Hello, Ada.",
    });
  });

  it("isolates module state between backend compositions", async () => {
    const first = createCallerFactory(createAppRouter(t))(
      createContext(createLogger({ module: "test" })),
    );

    const second = createCallerFactory(createAppRouter(t))(
      createContext(createLogger({ module: "test" })),
    );

    await first.greet({ name: "Isolated" });
    await expect(second.greeting({ name: "Isolated" })).rejects.toThrow(
      /no greeting/,
    );
  });

  it("throws NotFoundError for an unknown greeting", async () => {
    const caller = createCaller(
      createContext(createLogger({ module: "test" })),
    );

    await expect(caller.greeting({ name: "Nobody" })).rejects.toThrow(
      /no greeting/,
    );
  });
});
