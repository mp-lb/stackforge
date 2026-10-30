# Context inventory

Reconciled 30 October 2026. Stackforge owns the shared defaults and extension installation policy; project maintainers own local facts and product-specific rules. Factory aliases Berth.

## Default set

All 15 consumers have eight local defaults: `context`, `project`, `development`, `validation`, `scripts`, `documentation`, `delivery` and the short `standards` lookup. Code style is one remote Forum import, expanded during context build. Forum retains its tech-debt path override in `project.md`.

Context builds call the shared Tools `mdcompile` CLI and Forum `fm compile` directly. Only `AGENTS.md` and `CLAUDE.md` are generated. Each project has one `context-build` task, with no copied compiler implementation or copy/proxy tasks.

Mise setup is merged into development, beneath Zapper. Related owned repositories are described in project. Workflow and generic backend blocks are removed. MAP Lab Clerk, Electron and loading-UI additions are merged into their existing subject files. No separate MAP Lab-prefixed or toolchain blocks remain.

## Current context counts

Counts include `index.md`, exclude the remote style source and do not measure installed dependencies.

| Project | Previous files | Current files | Separate extension context |
| --- | ---: | ---: | --- |
| berth | 26 | 14 | arcnet, clerk, electron |
| contract-analyser | 14 | 11 | None |
| forum | 30 | 16 | arcnet, clerk, clerk-rbac, electron |
| fssstack-start | 17 | 12 | arcnet |
| helloworld | 14 | 10 | None |
| inproduct | 21 | 12 | arcnet |
| lexiquest | 25 | 14 | arcnet, clerk, clerk-rbac |
| maddi | 31 | 21 | clerk, clerk-rbac |
| mdkit | 17 | 11 | arcnet |
| nexus | 20 | 12 | None |
| tools | 15 | 11 | arcnet |
| zapper | 17 | 12 | arcnet |
| zog | 17 | 11 | arcnet |
| shad | 16 | 11 | arcnet |
| forum-mobile | 13 | 10 | clerk |

All ten extensions were reviewed. Redis, MongoDB, S3 and BullMQ no longer install context blocks. Playwright details live in validation; domain facts live in delivery; secret synchronization lives in ArcNet. Installation evidence remains in code/configuration, not an instruction block for each dependency. Library adapters do not imply deployed services.

## Project-specific blocks

These are intentional additions, owned by the named project. They were preserved byte-for-byte during the defaults/extension-completeness update. Facts embedded in standard blocks remain project-owned too; this table inventories the separate product blocks.

| Project | Block | Purpose |
| --- | --- | --- |
| contract-analyser | `workbench.md` | CLI-only repository scope, analyser boundaries and evaluation behavior. |
| forum | `product-terminology.md` | Forum product vocabulary. |
| lexiquest | `glossary.md` | LexiQuest domain vocabulary and naming conventions. |
| maddi | `the-engine.md` | Maddi engine model and consequential operational rules. |
| maddi | `the-property-aggregate.md` | Maddi’s event-sourced property boundary. |
| maddi | `work-systems.md` | Maddi capability boundaries and readiness documentation. |
| maddi | `the-agents.md` | Maddi agent and toolset model. |
| maddi | `debugging-through-trpc.md` | Maddi’s supported runtime investigation and observability commands. |
| maddi | `scenarios.md` | Maddi scenario model and entry points; validation owns execution restrictions. |
| maddi | `business-rules.md` | Maddi’s durable rule ledger and evidence semantics. |
| maddi | `langfuse.md` | Maddi tracing and prompt ownership. |
| nexus | `toolbox.md` | Nexus Toolbox package boundaries and API verification requirements. |

All other audited projects have no separate product-specific blocks. Do not remove a product block merely to equalize counts; merge only when its responsibility belongs in a standard block and its unique constraints are preserved.

## Mise and maintenance

All 15 consumers retain mise with their existing version pins and package managers. Forum Mobile remains npm-based. The public shell stays independent of mise; the augmentation adds it to every adopting project.

When updating context, preserve product-specific knowledge and existing execution restrictions. Verify required imports resolve once, the shared remote style expands, both outputs match, and there are no orphaned or boilerplate dependency blocks. Update this inventory when responsibilities change.
