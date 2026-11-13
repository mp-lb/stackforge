import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { t, type Logger } from "@example/fss-shell-server";
import type { AppRouter } from "@example/fss-shell-trpc";
import { createAppRouter } from "@example/fss-shell-trpc/server";
import type { readConfig } from "./readConfig";
import { createRequestContext } from "./createRequestContext";
import { registerRequestLogging } from "./registerRequestLogging";

export const createExampleBackend = (
  config: ReturnType<typeof readConfig>,
  logger: Logger,
) => {
  const app = Fastify({ logger: false });
  registerRequestLogging(app, logger);
  app.register(cors, { origin: config.frontendUrls });
  app.get("/health", async () => ({ ok: true }));
  app.register(fastifyTRPCPlugin<AppRouter>, {
    prefix: "/trpc",
    trpcOptions: {
      router: createAppRouter(t),
      createContext: ({ req }) => createRequestContext(logger, req),
      onError: ({ error, ctx, path }) => {
        (ctx?.logger ?? logger)[
          error.code === "INTERNAL_SERVER_ERROR" ? "error" : "warn"
        ]("trpc.error", {
          path,
          code: error.code,
          message: error.message,
          stack: error.stack,
        });
      },
    },
  });

  return app;
};
