import { stringify } from "yaml";
import type { ProjectPromptConfig } from "./project-schema";

export const buildManifestYaml = (config: ProjectPromptConfig) =>
  stringify({
    type: "fssstack",
    name: config.name,
    emoji: config.emoji,
    description: config.description,
    projectSlug: config.slug,
    packagePrefix: config.packagePrefix,
    shadcnPreset: config.shadcnPreset,
    frontends: config.frontendClients.map((client) => ({
      name: client.slug,
      type: client.type,
    })),
    backends: config.backendServices,
    libs: config.libraryPackages,
    extensions: config.extensions,
  }).trimEnd();
