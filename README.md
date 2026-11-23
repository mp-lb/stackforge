# Stackforge

Stackforge is the source repository for FSS Stack's Forum content, shell, and
ArcNet delivery guidance, and the FastNative and ArcNative mobile setup paths.

## Folders

- `fssstack/`: Forum content (store `mp-lb/fssstack`) and the target-project shell.
- [ArcNet](arcnet/README.md) covers deployment and shared secrets.
- [FastNative](fastnative/README.md) covers standalone Expo app setup and native API integration.
- [ArcNative](arcnative/README.md) covers CI, EAS builds and updates, and the handoff to store testing.

The configurator and CLI live in the separate
[FSS Stack Start repository](https://github.com/mp-lb/fssstack-start). It
depends on this repository's basic `fssstack.yaml` input contract; keep it in
sync when that contract changes.

## Commands

Run shell checks from its owning folder:

```bash
pnpm -C fssstack/shell test
pnpm -C fssstack/shell build
```

The repository root is not an npm project.
