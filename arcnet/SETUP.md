# ArcNet setup guide

Use this guide to add ArcNet deployment to an existing, locally validated project. **FSS Stack is not required.** ArcNet is MAP Lab's deployment conventions and onboarding around Zap Arc, the deployment engine in Zapper; the static Vercel adapter uses Vercel directly.

A `zap.yaml` alone is not sufficient for the current installer. It also requires Node 22+, a pnpm project with an exact `packageManager` and committed lockfile, a GitHub repository, and explicit deployment targets/build instructions. It does not require FSS Stack packages, scaffolding or application architecture. Projects using other package managers need installer/workflow adaptation; they are not supported unchanged merely because they have a Zap file.

Read the [ArcNet README and target file tree](README.md) for the actual files, supported targets and first-deployment requirements. The [hello-world reference project](https://github.com/mp-lb/stackforge/tree/main/helloworld) provides example project details. Use the target project's real service names, package names and build outputs, not assumed `backend` or `frontend` names.

## Inspect and select

Read `zap.yaml`, workspace packages, build scripts and existing workflows. Identify which apps should deploy, where they should run, which databases or other bindings they need, and any existing provider projects/domains to retain. Use known project configuration and existing authorized credentials; ask only for missing destination or access details. Do not deploy every local service. Package publishing is separate from application deployment.

For Terraform-managed services, write **`.arcnet/services.json`**, a map of service names to Arc module blocks. Use `cloud-run-web` for HTTP containers, `vercel-static` for Vercel sites, and the relevant database/storage binding modules from the README. Supply explicit paths, domains and environment keys. Place a backend Dockerfile at **`.arcnet/Dockerfile`**; multiple containers can use `.arcnet/<service>.Dockerfile`. Set each block's `dockerfile` to that repo-relative path. Docker builds use the **repo root** as context: `COPY` instructions refer to app/workspace paths from there. Build the actual app and make it listen on the configured port with the configured health endpoint. Do not invent a generic Dockerfile that cannot build the target workspace.

For a project containing only static Vercel sites, the current implementation uses `arcnet.vercel.json` instead; follow the [Vercel adapter instructions](VERCEL.md). The installer selects that adapter automatically. It requires explicit account and project identities, build commands, static output paths and routing. Do not use it for SSR/functions. Hello-world's `apps/web` is a static Vite example; its current docs app uses SSR and is not a static deployment example.

**Current boundary:** existing Vercel project references cannot yet be combined with Terraform services through this installer. The Terraform Vercel module creates/manages projects. Do not recreate an existing site or claim mixed adoption works; report the specific unsupported combination. The setup guide does not remove this engine limitation.

## Obtain the installer and generate target files

Do not assume Stackforge exists inside the target repo or at a particular home directory. From the **target repository root**, fetch the authoring tools into a temporary directory outside the project:

```sh
arcnetSource="$(mktemp -d)/stackforge"
git clone --depth 1 https://github.com/mp-lb/stackforge.git "$arcnetSource"
git -C "$arcnetSource" rev-parse HEAD
npx -y pnpm@10.11.0 -C "$arcnetSource/arcnet" install --frozen-lockfile
```

Record the source commit in the target's deployment notes. Read the downloaded README/templates before running them. Node 22+ is required; the target must have an exact pnpm `packageManager` and a committed `pnpm-lock.yaml`.

Replace `<project-slug>` with `project:` from the target's `zap.yaml`. The Terraform path reads the GitHub repository from `origin`; pass `--repository owner/repo` if needed. Preview, inspect, then generate:

```sh
node "$arcnetSource/arcnet/setup.mjs" <project-slug> --dry-run
node "$arcnetSource/arcnet/setup.mjs" <project-slug>
```

The installer preserves local configuration and refuses conflicting deployment files. Do not bypass that by deleting existing files. Review/adapt an existing installation explicitly; rerunning setup is not an upgrade mechanism.

Terraform setup adds `.arcnet/` runtime/configuration files and `.github/workflows/deploy-arc.yaml`, and appends `deploy:` to `zap.yaml`. Vercel-only setup adds a smaller `.arcnet/` runtime and the same workflow path, leaving `zap.yaml` unchanged. No root npm deployment scripts are needed. The target owns the generated files; the temporary source checkout is not a runtime dependency. Keep credentials and Terraform state out of Git.

## Validate and enable deployment

For Terraform, install the isolated deployment dependencies and check config:

```sh
pnpm -C .arcnet install --ignore-workspace --frozen-lockfile
node .arcnet/run.mjs check
```

For Vercel-only, no deployment dependency install is needed; run the same `node .arcnet/run.mjs check`. Validate the selected app builds and routing or container behavior using the project's normal checks. Offline checks do not prove provider access or a live deployment. Terraform `plan` contacts providers; the Vercel adapter's `plan` is offline.

Complete the selected adapter's documented provider setup and first deployment within the user's authorized scope. Configure GitHub's `arcnet-production` environment and the required credentials through the project's existing secret mechanism. Resolve network placeholders and cloud-authentication settings where applicable. Enable `approved` in `.arcnet/project.json` only when those settings and the production trigger are ready. Explicit Vercel project creation, when needed, is a separate initial step described in the adapter guide.

Commit the reviewed deployment files. After onboarding, pushes to main run the workflow and deploy the selected services. When deployment is authorized, verify the actual Actions run and service health; otherwise report precisely which setup or access inputs remain. Distinguish **files installed**, **CI enabled**, and **live deployment verified** rather than claiming installation alone makes the app live.

Add a short deployment section to the target README linking `.arcnet/` and the workflow, listing the selected services, commands and remaining prerequisites.
