import type { ConfigContext, ExpoConfig } from "expo/config";
import packageJson from "./package.json";

const EAS_PROJECT_ID_PLACEHOLDER = "REPLACE_WITH_EAS_PROJECT_ID";

function hasResolvedProjectId(projectId: unknown): projectId is string {
  return (
    typeof projectId === "string" &&
    projectId.length > 0 &&
    projectId !== EAS_PROJECT_ID_PLACEHOLDER
  );
}

// Static config lives in app.json. This wrapper keeps the app's marketing
// version in lockstep with package.json, which changesets owns; build numbers
// are managed remotely by EAS (appVersionSource: remote + autoIncrement).
export default ({ config }: ConfigContext): ExpoConfig => {
  const resolvedConfig: ExpoConfig = {
    ...(config as ExpoConfig),
    version: packageJson.version,
  };

  const projectId = resolvedConfig.extra?.eas?.projectId;
  if (!hasResolvedProjectId(projectId)) {
    const extra = { ...(resolvedConfig.extra ?? {}) };
    const eas = extra.eas;

    if (eas && typeof eas === "object") {
      const nextEas = { ...(eas as Record<string, unknown>) };
      delete nextEas.projectId;

      if (Object.keys(nextEas).length > 0) {
        extra.eas = nextEas;
      } else {
        delete extra.eas;
      }
    }

    resolvedConfig.extra = extra;
    delete resolvedConfig.updates;
  } else {
    resolvedConfig.updates = {
      ...(resolvedConfig.updates ?? {}),
      url: `https://u.expo.dev/${projectId}`,
    };
  }

  return resolvedConfig;
};
