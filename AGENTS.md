# Stackforge

Always read this file when starting new chats.

Stackforge is the authoring workbench for the FSS Stack setup system. It is not itself the target application. The target application is a separate repo assembled by an agent after reading the published Doctrine docs.

## Repository Shape

The root of this git repo should stay thin. It is a wrapper with documentation and a few sibling projects:

- `fssstack-start/` is the Next.js landing page and prompt builder.
- `flatpack-shell/` is the minimal working target-repo shell monorepo.
- `fssstack/` is the Doctrine payload for creating FSS Stack target projects.
- `arcnet/` owns opt-in deployment onboarding and non-secret network config; the engine stays in Zapper and operator credentials remain outside Git.
- `mp-lb-run/` is a tombstone — deployment moved to Zap Arc (zapper repo) on ArcNet (`arcnet/`, how-to in `arcnet/SETUP.md`). Only the tombstone README remains.
- `authoring-tools/` contains authoring-time scripts, tests, and build tooling that may generate Doctrine payload files.

Do not turn the repository root into an npm project. Run package-manager commands from the owning subproject with `pnpm -C <folder> ...`.

## Mental Model

Flatpack is a repo setup process. It gives an agent enough instructions and local building blocks to assemble a real target repo.

The current direction is:

1. Start from a real shell repo.
2. Layer project types into that shell.
3. Use standard scaffolding tools for thick app frameworks.
4. Copy and augment simple local examples for lightweight project types.

The shell is represented by `flatpack-shell/`. It should be a working monorepo, not pseudo-template code. It should install, typecheck, test, build, and run locally. When setup docs say to start from the base shell, the target-agent-facing form is expected to be something like:

```bash
fm clone example-repo ./
```

After that, target setup instructions can tell the agent to create Vite or Next.js apps with the appropriate external scaffolders, and to create simple backends and libraries by copying examples from the shell and running augment scripts.

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

Opt-in deployment onboarding and non-secret network configuration live in `arcnet/`; the engine remains in Zapper and operator credentials remain outside Git. The public shell remains deployment-free: `mp-lb-run/` is a tombstone (superseded by Zap Arc / ArcNet), and the public template carries no deployment opinions. Do not mix deployment-specific cloud configuration into the local-development shell unless the target repo genuinely needs it to run locally.

`authoring-tools/` is for scripts and tests used while maintaining this authoring repo. Some old setup scripts may be transitional while Flatpack moves from copied layer templates to shell plus augmentation.

## Root Commands

The root has no `package.json`. Use the owning folder:

- Landing page dev: `pnpm -C fssstack-start dev`
- Landing page build: `pnpm -C fssstack-start build`
- Landing page lint: `pnpm -C fssstack-start lint`
- Landing page test: `pnpm -C fssstack-start test`
- Shell install: `pnpm -C flatpack-shell install`
- Shell typecheck: `pnpm -C flatpack-shell typecheck`
- Shell test: `pnpm -C flatpack-shell test`
- Shell build: `pnpm -C flatpack-shell build`
- Authoring docs check: `pnpm -C authoring-tools check:docs`
- Authoring docs build: `pnpm -C authoring-tools build:docs`

The root `zap.yaml` is only a convenience wrapper for quickly running the shell example. The target repo shell also has its own `flatpack-shell/zap.yaml`.

## Doctrine Payload Rules

Do not add `AGENTS.md` files inside `fssstack/` or `mp-lb-run/`. Those folders are published payloads, not standalone working repos in this checkout.

For Doctrine payload changes:

1. Edit the relevant docs, templates, shell files, deployment files, or authoring source in this repository.
2. If generated script behavior changes, edit the source under `authoring-tools/` rather than hand-editing built artifacts.
3. Run focused validation for the changed surface.
4. If generated Doctrine artifacts are still involved, run `pnpm -C authoring-tools build:docs`.
5. Commit changes in this repository.
6. Publish Doctrine payloads with `fm pull`, `fm push`, or `fm git sync` as appropriate.

Do not edit built `.mjs` files directly unless doing an emergency published-artifact patch.

## Validation Expectations

For `flatpack-shell/` changes, prefer:

```bash
pnpm -C flatpack-shell install
pnpm -C flatpack-shell typecheck
pnpm -C flatpack-shell test
pnpm -C flatpack-shell build
```

When validating local run behavior, use Zapper:

```bash
zap t setup
zap up
zap o
```

For `fssstack-start/` changes, use the fssstack-start commands. Before changing framework-sensitive Next.js behavior, check the relevant guide in `fssstack-start/node_modules/next/dist/docs/`.

For `fssstack/` changes, read `TARGET_PROJECT_SHAPE.md` if present and compare the instructions against the actual `flatpack-shell/` shape. The docs must not assume this authoring checkout exists inside the generated target repo.
