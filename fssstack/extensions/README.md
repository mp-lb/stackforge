# Extensions

Each optional capability has its own directory. Start with `extensions/<extension>/README.md` (for example, `fm read extensions/clerk/README.md --store mp-lb/fssstack`). Setup instructions own prerequisites, code/configuration changes, payload mappings, validation and any necessary context updates.

| Extension | Instructions |
| --- | --- |
| ArcNet | [Setup](arcnet/README.md) |
| BullMQ | [Setup](bull/README.md), requires Redis |
| Clerk | [Setup](clerk/README.md) |
| Clerk RBAC | [Setup](clerk-rbac/README.md), requires Clerk |
| Custom domains | [Setup](custom-domains/README.md), requires configured hosting |
| Electron | [Setup](electron/README.md) |
| MongoDB | [Setup](mongodb/README.md) |
| Playwright | [Setup](playwright/README.md) |
| Redis | [Setup](redis/README.md) |
| S3 | [Setup](s3/README.md) |

## Payload convention

An optional `context/` directory contains consequential, non-obvious instructions needed repeatedly after installation. Only Clerk, Clerk RBAC, ArcNet and Electron currently carry these payloads. Redis, MongoDB, S3 and BullMQ do not need a block just because they are installed; Playwright updates validation and custom domains update delivery. `templates/` contains copyable project files where needed; Electron includes complete desktop templates. Add other payload folders only when they have real contents. Each README specifies source-to-target paths and project-specific adaptations. Do not copy whole extension tutorials into agent context.

Copy context payloads into the target's `context/`, adapt them, import them explicitly from `context/index.md` and run `zap task context-build`. A copy alone does not register a block. Merge with existing customized files on upgrades and avoid duplicate imports.

The public shell stays deployment-free. ArcNet is opt-in; organization accounts and shared-source defaults belong to augmentations. Extension instructions must be usable from published Forum/GitHub content without a local Stackforge checkout.
