import { AppError } from "@mp-lb/fssstack-platform/errors";

/**
 * Project-specific errors subclass the platform's transport-independent
 * {@link AppError}. The tRPC error formatter (baked into `createTrpc`) surfaces
 * the `appCode` to the client.
 */
export class NotFoundError extends AppError {
  constructor(message = "record not found") {
    super({ appCode: "NOT_FOUND", message, trpcCode: "NOT_FOUND" });
  }
}
