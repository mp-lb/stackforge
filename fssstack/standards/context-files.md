# Context files

The shell ships a complete `context/index.md` with small local source blocks: `context`, `project`, `development`, `validation`, `scripts`, `documentation` and `delivery`. Context maintenance is the first import and is independent of any organization augmentation.

## Standard block contract

Every FSS Stack project has these seven content blocks. The filenames identify responsibilities, not identical text: specialize commands, paths and constraints to the repository.

| Block | Owns | Does not own |
| --- | --- | --- |
| `context.md` | How to add, edit, remove, compile and commit blocks; extension payload locations; private additions | Product rules or organization policy |
| `project.md` | Purpose, scope, package map, architecture boundaries, related repositories, production/compatibility and data constraints | Startup commands or generic code style |
| `development.md` | Install/run/debug workflow, service management, hot reload, environment ownership, local tool pins | Test policy, publishing or context compilation instructions |
| `validation.md` | Actual check/test/build commands, required evidence, E2E/eval permissions and resource/spending limits | Product domain definitions or deployment triggers |
| `scripts.md` | Script language, location, ownership, lint/typecheck participation and task exposure | A duplicate list of all project commands |
| `documentation.md` | Documentation sources, generation/freshness checks, navigation and actual sync mapping | Copied documentation or release instructions |
| `delivery.md` | Actual deployment/publication targets, triggers, prerequisites, holds and verification; explicitly state when absent | Permission to deploy or publish merely because a workflow exists |

The baseline is small because it answers seven recurring questions in every project. `scripts` stays separate because it governs how automation is written, while `development` governs how the checkout runs. `delivery` stays present even in a local-only workbench so absence is explicit.

## Optional blocks and ownership

Add a block only when it carries instructions relevant to the installed project. A dependency declaration, an adapter library, or a stale setup manifest alone does not establish an installed service.

| Owner | Blocks | Inclusion rule |
| --- | --- | --- |
| Project-type setup | `ui`, `backend`, `library-cli`, `docs-website` | Actual frontend, API, published library/CLI or documentation site; specialize the package paths and commands |
| Extension | `arcnet` + `secrets`, `bull`, `clerk`, `clerk-rbac`, `domains`, `electron`, `mongodb`, `playwright`, `redis`, `s3` | Capability is configured; install from its extension folder; retain prerequisites and actual local/provider differences |
| MapLab augmentation | `maplab-workflow`, `maplab-standards`, `maplab-code-style` | Project adopts MapLab working conventions; these are not public-shell defaults |
| MapLab toolchain augmentation | `maplab-toolchain` | mise is configured; do not assert it for an npm/Expo checkout without mise |
| MapLab capability augmentation | `maplab-clerk`, `maplab-electron`, `maplab-shad` | The corresponding MapLab augmentation has actually been applied |
| Project | Domain vocabulary, business rules, engine/aggregate boundaries, scenario model, observability | Distinct product knowledge that cannot be expressed as a short part of a standard block |

Separate blocks should have separate responsibilities. For example, Playwright owns how browser tests are wired; validation owns whether/when they may run. ArcNet owns configuration/secrets mechanics; delivery owns the project's actual deployment triggers. A scenario block defines the scenario model; validation owns execution and spending constraints.

## Reconcile existing assortments

Use this mapping instead of retaining synonymous files alongside the baseline:

| Legacy block | Destination |
| --- | --- |
| `packages`, `workspace`, `project-mode`, `related-codebases` | `project.md` |
| `running-the-project`, `working-locally` | `development.md` |
| `agent-responsibility` | Split local operation into `development.md`, testing boundaries into `validation.md`, private workspace rules into `project.md` |
| `verification` | `validation.md` |
| `publishing` | `delivery.md` |
| `commands` | Classify each command into development, validation or delivery |
| `documentation-freshness` | `documentation.md` |
| `ui-components` | `ui.md` |
| `cli-changes` | `library-cli.md` |
| Generic `code-organization` | MapLab's `maplab-code-style.md`; preserve genuine project overrides there |
| `the-template` | Replace obsolete template-sync guidance with current Stackforge provenance in `project.md` |

Preserve unique rules and explicit restrictions when merging. Do not infer current production status from old template text or promote a project's disposable-data policy into a shared default. Remove unused files after checking nested imports and repository references; an unimported file does not supply instructions. Keep product-specific blocks where their distinct content warrants one.

Order the index as baseline, project types, extensions, organization augmentations, then product-specific blocks. Use comments to identify those groups. Keep ordinary instructions in the blocks, not interspersed in the index. Every shared Markdown file in `context/` should be reachable from the index; put reference documents in `docs/` instead. Do not keep one-line alias blocks just to preserve obsolete filenames.

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
