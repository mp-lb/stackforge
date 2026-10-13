# ArcNet setup guide

This guide onboards a project into an existing environment. Starting a new company/network? Follow [environment setup](environment/setup.md) first.

Use this guide to add ArcNet deployment to an existing, locally validated project. **FSS Stack is not required.** ArcNet is MAP Lab's deployment conventions and onboarding around Zap Arc, the deployment engine in Zapper; the static Vercel adapter uses Vercel directly.

A `zap.yaml` alone is not sufficient for the current installer. It also requires Node 22+, a pnpm project with an exact `packageManager` and committed lockfile, a GitHub repository, and explicit deployment targets/build instructions. It does not require FSS Stack packages, scaffolding or application architecture. Projects using other package managers need installer/workflow adaptation; they are not supported unchanged merely because they have a Zap file.

Read the [ArcNet README and target file tree](README.md) for the actual files and supported targets. First-deployment requirements are detailed below. The [hello-world reference project](https://github.com/mp-lb/stackforge/tree/main/helloworld) provides example project details. Use the target project's real service names, package names and build outputs, not assumed `backend` or `frontend` names.

## Inspect and select

Read `zap.yaml`, workspace packages, build scripts and existing workflows. Identify which apps should deploy, where they should run, which databases or other bindings they need, and any existing provider projects/domains to retain. Use known project configuration and existing authorized credentials; ask only for missing destination or access details. Do not deploy every local service. Package publishing is separate from application deployment.

For Terraform-managed services, write **`.arcnet/services.json`**, a map of service names to Arc module blocks. Use `cloud-run-web` for HTTP containers, `vercel-static` for Vercel sites, and the relevant database/storage binding modules from the README. Supply explicit paths, domains and environment keys. Place a backend Dockerfile at **`.arcnet/Dockerfile`**; multiple containers can use `.arcnet/<service>.Dockerfile`. Set each block's `dockerfile` to that repo-relative path. Docker builds use the **repo root** as context: `COPY` instructions refer to app/workspace paths from there. Build the actual app and make it listen on the configured port with the configured health endpoint. Do not invent a generic Dockerfile that cannot build the target workspace.

For a project containing only static Vercel sites, the current implementation uses `.arcnet/vercel.json` instead; follow the [Vercel adapter instructions](#vercel-adapter-details). The installer selects that adapter automatically. It requires explicit account and project identities, build commands, static output paths and routing. Do not use it for SSR/functions. Hello-world's `apps/web` is a static Vite example; its current docs app uses SSR and is not a static deployment example.

**Current boundary:** existing Vercel project references cannot yet be combined with Terraform services through this installer. The Terraform Vercel module creates/manages projects. Do not recreate an existing site or claim mixed adoption works; report the specific unsupported combination. The setup guide does not remove this engine limitation.

## Install and validate

The TypeScript package is implemented in tools. Its initial npm publication is currently blocked by registry authentication; the `0.1.0` install commands below become available once that release succeeds.

From the **target repository root**, preview and install the published CLI configuration. No Stackforge checkout is needed:

```sh
pnpm dlx @mp-lb/arcnet@0.1.0 setup <project-slug> --dry-run
pnpm dlx @mp-lb/arcnet@0.1.0 setup <project-slug>
pnpm install
pnpm exec arcnet check
```

The slug must match `project:` in `zap.yaml`. Setup pins its own package version in your existing root `package.json`; `pnpm install` updates the application lockfile. Commit both. The [command reference](https://github.com/mp-lb/tools/blob/main/packages/arcnet/docs/public/commands.md) describes overrides and other commands.

Setup preserves local configuration and refuses conflicting deployment files. Rerunning it is not an upgrade mechanism. It never contacts providers or provisions resources; deployment starts disabled.

Complete the selected profile's provider setup and first deployment within the user's authorized scope. Configure GitHub's `arcnet-production` environment and credentials through the project's secret mechanism. Resolve network placeholders and cloud authentication where applicable. Enable `approved` in `.arcnet/project.json` only when the destination and production trigger are ready. Explicit Vercel project creation remains a separate initial step.

Validate app builds and container behavior using the project's normal checks. `check` is offline; Terraform `plan` contacts providers, while static Vercel `plan` is offline. Installation alone does not prove live deployment. After onboarding, main pushes run the workflow. Verify Actions and service health when deployment is authorized.

Keep deployment notes under `.arcnet/`, with only a short pointer in the target README.

## Shared services: intended model

MongoDB sharing is implemented. Shared Redis and shared Bull hosting are planned, not current installer capabilities. The current `upstash-redis` module creates a Redis database per project; `gce-worker` creates a VM for each selected worker service. Keep those facts separate from the intended shared model when onboarding a project.

The network operator provisions the shared MongoDB cluster, Redis instance and Bull worker host/pool once. Project Terraform should bind to those existing resources rather than create or destroy the shared instances. Bindings can still provision a project-specific database user or other access rules; MongoDB already works this way. Shared Redis credentials and access-rule provisioning remain to be implemented.

Each consuming app needs its connection URL, a stable project namespace, and credentials restricted to that namespace. Namespace allocation must avoid collisions across projects and environments. For example, a future hello-world production binding could use `hello-world:production` for Redis keys and Bull queues; this is a proposed convention, not an implemented configuration key. Producers and workers must use the same queue namespace, including related job metadata. MongoDB currently defaults its database name to the project slug and scopes the database user to that database; additional database grants must be explicit.

A namespace prevents naming collisions; it is not by itself an authorization boundary. The shared design must enforce per-project data access and keep each project's worker code, credentials and resource limits separate. Bull names the background-job capability: projects contribute their own worker processes/containers to shared hosting, each consuming only its own queues. A connection URL and namespace configure queue access, but onboarding must also register/deploy the project's worker image or code. The shared host must already exist; there is no implemented pool registration/deployment mechanism yet.

## The pieces: files you add to a project

The [TypeScript package](https://github.com/mp-lb/tools/tree/main/packages/arcnet) owns the implementation. Its [templates](https://github.com/mp-lb/tools/tree/main/packages/arcnet/templates) contain the workflows, network defaults and Vercel module. Only configuration and the selected workflow are installed into the project.

| Project file | Purpose |
| --- | --- |
| `.arcnet/services.json` | Your Terraform service selection, including domains, builds and Dockerfile paths. |
| `.arcnet/vercel.json` | Alternative input for static Vercel project references. |
| `.arcnet/Dockerfile` | Your container build; use one per container when needed. |
| `.arcnet/project.json` | Generated identity, selected services, approval and CI authentication. |
| `.arcnet/network.yaml` | Generated environment/network snapshot for Terraform deployments. Review before use. |
| `.arcnet/env.production.json` | Optional public app environment values. Omit when unused. |
| `.arcnet/.gitignore` | Generated exclusions for local secret/state files or temporary receipt files. |
| `.github/workflows/deploy-arc.yaml` | Generated delivery workflow calling the installed CLI. |
| `zap.yaml` | Existing file; Terraform setup adds the deployment declaration. |
| Root `package.json` and `pnpm-lock.yaml` | Existing files; pin the CLI alongside the application's dependencies. |

`services.json` and `vercel.json` are setup inputs, not two inputs required together. After setup, `zap.yaml` owns Terraform service declarations and `project.json` owns static Vercel references. Keep retained input files consistent with intentional configuration changes.

## Where ArcNet lives

[Tools](https://github.com/mp-lb/tools/tree/main/packages/arcnet) owns the CLI, validation, installers, workflows and bundled Vercel module. Stackforge owns these onboarding guides and the FSS Stack entry point. Zapper supplies the pinned Terraform engine (`@mp-lb/zapper 0.21.0`) and other modules. The public shell stays deployment-free.

## Upgrade an existing copied installation

Audit first and compare local runner/module/workflow modifications against the package. Install `@mp-lb/arcnet` at an exact reviewed version in the root manifest and update the root lockfile. Replace workflow runner calls with `pnpm exec arcnet` using the package's matching workflow template; preserve project-specific credentials and build requirements.

For bundled Vercel Terraform services, change the module reference in `zap.yaml` from `./.arcnet/modules/vercel-static` to `./node_modules/@mp-lb/arcnet/templates/vercel-static`. This changes the local module source, not the service key or remote identity. Review a Terraform plan before applying.

Once the packaged CLI passes checks and every consumer has moved, remove the old `.arcnet/run.mjs`, deployment-only `package.json`, `pnpm-lock.yaml`, `.npmrc`, `node_modules/`, `operator.json` and unmodified bundled module copies. Preserve custom modules and actual project configuration. Supply operator tokens through the environment: the CLI disables the engine's machine-global credential fallback using a temporary configuration that it removes afterward. Do not delete a credentials source until its consumers are accounted for. This is a reviewed migration, not something setup silently does.

## Choose the deployment profile

- **Existing Vercel landing/docs or new static sites:** use the [Vercel-only profile](#vercel-adapter-details). It has explicit existing/new project modes and no GCP/WIF/Terraform dependencies.
- **Terraform-managed infrastructure:** use the original profile below.

## Install once, then set up Terraform-managed infrastructure

Prerequisites for generation: Node 22+, a pinned pnpm version, a GitHub repository with `zap.yaml`, `package.json` with an exact `packageManager`, and a committed `pnpm-lock.yaml`. The default service is `backend`; its `.arcnet/Dockerfile` must already exist, listen on the configured port (8080 by default), and serve `/health`. Setup does not invent an application's image build or run a cloud command.

From the target repository root:

```sh
pnpm dlx @mp-lb/arcnet@0.1.0 setup my-project
```

Replace `my-project` with the `project:` slug in `zap.yaml`. GitHub owner/repo is read from `origin`; use `--repository owner/repo` when no GitHub origin exists. Use `--dry-run` for a read-only preview. `--service` and `--dockerfile` override the default backend name/path (`backend` and `.arcnet/Dockerfile`). An existing root `Dockerfile` is accepted as a compatibility fallback. Docker builds use the repository root as their context, so `COPY` paths stay relative to the repo. Slugs are lowercase, start with a letter and have at most 23 characters, fitting the `arcnet-<slug>` GCP project convention.

For a whole project, commit **`.arcnet/services.json`** first. The same one-command setup automatically reads it. It is a map of service names to Arc service blocks; `--services path.json` selects a different file. The legacy root `arcnet.services.json` remains supported; if both files exist, select one explicitly. No services are auto-discovered for deployment. See [the static-sites example](https://github.com/mp-lb/tools/blob/main/packages/arcnet/examples/static-sites.services.json). That example selects hello-world’s web app and uses a placeholder domain. Replace it with an approved domain before deployment.

| Selection | Existing module / behavior |
| --- | --- |
| HTTP backend | `cloud-run-web`: Docker → Artifact Registry → public Cloud Run |
| Static Vite frontend or prerendered docs | `vercel-static`: explicit build and output-directory upload |
| Framework frontend/docs | `vercel-static`: `remote-build: true`, `params.framework`, `params.root-directory`; Vercel CLI builds locally then uploads prebuilt output |
| Background container | `gce-worker`: GCE VM; review ongoing compute cost and region/zone |
| Shared MongoDB | `shared-mongo-atlas`: database-scoped user on an existing cluster |
| Per-project Redis / storage | `upstash-redis`, `aws-s3`: create separate project resources |

**Qualification boundary:** the table describes existing Terraform modules, not freshly qualified live deployment shapes. This change validates the Vercel-only adapter with local fixtures; it does not requalify worker/database/storage architecture. The separate infrastructure review flags deprecated `gce-container-declaration` in the worker module and bucket-wide state Storage Admin grants. Those remain planned work; no worker, database-account, DNS or IAM changes are part of this implementation.

MyShop is local-only: its service name and references in selected blocks are rejected. Publishing the backend library remains a separate release workflow. Advanced project modules (budgets, proxies) still use Arc's existing `deploy.project` schema after setup; this installer does not recreate the engine.

## Files and checks

Setup appends `deploy:` to `zap.yaml`, preserving local services/comments, and adds `.arcnet/` plus `.github/workflows/deploy-arc.yaml`. Existing deployment blocks or conflicting files stop setup before writes. Identical reruns preserve all edits; incomplete installations fail with a restore instruction. Reruns are not upgrades: review and update committed files explicitly.

The target owns its network snapshot, service definitions, optional public environment JSON and approval/WIF settings. Shared executable code and modules come from the pinned package. The [network template](https://github.com/mp-lb/tools/tree/main/packages/arcnet/templates/network.yaml) replaces private billing/Atlas identifiers with `REPLACE_` placeholders. Setup reads an optional target-owned `arcnet.network.yaml`; otherwise it copies the template. Review and fill `.arcnet/network.yaml` before planning. The CLI rejects remaining placeholders. Review repository visibility before committing private network facts.

```sh
pnpm install
pnpm exec arcnet check
```

The CLI and app share the root package manifest, lockfile and pinned pnpm version. `check` is offline: it validates config, selected services and image paths. It does not build images, authenticate, plan Terraform or prove deployment.

Optionally keep public values in `.arcnet/env.production.json`, secret app values in `ARCNET_ENV_JSON` (a JSON object of strings), and whitelist service keys under `env:` in `zap.yaml`. Operator tokens come from environment variables. No persistent operator pointer file is needed. Do not commit credentials, state, plans, ADC or app secrets.

## Before the first live deployment

These are human/operator prerequisites, not actions performed by setup. No provisioning or permission change is authorized merely by generating the files.

1. Approve the exact services, billing account, domains, spend and permissions. Review `.arcnet/network.yaml`: this network uses `asia-southeast1`, project `arcnet-<slug>`, a shared GCS state bucket with `terraform/state/<slug>`, and `mp-lb.dev` DNS. A new network needs its own bootstrap; do not bootstrap the existing network again. Check GCP project availability/quota and billing permissions. [GCP project prerequisites](https://cloud.google.com/resource-manager/docs/creating-managing-projects).
2. Install Terraform **1.15.6**, gcloud and (for containers) Docker. Authenticate the approved operator with gcloud and ADC, then configure Docker for the network registry. Confirm access to the state bucket and the permissions for project creation/billing/APIs/IAM. No service-account key file is needed.
3. Obtain only the provider credentials selected modules require. Cloudflare needs zone-read and DNS-edit permissions on the selected zone; Vercel needs the correct account access; bindings need their respective Atlas/Upstash/AWS credentials. Do not populate CI secrets until specifically approved.
4. For Cloud Run domains, verify the **base domain** using Search Console. Keep its verification DNS record, and add the deploying service account as a verified owner when created. Verification belongs to an identity, not just a project. [Cloud Run ownership](https://cloud.google.com/run/docs/mapping-custom-domains#add-verified-owners), [Search Console DNS verification](https://support.google.com/webmasters/answer/9008080).
5. Review DNS ownership/records before applying: current modules can overwrite matching records. Cloud Run's module records only the first returned DNS record, so apex/multiple-record mappings require module review. Use DNS-only records for this existing route. [Cloudflare proxy behavior](https://developers.cloudflare.com/dns/proxy-status/). For Vercel, compare its currently requested records and domain verification with the module's fixed A/CNAME values; do not blindly reuse those values or transfer an existing site's domain. [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
6. After approval, run `pnpm exec arcnet plan` using the operator credentials and app env pool. This contacts cloud APIs and state; it is not the dry run. A brand-new project's first plan can fail while APIs/resources do not yet exist. Do not turn that failure into permission to apply. Review staged bootstrap with the operator. Arc deploy applies project modules first, then builds/pushes images, then applies services; a later failure can leave partial infrastructure. It is not an atomic transaction.
7. Only after that approval, set `approved: true` locally and run `pnpm exec arcnet deploy` for the first deployment. This creates project, registry and GitHub WIF trust. Populate `workloadIdentityProvider` using the actual numeric project number and verify `serviceAccount`. Do not commit the approval until CI prerequisites and the live smoke test are complete.
8. Configure GitHub's `arcnet-production` environment, main-branch restriction, protection rules and selected provider/app secrets. The generated workflow requests OIDC only in the deploy job and serializes deploys without cancelling an in-progress apply. [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments). Commit reviewed configuration to main. Subsequent pushes run Arc. Verify the actual Actions run, service health, TLS and DNS; a generated workflow alone is not evidence of a successful deployment.

The existing `github-ci` module grants project Editor, bucket-scoped Storage Admin, quota-project service usage and billing-cost permissions. Its trust is repository-name scoped, not branch scoped. Review effective refresh/apply permissions and protect the environment before enabling it. Google's current [WIF guidance](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) recommends numeric repository/owner IDs to avoid name-reuse risk; this extraction does not silently change existing IAM policy.

**Architecture limits:** Google's current docs mark Cloud Run domain mappings as preview and not recommended for production; Singapore is a supported mapping region. Choosing a load balancer instead requires a separate cost/architecture approval. The workflow pins JS tools and Terraform; upstream Terraform provider constraints remain ranges and Arc creates a fresh temporary working directory, so provider selections are not yet locked across deployments. Vercel's existing hook assumes the token's personal user account, not team-scoped project adoption. These are deployment review items, not claims that this extraction fixed them. Official prerequisites were checked on 2026-10-11.

This repository owns sanitized configuration and onboarding. Keep real network identifiers in the appropriate private configuration and operator credentials outside Git.

## Maintainer validation

Development and release happen in the tools repo under `packages/arcnet`. Run its typecheck, tests and build there. Tests cover dry runs, conflict handling, reruns, package layout, Vercel identity checks and published-engine Terraform rendering without applying infrastructure. The package release follows the tools repo’s Changesets workflow.

## Vercel adapter details

This profile implements existing-project references and explicit new-project creation without GCP, WIF, Terraform, DNS ownership or changes to project settings. It uses Vercel's documented REST API and pinned CLI `63.1.2`; no unpublished Zapper API or package release is needed. The Terraform-managed profile remains separate.

### One-command setup

In the target repo, add `.arcnet/vercel.json`: start from [the static-sites example](https://github.com/mp-lb/tools/blob/main/packages/arcnet/examples/static-sites.vercel.json), replace the repository, account and web project identifiers with actual values. It selects only the hello-world reference project’s Vite web app; choose existing/new mode for your destination. The example rejects its `REPLACE` values rather than guessing a live target.

From the target repository root:

```sh
pnpm dlx @mp-lb/arcnet@0.1.0 setup hello-world
```

The slug must match `zap.yaml`. `--dry-run` writes nothing; `--vercel path.json` selects another input file. Mixed Terraform/Vercel profiles and existing workflow conflicts fail without overwrites. No backend Dockerfile is needed. Setup leaves `zap.yaml` unchanged and generates `.arcnet/project.json`, an ignore file and `.github/workflows/deploy-arc.yaml`. It pins the CLI in the root manifest; run `pnpm install` and commit the updated lockfile. The legacy root `arcnet.vercel.json` is still accepted, but if both inputs exist you must select one explicitly.

```sh
pnpm exec arcnet plan
```

`plan` and `check` are **offline**. They render selected identities, build commands, static output and routing; no provider queries or mutations occur. This is an ArcNet deployment plan, not a Terraform plan. The plan explicitly records that project settings and DNS are not owned. Repeated setup preserves config edits and creation receipts; conflicting identities fail for review. After generation, `.arcnet/project.json` is authoritative. Keep the input in sync when intentionally changing the selection; setup is not an upgrade command.

### Existing project references

Each site needs `mode: existing`, exact `projectId` and `projectName`; the shared `account` has explicit `type: team|personal` and its exact ID. Different accounts require separate invocations/checkouts. The runner never guesses the current CLI account. Team REST requests carry `teamId`; every fetched project's `accountId`, ID and name must match. Personal references are checked against the same explicit owner ID. Vercel response bodies and secret values are not printed.

`inspect` is a read-only remote identity check, requiring an already-approved `VERCEL_TOKEN`; it performs no settings, domain or environment writes. Existing mode never calls the project-creation endpoint.

Build commands are explicit pnpm argument arrays. Only `output` is copied into a temporary `.vercel/output/static`; no repository source, `.git`, environment files, symlinks or MyShop application directory is uploaded. `outputConfig` is an explicit static Build Output API v3 config. Review its routing against the current site: it controls the new deployment's routes, while leaving provider project settings unchanged. The hello-world example uses a filesystem-first SPA fallback; live route verification is still required. The profile supports static sites, not SSR/functions.

After target approval, set `approved: true` locally for the preview; commit that flag only after approving the production trigger. `preview` uploads prebuilt output without `--prod`; `deploy` creates a production deployment. Both verify **every** reference before any build/upload, stage all selected sites, and use explicit project/organization IDs in isolated local Vercel links. No Vercel PATCH/DELETE, domain, DNS or env-management API calls exist in this adapter. Deployment is not atomic across sites; a later failed upload leaves earlier successful deployments in place and is reported without automatic retries.

Builds do not receive the deployment token or other `VERCEL_*` variables. Provide any genuinely needed public/build values explicitly in your own build setup; prebuilt output does not inherit Vercel's remote build/system environment.

### New projects: separate operator step

A new site uses `mode: new`, `projectName`, and `creationApproved: false`, with no project ID. It is visible in the offline plan but cannot be deployed by CI. Only after specific creation/cost approval, set that site's `creationApproved` to true and run locally:

```sh
pnpm exec arcnet create web
```

This is a **mutating command**, not part of setup or the offline checks. It first checks the scoped name for conflicts. Personal-account creation also verifies the token's user ID before the POST. It creates only a named static project with `framework: null`: no Git link, custom domain, DNS, env or paid feature is requested. Existing names fail rather than being silently adopted. A network failure is not automatically retried; inspect the account before retrying an uncertain outcome.

A successful response records the exact ID locally, changes the site to existing mode and resets deployment approval to false. Review/commit the reference before CI. Rerunning `create` on that reference only verifies identity. A failed local receipt write after successful creation requires reconciling the named project; never infer failure means the remote project was not created. Creation is blocked in GitHub Actions. No project was created while implementing or testing this.

### GitHub pushes and remaining inputs

The generated workflow validates offline on pushes to main. Deployment stays skipped until approved and every site is an existing reference. It then uses the target's own pinned pnpm, builds only selected sites, and uploads with `VERCEL_TOKEN` from the protected `arcnet-production` environment. No OIDC, GCP, Terraform, Cloudflare token or new state bucket is required.

The runner's `VERCEL_TOKEN` is a process interface. Projects with an existing secret loader can export the selected token to the runner through that loader; the generic workflow does not install encrypted-secret integration.

Use a dedicated hostname as the docs location convention, initially the verified provider hostname. The docs app must build and deploy without a landing app, and a landing app must build without docs. A cross-app link is optional and should be derived from the verified hostname during onboarding. Custom docs.<project-domain> is optional and requires separately authorized ownership/DNS verification. A single location-to-project orchestration command, standard build/output/routing defaults, and reusable encrypted-source workflow integration remain separately scoped tooling gaps; this CLI does not yet claim to automate those steps from a URL alone.

### Ownership/import is separate

Reference mode does not import Terraform state. If Terraform should later own project settings or domains, plan a separate reviewed migration. No automated import command is implemented or claimed verified. The existing Terraform profile is still for explicitly managed infrastructure.

### Evidence and public interfaces

Local tests use fixtures, an injected HTTP transport and intercepted commands; they cover account/team scope, new/existing modes, no-mutation reference behavior, conflicts, idempotence, disabled CI creation, static output isolation and routing artifacts. The exact CLI setup and offline plan run on disposable directories. Interfaces checked on 2026-10-11: [project lookup](https://vercel.com/docs/rest-api/projects/find-a-project-by-id-or-name), [project creation](https://vercel.com/docs/rest-api/projects/create-a-new-project), [prebuilt deploy](https://vercel.com/docs/cli/deploy#prebuilt), [project selection](https://vercel.com/docs/cli/global-options#project), [Build Output API](https://vercel.com/docs/build-output-api/configuration).
