## What Belongs Where

`fssstack/shell/` owns real example project files:

- Basic monorepo config.
- Basic package config.
- Shared library packages.
- A simple backend.
- A simple publishable library.
- Release docs and release wiring for the target repo.

`fssstack/` owns the setup instructions an agent reads from Forum and the
shell they assemble:

- Input collection.
- Target repo shape.
- Layering order.
- Commands to scaffold Vite, Next.js, backend, and library projects.
- Commands to validate the resulting target repo.
- References to standards docs and release process docs that should exist in the generated target repo.

Avoid putting fake working projects, copied package files, or framework app
templates outside `fssstack/`. The docs should describe how to assemble the
target repo and should reference real shell content or external scaffolders.

The separate [FSS Stack Start repository](https://github.com/mp-lb/fssstack-start)
owns the configurator and CLI. Its only integration boundary here is the basic
`fssstack.yaml` input contract; keep that contract synchronized when it changes.

Opt-in deployment onboarding and non-secret network configuration live in
`arcnet/`; the engine remains in Zapper and operator credentials remain outside
Git. The public shell carries no deployment opinions. Do not mix
deployment-specific cloud configuration into the local-development shell unless
the target repo genuinely needs it to run locally.
