# Add ArcNet to a project

ArcNet is an opt-in delivery layer for an existing Zap/pnpm/GitHub project. FSS Stack is not required. Start with a locally working project and the [ArcNet environment](environment/setup.md) already configured. The only project-owned ArcNet configuration for a new installation is `.arcnet/arcnet.yaml`; the package supplies standard environment settings. [File tree and supported capabilities](README.md).

## Choose what ships

Create `.arcnet/arcnet.yaml` with the project's real slug and GitHub repository. The slug must match `project:` in `zap.yaml`. Keep `approved: false` until the selected destinations and CI credentials have been reviewed.

An npm-only project needs no deployment fields:

```yaml
version: 1
project: example-lib
repository: mp-lb/example-lib
environment: mp-lb
approved: false
```

For a container backend, select the service in the same file. ArcNet uses `.arcnet/<service>.Dockerfile` by default. Public `web`, `frontend`, or `landing-page` services get `<slug>.mp-lb.dev`; `backend` gets `api.<slug>.mp-lb.dev`; other public services get `<service>.<slug>.mp-lb.dev`. Override `domain` or `dockerfile` only when needed. Docker builds use the repository root as context.

```yaml
version: 1
project: hello-world
repository: mp-lb/hello-world
environment: mp-lb
approved: false
services:
  backend:
    module: cloud-run-web
    env: [MONGODB_URL]
```

For a Vercel site, set its package root (`root: .` when the app is at the repository root). ArcNet detects Next.js and uses Vercel's framework build; named Vite, VitePress, and prerendered React Router packages use their `build` script and static output. Review the detected strategy in `arcnet plan`. A Vercel site can be selected alongside Terraform services in the same file. For a custom domain, set `vercel.dnsZone` and the site's `domain`; ArcNet attaches the domain to the referenced Vercel project and reconciles its Cloudflare DNS record during deployment. It does not manage Vercel Git integration.

When `aws-s3` is selected as the `s3` service, ArcNet defaults to the private bucket `arcnet.<project>.backend`; set `params.bucket` to choose another name. The default IAM user can list the bucket and get, put, and delete its objects, scoped to that bucket. Browser CORS follows HTTPS origins derived from declared service and Vercel site domains. The backend authorizes access and issues presigned URLs, so normal app domains need no separate CORS origin list.

Store non-secret production values, including frontend API URLs, in Forum. List the standard file first and the project file second so project values override shared defaults:

```yaml
variables:
  store: mp-lb/mp-lb
  paths:
    - /admin/standard-variables.json
    - /projects/hello-world/variables.json
```

Run `arcnet variables sync` and commit the generated `.arcnet/variables/*.json` snapshots with `arcnet.yaml`. CI reads the snapshots and needs no Forum token. ArcNet passes the resolved values to builds and selected services; it does not import a root `.env.production` file. Keep credentials in encrypted secrets sources. Existing inline `variables:` maps remain supported during migration.

Name newly created Vercel projects `arcnet.<project-slug>.<service-slug>` (for example, `arcnet.lexiquest.landing-page`). Keep the verified name of an existing project when referencing it; the ArcNet naming convention applies when creating a replacement.

```yaml
version: 1
project: hello-world
repository: mp-lb/hello-world
environment: mp-lb
approved: false
variables:
  store: mp-lb/mp-lb
  paths:
    - /admin/standard-variables.json
vercel:
  # Team comes from VERCEL_TEAM_ID in standard variables.
  sites:
    web:
      mode: new
      creationApproved: true
      projectName: arcnet.hello-world.web
      root: apps/web
```

Put `VERCEL_TEAM_ID` in the environment's standard non-secret variables file once, then run `arcnet variables sync` before setup. ArcNet uses the committed standard variables snapshot; an explicit `vercel.account` in YAML still overrides it, including for personal accounts. This keeps the shared account ID out of each project file. Review the site name, then set `approved: true` when ready to deploy. The first push to `main` creates a missing Vercel project in that exact account; later pushes verify and reuse it. Keep `creationApproved: false` to prevent creation. To reference a project that ArcNet must never create, use `mode: existing` with its verified `projectId` and `projectName`. Set `framework: static`, `build`, `output`, or `outputConfig` only to override detection. The [legacy guide](LEGACY_SETUP.md#vercel-adapter-details) describes identity and routing checks in depth.

## Install and check

From the project root, after adding `arcnet.yaml` and any needed Dockerfiles:

```sh
pnpm dlx @mp-lb/arcnet@latest variables sync # when variables: uses Forum paths
pnpm dlx @mp-lb/arcnet@latest setup <project-slug> --dry-run
pnpm dlx @mp-lb/arcnet@latest setup <project-slug>
pnpm install
```

Provision any declared secrets in the next step, then run `pnpm exec arcnet check`. A project without encrypted secrets can run it immediately. Setup pins the package, adds a deploy workflow only for selected services, and does not alter `zap.yaml`. A package-only project gets no deployment workflow. `check` and static Vercel `plan` are offline; Terraform `plan` contacts providers. Setup does not create cloud resources or approve deployment.

## Secrets and package publishing

For the internal Forum secrets convention, you may declare sources and consumer mappings in `arcnet.yaml` before provisioning. Declaring a source does not create its GitHub key. After setup, run `arcnet secrets add` for each existing Forum file; it creates the missing recipient and GitHub key even when the source is already listed in YAML. Add a project source only if it has project-specific values. ArcNet stores the ciphertext at `.arcnet/secrets/<KEY>.json.enc`; `arcnet secrets sync` refreshes it and generates the validation workflow. CI uses each source's GitHub decryption key and does not need a Forum login. [Legacy guide: source provisioning and local password mode](LEGACY_SETUP.md#layered-secrets).

```yaml
secrets:
  sources:
    - key: ARCNET_STANDARD_SECRETS_KEY
      store: mp-lb/mp-lb
      path: /admin/standard-secrets.json.enc
  consumers:
    publish:
      NODE_AUTH_TOKEN: NPM_TOKEN
```

For the example above, run this from the project root and enter the Forum password locally:

```sh
arcnet secrets add --key ARCNET_STANDARD_SECRETS_KEY --store mp-lb/mp-lb --path /admin/standard-secrets.json.enc --repository mp-lb/<project-slug>
```

Run `pnpm exec arcnet check`, then commit `arcnet.yaml` and the generated encrypted snapshot. On subsequent runs, a source with its GitHub key already present is left unchanged; use `arcnet secrets sync` when the Forum file changes.

A library or CLI release still uses the project's Changesets workflow. To supply npm credentials from ArcNet, configure a `publish` consumer in `arcnet.yaml` and run the publish command through `pnpm exec arcnet env run --consumer publish -- <command>`. The release workflow must call that command; installation does not publish a package or rewrite an unrelated workflow. Public FSS Stack projects may use a GitHub `NPM_TOKEN` secret directly instead of Forum.

For Terraform services, `variables:` in `arcnet.yaml` selects ordered Forum non-secret files; their committed snapshots provide application values. Encrypted sources supply secret values. `arcnet env` merges both pools before applying consumer mappings, with secrets taking precedence. Each service's `env` list selects which values it receives. The `deploy` consumer selects operator credentials. Do not put plaintext keys or connection URLs in the YAML.

## First deployment

For GCP services, complete the [environment prerequisites](environment/setup.md), including billing, Terraform state, provider credentials, and DNS ownership. The first deployment is a one-time trust bootstrap: an operator who already has GCP permissions authenticates locally with gcloud/ADC and reviews `arcnet plan`. After reviewing the targets, costs, IAM, and DNS changes, set `approved: true` in the local `arcnet.yaml` and run `arcnet deploy` locally. Do not push this intermediate config: CI requires the identity that this first deployment creates. Terraform creates the project's deploy service account, GitHub OIDC provider, repository condition and Workload Identity User binding in Google Cloud. A Git edit alone cannot grant a new repository access; an authorized operator must apply a changed trust configuration. No GCP service-account JSON key is needed.

Set `identity.workloadIdentityProvider` and `identity.serviceAccount` in `arcnet.yaml` after the operator deployment establishes them, then commit and push the approved configuration. The generated workflow then authenticates with short-lived GitHub OIDC tokens and deploys selected services on pushes to `main`. Verify the actual Actions run, service health, DNS, and TLS.

For Vercel sites, run `arcnet inspect` to verify existing identities and see which new projects are pending. Confirm any existing Git integration will not create unwanted duplicate deployments, then enable `approved: true`. A new project is created during the first approved deployment and then found by its configured name; the repository does not need to commit a generated project ID. If a site declares a custom domain, the deploy secret mapping must supply `CLOUDFLARE_API_TOKEN` and `VERCEL_TOKEN`. Set the standing Cloudflare CI token to Zone Read and DNS Write for all zones in the environment's account, including future zones. After that one-time setup, change the domain in `arcnet.yaml` and push. Deployment checks that the token can see the new zone before changing infrastructure.

Older installations continue to work with their committed `project.json`, `services.json`, `network.yaml`, `secrets.json`, and `zap.yaml` deployment block. Migrate them separately after reviewing their current Terraform or Vercel identity; do not run setup over an existing deployment. [Legacy installation and migration details](LEGACY_SETUP.md).
