## What Belongs Where

`flatpack-shell/` owns real example project files:

- Basic monorepo config.
- Basic package config.
- Shared library packages.
- A simple backend.
- A simple publishable library.
- Release docs and release wiring for the target repo.

`fssstack/` owns the setup instructions an agent reads from Doctrine:

- Input collection.
- Target repo shape.
- Layering order.
- Commands to scaffold Vite, Next.js, backend, and library projects.
- Commands to validate the resulting target repo.
- References to standards docs and release process docs that should exist in the generated target repo.

Avoid putting fake working projects, copied package files, or framework app templates back into `fssstack/`. The docs should describe how to assemble the target repo and should reference real shell content or external scaffolders.

Opt-in deployment onboarding and non-secret network configuration live in `arcnet/`; the engine remains in Zapper and MGR operator migration is deferred until verified. The public shell remains deployment-free: `mp-lb-run/` is a tombstone (superseded by Zap Arc / ArcNet), and the public template carries no deployment opinions. Do not mix deployment-specific cloud configuration into the local-development shell unless the target repo genuinely needs it to run locally.

`authoring-tools/` is for scripts and tests used while maintaining this authoring repo. Some old setup scripts may be transitional while Flatpack moves from copied layer templates to shell plus augmentation.
