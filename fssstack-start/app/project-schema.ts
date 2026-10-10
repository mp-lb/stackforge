import { z } from "zod";

export const defaultTheme = "b1a1M7Tvs";

// One source for initial web values and optional JSON input defaults.
const defaults = {
  name: "My App",
  slug: "my-app",
  emoji: "🚀",
  description: "",
  packagePrefix: "@fssstack",
  shadcnPreset: defaultTheme,
  extensions: [],
  backendServices: ["backend"],
  frontendClients: [{ slug: "frontend", type: "react-vite" }],
  libraryPackages: [],
} as const;

const namePattern = /^[A-Za-z0-9 .,'&()/_:+#-]+$/;
const slugPattern = /^[a-z]+(?:-[a-z]+)*$/;
const npmOrgPattern = /^@[a-z0-9][a-z0-9-]*$/;
const shadcnPresetPattern = /^[A-Za-z0-9_-]+$/;
const extensionSlugs = [
  "bull",
  "clerk",
  "mongodb",
  "playwright",
  "redis",
  "s3",
] as const;
const emojiPattern =
  /^(?=.*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}))(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D)+$/u;

export const toSlug = (value: string) => {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug;
};

export const projectPromptSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .regex(
        namePattern,
        "Use letters, numbers, spaces, and basic punctuation only.",
      )
      .default(defaults.name),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .regex(slugPattern, "Use lowercase letters separated by single hyphens.")
      .default(defaults.slug),
    emoji: z
      .string()
      .trim()
      .min(1, "Emoji is required.")
      .regex(emojiPattern, "Use emoji characters only.")
      .default(defaults.emoji),
    description: z
      .string()
      .trim()
      .min(1, "Description is required.")
      .max(200, "Description must be 200 characters or fewer."),
    packagePrefix: z
      .string()
      .trim()
      .min(2, "Package prefix is required.")
      .max(214, "Package prefix is too long.")
      .regex(npmOrgPattern, "Use a valid lowercase npm org, like @fssstack.")
      .default(defaults.packagePrefix),
    shadcnPreset: z
      .string()
      .trim()
      .min(1, "shadcn preset is required.")
      .regex(
        shadcnPresetPattern,
        "Use letters, numbers, underscores, and hyphens only.",
      )
      .default(defaults.shadcnPreset),
    extensions: z
      .array(z.enum(extensionSlugs))
      .default([...defaults.extensions]),
    backendServices: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Service slug is required.")
          .regex(
            slugPattern,
            "Use lowercase letters separated by single hyphens.",
          ),
      )
      .default([...defaults.backendServices]),
    frontendClients: z
      .array(
        z.object({
          slug: z
            .string()
            .trim()
            .min(1, "Client slug is required.")
            .regex(
              slugPattern,
              "Use lowercase letters separated by single hyphens.",
            ),
          type: z.enum(["react-vite", "react-nextjs", "react-fumadocs"]),
        }),
      )
      .default(defaults.frontendClients.map((client) => ({ ...client }))),
    libraryPackages: z
      .array(
        z
          .string()
          .trim()
          .regex(
            slugPattern,
            "Use lowercase letters separated by single hyphens.",
          ),
      )
      .default([...defaults.libraryPackages]),
  })
  .strict()
  .superRefine((config, context) => {
    const slugCounts = new Map<string, number>();

    const slugs = [
      ...config.backendServices,
      ...config.frontendClients.map((client) => client.slug),
      ...config.libraryPackages,
    ];

    for (const slug of slugs) {
      slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    }

    config.backendServices.forEach((service, index) => {
      if ((slugCounts.get(service) ?? 0) > 1) {
        context.addIssue({
          code: "custom",
          message: "App and package slugs must be unique.",
          path: ["backendServices", index],
        });
      }
    });

    config.frontendClients.forEach((client, index) => {
      if ((slugCounts.get(client.slug) ?? 0) > 1) {
        context.addIssue({
          code: "custom",
          message: "App and package slugs must be unique.",
          path: ["frontendClients", index, "slug"],
        });
      }
    });

    config.libraryPackages.forEach((libraryPackage, index) => {
      if ((slugCounts.get(libraryPackage) ?? 0) > 1) {
        context.addIssue({
          code: "custom",
          message: "App and package slugs must be unique.",
          path: ["libraryPackages", index],
        });
      }
    });
  });

export type ProjectPromptConfig = z.infer<typeof projectPromptSchema>;

export const defaultProjectPromptConfig: ProjectPromptConfig = {
  ...defaults,
  extensions: [...defaults.extensions],
  backendServices: [...defaults.backendServices],
  frontendClients: defaults.frontendClients.map((client) => ({ ...client })),
  libraryPackages: [...defaults.libraryPackages],
};

export const projectPromptJsonSchema = () => ({
  ...z.toJSONSchema(projectPromptSchema, { io: "input" }),
  title: "FSS Stack project configuration",
  description:
    "The web configurator's JSON values. Omitted optional fields use the same defaults as the web form. App and library slugs must also be unique across all three lists; the CLI enforces this with Zod.",
});

export const normalizeProjectPromptConfig = (
  config: ProjectPromptConfig,
): ProjectPromptConfig => ({
  ...config,
  name: config.name.trim(),
  slug: toSlug(config.slug),
  emoji: config.emoji.trim(),
  description: config.description.trim(),
  packagePrefix: config.packagePrefix.trim().toLowerCase(),
  shadcnPreset: config.shadcnPreset.trim(),
  extensions: [...new Set(config.extensions)],
  backendServices: config.backendServices
    .map(toSlug)
    .filter((service) => service !== ""),
  frontendClients: config.frontendClients
    .map((client) => ({
      ...client,
      slug: toSlug(client.slug),
    }))
    .filter((client) => client.slug !== ""),
  libraryPackages: config.libraryPackages
    .map(toSlug)
    .filter((slug) => slug !== ""),
});
