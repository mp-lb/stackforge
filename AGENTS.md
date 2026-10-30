## Agent context

Shared agent instructions live in `context/`. `context/index.md` explicitly imports blocks with `@filename.md`, in order. Files that are not imported are not included.

Edit source blocks, not generated root files. To add a block, create it and add its import to the index. To remove one, remove the import and unused file. Keep rules short and specific to the actual project.

Run `zap task context-build` after changes. Review and commit the source changes together with `AGENTS.base.md`, `AGENTS.md`, and `CLAUDE.md`. Without personal additions, all three outputs should match. Missing shared imports are errors, not optional omissions.

Keep private and machine-specific instructions out of committed context. The compiler supports explicit extra context paths for a local working copy; never commit those additions. `zap task context-copy` restores the root agent files from the shared base.

Extensions are documented at `extensions/<extension>/README.md` in the FSS Stack source (read with `fm read extensions/<extension>/README.md --store mp-lb/fssstack`). Each extension owns its context and other payloads. When installing one, copy its context payload, adapt it to the project, add the import once, and rebuild. Merge updates into existing customized blocks instead of overwriting them.

# Stackforge

Always read this file when starting new chats.

Stackforge is the authoring workbench for the FSS Stack setup system. It is not itself the target application. The target application is a separate repo assembled by an agent after reading the published Forum content.

## Repository Shape

The root of this git repo should stay thin. It owns the FSS Stack source content:

- `fssstack/` is the Forum content and shell for creating FSS Stack target projects.
- `arcnet/` owns opt-in deployment onboarding and non-secret network config; the engine stays in Zapper and operator credentials remain outside Git.
- `fssstack-mobile/` owns mobile setup and release guidance.

[`fssstack-start`](https://github.com/mp-lb/fssstack-start) is a separate
downstream repository. It owns the configurator and CLI, and depends on this
project's FSS Stack setup contract. When changing the basic project inputs in
`fssstack.yaml`, keep that repository in sync; do not add it back to this
checkout.

Do not turn the repository root into an npm project. Run package-manager
commands from the owning subproject.

## Mental Model

FSS Stack is a repo setup process. It gives an agent enough instructions and
local building blocks to assemble a real target repo.

The current direction is:

1. Start from a real shell repo.
2. Layer project types into that shell.
3. Use standard scaffolding tools for thick app frameworks.
4. Copy and augment simple local examples for lightweight project types.

The shell is represented by `fssstack/shell/`. It is a working monorepo, not
pseudo-template code. It should install, typecheck, test, build, and run
locally. The published setup process fetches it into a target repository.

Target setup instructions create Vite or Next.js apps with the appropriate
external scaffolders, and create simple backends and libraries by copying shell
examples and applying the documented wiring.

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

## Root commands

The root has no `package.json`. Use the owning folder:

- Rebuild local agent instructions: `zap task context-build`
- Shell install: `pnpm -C fssstack/shell install`
- Shell typecheck: `pnpm -C fssstack/shell typecheck`
- Shell test: `pnpm -C fssstack/shell test`
- Shell build: `pnpm -C fssstack/shell build`

The root `zap.yaml` provides authoring tasks and mobile-script checks. Run
`zap t mobile-scripts-setup` once, then `zap t mobile-scripts-check`; use
`zap t mobile-apply-inputs -- <inputs.env> <target-directory>` for mobile setup.
Target projects use the separate `fssstack/shell/zap.yaml`.

## Documentation

Stackforge authors shared Forum content. Its two sync targets publish `fssstack/` to `mp-lb/fssstack` and `arcnet/` to `mp-lb/arcnet`; these are source trees, rather than a project-specific `docs/` folder. Run `fm sync` from the repository root before changing mapped content and again after committing it. Resolve conflicts before continuing.

Do not add `AGENTS.md` inside `fssstack/` or generate setup scripts. Edit the relevant source documents or templates, run focused validation, commit the change, and publish the mapped files. The setup process must remain followable from the published instructions.

Read shared standards with `fm read <file>.md --store mp-lb/dev` and shared extensions with `fm read extensions/<extension>/README.md --store mp-lb/fssstack`.

## Validation Expectations

For `fssstack/shell/` changes, prefer:

```bash
pnpm -C fssstack/shell install
pnpm -C fssstack/shell typecheck
pnpm -C fssstack/shell test
pnpm -C fssstack/shell build
```

When validating local run behavior, use Zapper:

```bash
zap t setup
zap up
zap o
```

For `fssstack/` changes, compare the setup instructions against the actual
`fssstack/shell/` shape. The docs must not assume this authoring checkout exists
inside the generated target repo.

When a change alters the basic `fssstack.yaml` input contract, update the
separate [FSS Stack Start repository](https://github.com/mp-lb/fssstack-start)
as part of that work.

## Scripts

Write project scripts in TypeScript in the package that owns the behaviour, or `packages/scripts` when there is no natural owner, and include them in normal lint and typecheck checks. Expose each script as a thin Zap task that invokes it with `tsx` (for example, `zap t somemigration` runs `packages/scripts/somemigration.ts`); keep CI callers aligned when moving scripts.
