import { clerkPlugin, getAuth } from "@clerk/fastify";
import Fastify from "fastify";
import {
  createCallerFactory,
  createContext,
  logger,
} from "@hello-world/hello-world-server";
import { appRouter } from "@hello-world/hello-world-trpc";

const serviceName = "api";
const createCaller = createCallerFactory(appRouter);

export const createExampleBackend = async () => {
  const app = Fastify();
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (secretKey) await app.register(clerkPlugin, { secretKey });
  app.get("/health", async () => {
    const caller = createCaller(createContext());
    return { ok: true, ...(await caller.greet({ name: serviceName })) };
  });
  app.get("/api/protected", async (request, reply) => {
    if (!secretKey)
      return reply.status(503).send({ error: "clerk_not_configured" });
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    return { userId };
  });
  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.API_PORT ?? 3101);
  createExampleBackend().then((server) =>
    server
      .listen({ port, host: "0.0.0.0" })
      .then(() =>
        logger.info(
          "backend.listening",
          { port },
          { source: { service: serviceName } },
        ),
      ),
  );
}
