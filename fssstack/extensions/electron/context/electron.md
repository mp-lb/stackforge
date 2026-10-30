## Desktop application

This project uses Electron. Keep main-process, preload and renderer responsibilities separate. Preserve `nodeIntegration: false`, `contextIsolation: true`, and sandboxing; expose narrow validated preload APIs instead of raw IPC.

Use the configured desktop Zap profile and resolved development URL. The packaged app's hosted URL, local-preview requirements and assets are project-specific. A source build does not refresh an already packaged app: use the configured packaging task and verify the packaged result.

Local unsigned packaging, signing and release distribution are different operations. Follow the project's delivery instructions for releases, authentication handoff, offline recovery and updates.

Setup and updates: `fm read extensions/electron/README.md --store mp-lb/fssstack`.
