import { createGreeting, greetingInputSchema } from "@example/fss-shell-core";
import { NotFoundError, type TRPCInstance } from "@example/fss-shell-server";
import { eventSchema } from "@mp-lb/fssstack-platform/events";

/**
 * A domain router factory. The backend supplies the platform-backed tRPC
 * instance; procedures use its builder, log through the context logger,
 * and signal failure with the platform error types.
 */
export const createAppRouter = (t: TRPCInstance) => {
  const greetings = new Map<string, string>();

  return t.router({
    greet: t.procedure.input(greetingInputSchema).mutation(({ ctx, input }) => {
      const greeting = createGreeting(input);

      greetings.set(input.name, greeting.message);
      ctx.logger.info("greeting.created", { name: input.name });

      return greeting;
    }),
    greeting: t.procedure.input(greetingInputSchema).query(({ input }) => {
      const message = greetings.get(input.name);

      if (message === undefined) {
        throw new NotFoundError(`no greeting for ${input.name}`).toTrpcError();
      }

      return { message };
    }),
    // Accepts anything conforming to the canonical event schema and logs it.
    recordEvent: t.procedure.input(eventSchema).mutation(({ ctx, input }) => {
      ctx.logger.info(input.eventType, input.details);

      return { recorded: true };
    }),
  });
};

export type AppRouter = ReturnType<typeof createAppRouter>;
