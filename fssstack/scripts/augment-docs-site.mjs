#!/usr/bin/env node

// scripts-src/flatpack-docs/augment-docs-site.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

// scripts-src/flatpack-docs/lib/args.ts
var getScriptArgs = () => {
  const args2 = process.argv.slice(2);
  return args2[0] === "--" ? args2.slice(1) : args2;
};
var fail = (message) => {
  console.error(message);
  process.exit(1);
};

// scripts-src/flatpack-docs/lib/services.ts
var serviceNamePattern = /^[a-z][a-z0-9-]*$/;
var validateServiceName = (serviceName) => {
  if (!serviceNamePattern.test(serviceName)) {
    fail(
      `invalid service name '${serviceName}'; use lowercase letters, numbers, and hyphens`
    );
  }
};
var portEnvName = (serviceName) => `${serviceName.toUpperCase().replaceAll("-", "_")}_PORT`;

// scripts-src/flatpack-docs/augment-docs-site.ts
var stripRange = (value) => typeof value === "string" ? value.replace(/^[~^]/, "") : value;
var FRONTEND_TSCONFIG = {
  extends: "@mp-lb/fssstack-config/tsconfig/frontend.json"
};
var args = getScriptArgs();
if (args.length < 1 || args.length > 2) {
  fail("usage: augment-docs-site.mjs /path/to/target-project [docs-client]");
}
var targetRoot = args[0];
var docsClient = args[1] ?? "docs";
validateServiceName(docsClient);
var docsRoot = join(targetRoot, "apps", docsClient);
var portEnv = portEnvName(docsClient);
if (!existsSync(docsRoot)) {
  fail(`docs app not found at ${docsRoot}; scaffold it with create-fumadocs-app first`);
}
var packageJsonPath = join(docsRoot, "package.json");
var packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
packageJson.scripts = {
  ...packageJson.scripts,
  dev: `react-router dev --host 0.0.0.0 --port \${${portEnv}:-4315}`,
  build: "react-router build",
  start: `serve ./build/client --config serve.json -l \${${portEnv}:-4315}`,
  typecheck: "react-router typegen && fumadocs-mdx && tsc --noEmit",
  postinstall: "fumadocs-mdx"
};
packageJson.devDependencies = {
  ...packageJson.devDependencies,
  serve: "14.2.6"
};
for (const dependencySet of [packageJson.dependencies, packageJson.devDependencies]) {
  if (!dependencySet) continue;
  for (const [name, version] of Object.entries(dependencySet)) {
    dependencySet[name] = stripRange(version);
  }
}
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}
`);
var sharedTsconfigPath = join(targetRoot, "etc", "tsconfig.frontend.json");
if (!existsSync(sharedTsconfigPath)) {
  mkdirSync(dirname(sharedTsconfigPath), { recursive: true });
  writeFileSync(sharedTsconfigPath, `${JSON.stringify(FRONTEND_TSCONFIG, null, 2)}
`);
}
var tsconfig = {
  extends: "../../etc/tsconfig.frontend.json",
  include: ["**/*", "**/.server/**/*", "**/.client/**/*", ".react-router/types/**/*"],
  compilerOptions: {
    types: ["node", "vite/client"],
    rootDirs: [".", "./.react-router/types"],
    paths: {
      "@/*": ["./app/*"],
      "collections/*": ["./.source/*"]
    }
  }
};
writeFileSync(
  join(docsRoot, "tsconfig.json"),
  `${JSON.stringify(tsconfig, null, 2)}
`
);
var serveConfig = {
  rewrites: [{ source: "/**", destination: "/__spa-fallback.html" }]
};
writeFileSync(
  join(docsRoot, "serve.json"),
  `${JSON.stringify(serveConfig, null, 2)}
`
);
