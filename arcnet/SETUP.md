# Add ArcNet to a project

Start with a working Zap/pnpm/GitHub project and an [ArcNet environment](initial-setup.md).

Choose **full** setup when deploying applications through ArcNet, or **minimal** setup for its secrets and variables infrastructure without application deployment. Both use the shared setup below. For FSS Stack, take the project slug and repository from `projectSlug` and `githubRepository` in `fssstack.yaml`.

## Deployment preflight (full setup)

Agree the intended live outcome, provider identities/accounts, domains, resources, cost assumptions, and external actions before provisioning. Check authentication freshness and access to the existing company billing account and state bucket; use existing projects as evidence before proposing a different billing account. Preserve authorization already given.

Plan encrypted-source password handoffs and production authentication setup early. Record observed blockers and workarounds in the target project's `SETUP_GAPS.md`, with evidence and owning fixes. Distinguish missing prerequisites, tool defects, documentation defects, and execution mistakes.

Before a container build, check Docker filesystem capacity separately from host disk space. Preserve unrelated images, containers and volumes. If the local image build is blocked, a scoped foundation/CI bootstrap may be needed: review partial state, establish and verify the deployment identity, then let authorized CI complete the image/service deployment. Do not blindly reapply or claim the full deployment succeeded.

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

Add a project context source block explaining where secrets and variables live. For FSS Stack, create `context/secrets.md` and import it from `context/index.md`; otherwise use the project's existing context source and build process. Describe the actual configured Forum store and source paths (shared and project secrets, plus non-secret variables), `.arcnet/arcnet.yaml` as the source and consumer configuration, and the committed encrypted snapshots under `.arcnet/secrets/`. Explain that GitHub repository secrets hold the decryption keys for CI, not the plaintext source values; `arcnet secrets sync` refreshes encrypted snapshots after Forum changes, and `arcnet variables sync` refreshes non-secret snapshots. Mention `arcnet env check --password` for local validation and `arcnet env run --consumer <name> -- <command>` for configured consumers. Describe only the project's configured consumers, and keep secret values and decryption keys out of the context block. Distinguish these deployment sources from the local `.env` secrets and `.env.local` non-secret defaults where those files are used.

Rebuild the project context (for FSS Stack, `zap task context-build`) and commit the source block and generated agent context with the ArcNet configuration. This applies to both minimal and full setups.

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

Add the shared ArcNet delivery link to the project context index: `[Delivery](https://hyperdoc.forumlabs.net/0a66417d-d743-45af-ba2f-3a56adb43509)`, on its own line with blank lines around it. Keep any project-specific release exceptions in local context, then rebuild and commit the generated agent context.

Keep the shared setup sources and snapshots in place when adding deployment capabilities.

For container services, exclude local secrets, generated CI credentials, dependency directories and scratch files from the Docker build context. Keep generated CI credential files out of Git too. Review actual required CI permissions for state refresh, federation, service IAM, and quota-project usage; do not assume Editor covers every operation or grant billing-management roles for an unselected capability.

For prebuilt static Vercel sites, distinguish the source build root from the provider root: a source subdirectory need not exist in ArcNet's temporary upload tree. Preserve SPA deep-route fallbacks in the prebuilt output. Choose one authoritative production delivery path and prevent an independent Git deployment from bypassing its checks. Verify the generated workflow gates deployment on the project's configured validation.

**First Cloud Run deployment:** Before applying a service with a custom domain, delegate the already verified parent domain to the exact project deployment service account using `pnpm exec arcnet environment domain-owner --domain <parent-domain> --email <deploy-service-account> --quota-project <quota-project>`. Verify the command reports the intended owner; DNS access alone is insufficient. Use the environment's authorized operator/ADC and existing verified domain, not a replacement identity.

An authorized operator must run `arcnet plan` and `arcnet deploy` locally before pushing. This creates GitHub's GCP trust relationship. Then add the resulting `identity` values to `arcnet.yaml` and push. [Environment prerequisites](initial-setup.md).

[Project files and supported capabilities](README.md) · [Command reference](https://github.com/mp-lb/tools/tree/main/packages/arcnet/docs/public)

## Live completion checks

Full setup completes when the selected services work at their real release URLs. A passing CI run or created provider resource is an intermediate milestone. Verify:

- Landing/app HTTPS and a direct load of application routes.
- Backend health including a real database check, rejection of unauthenticated access, and allowed frontend-origin requests.
- A real production sign-in through the configured provider, callback, and authenticated app-to-API response. Plan use of the user's authenticated browser where appropriate; never request passwords or codes in chat. Follow any required human-only OAuth Console steps.
- Custom domain ownership delegation and TLS separately from DNS/resource creation. If issuance is pending, an authorized native HTTPS hostname can keep the app functional; switch to the custom hostname only after verification.
- Actual release URLs recorded in the project's work-management record, and the gap ledger reconciled with verification evidence. Publish focused shared-process corrections at the end, keeping unresolved owning-tool defects explicit.
