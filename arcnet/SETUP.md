# Add ArcNet to a project

Start with a working Zap/pnpm/GitHub project and an [ArcNet environment](initial-setup.md).

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

2. Ensure the MAP Lab Forum sources and their GitHub decryption keys are provisioned: shared `/admin/standard-secrets.json.enc` and project `/projects/<project-slug>/secrets.json.enc` and `/projects/<project-slug>/variables.json` in `mp-lb/mp-lb`. FSS Stack projects may already have completed this through the MAP Lab augmentation. Preserve existing sources and consumers; use `arcnet secrets add` for existing encrypted sources and `arcnet secrets init` only for a missing project secrets source. Initialize missing non-secret variables as `{}` without overwriting existing files. Install the ArcNet dependency before provisioning, then sync snapshots and validate. See the [command reference](https://github.com/mp-lb/tools/tree/main/packages/arcnet/docs/public).

3. Install and check:

   ```sh
   npx -y @mp-lb/arcnet@latest variables sync
   npx -y @mp-lb/arcnet@latest setup hello-world
   pnpm install
   pnpm exec arcnet check
   ```

4. Commit the generated files and push to `main`. For Cloud Run, complete the first-deployment step below **before** pushing.

Update the project's delivery context block (for FSS Stack, `agents-md/delivery.md`, or the existing project context directory). State that changes reaching `main` on GitHub deploy the selected application services and publish changed eligible packages through their configured workflows. Describe only delivery paths actually configured, retain any first-publish or first-deployment prerequisites, and tell agents to check the corresponding GitHub Actions runs. Rebuild and commit the generated agent context.

Omit `variables` and its sync command if no Forum values are needed. If YAML lists encrypted `secrets` sources, run `pnpm exec arcnet secrets add --key KEY --store STORE --path PATH --repository OWNER/REPO` for each source before `arcnet check`.

**First Cloud Run deployment:** An authorized operator must run `arcnet plan` and `arcnet deploy` locally before pushing. This creates GitHub's GCP trust relationship. Then add the resulting `identity` values to `arcnet.yaml` and push. [Environment prerequisites](initial-setup.md).

[Project files and supported capabilities](README.md) · [Command reference](https://github.com/mp-lb/tools/tree/main/packages/arcnet/docs/public)
