## Desktop application

This project uses Electron. Keep main-process, preload and renderer responsibilities separate. Preserve `nodeIntegration: false`, `contextIsolation: true`, and sandboxing; expose narrow validated preload APIs instead of raw IPC.

Use the configured desktop Zap profile and resolved development URL. The packaged app's hosted URL, local-preview requirements and assets are project-specific. A source build does not refresh an already packaged app: use the configured packaging task and verify the packaged result.

Local unsigned packaging, signing and release distribution are different operations. Follow the project's delivery instructions for releases, authentication handoff, offline recovery and updates.

Setup and updates: `fm read extensions/electron/README.md --store mp-lb/fssstack`.

Preserve configured Electron Kit integration, packaged offline recovery, window state and browser-auth handoff. See `fm read extensions/electron/integration.md --store mp-lb/fssstack`. When ArcNet is installed, activate its desktop release capability as part of Electron setup: `fm read desktop-releases.md --store mp-lb/arcnet`. Preserve release holds and custom workflows.
