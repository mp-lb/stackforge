import { z } from "zod";

export const readConfig = (source: NodeJS.ProcessEnv) =>
  z
    .object({
      port: z.coerce.number().int().min(0).max(65535).default(3101),
      frontendUrls: z
        .string()
        .default("")
        .transform((value) =>
          value
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
        ),
    })
    .parse({
      port: source.PORT ?? source.EXAMPLE_BACKEND_PORT,
      frontendUrls: source.FRONTEND_URLS,
    });
