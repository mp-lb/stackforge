# Electron setup compatibility

Electron no longer needs a separate MAP Lab augmentation.

- Application setup and Electron Kit integration: `fm read extensions/electron/README.md --store mp-lb/fssstack` and `fm read extensions/electron/integration.md --store mp-lb/fssstack`.
- Signing, release workflows, installer distribution and feeds: `fm read desktop-releases.md --store mp-lb/arcnet`.

ArcNet’s desktop capability is available before Electron is installed. The Electron extension activates it when added to an ArcNet project; projects without a desktop app need no dormant workflow or signing consumers. Preserve existing custom release policies.
