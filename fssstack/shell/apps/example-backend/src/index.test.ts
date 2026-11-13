import { onTestFinished, describe, expect, it, vi } from "vitest";
import { createExampleBackend } from "./createExampleBackend";
import { readConfig } from "./readConfig";

const fixture = () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };

  logger.child.mockReturnValue(logger);

  const app = createExampleBackend(
    { port: 0, frontendUrls: ["https://example.test"] },
    logger,
  );

  onTestFinished(() => app.close());
  return { app, logger };
};

const input = (name: string) =>
  encodeURIComponent(JSON.stringify({ json: { name } }));

describe("example backend", () => {
  it("serves an unauthenticated health check without running a domain procedure", async () => {
    const { app, logger } = fixture();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(logger.child).not.toHaveBeenCalled();
  });

  it("exposes the module through the Fastify tRPC transport with request-scoped logging", async () => {
    const { app, logger } = fixture();

    const created = await app.inject({
      method: "POST",
      url: "/trpc/greet",
      payload: { json: { name: "Ada" } },
    });

    expect(created.statusCode).toBe(200);

    const read = await app.inject({
      method: "GET",
      url: `/trpc/greeting?input=${input("Ada")}`,
    });

    expect(read.statusCode).toBe(200);
    expect(read.json().result.data.json).toEqual({ message: "Hello, Ada." });
    expect(logger.child).toHaveBeenCalledWith({
      requestId: expect.any(String),
      http: { route: "/trpc/:path" },
    });

    expect(logger.info).toHaveBeenCalledWith("greeting.created", {
      name: "Ada",
    });
  });

  it("preserves the module's typed error through the HTTP boundary", async () => {
    const { app, logger } = fixture();

    const response = await app.inject({
      method: "GET",
      url: `/trpc/greeting?input=${input("Nobody")}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.json.data.appCode).toBe("NOT_FOUND");
    expect(logger.warn).toHaveBeenCalledWith(
      "trpc.error",
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });

  it("logs unexpected HTTP errors once and hides internals from the response", async () => {
    const { app, logger } = fixture();
    app.get("/fail", async () => {
      throw new Error("internal database detail");
    });

    const response = await app.inject({
      method: "GET",
      url: "/fail?token=private-query",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "internal" });
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      "http.error",
      expect.objectContaining({
        requestId: expect.any(String),
        route: "/fail",
        status: 500,
      }),
    );

    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(
      "private-query",
    );
  });

  it("only allows configured browser origins", async () => {
    const { app } = fixture();

    for (const origin of ["https://example.test", "https://untrusted.test"]) {
      const response = await app.inject({
        method: "OPTIONS",
        url: "/trpc/greet",
        headers: { origin, "access-control-request-method": "POST" },
      });

      expect(response.headers["access-control-allow-origin"]).toBe(
        origin === "https://example.test" ? origin : undefined,
      );
    }
  });

  it("reads configuration at the app boundary and rejects invalid ports", () => {
    expect(
      readConfig({
        PORT: "8080",
        EXAMPLE_BACKEND_PORT: "3000",
        FRONTEND_URLS: " https://example.test, ",
      }),
    ).toEqual({ port: 8080, frontendUrls: ["https://example.test"] });

    expect(() => readConfig({ PORT: "invalid" })).toThrow();
  });
});
