import type { Logger } from "@mp-lb/fssstack-platform/logger/server";
import { createTrpc } from "@mp-lb/fssstack-platform/trpc";

/**
 * The backend context every procedure receives. Grow this with the things a
 * real backend needs (a db handle, the authenticated user, …).
 */
export type AppContext = {
  logger: Logger;
};

const t = createTrpc<AppContext>();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export type TRPCInstance = typeof t;
