# Context inventory

Last reconciled: 30 October 2026. Owner: the project’s maintainer; Stackforge owns the shared defaults and extension payloads. Update this inventory when onboarding a project, installing/removing a capability, or adding a product-specific block.

## Scope and defaults

This inventory covers 13 primary FSS Stack checkouts and the related Shad and Forum Mobile consumers. Factory is the Berth checkout’s alias. Archived/duplicate checkouts are excluded. Stackforge itself is an authoring workbench, not a generated target.

All rows use the nine defaults: `context`, `project`, `standards`, `code-style`, `development`, `validation`, `scripts`, `documentation`, `delivery`. MAP Lab’s public standards and code style ship with FSS Stack. All rows also receive MapLab’s `maplab-workflow` and `maplab-toolchain` blocks and mise configuration. Existing package managers and version pins are preserved; Forum Mobile remains npm-based.

## Extension coverage

The installed context is checked against owning packages plus actual initialization/configuration. `fssstack.yaml` is setup input and is often stale; empty extension lists do not describe current capability use. “domains” is the custom-domains extension; “secrets” is included with ArcNet and not counted as a separate extension. These are repository configuration findings, not a certification of live provider state.

| Project | Extension context | Evidence / qualification |
| --- | --- | --- |
| berth | arcnet, clerk, mongodb, redis, bull, electron, domains | `apps/api`, `apps/web`, `apps/desktop`, `packages/server`, `zap.yaml`, `.arcnet/arcnet.yaml`. |
| contract-analyser | None | CLI workbench; no configured extension capability. |
| forum | arcnet, clerk, clerk-rbac, mongodb, redis, bull, s3, playwright, electron, domains | Backend authentication/role resolution, `packages/job-system`, desktop app, E2E package and ArcNet configuration. |
| fssstack-start | arcnet, domains | ArcNet configuration and its declared domain; no app database/auth extension. |
| helloworld | None | Shell application examples; no configured extension capability. |
| inproduct | arcnet, mongodb, s3, playwright, domains | ArcNet configuration; storage package Mongo/S3 adapters (library capability, not a deployed database); `tests/docs/playwright.config.ts`. |
| lexiquest | arcnet, clerk, clerk-rbac, mongodb, redis, bull, s3, domains | Server/worker packages, Clerk metadata role lookup in `packages/server/src/auth.ts`, ArcNet configuration. |
| maddi | clerk, clerk-rbac, mongodb, redis, bull, s3, playwright | Server, DB and worker packages; `accessPrincipal.ts` role resolver; E2E package. No ArcNet config. |
| mdkit | arcnet, domains | ArcNet configuration and its declared domains; no configured auth/database capability. |
| nexus | mongodb, redis, bull, s3 | Server and domain packages own Mongo, queues/Redis and S3. App-owned authorization is not Clerk RBAC. |
| tools | arcnet | ArcNet configuration. `electron-kit`, `mobile-clerk` and `fssstack-testing` are reusable library implementations/helpers, not installed desktop/auth/database/browser-test applications; do not add misleading runtime blocks. |
| zapper | arcnet, domains | ArcNet configuration and its declared domains; VM E2E tests are not Playwright. |
| zog | arcnet, mongodb, domains | ArcNet configuration and Mongo-backed library behavior; Mongo context is scoped to that library. |
| shad | arcnet, domains | `.arcnet/arcnet.yaml` declares the Vercel docs/registry site and `shad.mp-lb.dev`. |
| forum-mobile | clerk | `app/_layout.tsx` Clerk provider/token cache; `app/sign-in.tsx`; `lib/TrpcProvider.tsx` and `lib/trpc.ts`. Native client; authorization is enforced by Forum backend. |

The audit covers all ten available extensions. Six missing blocks were added: Clerk RBAC in Forum, LexiQuest and Maddi; Playwright in InProduct; Clerk in Forum Mobile; and custom domains in Shad. Existing blocks were retained with their local adaptations. Installation is an atomic documentation step: copy the extension payload, specialize it, import it, and rebuild alongside the capability change.

RBAC blocks describe each installed model rather than imposing the setup example: Forum separates global roles from workspace permissions; LexiQuest reads verified users’ metadata on requests; Maddi preserves its explicit-user denial, local fallback and revocation behavior. InProduct’s docs-browser tests keep their existing explicit browser-test permission requirement.

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

## Mise policy

Mise is required by the MapLab augmentation in every audited project. The public shell remains independent of mise. Node is selected from `.node-version`; pnpm projects read `package.json#packageManager`. npm projects use the npm bundled with the selected Node. The configuration does not duplicate those pins.

The 13 FSS Stack projects already used this setup. Shad’s partial pnpm-only setup now reads its existing pnpm pin and an explicit Node 22.23.4 pin, consistent with its Node 22 CI configuration. Forum Mobile selects Node 22.17.1 from its existing EAS build profiles and retains npm. No existing Node/pnpm pins were upgraded.

## Maintenance checks

Confirm all nine defaults and the two augmentation blocks are reachable exactly once. Compare extension imports with actual implementation/configuration, including prerequisites and ArcNet’s secrets block. Record library-only cases explicitly. Keep this product-block table current. Compile with each project’s `zap task context-build`, review the diff, and commit all three shared outputs with the source changes. Test permissions in validation remain authoritative.
