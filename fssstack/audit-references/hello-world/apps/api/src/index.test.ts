import { describe, expect, it } from "vitest";
import { createExampleBackend } from ".";

describe("example backend", () => {
  it("serves a greeting on /health", async () => {
    const server = await createExampleBackend();
    const response = await server.inject({ method: "GET", url: "/health" });
    const body = response.json() as unknown;
    await server.close();

    expect(response.statusCode).toBe(200);
    expect(body).toEqual({ ok: true, message: "Hello, api." });
  });

  it("reports an unconfigured Clerk protected route without a secret", async () => {
    const server = await createExampleBackend();
    const response = await server.inject({
      method: "GET",
      url: "/api/protected",
    });
    await server.close();
    expect(response.statusCode).toBe(503);
  });
});
