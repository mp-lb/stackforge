# Vercel-only static sites

This profile implements existing-project references and explicit new-project
creation without GCP, WIF, Terraform, DNS ownership or changes to project settings.
It uses Vercel's documented REST API and pinned CLI `63.1.2`; no unpublished Zapper
API or package release is needed. The Terraform-managed profile remains separate.

## One-command setup

Install StackForge's authoring dependencies once with `zap t arcnet-setup`.
In the target repo, commit `arcnet.vercel.json`: start from
[the static-sites example](examples/static-sites.vercel.json), replace account and landing
project identifiers with actual values, and choose existing/new mode for docs.
The example rejects its `REPLACE` values rather than guessing a live target.

From the target repository root:

```sh
node ~/Work/stackforge/arcnet/setup.mjs example-app
```

The slug must match `zap.yaml`. `--dry-run` writes nothing; `--vercel path.json`
selects another input file. Mixed Terraform/Vercel profiles and existing workflow
conflicts fail without overwrites. No backend Dockerfile is needed. Setup leaves
`zap.yaml` unchanged and writes only `.arcnet/project.json`, a dependency-free
runner, an ignore file and `.github/workflows/deploy-arc.yaml`.

```sh
node .arcnet/run.mjs plan
```

`plan` and `check` are **offline**. They render selected identities, build commands,
static output and routing; no provider queries or mutations occur. This is an
ArcNet deployment plan, not a Terraform plan. The plan explicitly records that
project settings and DNS are not owned. Repeated setup preserves config edits
and creation receipts; conflicting identities fail for review. After generation,
`.arcnet/project.json` is authoritative. Keep the input in sync when intentionally
changing the selection; setup is not an upgrade command.

## Existing project references

Each site needs `mode: existing`, exact `projectId` and `projectName`; the shared
`account` has explicit `type: team|personal` and its exact ID. Different accounts
require separate invocations/checkouts. The runner never guesses the current CLI
account. Team REST requests carry `teamId`; every fetched project's `accountId`,
ID and name must match. Personal references are checked against the same explicit
owner ID. Vercel response bodies and secret values are not printed.

`inspect` is a read-only remote identity check, requiring an already-approved
`VERCEL_TOKEN`; it performs no settings, domain or environment writes.
Existing mode never calls the project-creation endpoint.

Build commands are explicit pnpm argument arrays. Only `output` is copied into a
temporary `.vercel/output/static`; no repository source, `.git`, environment files,
symlinks or MyShop application directory is uploaded. `outputConfig` is an explicit
static Build Output API v3 config. Review its routing against the current site:
it controls the new deployment's routes, while leaving provider project settings
unchanged. The example translates the landing's SPA fallback/HTML/trailing-slash
behavior and keeps docs/search/Markdown files separate; live route verification
is still required. The profile supports static sites, not SSR/functions.

After target approval, set `approved: true` locally for the preview; commit that
flag only after approving the production trigger. `preview` uploads
prebuilt output without `--prod`; `deploy` creates a production deployment. Both
verify **every** reference before any build/upload, stage all selected sites, and
use explicit project/organization IDs in isolated local Vercel links. No Vercel
PATCH/DELETE, domain, DNS or env-management API calls exist in this adapter.
Deployment is not atomic across sites; a later failed upload leaves earlier
successful deployments in place and is reported without automatic retries.

Builds do not receive the deployment token or other `VERCEL_*` variables. Provide
any genuinely needed public/build values explicitly in your own build setup;
prebuilt output does not inherit Vercel's remote build/system environment.

## New projects: separate operator step

A new site uses `mode: new`, `projectName`, and `creationApproved: false`, with no
project ID. It is visible in the offline plan but cannot be deployed by CI.
Only after specific creation/cost approval, set that site's `creationApproved`
to true and run locally:

```sh
node .arcnet/run.mjs create docs
```

This is a **mutating command**, not part of setup or the offline checks. It first
checks the scoped name for conflicts. Personal-account creation also verifies the
token's user ID before the POST. It creates only a named static project with
`framework: null`: no Git link, custom domain, DNS, env or paid feature is requested.
Existing names fail rather than being silently adopted. A network failure is not
automatically retried; inspect the account before retrying an uncertain outcome.

A successful response records the exact ID locally, changes the site to existing
mode and resets deployment approval to false. Review/commit the reference before
CI. Rerunning `create` on that reference only verifies identity. A failed local
receipt write after successful creation requires reconciling the named project;
never infer failure means the remote project was not created. Creation is blocked
in GitHub Actions. No project was created while implementing or testing this.

## GitHub pushes and remaining inputs

The generated workflow validates offline on pushes to main. Deployment stays
skipped until approved and every site is an existing reference. It then uses the
target's own pinned pnpm, builds only selected sites, and uploads with
`VERCEL_TOKEN` from the protected `arcnet-production` environment. No OIDC, GCP,
Terraform, Cloudflare token or new state bucket is required.

The runner's `VERCEL_TOKEN` is a process interface. Projects with an existing
secret loader can export the selected token to the runner through that loader;
the generic workflow does not install encrypted-secret integration.

Use a dedicated hostname as the docs location convention, initially the verified
provider hostname. The docs app must build and deploy without a landing app, and
a landing app must build without docs. A cross-app link is optional and should be
derived from the verified hostname during onboarding. Custom docs.<project-domain>
is optional and requires separately authorized ownership/DNS verification. A single
location-to-project orchestration command, standard build/output/routing defaults,
and reusable encrypted-source workflow integration remain separately scoped tooling
gaps; this CLI does not yet claim to automate those steps from a URL alone.

## Ownership/import is separate

Reference mode does not import Terraform state. If Terraform should later own
project settings or domains, plan a separate reviewed migration.
No automated import command is implemented or claimed verified. The existing
Terraform profile is still for explicitly managed infrastructure.

## Evidence and public interfaces

Local tests use fixtures, an injected HTTP transport and intercepted commands;
they cover account/team scope, new/existing modes, no-mutation reference behavior,
conflicts, idempotence, disabled CI creation, static output isolation and routing
artifacts. The exact CLI setup and offline plan run on disposable directories.
Interfaces checked on 2026-10-11:
[project lookup](https://vercel.com/docs/rest-api/projects/find-a-project-by-id-or-name),
[project creation](https://vercel.com/docs/rest-api/projects/create-a-new-project),
[prebuilt deploy](https://vercel.com/docs/cli/deploy#prebuilt),
[project selection](https://vercel.com/docs/cli/global-options#project),
[Build Output API](https://vercel.com/docs/build-output-api/configuration).
