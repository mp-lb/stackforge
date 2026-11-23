# Context inventory

Current ownership (24 November 2026): FSS Stack owns tool selection, code style and shared context defaults. ArcNet owns desktop release setup. Older augmentation context paths are compatibility references. The adoption notes below are historical; no downstream context recompilation is required by this change.

Reconciled 30 October 2026. Stackforge owns the shared defaults and extension installation policy; project maintainers own local facts and product-specific rules. Factory aliases Berth.

## Shared and local context

Reconciled 31 October 2026. Projects import shared standards, scripts and documentation from Forum, and use remote development, validation, UI and ArcNet blocks where they apply. `project.md` and project-specific development, validation, UI, documentation and delivery details remain local. The former library/CLI block has been removed.

The FSS Stack shell imports the standard blocks remotely for new projects. Agent context and the default development and validation blocks live in `mp-lb/fssstack`; development (including mise) now lives in `mp-lb/fssstack`; the old augmentation path forwards to it. ArcNet and delivery context live in `mp-lb/arcnet`; compilation expands Forum links after local blocks and writes matching `AGENTS.md` and `CLAUDE.md`.

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

Other projects may retain local blocks for their specific operational details. Do not remove a product block merely to equalize counts; merge only when its responsibility belongs in a standard block and its unique constraints are preserved.

## Mise and maintenance

All 15 consumers retain mise with their existing version pins and package managers. Forum Mobile remains npm-based. The shell now includes mise directly; existing projects retain their pins.

When updating context, preserve product-specific knowledge and existing execution restrictions. Verify required imports resolve once, the shared remote style expands, both outputs match, and there are no orphaned or boilerplate dependency blocks. Update this inventory when responsibilities change.


## Termkit adoption

31 October 2026: Termkit uses mise with the Fssstack Node/pnpm pins, the MAP Lab development and code-style imports, Fumadocs documentation guidance, shared frontend UI, and full ArcNet/delivery context. Its Next.js landing page hosts the static docs at `/docs`. Local project context records the library scope, docs generation/staging, related tooling repositories, Forum deployment sources and consumers. The package stays private pending its first release.
