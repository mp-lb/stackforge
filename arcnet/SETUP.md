# Add ArcNet to a project

Start with a working Zap/pnpm/GitHub project and an [ArcNet environment](initial-setup.md).

Choose **full** setup when deploying applications through ArcNet, or **minimal** setup for its secrets and variables infrastructure without application deployment. Both use the shared setup below. For FSS Stack, take the project slug and repository from `projectSlug` and `githubRepository` in `fssstack.yaml`.

## Shared setup

For FSS Stack projects, read `projectSlug` and `githubRepository` from `fssstack.yaml`. Use those values for `<project-slug>` and `<owner/repo>` below. The GitHub repository must exist, and `fm` and `gh` must be authenticated with access to the Forum store and repository. Use the project's normal pnpm dependency workflow to install `@mp-lb/arcnet` in the workspace root; it provides the secrets tooling even when deployment is not configured.

Ensure `/projects/<project-slug>/variables.json` exists in the `mp-lb/mp-lb` Forum store. If absent, create it as `{}` with `fm write` without `--force`; preserve any existing values. The shared standard secrets source is `/admin/standard-secrets.json.enc` in the same store. It must already exist; do not replace it.

Create `.arcnet/arcnet.yaml` if absent, substituting the values from `fssstack.yaml`:

```yaml
version: 1
project: <project-slug>
repository: <owner/repo>
environment: mp-lb
variables:
  store: mp-lb/mp-lb
  paths:
    - /admin/standard-variables.json
    - /projects/<project-slug>/variables.json
```

If the file already exists, preserve its services, configuration, sources and consumers, and ensure the variables paths above are present in that order. Project variables override standard variables. Do not overwrite an existing configuration. The ArcNet project must also match `zap.yaml`; resolve a mismatch before proceeding.

Provision the shared source with `secrets add`. For the project source, use `secrets init` if the Forum file does not exist, or `secrets add` if it already exists:

```sh
pnpm exec arcnet secrets add --key ARCNET_STANDARD_SECRETS_KEY --store mp-lb/mp-lb --path /admin/standard-secrets.json.enc --repository <owner/repo>
pnpm exec arcnet secrets init --key ARCNET_PROJECT_SECRETS_KEY --store mp-lb/mp-lb --path /projects/<project-slug>/secrets.json.enc --repository <owner/repo>
pnpm exec arcnet variables sync
pnpm exec arcnet setup <project-slug>
pnpm install
pnpm exec arcnet env check --password
pnpm exec arcnet check
```

For an existing project secrets file, replace `init` with `add`. These commands prompt for the Forum encryption password, add per-file recipients, provision GitHub repository secrets, record sources, and generate encrypted snapshots and validation CI. If a GitHub key already exists, use `--existing-key` with `secrets add` only after verifying it decrypts the corresponding source; do not overwrite it. On reruns, retain the existing source keys and consumer mappings. If the standard source or required access is missing, ask the operator to restore access rather than replacing the source. Never commit plaintext secrets.

Review and commit the configuration, encrypted snapshots, variable snapshots, generated workflow, dependency and lockfile. Configure consumer mappings for actual uses as they arise; the validation checks decryption and configured mappings. For full ArcNet setup, continue below to configure deployment and run setup again; for minimal setup, stop after validation and commit.

## Application deployment (full setup only)

1. Ensure `.arcnet/arcnet.yaml` contains the capabilities the project ships. If it already exists, extend it without replacing its variables, secrets, or other configuration. For a new file, start with:

   ```yaml
   version: 1
   project: hello-world
   repository: mp-lb/hello-world
   environment: mp-lb
   variables:
     store: mp-lb/mp-lb
     paths: [/admin/standard-variables.json]
   services:
     backend:
       module: cloud-run-web
   vercel:
     sites:
       web:
         mode: new
         projectName: arcnet.hello-world.web
         root: apps/web
   ```

   Match `project` to `zap.yaml`. Omit `services` or `vercel` when unused; omit both for a package-only project. Put each container's Dockerfile at `.arcnet/<service>.Dockerfile`.

2. Install and check:

   ```sh
   npx -y @mp-lb/arcnet@latest variables sync
   npx -y @mp-lb/arcnet@latest setup hello-world
   pnpm install
   pnpm exec arcnet check
   ```

3. Commit the generated files and push to `main`. For Cloud Run, complete the first-deployment step below **before** pushing.

Update the project's delivery context block (for FSS Stack, `agents-md/delivery.md`, or the existing project context directory). State that changes reaching `main` on GitHub deploy the selected application services and publish changed eligible packages through their configured workflows. Describe only delivery paths actually configured, retain any first-publish or first-deployment prerequisites, and tell agents to check the corresponding GitHub Actions runs. Rebuild and commit the generated agent context.

Keep the shared setup sources and snapshots in place when adding deployment capabilities.

**First Cloud Run deployment:** An authorized operator must run `arcnet plan` and `arcnet deploy` locally before pushing. This creates GitHub's GCP trust relationship. Then add the resulting `identity` values to `arcnet.yaml` and push. [Environment prerequisites](initial-setup.md).

[Project files and supported capabilities](README.md) · [Command reference](https://github.com/mp-lb/tools/tree/main/packages/arcnet/docs/public)
