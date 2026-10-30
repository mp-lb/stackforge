# Context sources

The shell owns eight local default files and an index importing MAP Lab's public code style remotely from `context/code-style.md` in this store. Do not copy the shared style source into target projects.

Install `ui.md`, `library-cli.md` or `docs-website.md` only where their instructions apply. There is no generic backend payload. Specialize actual paths and commands during setup; installed instructions describe operation, not how to adapt themselves.

Extensions may own context, templates or other payloads. Only Clerk, Clerk RBAC, ArcNet and Electron currently need separate context payloads. MAP Lab augmentation merges local mise setup and capability-specific conventions into existing subject files. See [Context files](../standards/context-files.md).
