# ArcNet setup guide

This guide onboards a project into an existing environment. Starting a new company/network? Follow [environment setup](environment/setup.md) first.

Use this guide to add ArcNet deployment to an existing, locally validated project. **FSS Stack is not required.** ArcNet is MAP Lab's deployment conventions and onboarding around Zap Arc, the deployment engine in Zapper; the static Vercel adapter uses Vercel directly.

A `zap.yaml` alone is not sufficient for the current installer. It also requires Node 22+, a pnpm project with an exact `packageManager` and committed lockfile, a GitHub repository, and explicit deployment targets/build instructions. It does not require FSS Stack packages, scaffolding or application architecture. Projects using other package managers need installer/workflow adaptation; they are not supported unchanged merely because they have a Zap file.

Read the [ArcNet README and target file tree](README.md) for the actual files and supported targets. First-deployment requirements are detailed below. The [hello-world reference project](https://github.com/mp-lb/stackforge/tree/main/helloworld) provides example project details. Use the target project's real service names, package names and build outputs, not assumed `backend` or `frontend` names.

## Inspect and select

Read `zap.yaml`, workspace packages, build scripts and existing workflows. Identify which apps should deploy, where they should run, which databases or other bindings they need, and any existing provider projects/domains to retain. Use known project configuration and existing authorized credentials; ask only for missing destination or access details. Do not deploy every local service. Package publishing is separate from application deployment.

For Terraform-managed services, write **`.arcnet/services.json`**, a map of service names to Arc module blocks. Use `cloud-run-web` for HTTP containers, `vercel-static` for Vercel sites, and the relevant database/storage binding modules from the README. Supply explicit paths, domains and environment keys. Place a backend Dockerfile at **`.arcnet/Dockerfile`**; multiple containers can use `.arcnet/<service>.Dockerfile`. Set each block's `dockerfile` to that repo-relative path. Docker builds use the **repo root** as context: `COPY` instructions refer to app/workspace paths from there. Build the actual app and make it listen on the configured port with the configured health endpoint. Do not invent a generic Dockerfile that cannot build the target workspace.

For a project containing only static Vercel sites, the current implementation uses `arcnet.vercel.json` instead; follow the [Vercel adapter instructions](#vercel-adapter-details). The installer selects that adapter automatically. It requires explicit account and project identities, build commands, static output paths and routing. Do not use it for SSR/functions. Hello-world's `apps/web` is a static Vite example; its current docs app uses SSR and is not a static deployment example.

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

## Shared services: intended model

MongoDB sharing is implemented. Shared Redis and shared Bull hosting are planned, not current installer capabilities. The current `upstash-redis` module creates a Redis database per project; `gce-worker` creates a VM for each selected worker service. Keep those facts separate from the intended shared model when onboarding a project.

The network operator provisions the shared MongoDB cluster, Redis instance and Bull worker host/pool once. Project Terraform should bind to those existing resources rather than create or destroy the shared instances. Bindings can still provision a project-specific database user or other access rules; MongoDB already works this way. Shared Redis credentials and access-rule provisioning remain to be implemented.

Each consuming app needs its connection URL, a stable project namespace, and credentials restricted to that namespace. Namespace allocation must avoid collisions across projects and environments. For example, a future hello-world production binding could use `hello-world:production` for Redis keys and Bull queues; this is a proposed convention, not an implemented configuration key. Producers and workers must use the same queue namespace, including related job metadata. MongoDB currently defaults its database name to the project slug and scopes the database user to that database; additional database grants must be explicit.

A namespace prevents naming collisions; it is not by itself an authorization boundary. The shared design must enforce per-project data access and keep each project's worker code, credentials and resource limits separate. Bull names the background-job capability: projects contribute their own worker processes/containers to shared hosting, each consuming only its own queues. A connection URL and namespace configure queue access, but onboarding must also register/deploy the project's worker image or code. The shared host must already exist; there is no implemented pool registration/deployment mechanism yet.

## The pieces: files you add to a project

The [templates](templates/) are the deployment files copied into a target repo. The [setup script](setup.mjs) combines them with your project configuration and generates the remaining files. You choose **one** of the two profiles below; they use the same destination filenames but different runners and workflows.

ArcNet adds three things to an otherwise undeployed project: a declaration of **what to deploy and where**, a **runner that performs the deployment**, and a **GitHub Actions workflow that runs it on pushes to main**. Your application still supplies its own build command and, for container services, Dockerfile.

Example project details come from the [hello-world reference project](../helloworld/README.md). Both examples select its Vite app, `apps/web`, using package `@hello-world/hello-world-web` and output `apps/web/dist`. Its docs app currently uses server rendering and is not included in these static examples. Repository, provider IDs and domains must be set for the actual deployment; these examples do not represent a live deployment of hello-world.

### Static sites on Vercel

| Source in ArcNet | File in your project | What it does |
| --- | --- | --- |
| [Vercel input example](examples/static-sites.vercel.json) | `arcnet.vercel.json` (you customize it) | Selects sites, Vercel account/project identities, build commands, output folders and routing. |
| [Vercel setup](vercel-setup.mjs) | `.arcnet/project.json` (generated) | Stores those deployment settings plus approval state. This becomes the runner's authoritative configuration. |
| [Vercel runner](templates/vercel-run.mjs) | `.arcnet/run.mjs` | Checks configuration and project identities, builds the selected sites, and uploads their static output through Vercel. Also supports a separate explicit project-creation command. |
| [Vercel workflow](templates/deploy-vercel.yaml) | `.github/workflows/deploy-arc.yaml` | Checks configuration on main pushes; once enabled, installs app dependencies and runs the deployment with `VERCEL_TOKEN`. |
| [Vercel setup](vercel-setup.mjs) | `.arcnet/.gitignore` (generated) | Ignores the temporary project-configuration write file. |

This profile leaves `zap.yaml` and the root `package.json` unchanged. Setup requires `zap.yaml` for the project name, an exact pnpm `packageManager` in `package.json`, and `pnpm-lock.yaml`. The generated runner has no npm dependencies of its own. It deploys static output directly to Vercel; it does not use Terraform, provision GCP infrastructure, or manage DNS. See [Vercel setup](#vercel-adapter-details).

### Terraform-managed infrastructure through Zap Arc

| Source in ArcNet | File/change in your project | What it does |
| --- | --- | --- |
| [Service-selection example](examples/static-sites.services.json) | Optional `.arcnet/services.json` (you customize it) | Selects the services and infrastructure modules to deploy. Without this file, setup defaults to one HTTP backend. |
| [Setup script](setup.mjs) | Adds `deploy:` to `zap.yaml` | Declares project infrastructure and selected services: modules, domains, Dockerfiles, build settings and allowed environment variables. |
| [Network template](network.yaml) | `.arcnet/network.yaml` | Supplies network conventions: cloud regions, naming, Terraform state location, providers and module defaults. Setup copies a target-owned `arcnet.network.yaml` instead if supplied. |
| [Setup script](setup.mjs) | `.arcnet/project.json` (generated) | Records project/repository identity, selected services, deployment approval and GitHub cloud-authentication settings. |
| [Terraform runner](templates/run.mjs) | `.arcnet/run.mjs` | Checks configuration, gathers environment values, and invokes Zap Arc to plan or deploy the selected infrastructure and services. |
| [Terraform workflow](templates/deploy-arc.yaml) | `.github/workflows/deploy-arc.yaml` | Checks configuration on main pushes; once enabled, authenticates to GCP, installs deployment/build tools and runs deployment. |
| [Package manifest](package.json) and [lockfile](pnpm-lock.yaml) | `.arcnet/package.json` and `.arcnet/pnpm-lock.yaml` | Pin Zapper's deployment engine and YAML dependency separately from your application. |
| [Setup script](setup.mjs) | `.arcnet/.npmrc` (generated) | Keeps deployment dependency installation separate from the target pnpm workspace. |
| [Setup script](setup.mjs) | `.arcnet/env.production.json` (generated empty) | Holds public application environment values; secret values come through `ARCNET_ENV_JSON`. |
| [Setup script](setup.mjs) | `.arcnet/operator.json` and `.arcnet/.gitignore` (generated) | Provides a project-local credentials-file pointer and excludes credentials, installed dependencies and Terraform state/plan files from Git. The runner requires operator tokens through the environment. |
| [Vercel Terraform module](templates/vercel-static/main.tf) and [module manifest](templates/vercel-static/module.yaml) | `.arcnet/modules/vercel-static/main.tf` and `module.yaml` (only when selected) | Defines the Vercel resource and its build/upload hook, with a pinned Vercel CLI. Other module implementations come with Zapper. |

The installer does not add dependencies or scripts to the root `package.json`; it requires an existing exact pnpm `packageManager` and lockfile. Container services need an application-specific Dockerfile, which ArcNet does not generate.

### From these files to a live deployment

1. **Describe the deployment.** Choose a profile and fill in its project/service input, build outputs or Dockerfiles, and destination settings.
2. **Generate the files.** Run [setup](setup.mjs) from the target repo. This writes the selected workflow, runner and configuration; it does not contact a cloud provider or deploy anything. Deployment starts disabled.
3. **Connect the destination.** Configure provider access and GitHub's `arcnet-production` environment. Vercel needs explicit project references (or separately created projects); Terraform needs the network, state backend and cloud permissions described below. Credentials are supplied outside Git.
4. **Validate and enable.** Check configuration, review the deployment, complete the profile's first-deployment steps, then commit the reviewed configuration and approval. Subsequent main pushes run the workflow, which calls the runner, which builds/uploads the app and, for Terraform, applies infrastructure.

The setup tools stay here in Stackforge; the generated files live in the target repo and run there. FSS Stack is not required. The current installer does assume a Zap project using pnpm and GitHub; the Terraform engine itself lives in Zapper.

## Where ArcNet lives

ArcNet's network configuration and onboarding live here. The Terraform engine and modules remain in **Zapper**, pinned to published `@mp-lb/zapper 0.21.0`. This is an opt-in layer; the public FSS Stack shell stays deployment-free. The static Vercel-only adapter uses public Vercel APIs/CLI directly. MGR's existing installation, credentials and operator pointer are unchanged.

## Choose the deployment profile

- **Existing Vercel landing/docs or new static sites:** use the [Vercel-only profile](#vercel-adapter-details). It has explicit existing/new project modes and no GCP/WIF/Terraform dependencies.
- **Terraform-managed infrastructure:** use the original profile below.

## Install once, then set up Terraform-managed infrastructure

Prerequisites for generation: Node 22+, pnpm 10.11.0 (for this tool), a GitHub repository with `zap.yaml`, `package.json` with an exact `packageManager`, and a committed `pnpm-lock.yaml`. The default service is `backend`; its `.arcnet/Dockerfile` must already exist, listen on the configured port (8080 by default), and serve `/health`. Setup does not invent an application's image build or run a cloud command.

From StackForge run `zap t arcnet-setup` (or `pnpm -C arcnet install --frozen-lockfile`). Then, **from the target repository root**, the setup command is:

```sh
node ~/Work/stackforge/arcnet/setup.mjs my-project
```

Replace `my-project` with the `project:` slug in `zap.yaml`. GitHub owner/repo is read from `origin`; use `--repository owner/repo` when no GitHub origin exists. Use `--dry-run` for a read-only preview. `--service` and `--dockerfile` override the default backend name/path (`backend` and `.arcnet/Dockerfile`). An existing root `Dockerfile` is accepted as a compatibility fallback. Docker builds use the repository root as their context, so `COPY` paths stay relative to the repo. Slugs are lowercase, start with a letter and have at most 23 characters, fitting the `arcnet-<slug>` GCP project convention.

For a whole project, commit **`.arcnet/services.json`** first. The same one-command setup automatically reads it. It is a map of service names to Arc service blocks; `--services path.json` selects a different file. The legacy root `arcnet.services.json` remains supported; if both files exist, select one explicitly. No services are auto-discovered for deployment. See [the static-sites example](examples/static-sites.services.json). That example selects hello-world’s web app and uses a placeholder domain. Replace it with an approved domain before deployment.

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

The target owns its network snapshot, service definitions, public environment JSON, exact JS dependency lock, runner and approval/WIF settings. No MGR paths or credentials are copied. Selected Vercel services receive a small local copy of the upstream module with its CLI pinned to `63.1.2` (the only module change). Unused provider settings are omitted. The committed network template preserves MGR conventions but replaces its real billing/Atlas identifiers with `REPLACE_` placeholders because StackForge is public. Setup reads an optional target-owned `arcnet.network.yaml`; otherwise it copies this template. Review and fill the generated `.arcnet/network.yaml` before planning; the runner rejects remaining placeholders. Never publish private network facts without reviewing the target repository visibility.

```sh
pnpm -C .arcnet install --ignore-workspace --frozen-lockfile
node .arcnet/run.mjs check
```

The dependency installation is isolated from the target pnpm workspace. The workflow installs the target's own pnpm version separately for app builds. `check` is offline: it validates config, selected services and image paths. It does not build images, authenticate, plan Terraform or prove deployment.

Keep public values in `.arcnet/env.production.json`, secret app values in the `ARCNET_ENV_JSON` environment variable (a JSON object of strings), and whitelist service keys under `env:` in `zap.yaml`. Operator tokens stay in environment variables. `.arcnet/operator.json` avoids silently reading the MGR pointer; its optional credentials file is ignored, but the runner requires environment tokens for explicit preflight. Do not commit that file, state, plans, ADC or app secrets.

## Before the first live deployment

These are human/operator prerequisites, not actions performed by setup. No provisioning or permission change is authorized merely by generating the files.

1. Approve the exact services, billing account, domains, spend and permissions. Review `.arcnet/network.yaml`: this network uses `asia-southeast1`, project `arcnet-<slug>`, a shared GCS state bucket with `terraform/state/<slug>`, and `mp-lb.dev` DNS. A new network needs its own bootstrap; do not bootstrap the existing network again. Check GCP project availability/quota and billing permissions. [GCP project prerequisites](https://cloud.google.com/resource-manager/docs/creating-managing-projects).
2. Install Terraform **1.15.6**, gcloud and (for containers) Docker. Authenticate the approved operator with gcloud and ADC, then configure Docker for the network registry. Confirm access to the state bucket and the permissions for project creation/billing/APIs/IAM. No service-account key file is needed.
3. Obtain only the provider credentials selected modules require. Cloudflare needs zone-read and DNS-edit permissions on the selected zone; Vercel needs the correct account access; bindings need their respective Atlas/Upstash/AWS credentials. Do not populate CI secrets until specifically approved.
4. For Cloud Run domains, verify the **base domain** using Search Console. Keep its verification DNS record, and add the deploying service account as a verified owner when created. Verification belongs to an identity, not just a project. [Cloud Run ownership](https://cloud.google.com/run/docs/mapping-custom-domains#add-verified-owners), [Search Console DNS verification](https://support.google.com/webmasters/answer/9008080).
5. Review DNS ownership/records before applying: current modules can overwrite matching records. Cloud Run's module records only the first returned DNS record, so apex/multiple-record mappings require module review. Use DNS-only records for this existing route. [Cloudflare proxy behavior](https://developers.cloudflare.com/dns/proxy-status/). For Vercel, compare its currently requested records and domain verification with the module's fixed A/CNAME values; do not blindly reuse those values or transfer an existing site's domain. [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
6. After approval, run `node .arcnet/run.mjs plan` using the operator credentials and app env pool. This contacts cloud APIs and state; it is not the dry run. A brand-new project's first plan can fail while APIs/resources do not yet exist. Do not turn that failure into permission to apply. Review staged bootstrap with the operator. Arc deploy applies project modules first, then builds/pushes images, then applies services; a later failure can leave partial infrastructure. It is not an atomic transaction.
7. Only after that approval, set `approved: true` locally and run `node .arcnet/run.mjs deploy` for the first deployment. This creates project, registry and GitHub WIF trust. Populate `workloadIdentityProvider` using the actual numeric project number and verify `serviceAccount`. Do not commit the approval until CI prerequisites and the live smoke test are complete.
8. Configure GitHub's `arcnet-production` environment, main-branch restriction, protection rules and selected provider/app secrets. The generated workflow requests OIDC only in the deploy job and serializes deploys without cancelling an in-progress apply. [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments). Commit reviewed configuration to main. Subsequent pushes run Arc. Verify the actual Actions run, service health, TLS and DNS; a generated workflow alone is not evidence of a successful deployment.

The existing `github-ci` module grants project Editor, bucket-scoped Storage Admin, quota-project service usage and billing-cost permissions. Its trust is repository-name scoped, not branch scoped. Review effective refresh/apply permissions and protect the environment before enabling it. Google's current [WIF guidance](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) recommends numeric repository/owner IDs to avoid name-reuse risk; this extraction does not silently change existing IAM policy.

**Architecture limits:** Google's current docs mark Cloud Run domain mappings as preview and not recommended for production; Singapore is a supported mapping region. Choosing a load balancer instead requires a separate cost/architecture approval. The workflow pins JS tools and Terraform; upstream Terraform provider constraints remain ranges and Arc creates a fresh temporary working directory, so provider selections are not yet locked across deployments. Vercel's existing hook assumes the token's personal user account, not team-scoped project adoption. These are deployment review items, not claims that this extraction fixed them. Official prerequisites were checked on 2026-10-11.

MGR migration remains additive: this repo owns the sanitized configuration and onboarding; real identifiers, credentials and operator pointers remain in MGR. Never move/delete the whole MGR folder or copy credentials into Git.

## Maintainer validation

Run `zap t arcnet-setup` and `zap t arcnet-test` from StackForge, through the shared heavy-job queue when working alongside other agents. Tests exercise dry runs, safe failures, reruns and published-engine Terraform rendering, including a multi-service fixture; no Terraform apply, provider login or live deployment occurs. Root `zap t setup` now targets the existing `fssstack/shell/` with a frozen lockfile. ArcNet onboarding remains independently reproducible with its scoped setup task.

## Vercel adapter details

This profile implements existing-project references and explicit new-project creation without GCP, WIF, Terraform, DNS ownership or changes to project settings. It uses Vercel's documented REST API and pinned CLI `63.1.2`; no unpublished Zapper API or package release is needed. The Terraform-managed profile remains separate.

### One-command setup

Install StackForge's authoring dependencies once with `zap t arcnet-setup`. In the target repo, commit `arcnet.vercel.json`: start from [the static-sites example](examples/static-sites.vercel.json), replace the repository, account and web project identifiers with actual values. It selects only the hello-world reference project’s Vite web app; choose existing/new mode for your destination. The example rejects its `REPLACE` values rather than guessing a live target.

From the target repository root:

```sh
node ~/Work/stackforge/arcnet/setup.mjs hello-world
```

The slug must match `zap.yaml`. `--dry-run` writes nothing; `--vercel path.json` selects another input file. Mixed Terraform/Vercel profiles and existing workflow conflicts fail without overwrites. No backend Dockerfile is needed. Setup leaves `zap.yaml` unchanged and writes only `.arcnet/project.json`, a dependency-free runner, an ignore file and `.github/workflows/deploy-arc.yaml`.

```sh
node .arcnet/run.mjs plan
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
node .arcnet/run.mjs create web
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
