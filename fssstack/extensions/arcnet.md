# ArcNet deployment extension

Read and follow the [ArcNet setup guide](https://raw.githubusercontent.com/mp-lb/stackforge/refs/heads/main/arcnet/SETUP.md). It owns the installation steps, requirements, supported deployment targets and validation.

## FSS Stack conventions

Apply after the base project validates. Use these conventions for the project-specific choices in the ArcNet guide:

- **Service selection:** use the real service names from `zap.yaml` and package names from `apps/*/package.json`. Put Terraform service selections in `.arcnet/services.json`. Deploy only the selected apps; local development databases and package-release jobs are not deployment services.
- **Dockerfiles:** use `.arcnet/Dockerfile` for a single container app, or `.arcnet/<service>.Dockerfile` for several. Each image runs one app. Set each service's `dockerfile` explicitly; use the repository root as the Docker build context.
- **Workspace builds:** use Node 22+ and the root's exact pnpm version. Install with the committed lockfile and build the selected package plus its workspace dependencies with `pnpm --filter '<package-name>...' build`. Include the workspace manifests, shared config and required packages, not just the app directory.
- **Container startup:** default to the app's existing production `start` script, never its watch/dev command. The shell uses `tsx` and source-exporting workspace packages: retain their required source and runtime dependencies in the image, including `tsx`. Do not assume TypeScript compilation alone makes `node dist/index.js` runnable. Exclude secrets and local `.env` files from the image.
- **HTTP backends:** listen on `0.0.0.0`, honor the hosting provider's `PORT` before the app's local port variable, and serve `/health`. Match the ArcNet port and health settings to the app. Keep local Zap port behavior working.
- **Frontends and Bull:** Vite apps normally build to `apps/<service>/dist`; configure an SPA fallback when needed. Treat Next.js and SSR docs as framework deployments, not static folders. Use the Bull extension for queue code and the project's namespace for producers and workers; shared Redis/Bull hosting remains planned, as documented in ArcNet.

Use the [hello-world reference project](https://github.com/mp-lb/stackforge/tree/main/helloworld) for concrete package/layout examples. Verify the selected app builds and container startup before declaring deployment ready. Keep provider setup and deployment mechanics in the ArcNet guide.
