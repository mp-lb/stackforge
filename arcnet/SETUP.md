# Add ArcNet to a project

Start with a working Zap/pnpm/GitHub project and an [ArcNet environment](initial-setup.md). Choose **full** setup to deploy applications, or **minimal** setup for secrets and variables only. For FSS Stack, use `projectSlug` and `githubRepository` from `fssstack.yaml` throughout.

## Before provisioning

Agree the selected services, accounts, domains, costs and external actions; preserve authorization already given. Verify provider logins, access to the environment's billing account and state bucket, and the [environment prerequisites](initial-setup.md#2-gcp-foundation-identities-and-apis). Use existing company projects to resolve account choices rather than substituting a different billing account.

Plan encryption-password and production-authentication handoffs early. Follow the selected authentication extension and company augmentation for provider setup, including any human-only OAuth steps. Keep passwords and login codes out of chat.

## Shared configuration

The GitHub repository must exist. Authenticate `fm` and `gh` with access to the Forum sources and repository, then install `@mp-lb/arcnet` in the workspace root using the project's normal dependency workflow. Use that pinned version for the commands below.

Ensure `/projects/<project-slug>/variables.json` exists in the `mp-lb/mp-lb` Forum store; create it as `{}` with `fm write` without `--force` if absent. The shared secret source `/admin/standard-secrets.json.enc` must already exist. Restore missing access rather than replacing the source.

Create `.arcnet/arcnet.yaml`, or extend the existing file while preserving services, sources and consumers:

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

`project` identifies the production application; no `zap.yaml` is required. Project variables override standard variables because their path comes last.

Provision the shared and project secret sources:

```sh
pnpm exec arcnet secrets add --key ARCNET_STANDARD_SECRETS_KEY --store mp-lb/mp-lb --path /admin/standard-secrets.json.enc --repository <owner/repo>
pnpm exec arcnet secrets init --key ARCNET_PROJECT_SECRETS_KEY --store mp-lb/mp-lb --path /projects/<project-slug>/secrets.json.enc --repository <owner/repo>
pnpm exec arcnet variables sync
```

Use `secrets add` instead of `init` when the project source already exists. These commands prompt for the Forum encryption password, provision recipient/GitHub keys, record sources and create encrypted snapshots. On reruns, retain existing keys and mappings; use `--existing-key` only after verifying it decrypts the corresponding source. Never commit plaintext secrets.

## Select applications (full setup only)

Add the selected deployment capabilities to the same `.arcnet/arcnet.yaml`. For example:

```yaml
services:
  backend:
    module: cloud-run-web
vercel:
  sites:
    web:
      mode: new
      projectName: arcnet.<project-slug>.web
      root: apps/web
```

Omit unused sections. A package-only project needs neither. Configure consumer mappings for the credentials and variables each selected capability uses; package publishing uses the `publish` consumer. See [project files and supported capabilities](README.md).

Put each container's Dockerfile at `.arcnet/<service>.Dockerfile`. Verify its production build/start command and health endpoint. Exclude local secrets, generated CI credentials, dependencies and scratch files from the build context; keep CI credential files out of Git. FSS Stack projects follow the [extension's application conventions](../fssstack/extensions/arcnet/README.md#fss-stack-conventions).

## Generate and validate

```sh
pnpm exec arcnet setup <project-slug>
pnpm install
pnpm exec arcnet env check --password
pnpm exec arcnet check
```

Review the generated configuration, workflows, snapshots and dependency lockfile. ArcNet supplies deployment validation gates, inferred React/Vite SPA routing, provider root/framework checks and disabled Vercel Git delivery. Preserve explicit routing and resolve reported configuration conflicts before deploying. Custom `vercel.ts` configuration requires manual integration, as reported by setup.

For FSS Stack projects, add these shared Forum blocks to `context/index.md`. Put each link on its own line with blank lines around it.

```markdown
<!-- arcnet -->

[ArcNet](https://hyperdoc.forumlabs.net/232107c4-d98b-4065-851f-9e29d9b5497e)

[Delivery](https://hyperdoc.forumlabs.net/0a66417d-d743-45af-ba2f-3a56adb43509)

[Package publishing](https://hyperdoc.forumlabs.net/6a5a5879-934b-47b9-a9b1-093d672d2780)
```

Add a local secrets context block describing the configured Forum paths, `.arcnet/arcnet.yaml` consumers, committed encrypted snapshots and local secret files. Explain that GitHub holds decryption keys, while `arcnet secrets sync` and `arcnet variables sync` refresh source snapshots. Include `arcnet env check --password` and `arcnet env run --consumer <name> -- <command>` for local use. Include no secret values; distinguish deployment sources from local `.env` secrets and `.env.local` defaults.

Rebuild context (`zap task context-build` for FSS Stack) and commit the sources, generated context and ArcNet files. **Minimal setup ends here.** Full setup continues below before the first push that deploys.

## First deployment (full setup only)

For Terraform services, provision the project's foundation first in
[mp-lb/arcnet-base](https://github.com/mp-lb/arcnet-base). Add a project stack,
then run `mise run plan -- <project>` and `mise run apply -- <project>` locally
with `ARCNET_BASE_ACCOUNT` set to an authorized Google account. The base repository
owns cloud projects, APIs, registries, CI identities, IAM, budgets and state
buckets. Its CI only validates; it never applies infrastructure.

Copy the stack's `application_config` output into `.arcnet/arcnet.yaml`, including
both `foundation` and `identity`. Application state must use its own bucket;
application CI receives no access to base state. Use ArcNet 0.7.23 or newer.
Existing projects must transfer their base resources to separate state using the
base repository's migration procedure before removing their configuration.
Never recreate an existing project or grant IAM administrator roles to app CI.

Before applying a service with a custom domain, delegate the already verified
parent domain to the exact deployment service account:

```sh
pnpm exec arcnet environment domain-owner --domain <parent-domain> --email <deploy-service-account> --quota-project <quota-project>
```

Verify the reported owner; DNS access alone is insufficient. Domain verification
is separate from Terraform IAM permissions. Setting a local ADC quota project
does not change permissions or the identity used in GitHub Actions.

Commit the completed configuration and push to `main` to run delivery. Vercel-only projects need no GCP bootstrap. Check the deployment workflow, then verify the live result.

## Live completion checks

Full setup completes when the selected services work at their real release URLs. Verify what the project uses:

- Landing/app HTTPS, including a direct load of application routes.
- Backend health with a real database check when selected, allowed frontend origins, and rejection of unauthenticated access to protected procedures.
- A real production sign-in reaching an authenticated app-to-API response when auth is selected. Use the user's authenticated browser where appropriate.
- Custom-domain TLS as well as DNS. An authorized native HTTPS hostname can be used while issuance is pending; switch only after verifying the custom host.

Report the verified URLs and remaining blockers to the project-creation process. Passing CI or creating provider resources alone does not complete full setup.

[Command reference](https://github.com/mp-lb/tools/tree/main/packages/arcnet/docs/public)
