import { Document, Scalar } from "yaml";
import type { ProjectPromptConfig } from "./project-schema";

export const buildManifestYaml = (config: ProjectPromptConfig) => {
  const description = new Scalar(config.description);
  description.type = Scalar.QUOTE_DOUBLE;

  const document = new Document({
    type: "fssstack",
    name: config.name,
    emoji: config.emoji,
    description,
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
  });

  return document.toString({ doubleQuotedAsJSON: true }).trimEnd();
};
