#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const getScriptArgs = () => {
  const args2 = process.argv.slice(2);
  return args2[0] === "--" ? args2.slice(1) : args2;
};

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const serviceNamePattern = /^[a-z][a-z0-9-]*$/;

const validateServiceName = (serviceName: string) => {
  if (!serviceNamePattern.test(serviceName)) {
    fail(
      `invalid service name '${serviceName}'; use lowercase letters, numbers, and hyphens`,
    );
  }
};

const portEnvName = (serviceName: string) =>
  `${serviceName.toUpperCase().replaceAll("-", "_")}_PORT`;

const stripRange = (value: string) =>
  typeof value === "string" ? value.replace(/^[~^]/, "") : value;

const FRONTEND_TSCONFIG = {
  extends: "@mp-lb/fssstack-config/tsconfig/frontend.json",
};

const args = getScriptArgs();

if (args.length < 1 || args.length > 2) {
  fail(
    "usage: zap t augment-docs-site -- /path/to/target-project [docs-client]",
  );
}

const targetRoot = args[0];
const docsClient = args[1] ?? "docs";
validateServiceName(docsClient);
const docsRoot = join(targetRoot, "apps", docsClient);
const portEnv = portEnvName(docsClient);

if (!existsSync(docsRoot)) {
  fail(
    `docs app not found at ${docsRoot}; scaffold it with create-fumadocs-app first`,
  );
}

const packageJsonPath = join(docsRoot, "package.json");

const packageJson: {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} = JSON.parse(readFileSync(packageJsonPath, "utf8"));

packageJson.scripts = {
  ...packageJson.scripts,
  dev: `react-router dev --host 0.0.0.0 --port \${${portEnv}:-4315}`,
  build: "react-router build",
  start: `serve ./build/client --config serve.json -l \${${portEnv}:-4315}`,
  typecheck: "react-router typegen && fumadocs-mdx && tsc --noEmit",
  postinstall: "fumadocs-mdx",
};

packageJson.devDependencies = {
  ...packageJson.devDependencies,
  serve: "14.2.6",
};

for (const dependencySet of [
  packageJson.dependencies,
  packageJson.devDependencies,
]) {
  if (!dependencySet) continue;

  for (const [name, version] of Object.entries(dependencySet)) {
    dependencySet[name] = stripRange(version);
  }
}

writeFileSync(
  packageJsonPath,
  `${JSON.stringify(packageJson, null, 2)}
`,
);

const sharedTsconfigPath = join(targetRoot, "etc", "tsconfig.frontend.json");

if (!existsSync(sharedTsconfigPath)) {
  mkdirSync(dirname(sharedTsconfigPath), { recursive: true });
  writeFileSync(
    sharedTsconfigPath,
    `${JSON.stringify(FRONTEND_TSCONFIG, null, 2)}
`,
  );
}

const tsconfig = {
  extends: "../../etc/tsconfig.frontend.json",
  include: [
    "**/*",
    "**/.server/**/*",
    "**/.client/**/*",
    ".react-router/types/**/*",
  ],
  compilerOptions: {
    types: ["node", "vite/client"],
    rootDirs: [".", "./.react-router/types"],
    paths: {
      "@/*": ["./app/*"],
      "collections/*": ["./.source/*"],
    },
  },
};

writeFileSync(
  join(docsRoot, "tsconfig.json"),
  `${JSON.stringify(tsconfig, null, 2)}
`,
);

const serveConfig = {
  rewrites: [{ source: "/**", destination: "/__spa-fallback.html" }],
};

writeFileSync(
  join(docsRoot, "serve.json"),
  `${JSON.stringify(serveConfig, null, 2)}
`,
);
