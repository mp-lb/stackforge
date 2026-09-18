import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type AppManifest = {
  name: string;
  path: string;
  package: string;
  type?: "frontend" | "backend" | "worker" | "landing-page" | "docs";
  domain?: string;
  buildCommand?: string;
  outputDirectory?: string;
  dnsRecordType?: string;
  dnsRecordContent?: string;
  port?: number;
  env?: string[];
};

type ServiceManifest = Omit<AppManifest, "name" | "domain"> & {
  name?: string;
  type: "frontend" | "backend" | "worker" | "landing-page" | "docs";
  subdomain?: string | null;
  domain?: string;
};

type DeploymentManifest = {
  projectSlug?: string;
  projectName?: string;
  customDomain?: string | null;
  baseDomain?: string;
  domain?: string;
  gcpRegion?: string;
  manageCloudflareDns?: boolean;
  services?: ServiceManifest[];
  frontends?: AppManifest[];
  backends?: AppManifest[];
  workers?: AppManifest[];
};

type NormalizedAppManifest = AppManifest & { domain: string };

type NormalizedDeploymentManifest = Omit<
  Required<DeploymentManifest>,
  | "projectSlug"
  | "customDomain"
  | "baseDomain"
  | "services"
  | "frontends"
  | "backends"
  | "workers"
> & {
  dnsZoneDomain: string;
  frontends: NormalizedAppManifest[];
  backends: NormalizedAppManifest[];
  workers: AppManifest[];
};

const importRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cwdRoot = process.cwd();
const repoRoot =
  [importRoot, cwdRoot].find((candidate) =>
    fs.existsSync(path.join(candidate, "templates", "main.tf")),
  ) ?? importRoot;
const storeName = process.env.MP_LB_RUN_STORE ?? "mp-lb-run";
const defaultDomain = "mp-lb.dev";
const legacyDomain = "maplab.dev";
const terraformTemplates = [
  "backend.tf",
  "budget.tf",
  "dns.tf",
  "frontend.tf",
  "main.tf",
  "outputs.tf",
  "redis.tf",
  "registry.tf",
  "variables.tf",
];
const baseDeploymentEnv = [
  "GCP_PROJECT_ID",
  "GCP_REGION",
  "GCP_SA_KEY",
  "VERCEL_API_TOKEN",
];
const cloudflareDeploymentEnv = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
];

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const targetRoot = path.resolve(args[0] ?? process.cwd());
const force = args.includes("--force");

const read = (file: string) => fs.readFileSync(file, "utf8");

const readRepoFile = (relativePath: string) => {
  const localPath = path.join(repoRoot, relativePath);
  if (fs.existsSync(localPath)) return read(localPath);

  try {
    return execFileSync("fm", ["--store", storeName, "read", relativePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    });
  } catch {
    throw new Error(
      `Could not read ${relativePath} from local files or Doctrine store ${storeName}`,
    );
  }
};

const writeFile = (file: string, content: string) => {
  if (fs.existsSync(file) && !force) {
    console.log(`skip ${path.relative(targetRoot, file)} already exists`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`write ${path.relative(targetRoot, file)}`);
};

const sanitizeName = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-");
const sanitizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
const isDnsLabel = (value: string) =>
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
const isDomain = (value: string) =>
  value.split(".").every((part) => isDnsLabel(part));

const hclString = (value: unknown) => JSON.stringify(String(value));

const serviceDeploymentType = (type: ServiceManifest["type"]) =>
  type === "backend" || type === "worker" ? "backend" : "frontend";

const serviceName = (service: ServiceManifest) =>
  service.name ?? service.subdomain ?? service.type;

const serviceDomain = (rootDomain: string, service: ServiceManifest) => {
  if (service.domain) return normalizeDomain(service.domain);

  return service.subdomain === null || service.subdomain === undefined
    ? rootDomain
    : `${service.subdomain}.${rootDomain}`;
};

const defaultAppDomain = (
  projectName: string,
  type: "frontend" | "backend",
  appName: string,
  index: number,
) => {
  const safeAppName = sanitizeName(appName).toLowerCase();
  const safeProjectName = sanitizeName(projectName).toLowerCase();

  if (type === "frontend") {
    return index === 0
      ? `${safeProjectName}.${defaultDomain}`
      : `${safeAppName}-${safeProjectName}.${defaultDomain}`;
  }

  return index === 0
    ? `api.${safeProjectName}.${defaultDomain}`
    : `${safeAppName}.${safeProjectName}.${defaultDomain}`;
};

const normalizeDomain = (domain: string) => {
  if (domain === legacyDomain) return defaultDomain;
  if (domain.endsWith(`.${legacyDomain}`)) {
    return `${domain.slice(0, -legacyDomain.length)}${defaultDomain}`;
  }
  return domain;
};

const validateUnique = (
  errors: string[],
  label: string,
  values: Array<{ value: string; owner: string }>,
) => {
  const seen = new Map<string, string>();

  for (const item of values) {
    const previousOwner = seen.get(item.value);
    if (previousOwner) {
      errors.push(
        `Duplicate ${label} "${item.value}" for ${previousOwner} and ${item.owner}.`,
      );
      continue;
    }
    seen.set(item.value, item.owner);
  }
};

const normalizeServices = (services: ServiceManifest[], rootDomain: string) => {
  const errors: string[] = [];
  const serviceNames: Array<{ value: string; owner: string }> = [];
  const serviceSubdomains: Array<{ value: string; owner: string }> = [];
  const serviceDomains: Array<{ value: string; owner: string }> = [];
  const frontends: NormalizedAppManifest[] = [];
  const backends: NormalizedAppManifest[] = [];
  const workers: AppManifest[] = [];

  for (const [index, service] of services.entries()) {
    const owner = `services[${index}]`;
    const name = serviceName(service);
    const deploymentType = serviceDeploymentType(service.type);
    const domain =
      service.type === "worker" &&
      !service.domain &&
      service.subdomain === undefined
        ? undefined
        : serviceDomain(rootDomain, service);

    serviceNames.push({ value: name, owner });
    if (domain) {
      serviceDomains.push({ value: domain, owner });
    }
    if (service.subdomain !== null && service.subdomain !== undefined) {
      serviceSubdomains.push({ value: service.subdomain, owner });
    }

    if (!isDnsLabel(name)) {
      errors.push(
        `${owner}.name must be a DNS-safe label; received "${name}".`,
      );
    }
    if (
      !["frontend", "backend", "worker", "landing-page", "docs"].includes(
        service.type,
      )
    ) {
      errors.push(
        `${owner}.type must be "frontend", "backend", "worker", "landing-page", or "docs"; received "${service.type}".`,
      );
    }
    if (!service.path) {
      errors.push(`${owner}.path is required.`);
    }
    if (!service.package) {
      errors.push(`${owner}.package is required.`);
    }
    if (deploymentType === "frontend" && !service.buildCommand) {
      errors.push(`${owner}.buildCommand is required for frontend services.`);
    }
    if (deploymentType === "frontend" && !service.outputDirectory) {
      errors.push(
        `${owner}.outputDirectory is required for frontend services.`,
      );
    }
    if (
      service.subdomain !== null &&
      service.subdomain !== undefined &&
      typeof service.subdomain !== "string"
    ) {
      errors.push(`${owner}.subdomain must be null or a DNS-safe label.`);
    } else if (
      service.subdomain !== null &&
      service.subdomain !== undefined &&
      !isDnsLabel(service.subdomain)
    ) {
      errors.push(
        `${owner}.subdomain must be null or a DNS-safe label; received "${service.subdomain}".`,
      );
    }
    if (domain && !isDomain(domain)) {
      errors.push(`${owner} resolves to invalid domain "${domain}".`);
    }

    const app = {
      ...service,
      name,
    };

    delete (app as Partial<ServiceManifest>).type;
    delete (app as Partial<ServiceManifest>).subdomain;

    if (deploymentType === "backend") {
      if (service.type === "worker") {
        workers.push({ ...app, type: "worker" });
      } else {
        backends.push({ ...app, domain: domain ?? "" });
      }
    } else {
      frontends.push({ ...app, domain: domain ?? "" });
    }
  }

  validateUnique(errors, "service name", serviceNames);
  validateUnique(errors, "service subdomain", serviceSubdomains);
  validateUnique(errors, "service domain", serviceDomains);

  if (errors.length > 0) {
    throw new Error(
      `Invalid fssstack.json services:\n- ${errors.join("\n- ")}`,
    );
  }

  return { frontends, backends, workers };
};

const normalizeApps = (
  apps: AppManifest[],
  projectName: string,
  type: "frontend" | "backend",
): NormalizedAppManifest[] =>
  apps.map((app, index) => ({
    ...app,
    domain: normalizeDomain(
      app.domain ?? defaultAppDomain(projectName, type, app.name, index),
    ),
  }));

const renderTfvars = (manifest: NormalizedDeploymentManifest) => {
  const lines = [
    `project_name = ${hclString(manifest.projectName)}`,
    `domain       = ${hclString(manifest.domain)}`,
    `dns_zone_domain = ${hclString(manifest.dnsZoneDomain)}`,
    `gcp_region   = ${hclString(manifest.gcpRegion)}`,
    `manage_cloudflare_dns = ${manifest.manageCloudflareDns ? "true" : "false"}`,
    "",
    "frontends = {",
  ];

  for (const app of manifest.frontends) {
    lines.push(`  ${app.name} = {`);
    lines.push(`    path               = ${hclString(app.path)}`);
    lines.push(`    package            = ${hclString(app.package)}`);
    lines.push(`    domain             = ${hclString(app.domain)}`);
    lines.push(`    build_command      = ${hclString(app.buildCommand)}`);
    lines.push(`    output_directory   = ${hclString(app.outputDirectory)}`);
    lines.push(
      `    dns_record_type    = ${hclString(app.dnsRecordType ?? "CNAME")}`,
    );
    lines.push(
      `    dns_record_content = ${hclString(app.dnsRecordContent ?? "cname.vercel-dns.com")}`,
    );
    lines.push("  }");
  }

  lines.push("}", "", "backends = {");

  for (const app of manifest.backends) {
    lines.push(`  ${app.name} = {`);
    lines.push(`    path    = ${hclString(app.path)}`);
    lines.push(`    package = ${hclString(app.package)}`);
    lines.push(`    domain  = ${hclString(app.domain)}`);
    lines.push(`    port    = ${Number(app.port ?? 8080)}`);
    lines.push("    env     = {}");
    lines.push("  }");
  }

  lines.push("}", "");
  return `${lines.join("\n")}\n`;
};

const renderWorkflow = (
  template: string,
  manifest: NormalizedDeploymentManifest,
) => {
  const backendImageSteps = manifest.backends
    .map((backend) => {
      const envName = `IMAGE_${backend.name.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()}`;
      return `      - name: Build ${backend.name} image
        run: |
          IMAGE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$PROJECT_NAME/${backend.name}:\${{ github.sha }}"
          docker build -t "$IMAGE" -f ${backend.path}/Dockerfile .
          docker push "$IMAGE"
          echo "${envName}=$IMAGE" >> "$GITHUB_ENV"`;
    })
    .join("\n\n");

  const backendImageTfvarsStep =
    manifest.backends.length === 0
      ? ""
      : `      - name: Write backend image Terraform vars
        run: |
          node <<'NODE'
          const fs = require('node:fs');
          const images = {};
          ${manifest.backends
            .map((backend) => {
              const envName = `IMAGE_${backend.name.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()}`;
              return `if (process.env.${envName}) images[${JSON.stringify(backend.name)}] = process.env.${envName};`;
            })
            .join("\n          ")}
          fs.writeFileSync('terraform/backend-images.auto.tfvars.json', JSON.stringify({ backend_images: images }, null, 2) + '\\n');
          NODE`;

  const frontendSteps = manifest.frontends
    .map((frontend) => {
      return `      - name: Build ${frontend.name}
        run: ${frontend.buildCommand}

      - name: Deploy ${frontend.name} to Vercel
        run: |
          cp ${frontend.path}/vercel.json ${frontend.outputDirectory}/vercel.json
          PROJECT_ID=$(terraform -chdir=terraform output -json vercel_project_ids | node -e "let d=''; process.stdin.on('data', c => d += c).on('end', () => console.log(JSON.parse(d)['${frontend.name}']))")
          ORG_ID=$(curl -s -H "Authorization: Bearer $VERCEL_API_TOKEN" https://api.vercel.com/v2/user | node -e "let d=''; process.stdin.on('data', c => d += c).on('end', () => console.log(JSON.parse(d).user.id))")
          VERCEL_PROJECT_ID="$PROJECT_ID" VERCEL_ORG_ID="$ORG_ID" npx vercel deploy ${frontend.outputDirectory} --prod --yes --token="$VERCEL_API_TOKEN"`;
    })
    .join("\n\n");

  return template
    .replaceAll("{{PROJECT_NAME}}", manifest.projectName)
    .replace("{{BACKEND_IMAGE_STEPS}}", backendImageSteps)
    .replace("{{BACKEND_IMAGE_TFVARS_STEP}}", backendImageTfvarsStep)
    .replace("{{FRONTEND_DEPLOY_STEPS}}", frontendSteps);
};

const deploymentEnvForManifest = (manifest: NormalizedDeploymentManifest) => [
  ...baseDeploymentEnv,
  ...(manifest.manageCloudflareDns ? cloudflareDeploymentEnv : []),
];

const manifestPath = path.join(targetRoot, "fssstack.json");
if (!fs.existsSync(manifestPath)) {
  throw new Error(`Missing ${path.relative(targetRoot, manifestPath)}`);
}

const rawManifest = JSON.parse(read(manifestPath)) as DeploymentManifest;
if (
  !rawManifest.services &&
  !rawManifest.frontends &&
  !rawManifest.backends &&
  !rawManifest.workers
) {
  throw new Error(
    "fssstack.json must include services, frontends, backends, or workers.",
  );
}

const projectSlug = sanitizeSlug(
  rawManifest.projectSlug ??
    rawManifest.projectName ??
    path.basename(targetRoot),
);
if (!projectSlug || !isDnsLabel(projectSlug)) {
  throw new Error(
    `Invalid projectSlug "${rawManifest.projectSlug ?? rawManifest.projectName ?? path.basename(targetRoot)}".`,
  );
}

const hasCustomDomain = Object.hasOwn(rawManifest, "customDomain");
const customDomain =
  rawManifest.customDomain === null || rawManifest.customDomain === undefined
    ? null
    : normalizeDomain(rawManifest.customDomain);
const legacyManifestDomain = rawManifest.domain
  ? normalizeDomain(rawManifest.domain)
  : undefined;
const legacyBaseDomain = rawManifest.baseDomain
  ? normalizeDomain(rawManifest.baseDomain)
  : undefined;
const rootDomain = hasCustomDomain
  ? (customDomain ?? `${projectSlug}.${defaultDomain}`)
  : (legacyManifestDomain ??
    `${projectSlug}.${legacyBaseDomain ?? defaultDomain}`);
const dnsZoneDomain =
  hasCustomDomain && customDomain === null
    ? defaultDomain
    : !hasCustomDomain && !legacyManifestDomain
      ? (legacyBaseDomain ?? defaultDomain)
      : rootDomain;

if (!isDomain(rootDomain)) {
  throw new Error(`Resolved root domain is invalid: "${rootDomain}".`);
}
if (!isDomain(dnsZoneDomain)) {
  throw new Error(`Resolved DNS zone domain is invalid: "${dnsZoneDomain}".`);
}

const manifest: NormalizedDeploymentManifest = {
  projectName: projectSlug,
  domain: rootDomain,
  dnsZoneDomain,
  gcpRegion: rawManifest.gcpRegion ?? "asia-southeast1",
  manageCloudflareDns: rawManifest.manageCloudflareDns !== false,
  frontends: [],
  backends: [],
  workers: [],
};

if (rawManifest.services) {
  const services = normalizeServices(rawManifest.services, manifest.domain);
  manifest.frontends = services.frontends;
  manifest.backends = services.backends;
  manifest.workers = services.workers;
} else {
  manifest.frontends = normalizeApps(
    rawManifest.frontends ?? [],
    manifest.projectName,
    "frontend",
  );
  manifest.backends = normalizeApps(
    rawManifest.backends ?? [],
    manifest.projectName,
    "backend",
  );
  manifest.workers = rawManifest.workers ?? [];
}

for (const file of terraformTemplates) {
  writeFile(
    path.join(targetRoot, "terraform", file),
    readRepoFile(path.join("templates", file)),
  );
}
writeFile(
  path.join(targetRoot, "terraform", "terraform.tfvars"),
  renderTfvars(manifest),
);

for (const backend of manifest.backends) {
  const dockerfile = readRepoFile(path.join("templates", "Dockerfile"))
    .replaceAll("{{BACKEND_PACKAGE}}", backend.package)
    .replaceAll("{{BACKEND_PORT}}", String(backend.port ?? 8080));
  writeFile(path.join(targetRoot, backend.path, "Dockerfile"), dockerfile);
}

writeFile(
  path.join(targetRoot, ".github", "workflows", "deploy.yml"),
  renderWorkflow(readRepoFile(path.join("templates", "deploy.yml")), manifest),
);

writeFile(
  path.join(targetRoot, "scripts", "load-deployment-env.mjs"),
  readRepoFile(path.join("templates", "load-deployment-env.mjs")),
);

writeFile(
  path.join(targetRoot, "deployment", "apps.json"),
  `${JSON.stringify(
    {
      projectName: manifest.projectName,
      deploymentEnv: deploymentEnvForManifest(manifest),
      frontends: manifest.frontends,
      backends: manifest.backends,
      workers: manifest.workers,
    },
    null,
    2,
  )}\n`,
);

writeFile(
  path.join(targetRoot, ".env.production"),
  readRepoFile(path.join("templates", "env.production")),
);
writeFile(path.join(targetRoot, "secrets.json.enc"), "{\n}\n");
