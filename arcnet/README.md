# ArcNet onboarding

ArcNet's network configuration and onboarding live here. The deployment engine
and Terraform modules remain in **Zapper**, pinned to published `@mp-lb/zapper
0.21.0`. This is an opt-in layer; the public FSS Stack shell stays deployment-free.
MGR's existing installation, credentials and operator pointer are unchanged.

## Install once, then set up a project

Prerequisites for generation: Node 22+, pnpm 10.11.0 (for this tool), a GitHub
repository with `zap.yaml`, `package.json` with an exact `packageManager`, and a
committed `pnpm-lock.yaml`. The default service is `backend`; its Dockerfile must
already exist, listen on the configured port (8080 by default), and serve `/health`.
Setup does not invent an application's image build or run a cloud command.

From StackForge run `zap t arcnet-setup` (or `pnpm -C arcnet install --frozen-lockfile`). Then,
**from the target repository root**, the setup command is:

```sh
node ~/Work/stackforge/arcnet/setup.mjs inproduct
```

Replace `inproduct` with the `project:` slug in `zap.yaml`. GitHub owner/repo is
read from `origin`; use `--repository owner/repo` when no GitHub origin exists.
Use `--dry-run` for a read-only preview. `--service` and `--dockerfile` override
the default backend name/path. Slugs are lowercase, start with a letter and have
at most 23 characters, fitting the `arcnet-<slug>` GCP project convention.

For a whole project, commit **`arcnet.services.json`** first. The same one-command
setup automatically reads it. It is a map of service names to Arc service blocks;
`--services path.json` selects a different file. No services are auto-discovered
for deployment. See [the InProduct-shaped example](examples/inproduct.services.json).
That example is a proposal using separate hostnames, not a deployed application
or an approved migration. Omit `frontend` to retain its independent Vercel pipeline.

| Selection | Existing module / behavior |
| --- | --- |
| HTTP backend | `cloud-run-web`: Docker → Artifact Registry → public Cloud Run |
| Static Vite frontend or prerendered docs | `vercel-static`: explicit build and output-directory upload |
| Framework frontend/docs | `vercel-static`: `remote-build: true`, `params.framework`, `params.root-directory`; Vercel CLI builds locally then uploads prebuilt output |
| Background container | `gce-worker`: GCE VM; review ongoing compute cost and region/zone |
| Shared database / Redis / storage | `shared-mongo-atlas`, `upstash-redis`, `aws-s3` bindings; opt in explicitly |

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

## InProduct migration plan — no cutover yet

The reported Vercel landing page remains live and unchanged. The observed backend
serves `/health` and reads `BACKEND_PORT` (not `PORT`); the example sets
`BACKEND_PORT=8080`. No backend Dockerfile exists in the base checkout: author and
locally verify one before onboarding that service. Coordinate with the InProduct
worker rather than modifying its worktree. Its Fumadocs uses React Router static
prerendering, with output `apps/docs/build/client`, not a Next.js assumption.

First finish/merge the consumer's docs and library changes. Record the current
Vercel project/account/domain/Git integration and a rollback route. Decide whether
to retain Vercel's current pipeline, adopt its project via reviewed Terraform
import, or create a separately named preview project; the module's default is to
create a new project. Verify temporary hostnames, backend image, docs search and
links before proposing any domain transfer. Keep the old Vercel project and DNS
until an approved cutover has passed live checks. Never deploy `apps/myshop`.

MGR migration is similarly additive: this repo now owns the sanitized configuration template
and onboarding. Real MGR billing/Atlas identifiers were deliberately not copied
into this public repository. Existing operators keep using MGR until the replacement is proven.
Then review pointer/docs updates separately. Never move/delete the whole MGR
folder or copy its credentials into Git.

## Maintainer validation

Run `zap t arcnet-setup` and `zap t arcnet-test` from StackForge, through the shared heavy-job
queue when working alongside other agents. Tests exercise dry runs, safe failures,
reruns and published-engine Terraform rendering, including an InProduct-shaped
fixture; no Terraform apply, provider login or live deployment occurs. Root
`zap t setup` currently references an absent `flatpack-shell/`; that unrelated
baseline issue does not prevent this package's scoped setup/tests.
