import { z } from "zod";

/**
 * Shared domain types live in `core`. Both the server and any frontend import
 * from here, so the contract is defined once. This greeting schema is a
 * placeholder for a real project's domain — replace it.
 */
export const greetingInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const greetingSchema = z.object({
  message: z.string(),
});

export type GreetingInput = z.infer<typeof greetingInputSchema>;
export type Greeting = z.infer<typeof greetingSchema>;

export const createGreeting = (input: GreetingInput): Greeting => ({
  message: `Hello, ${input.name}.`,
});
