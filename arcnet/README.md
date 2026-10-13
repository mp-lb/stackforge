# ArcNet onboarding

Apply the FSS Stack [ArcNet extension](../fssstack/extensions/arcnet.md) to add this
capability to a validated project.

## What gets added to your project?

For **a landing page, a frontend, a backend and a database**, the current
Terraform installer produces the tree below. Assume both websites use Vercel,
the backend uses Cloud Run, and the database is a project-specific binding on
an existing shared MongoDB Atlas cluster.

```text
your existing repo/
├── .github/workflows/
│   └── deploy-arc.yaml              NEW — one deployment workflow for all services
├── .arcnet/
│   ├── services.json                YOU ADD — selection of the four services
│   ├── Dockerfile                   YOU SUPPLY — builds/runs the backend container
│   ├── run.mjs                      NEW — runs checks, plans and deployment
│   ├── project.json                 NEW — repo identity, service list, approval and CI auth
│   ├── network.yaml                 NEW — regions, state storage, providers and shared resources
│   ├── env.production.json          NEW — public app environment values
│   ├── operator.json                NEW — project-local credentials-file pointer
│   ├── package.json                 NEW — deployment tool dependencies
│   ├── pnpm-lock.yaml               NEW — exact deployment dependency versions
│   ├── .npmrc                       NEW — isolates these dependencies from your app workspace
│   ├── .gitignore                   NEW — excludes credentials, state and installed tools
│   └── modules/vercel-static/
│       ├── main.tf                  NEW — Vercel project/domain/environment resources
│       └── module.yaml              NEW — Vercel build/upload instructions
├── zap.yaml                        MODIFIED — setup adds the deploy: declaration
├── package.json                    EXISTING — must already pin the pnpm version
└── pnpm-lock.yaml                   EXISTING — your application's dependency lockfile
```

**That is one workflow and one `.arcnet/` directory for the whole project.**
There is no deployment folder per app and no separate database workflow.
Both Vercel sites reuse the same two module files. Backend and database modules
come from the pinned Zapper dependency rather than being copied into your repo.
The Dockerfile can live elsewhere if its path is specified in the service input.

The four entries in `.arcnet/services.json` describe each service's module and
settings: Vercel build commands/output paths/domains for the two sites, a
Dockerfile/domain/environment selection for the backend, and the Atlas binding
for the database. Setup turns that input into `deploy.services` in `zap.yaml`
and adds the GCP project, image registry and GitHub authentication resources
under `deploy.project`. After setup, the runner reads the generated configuration;
it does not read `.arcnet/services.json` on each deployment.

The [file-by-file source inventory below](#the-pieces-files-you-add-to-a-project)
links to every copied template and the code that generates the other files.
You do **not** copy this repo's `templates/` directory or installer into your
project. Once generated, the project and CI run from their own committed files
and installed tools; they do not need the Stackforge checkout.

To make those files deploy, configure the destination/provider access and the
GitHub `arcnet-production` environment, complete the first-deployment setup,
and enable deployment in `.arcnet/project.json`. Then the normal flow is:
**push to main → GitHub workflow → `.arcnet/run.mjs` → build and deploy the
selected services**. Secret credentials are external inputs, not extra files
to commit. The Atlas binding uses an existing cluster; it does not create one.

**Current limitation:** this mixed-service path creates/manages Vercel projects.
It cannot simply attach an already-deployed Vercel landing page. Existing-project
references currently use the separate Vercel adapter, and the installer rejects
combining the two inputs. One installation process that freely combines those
references with a backend/database is the intended direction, not an implemented
capability. The smaller Vercel-only file set is listed below.

## The pieces: files you add to a project

The [templates](templates/) are the deployment files copied into a target repo.
The [setup script](setup.mjs) combines them with your project configuration and
generates the remaining files. You choose **one** of the two profiles below;
they use the same destination filenames but different runners and workflows.

ArcNet adds three things to an otherwise undeployed project: a declaration of
**what to deploy and where**, a **runner that performs the deployment**, and a
**GitHub Actions workflow that runs it on pushes to main**. Your application
still supplies its own build command and, for container services, Dockerfile.

Example project details come from the [hello-world reference project](../helloworld/README.md).
Both examples select its Vite app, `apps/web`, using package
`@hello-world/hello-world-web` and output `apps/web/dist`. Its docs app currently
uses server rendering and is not included in these static examples. Repository,
provider IDs and domains must be set for the actual deployment; these examples
do not represent a live deployment of hello-world.

### Static sites on Vercel

| Source in ArcNet | File in your project | What it does |
| --- | --- | --- |
| [Vercel input example](examples/static-sites.vercel.json) | `arcnet.vercel.json` (you customize it) | Selects sites, Vercel account/project identities, build commands, output folders and routing. |
| [Vercel setup](vercel-setup.mjs) | `.arcnet/project.json` (generated) | Stores those deployment settings plus approval state. This becomes the runner's authoritative configuration. |
| [Vercel runner](templates/vercel-run.mjs) | `.arcnet/run.mjs` | Checks configuration and project identities, builds the selected sites, and uploads their static output through Vercel. Also supports a separate explicit project-creation command. |
| [Vercel workflow](templates/deploy-vercel.yaml) | `.github/workflows/deploy-arc.yaml` | Checks configuration on main pushes; once enabled, installs app dependencies and runs the deployment with `VERCEL_TOKEN`. |
| [Vercel setup](vercel-setup.mjs) | `.arcnet/.gitignore` (generated) | Ignores the temporary project-configuration write file. |

This profile leaves `zap.yaml` and the root `package.json` unchanged. Setup
requires `zap.yaml` for the project name, an exact pnpm `packageManager` in
`package.json`, and `pnpm-lock.yaml`. The generated runner has no npm dependencies
of its own. It deploys static output directly to Vercel; it does not use
Terraform, provision GCP infrastructure, or manage DNS. See [Vercel setup](VERCEL.md).

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

The installer does not add dependencies or scripts to the root `package.json`;
it requires an existing exact pnpm `packageManager` and lockfile. Container
services need an application-specific Dockerfile, which ArcNet does not generate.

### From these files to a live deployment

1. **Describe the deployment.** Choose a profile and fill in its project/service
   input, build outputs or Dockerfiles, and destination settings.
2. **Generate the files.** Run [setup](setup.mjs) from the target repo. This writes
   the selected workflow, runner and configuration; it does not contact a cloud
   provider or deploy anything. Deployment starts disabled.
3. **Connect the destination.** Configure provider access and GitHub's
   `arcnet-production` environment. Vercel needs explicit project references
   (or separately created projects); Terraform needs the network, state backend
   and cloud permissions described below. Credentials are supplied outside Git.
4. **Validate and enable.** Check configuration, review the deployment, complete
   the profile's first-deployment steps, then commit the reviewed configuration
   and approval. Subsequent main pushes run the workflow, which calls the runner,
   which builds/uploads the app and, for Terraform, applies infrastructure.

The setup tools stay here in Stackforge; the generated files live in the target
repo and run there. FSS Stack is not required. The current installer does assume
a Zap project using pnpm and GitHub; the Terraform engine itself lives in Zapper.

## Where ArcNet lives

ArcNet's network configuration and onboarding live here. The Terraform engine
and modules remain in **Zapper**, pinned to published `@mp-lb/zapper
0.21.0`. This is an opt-in layer; the public FSS Stack shell stays deployment-free.
The static Vercel-only adapter uses public Vercel APIs/CLI directly.
MGR's existing installation, credentials and operator pointer are unchanged.

## Choose the deployment profile

- **Existing Vercel landing/docs or new static sites:** use the [Vercel-only profile](VERCEL.md). It has explicit existing/new project modes and no GCP/WIF/Terraform dependencies.
- **Terraform-managed infrastructure:** use the original profile below.

## Install once, then set up Terraform-managed infrastructure

Prerequisites for generation: Node 22+, pnpm 10.11.0 (for this tool), a GitHub
repository with `zap.yaml`, `package.json` with an exact `packageManager`, and a
committed `pnpm-lock.yaml`. The default service is `backend`; its `.arcnet/Dockerfile` must
already exist, listen on the configured port (8080 by default), and serve `/health`.
Setup does not invent an application's image build or run a cloud command.

From StackForge run `zap t arcnet-setup` (or `pnpm -C arcnet install --frozen-lockfile`). Then,
**from the target repository root**, the setup command is:

```sh
node ~/Work/stackforge/arcnet/setup.mjs my-project
```

Replace `my-project` with the `project:` slug in `zap.yaml`. GitHub owner/repo is
read from `origin`; use `--repository owner/repo` when no GitHub origin exists.
Use `--dry-run` for a read-only preview. `--service` and `--dockerfile` override
the default backend name/path (`backend` and `.arcnet/Dockerfile`). An existing
root `Dockerfile` is accepted as a compatibility fallback. Docker builds use the
repository root as their context, so `COPY` paths stay relative to the repo. Slugs are lowercase, start with a letter and have
at most 23 characters, fitting the `arcnet-<slug>` GCP project convention.

For a whole project, commit **`.arcnet/services.json`** first. The same one-command
setup automatically reads it. It is a map of service names to Arc service blocks;
`--services path.json` selects a different file. The legacy root
`arcnet.services.json` remains supported; if both files exist, select one explicitly. No services are auto-discovered
for deployment. See [the static-sites example](examples/static-sites.services.json).
That example selects hello-world’s web app and uses a placeholder domain.
Replace it with an approved domain before deployment.

| Selection | Existing module / behavior |
| --- | --- |
| HTTP backend | `cloud-run-web`: Docker → Artifact Registry → public Cloud Run |
| Static Vite frontend or prerendered docs | `vercel-static`: explicit build and output-directory upload |
| Framework frontend/docs | `vercel-static`: `remote-build: true`, `params.framework`, `params.root-directory`; Vercel CLI builds locally then uploads prebuilt output |
| Background container | `gce-worker`: GCE VM; review ongoing compute cost and region/zone |
| Shared database / Redis / storage | `shared-mongo-atlas`, `upstash-redis`, `aws-s3` bindings; opt in explicitly |

**Qualification boundary:** the table describes existing Terraform modules, not
freshly qualified live deployment shapes. This change validates the Vercel-only
adapter with local fixtures; it does not requalify worker/database/storage
architecture. The separate infrastructure review flags deprecated
`gce-container-declaration` in the worker module and bucket-wide state Storage
Admin grants. Those remain planned work; no worker, database-account, DNS or IAM
changes are part of this implementation.

MyShop is local-only: its service name and references in selected blocks are
rejected. Publishing the backend library remains a separate release workflow.
Advanced project modules (budgets, proxies) still use Arc's existing
`deploy.project` schema after setup; this installer does not recreate the engine.

## Files and checks

Setup appends `deploy:` to `zap.yaml`, preserving local services/comments, and
adds `.arcnet/` plus `.github/workflows/deploy-arc.yaml`. Existing deployment
blocks or conflicting files stop setup before writes. Identical reruns preserve
all edits; incomplete installations fail with a restore instruction. Reruns are
not upgrades: review and update committed files explicitly.

The target owns its network snapshot, service definitions, public environment
JSON, exact JS dependency lock, runner and approval/WIF settings. No MGR paths or
credentials are copied. Selected Vercel services receive a small local copy of
the upstream module with its CLI pinned to `63.1.2` (the only module change).
Unused provider settings are omitted. The committed network template preserves MGR conventions but replaces its real
billing/Atlas identifiers with `REPLACE_` placeholders because StackForge is
public. Setup reads an optional target-owned `arcnet.network.yaml`; otherwise it
copies this template. Review and fill the generated `.arcnet/network.yaml` before
planning; the runner rejects remaining placeholders. Never publish private
network facts without reviewing the target repository visibility.

```sh
pnpm -C .arcnet install --ignore-workspace --frozen-lockfile
node .arcnet/run.mjs check
```

The dependency installation is isolated from the target pnpm workspace. The
workflow installs the target's own pnpm version separately for app builds.
`check` is offline: it validates config, selected services and image paths. It
does not build images, authenticate, plan Terraform or prove deployment.

Keep public values in `.arcnet/env.production.json`, secret app values in the
`ARCNET_ENV_JSON` environment variable (a JSON object of strings), and whitelist
service keys under `env:` in `zap.yaml`. Operator tokens stay in environment
variables. `.arcnet/operator.json` avoids silently reading the MGR pointer; its
optional credentials file is ignored, but the runner requires environment tokens
for explicit preflight. Do not commit that file, state, plans, ADC or app secrets.

## Before the first live deployment

These are human/operator prerequisites, not actions performed by setup. No
provisioning or permission change is authorized merely by generating the files.

1. Approve the exact services, billing account, domains, spend and permissions.
   Review `.arcnet/network.yaml`: this network uses `asia-southeast1`, project
   `arcnet-<slug>`, a shared GCS state bucket with `terraform/state/<slug>`, and
   `mp-lb.dev` DNS. A new network needs its own bootstrap; do not bootstrap the
   existing network again. Check GCP project availability/quota and billing
   permissions. [GCP project prerequisites](https://cloud.google.com/resource-manager/docs/creating-managing-projects).
2. Install Terraform **1.15.6**, gcloud and (for containers) Docker. Authenticate
   the approved operator with gcloud and ADC, then configure Docker for the
   network registry. Confirm access to the state bucket and the permissions for
   project creation/billing/APIs/IAM. No service-account key file is needed.
3. Obtain only the provider credentials selected modules require. Cloudflare
   needs zone-read and DNS-edit permissions on the selected zone; Vercel needs
   the correct account access; bindings need their respective Atlas/Upstash/AWS
   credentials. Do not populate CI secrets until specifically approved.
4. For Cloud Run domains, verify the **base domain** using Search Console. Keep
   its verification DNS record, and add the deploying service account as a
   verified owner when created. Verification belongs to an identity, not just a
   project. [Cloud Run ownership](https://cloud.google.com/run/docs/mapping-custom-domains#add-verified-owners),
   [Search Console DNS verification](https://support.google.com/webmasters/answer/9008080).
5. Review DNS ownership/records before applying: current modules can overwrite
   matching records. Cloud Run's module records only the first returned DNS
   record, so apex/multiple-record mappings require module review. Use DNS-only
   records for this existing route. [Cloudflare proxy behavior](https://developers.cloudflare.com/dns/proxy-status/).
   For Vercel, compare its currently requested records and domain verification
   with the module's fixed A/CNAME values; do not blindly reuse those values or
   transfer an existing site's domain. [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
6. After approval, run `node .arcnet/run.mjs plan` using the operator credentials
   and app env pool. This contacts cloud APIs and state; it is not the dry run.
   A brand-new project's first plan can fail while APIs/resources do not yet
   exist. Do not turn that failure into permission to apply. Review staged
   bootstrap with the operator. Arc deploy applies project modules first, then
   builds/pushes images, then applies services; a later failure can leave partial
   infrastructure. It is not an atomic transaction.
7. Only after that approval, set `approved: true` locally and run
   `node .arcnet/run.mjs deploy` for the first deployment. This creates project,
   registry and GitHub WIF trust. Populate `workloadIdentityProvider` using the
   actual numeric project number and verify `serviceAccount`. Do not commit the
   approval until CI prerequisites and the live smoke test are complete.
8. Configure GitHub's `arcnet-production` environment, main-branch restriction,
   protection rules and selected provider/app secrets. The generated workflow
   requests OIDC only in the deploy job and serializes deploys without cancelling
   an in-progress apply. [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
   Commit reviewed configuration to main. Subsequent pushes run Arc. Verify the
   actual Actions run, service health, TLS and DNS; a generated workflow alone
   is not evidence of a successful deployment.

The existing `github-ci` module grants project Editor, bucket-scoped Storage
Admin, quota-project service usage and billing-cost permissions. Its trust is
repository-name scoped, not branch scoped. Review effective refresh/apply
permissions and protect the environment before enabling it. Google's current
[WIF guidance](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)
recommends numeric repository/owner IDs to avoid name-reuse risk; this extraction
does not silently change existing IAM policy.

**Architecture limits:** Google's current docs mark Cloud Run domain mappings as
preview and not recommended for production; Singapore is a supported mapping
region. Choosing a load balancer instead requires a separate cost/architecture
approval. The workflow pins JS tools and Terraform; upstream Terraform provider
constraints remain ranges and Arc creates a fresh temporary working directory,
so provider selections are not yet locked across deployments. Vercel's existing
hook assumes the token's personal user account, not team-scoped project adoption.
These are deployment review items, not claims that this extraction fixed them.
Official prerequisites were checked on 2026-10-11.

MGR migration remains additive: this repo owns the sanitized configuration
and onboarding; real identifiers, credentials and operator pointers remain in
MGR. Never move/delete the whole MGR folder or copy credentials into Git.

## Maintainer validation

Run `zap t arcnet-setup` and `zap t arcnet-test` from StackForge, through the shared heavy-job
queue when working alongside other agents. Tests exercise dry runs, safe failures,
reruns and published-engine Terraform rendering, including a multi-service
fixture; no Terraform apply, provider login or live deployment occurs. Root `zap t setup` now targets the existing `fssstack/shell/` with a frozen
lockfile. ArcNet onboarding remains independently reproducible with its scoped
setup task.
