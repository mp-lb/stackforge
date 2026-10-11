# InProduct: offline Vercel adoption plan

Status: offline adoption/import plan, updated 2026-10-11. The
[Vercel-only adapter](VERCEL.md) now implements reference-only deployment and
explicit creation, tested with local fixtures only. No provider queries,
Terraform import/plan/apply, Vercel changes, tokens, CI secrets or DNS edits were
performed. The reported live landing page is preserved. Earlier guidance that
InProduct required a backend Dockerfile was too broad and is superseded here.

## Actual deployment scope

| Component | Observed implementation | First hosting plan |
| --- | --- | --- |
| Landing | `apps/frontend`, Vite, `@mp-lb/inproduct-frontend`; output `apps/frontend/dist`; existing `vercel.json` has SPA rewrites | Reuse the existing Vercel project and domains; preserve its routing and Git configuration |
| Public docs | `apps/docs`, Fumadocs + React Router with `ssr: false` and prerender; output `apps/docs/build/client` | Static Vercel site; use an existing docs project if one exists, otherwise propose one new project using its default `vercel.app` hostname first |
| Backend scaffold | `apps/backend`, private health service | No deployment |
| Backend library | `packages/inproduct`, npm package | Existing publishing/release workflow, not a hosted API |
| MyShop | `apps/myshop`, private local demonstration | Never deploy |

The inspected frontend/docs source declares no custom build/runtime environment
keys; the only matched access was the docs development-mode flag. No new app
secret is justified by that code. Provider-side settings still need read-only
verification before claiming an existing project has no environment dependencies.

Build only `pnpm --filter @mp-lb/inproduct-frontend build` and
`pnpm --filter @mp-lb/inproduct-docs build`. Docs include prerendered search and
Markdown outputs: preserve `api/search`, `llms.txt`, `llms-full.txt`, and generated
`.md` routes. Do not apply the landing site's SPA fallback to the docs site.

The smallest deployment selection is **frontend + docs, zero project factory,
registry, Cloud Run, worker, database or storage modules**. Keep both existing DNS
and the landing Vercel project settings outside Terraform ownership initially.
Prefer an existing-project reference/lookup over importing ownership merely to
upload a new build. Leave the current landing Git integration active until its
replacement trigger is tested; don't allow both systems to race production builds.

## Terraform ownership gaps (reference-only mode does not need these)

The original Terraform profile implements explicit service selection, static upload/build fields, repo-owned
config, pinned JS tooling, local checks/rendering, disabled-by-default GitHub
workflow and conflict-safe generation. The sites-only fixture renders no backend
or MyShop; it still exposes the following starter limitations:

1. `setup.mjs` always adds `gcp`, `registry`, `ci` and copies the GCS backend.
   A static adoption profile must permit `deploy.project: {}`, a Vercel-only
   provider and no GCP authentication. Data-only project lookups can use ephemeral
   local Terraform state; if resource ownership is added later, select durable
   state deliberately. Do not retain ephemeral state for managed projects.
2. The current `vercel-static` module owns `vercel_project`, domain, DNS and env
   resources. It has no existing-project mode. The minimal new module should use
   `data.vercel_project` (existing name + optional team), output its ID, and run
   the pinned upload hook without declaring managed project/domain/env resources.
   Vercel provider 1.14.1 already supports that
   [read-only lookup](https://github.com/vercel/terraform-provider-vercel/blob/v1.14.1/docs/data-sources/project.md).
3. The hook infers a personal organization via `/v2/user`; it needs explicit
   account/team scope matching the selected existing project. The Terraform runner and
   workflow still require gcloud/WIF. A Vercel-only profile must instead
   require only the selected Vercel authentication and app build tools.
4. The existing managed-project module omits Git integration and fixes build and
   output settings to null. Importing a live project into it is not safe adoption:
   a subsequent apply could reset settings. Match all observed settings first,
   add destruction protection for adoption, and require a reviewed no-change plan.
5. `zap arc` exposes plan/deploy/destroy/bootstrap, not import or a persistent
   render workspace. Terraform import support does not mean Arc offers a verified
   import workflow. A controlled import workspace/state handoff is still needed
   if Terraform ownership, rather than reference-only reuse, is chosen.

These limitations remain in the Terraform ownership path. They are not
prerequisites for the new Vercel-only reference profile: it uses explicit IDs and
account-scoped reads, stages static output, and never requests ownership/import.
Its one-command generation and offline plan are tested; live InProduct deployment
is still not authorized or verified.

## Existing state that can be adopted, if ownership is later chosen

The following is an address/identifier map, not commands to execute. Import writes
Terraform state; it is outside this offline plan. Version-matched official
provider docs were checked for 1.14.1, within the module's `~> 1.0` constraint.

| Existing object | Candidate Arc resource address | Identifier required / treatment |
| --- | --- | --- |
| Landing Vercel project | `module.svc_frontend.vercel_project.main` | `prj_…`, or `team_…/prj_…`; preserve its name, framework, root/build/output/install settings, production branch, Git integration and protection settings |
| Each domain association | `module.svc_frontend.vercel_project_domain.main` (and `www[0]` only if actually present) | `prj_…/domain` or `team_…/prj_…/domain`; preserve redirect, status and branch associations |
| Explicitly selected env entries | `module.svc_frontend.vercel_project_environment_variable.env["KEY"]` | `prj_…/env-id` or `team_…/prj_…/env-id`; preserve targets/branch/sensitive classification; do not fetch or publish secret values |
| Existing DNS records | None in the minimal plan | Keep them outside Arc ownership; no Cloudflare token or record import needed |
| Existing deployment history and current live alias | No new managed resource | Preserve on Vercel; the module's upload hook does not import deployment history. Record the current production deployment ID/URL as rollback reference |

Sources: [project import](https://github.com/vercel/terraform-provider-vercel/blob/v1.14.1/docs/resources/project.md),
[domain import](https://github.com/vercel/terraform-provider-vercel/blob/v1.14.1/docs/resources/project_domain.md),
[environment import](https://github.com/vercel/terraform-provider-vercel/blob/v1.14.1/docs/resources/project_environment_variable.md).
Sensitive environment values import as null, so importing their metadata is not a
way to recover secrets. Reference-only adoption avoids taking over those entries.

## Missing identifiers and decisions — narrowly scoped

Local inspection found no `.vercel/project.json` at the repository or frontend
root. `apps/frontend/vercel.json` contains routing only. The live identifiers
below cannot be established from the checked files; none was guessed:

- Landing project ID/name and owner/team ID; current production URL/deployment ID.
- Attached domains and their current redirect/branch associations, if custom
  domains are in use. The provider/DNS zone is only needed if DNS ownership is
  deliberately expanded later.
- Actual root/build/output/install settings, Git link/production branch, and
  whether current pushes already deploy through Vercel's GitHub integration.
- Whether a docs Vercel project already exists. If absent, creating that one
  static project is the only proposed additional hosting resource.
- Required build-time environment key names/targets (not values), if any.

These facts can be collected later through approved existing read access; this
plan neither requires a new credential nor asks for permission to mutate anything.

## Permissions, cost and acceptance

For planning: no new permission or cost. For eventual reference-only deployment:
existing account access sufficient to read the selected projects and deploy to
those projects; a GitHub Actions token/secret is necessary only if choosing Actions
over an already-working Vercel Git integration. No GCP project, billing link, WIF,
Docker, Cloudflare token, Search Console or DNS change is inherently required.

A docs project/default hostname needs explicit creation approval if absent.
Build and hosting usage remains governed by the existing Vercel plan; no plan
upgrade is proposed or known to be required. Current plan/usage was not queried.
A custom docs domain is optional and would need a separate domain/DNS decision.

Before production replacement, prove a preview upload targets the correct owner
and project, inspect built outputs for MyShop exclusion, test landing routes and
docs/search/Markdown paths, then agree on one production trigger. Only after that
should an approved production deployment or trigger switch occur. Keep the old
production deployment and DNS available for rollback. None of these live steps
has been performed.
