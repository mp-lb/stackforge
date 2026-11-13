import { createContext, type Logger } from "@example/fss-shell-server";
import type { FastifyRequest } from "fastify";

export const createRequestContext = (
  logger: Logger,
  request: FastifyRequest,
) => {
  const metadata = {
    requestId: request.id,
    http: { route: request.routeOptions.url },
  };

  return createContext(logger.child(metadata));
};
