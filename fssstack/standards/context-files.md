# Context files

The shell ships a complete `context/index.md` with small local source blocks: `context`, `project`, `development`, `validation`, `scripts`, `documentation` and `delivery`. Context maintenance is the first import and is independent of any organization augmentation.

## Composition and outputs

Use explicit `@filename.md` imports in `context/index.md`. A file is included only when imported. Required local imports must exist; do not use blanket optional compilation. Keep the repository self-contained by copying the selected shell, project-type, extension and augmentation payloads locally. Longer standards can be read on demand.

`zap task context-build` compiles the index into `AGENTS.base.md`, then writes identical `AGENTS.md` and `CLAUDE.md` outputs. Commit all three generated files with source changes in target projects. Do not hand-edit or gitignore the generated files. `zap task context-copy` restores both root files from the base without recompiling.

The shell compiler uses mdcompile for local imports. It does not expand standalone Forum links. If an existing project deliberately composes remote content, preserve its explicit Forum compilation stage until that content has been migrated to local blocks. Compile it once into the base, then copy the base to both outputs.

## Local additions

The compiler accepts `--agents` or `--claude` to select an output. With neither flag it writes both. `zap task context-build -- ~/personal.md` appends explicitly selected private context to the local agent files, never to the shared base. Use `--optional-extra` only for deliberately optional personal files. Private additions must not be committed; restore shared outputs with `zap task context-copy`.

`AGENTS.local.md` and `AGENTS_WORKTREE.md` remain ignored. They are not automatically imported by the compiler; use the project's documented explicit local/worktree mechanism.

## Adding capabilities

Each extension lives at `extensions/<extension>/README.md`, with `context/` payloads and any templates alongside it. Follow its source-to-target mapping, adapt project details, import each block exactly once and rebuild. On updates, merge with customized installed blocks. Setup documents are not themselves always-loaded context.

Project-type setup owns conditional frontend, backend, CLI/library and docs-site guidance. MapLab augmentation owns organization workflow, standards and account choices. Product facts and specialized validation policies remain project-local.

## Migration checks

Remove obsolete missing imports after reviewing their replacement. Preserve production-state and testing constraints. Verify required imports resolve, no block is imported twice, extension paths use the directory entry point, and the three shared outputs match. Context compilation must fail rather than silently omit a required block.
