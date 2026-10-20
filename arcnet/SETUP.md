# Add ArcNet to a project

Start with a working Zap/pnpm/GitHub project and an [ArcNet environment](initial-setup.md).

1. Create `.arcnet/arcnet.yaml`. Start with this; add only the capabilities the project ships:

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

Omit `variables` and its sync command if no Forum values are needed. If YAML lists encrypted `secrets` sources, run `pnpm exec arcnet secrets add --key KEY --store STORE --path PATH --repository OWNER/REPO` for each source before `arcnet check`.

**First Cloud Run deployment:** An authorized operator must run `arcnet plan` and `arcnet deploy` locally before pushing. This creates GitHub's GCP trust relationship. Then add the resulting `identity` values to `arcnet.yaml` and push. [Environment prerequisites](initial-setup.md).

[Project files and supported capabilities](README.md) · [Command reference](https://github.com/mp-lb/tools/tree/main/packages/arcnet/docs/public)
