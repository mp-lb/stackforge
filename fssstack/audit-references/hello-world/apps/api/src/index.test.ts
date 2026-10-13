import { describe, expect, it } from "vitest";
import { createExampleBackend } from ".";

describe("example backend", () => {
  it("serves a greeting on /health", async () => {
    const server = createExampleBackend();

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();

    if (address === null || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const body = (await response.json()) as unknown;

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, message: "Hello, api." });
  });
});
