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

For a Vercel site, set its package root. ArcNet detects Next.js and uses Vercel's framework build; named Vite, VitePress, and prerendered React Router packages use their `build` script and static output. Review the detected strategy in `arcnet plan`. A Vercel site can be selected alongside Terraform services in the same file. For a custom domain, set `vercel.dnsZone` and the site's `domain`; ArcNet attaches the domain to the referenced Vercel project and reconciles its Cloudflare DNS record during deployment. It does not manage Vercel Git integration.

Put public production build values, including the frontend API URL, in `variables` in `.arcnet/arcnet.yaml`. ArcNet passes these to the site build; it does not import a root `.env.production` file. After deployment, check the public domain and the frontend's actual API target. Keep credentials in encrypted secrets sources.

Name newly created Vercel projects `arcnet.<project-slug>.<service-slug>` (for example, `arcnet.lexiquest.landing-page`). Keep the verified name of an existing project when referencing it; the ArcNet naming convention applies when creating a replacement.

```yaml
version: 1
project: hello-world
repository: mp-lb/hello-world
environment: mp-lb
approved: false
vercel:
  account:
    type: team
    id: team_REPLACE_WITH_REAL_ID
  sites:
    web:
      mode: new
      creationApproved: true
      projectName: arcnet.hello-world.web
      root: apps/web
```

Replace the account ID placeholder, review the site name, then set `approved: true` when ready to deploy. The first push to `main` creates a missing Vercel project in that exact account; later pushes verify and reuse it. Keep `creationApproved: false` to prevent creation. To reference a project that ArcNet must never create, use `mode: existing` with its verified `projectId` and `projectName`. Set `framework: static`, `build`, `output`, or `outputConfig` only to override detection. The [legacy guide](LEGACY_SETUP.md#vercel-adapter-details) describes identity and routing checks in depth.

## Install and check

From the project root, after adding `arcnet.yaml` and any needed Dockerfiles:

```sh
pnpm dlx @mp-lb/arcnet@0.5.9 setup <project-slug> --dry-run
pnpm dlx @mp-lb/arcnet@0.5.9 setup <project-slug>
pnpm install
pnpm exec arcnet check
```

Setup pins the package, adds a deploy workflow only for selected services, and does not alter `zap.yaml`. A package-only project gets no deployment workflow. `check` and static Vercel `plan` are offline; Terraform `plan` contacts providers. Setup does not create cloud resources or approve deployment.

## Secrets and package publishing

For the internal Forum secrets convention, attach the standard encrypted source with `arcnet secrets add --key <GITHUB_SECRET_NAME>` and add a project source only if it has project-specific values. The `secrets:` section needs only each source's `key`, `store`, and `path`, plus consumer mappings. ArcNet stores the ciphertext at `.arcnet/secrets/<KEY>.json.enc`; `arcnet secrets sync` refreshes it and generates the validation workflow. CI uses each source's GitHub decryption key and does not need a Forum login. [Legacy guide: source provisioning and local password mode](LEGACY_SETUP.md#layered-secrets).

```yaml
secrets:
  sources:
    - key: STANDARD_SECRETS_KEY
      store: mp-lb/mp-lb
      path: /admin/standard-secrets.json.enc
  consumers:
    publish:
      NODE_AUTH_TOKEN: NPM_TOKEN
```

A library or CLI release still uses the project's Changesets workflow. To supply npm credentials from ArcNet, configure a `publish` consumer in `arcnet.yaml` and run the publish command through `pnpm exec arcnet env run --consumer publish -- <command>`. The release workflow must call that command; installation does not publish a package or rewrite an unrelated workflow. Public FSS Stack projects may use a GitHub `NPM_TOKEN` secret directly instead of Forum.

For Terraform services, `variables:` in `arcnet.yaml` holds committed non-secret application values. Encrypted sources supply secret values; each service's `env` list selects which values it receives. The `deploy` consumer selects operator credentials. Do not put plaintext keys or connection URLs in the YAML.

## First deployment

For GCP services, complete the [environment prerequisites](environment/setup.md), including billing, Terraform state, provider credentials, DNS ownership, and initial CI identity. Set `identity.workloadIdentityProvider` and `identity.serviceAccount` in `arcnet.yaml` after the first operator deployment establishes them. Review `arcnet plan` and the expected Terraform changes before enabling `approved: true`. The generated workflow then deploys selected services on pushes to `main`. Verify the actual Actions run, service health, DNS, and TLS.

For Vercel sites, run `arcnet inspect` to verify existing identities and see which new projects are pending. Confirm any existing Git integration will not create unwanted duplicate deployments, then enable `approved: true`. A new project is created during the first approved deployment and then found by its configured name; the repository does not need to commit a generated project ID. If a site declares a custom domain, the deploy secret mapping must supply `CLOUDFLARE_API_TOKEN` with DNS edit access to `vercel.dnsZone` as well as `VERCEL_TOKEN`.

Older installations continue to work with their committed `project.json`, `services.json`, `network.yaml`, `secrets.json`, and `zap.yaml` deployment block. Migrate them separately after reviewing their current Terraform or Vercel identity; do not run setup over an existing deployment. [Legacy installation and migration details](LEGACY_SETUP.md).
