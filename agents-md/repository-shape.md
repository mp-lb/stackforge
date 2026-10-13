## Repository Shape

The root of this git repo should stay thin. It is a wrapper with documentation and a few sibling projects:

- `fssstack-start/` is the Next.js landing page and prompt builder.
- `flatpack-shell/` is the minimal working target-repo shell monorepo.
- `fssstack/` is the Doctrine payload for creating FSS Stack target projects.
- `arcnet/` owns opt-in deployment onboarding and non-secret network config; the engine stays in Zapper and operator credentials remain outside Git.
- `mp-lb-run/` is a tombstone — deployment moved to Zap Arc (zapper repo) on ArcNet (`arcnet/`, how-to in `arcnet/SETUP.md`). Only the tombstone README remains.
- `authoring-tools/` contains authoring-time scripts, tests, and build tooling that may generate Doctrine payload files.

Do not turn the repository root into an npm project. Run package-manager commands from the owning subproject with `pnpm -C <folder> ...`.
