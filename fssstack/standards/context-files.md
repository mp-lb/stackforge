# Context files

Context is the small set of recurring instructions an agent needs to work correctly. A dependency, framework or setup step does not automatically deserve a block. Prefer consequential, non-obvious project rules over generic programming advice.

## Default responsibilities

| Source | Responsibility |
| --- | --- |
| `context.md` | Where instructions live and how to edit, add, remove, compile and commit them |
| `project.md` | Purpose, package map, architecture, product constraints and related source repositories |
| `development.md` | Local setup, tools, processes, environment and debugging |
| `validation.md` | Check/test/build commands, evidence and execution restrictions |
| `scripts.md` | Script ownership, language and task exposure |
| `documentation.md` | Documentation locations and actual publication/sync mapping |
| `delivery.md` | Actual deployment and publication workflows, including their absence |
| `standards.md` | Only the commands to list and read shared standards |
| Remote MAP Lab code style | Shared style rules, imported directly from Forum in the index |

The shell has eight local content files plus `index.md`. MAP Lab's public code style remains part of the default compiled instructions, with one remote source at `context/code-style.md` in `mp-lb/fssstack`; do not copy it into each project. Preserve project-specific overrides in `project.md`, after the remote import.

Write operational instructions directly. Installed context must not contain authoring directions such as “adapt this block”, placeholders or a description of itself. Setup documents tell the installer how to specialize project paths, commands and facts. The context-maintenance instructions naturally explain the context system.

## Conditional instructions

| Capability | Treatment |
| --- | --- |
| shadcn frontend | `ui.md`: consistent component use, discovery/install commands, actual component locations and shared theme ownership |
| Libraries and CLIs | `library-cli.md` when package boundaries and local build/link behavior need explanation |
| Documentation site | `docs-website.md` when its authoring workflow needs explanation |
| ArcNet | `arcnet.md`, including secret/variable synchronization |
| Clerk / Clerk RBAC | Authentication and actual authorization rules in their focused payloads |
| Electron | Development, process boundaries, packaging and desktop delivery |
| Playwright | Add actual commands, lifecycle and restrictions to `validation.md`; no separate default block |
| Custom domains | Put actual domain/provider requirements in `delivery.md` |
| MongoDB, Redis, S3, BullMQ | No automatic context payload; setup remains in extension documentation |
| Backend | No generic backend block; important architecture belongs in `project.md` |

Extensions still own folders and can carry templates or other payloads without having a `context/` directory. Add context only when recurring, non-obvious instructions justify it. Do not move generic discarded prose into other blocks just to preserve it.

MAP Lab augmentation adds mise guidance to `development.md`: mise selects tools, then Zapper runs on top of them. There is no workflow block or mandatory toolchain block. Relationships to owned dependencies belong in `project.md`; they should identify where upstream changes belong and how to rebuild/relink them. Merge Clerk, Electron and Shad augmentation guidance into the existing subject files rather than adding MAP Lab-prefixed files.

Product-specific blocks remain project-owned. Keep a separate inventory of their purpose and preserve operational restrictions when reorganizing instructions.

## Composition and outputs

`context/index.md` uses explicit local `@filename.md` imports and a standalone remote Markdown link for MAP Lab code style:

```markdown
[MAP Lab code style](https://hyperdoc.forumlabs.net/ad089738-f27b-41ec-b77e-b4342f1773c6)
```

Keep blank lines around remote links. Put context maintenance first, shared style before project overrides, then other defaults, conditional instructions and product-specific knowledge. Every local source file must be reachable exactly once. Reference documents belong in `docs/`.

`zap task context-build` expands local imports with mdcompile, then remote links with `fm compile --stdin`, and writes matching `AGENTS.base.md`, `AGENTS.md` and `CLAUDE.md`. Forum access and an up-to-date shared `fm` CLI on PATH outside project `node_modules/.bin` are required to refresh remote rules. Missing local files or failed remote reads fail compilation; never silently omit required instructions. The committed generated outputs remain readable offline. Review changes to shared remote content when rebuilding.

Commit source and generated files together. `zap task context-copy` restores the two agent files from the shared base without network access. Do not edit generated files manually. Do not create `AGENTS.md` inside Stackforge's `fssstack/` authoring tree.

The shell compiler supports `--agents` or `--claude` to select an output and explicit extra context paths for private working copies. `--optional-extra` applies only to deliberately optional private files, never shared imports. Private additions must not be committed; restore shared outputs before committing.

## Reconciliation

Remove redundant files and their imports. Preserve unique product rules, production/data constraints and test permissions. Merge Playwright into validation, domains into delivery, ArcNet secrets into ArcNet, and augmentation instructions into the matching subject. Remove backend, workflow and dependency-only blocks. Replace local code-style copies with the remote import; keep local overrides explicit.

Verify all imports, remote expansion and matching generated outputs. Check extension context against actual implementation/configuration, but do not equate installed extensions with required blocks. Record retained project-specific knowledge and intentional exceptions in the project inventory.
