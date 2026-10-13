import { createGreeting, greetingInputSchema } from "@hello-world/hello-world-core";
import {
  NotFoundError,
  publicProcedure,
  router,
} from "@hello-world/hello-world-server";
import { eventSchema } from "@mp-lb/fssstack-platform/events";

const greetings = new Map<string, string>();

/**
 * The app's tRPC router. Procedures share the platform-backed `router` /
 * `publicProcedure` from the server package, log through the context logger,
 * and signal failure with the platform error types.
 */
export const appRouter = router({
  greet: publicProcedure
    .input(greetingInputSchema)
    .mutation(({ ctx, input }) => {
      const greeting = createGreeting(input);

      greetings.set(input.name, greeting.message);
      ctx.logger.info("greeting.created", { name: input.name });

      return greeting;
    }),
  greeting: publicProcedure.input(greetingInputSchema).query(({ input }) => {
    const message = greetings.get(input.name);

    if (message === undefined) {
      throw new NotFoundError(`no greeting for ${input.name}`);
    }

    return { message };
  }),
  // Accepts anything conforming to the canonical event schema and logs it.
  recordEvent: publicProcedure.input(eventSchema).mutation(({ ctx, input }) => {
    ctx.logger.info(input.eventType, input.details);

    return { recorded: true };
  }),
});

export type AppRouter = typeof appRouter;
