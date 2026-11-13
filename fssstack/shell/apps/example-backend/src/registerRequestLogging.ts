import type { Logger } from "@example/fss-shell-server";
import type { FastifyError, FastifyInstance } from "fastify";

export const registerRequestLogging = (
  app: FastifyInstance,
  logger: Logger,
) => {
  app.addHook("onResponse", async (request, reply) => {
    logger.info("http.request.completed", {
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url,
      status: reply.statusCode,
      durationMs: reply.elapsedTime,
    });
  });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const status =
      error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

    logger[status >= 500 ? "error" : "warn"]("http.error", {
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url,
      status,
      message: error.message,
      stack: error.stack,
    });

    void reply
      .code(status)
      .send({ error: status >= 500 ? "internal" : "request_error" });
  });
};
