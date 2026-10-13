export const extensionRegistry = [
  {
    slug: "clerk",
    label: "Clerk",
    icon: "key",
    accent:
      "text-violet-300 border-violet-300/60 bg-violet-400/10 shadow-[0_0_10px_rgba(167,139,250,0.18)]",
  },
  {
    slug: "mongodb",
    label: "MongoDB",
    icon: "database",
    accent:
      "text-emerald-300 border-emerald-300/60 bg-emerald-400/10 shadow-[0_0_10px_rgba(52,211,153,0.18)]",
  },
  {
    slug: "s3",
    label: "S3",
    icon: "cloud",
    accent:
      "text-sky-300 border-sky-300/60 bg-sky-400/10 shadow-[0_0_10px_rgba(56,189,248,0.18)]",
  },
  {
    slug: "bull",
    label: "BullMQ",
    icon: "boxes",
    accent:
      "text-lime-300 border-lime-300/60 bg-lime-400/10 shadow-[0_0_10px_rgba(190,242,100,0.18)]",
  },
  {
    slug: "playwright",
    label: "Playwright",
    icon: "list",
    accent:
      "text-fuchsia-300 border-fuchsia-300/60 bg-fuchsia-400/10 shadow-[0_0_10px_rgba(240,171,252,0.18)]",
  },
  {
    slug: "redis",
    label: "Redis",
    icon: "database",
    accent:
      "text-red-300 border-red-300/60 bg-red-400/10 shadow-[0_0_10px_rgba(248,113,113,0.18)]",
  },
  {
    slug: "electron",
    label: "Electron",
    icon: "monitor",
    accent:
      "text-cyan-300 border-cyan-300/60 bg-cyan-400/10 shadow-[0_0_10px_rgba(103,232,249,0.18)]",
  },
] as const;

export type ExtensionSlug = (typeof extensionRegistry)[number]["slug"];

export const extensionSlugs = extensionRegistry.map(
  ({ slug }) => slug,
) as [ExtensionSlug, ...ExtensionSlug[]];
