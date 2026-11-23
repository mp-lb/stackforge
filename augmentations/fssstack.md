# FSS Stack augmentation compatibility

Tool selection, code style and shared context now belong to FSS Stack itself. Follow `fm read SETUP_PROCESS.md --store mp-lb/fssstack` and `fm read tool-selection.md --store mp-lb/fssstack`. New projects keep the shell’s default context imports. Existing projects may retain their compiled context and choose when to refresh it; old remote context links remain compatibility references.

The project-creation skill chooses ArcNet capabilities and records the selected layers. Do not repeat that selection here.

For React frontends, continue to apply the [Shad augmentation](shad.md). For Clerk account/provider setup, continue to apply the [Clerk augmentation](clerk.md). Their behavior is unchanged.

Electron application integration now lives in `extensions/electron/README.md` in `mp-lb/fssstack`; desktop releases live in `desktop-releases.md` in `mp-lb/arcnet`.
