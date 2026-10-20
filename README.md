# Stackforge

Stackforge is the source repository for FSS Stack's Forum content, shell, and
optional ArcNet and mobile guidance.

## Folders

- `fssstack/`: Forum content (store `mp-lb/fssstack`) and the target-project shell.
- `arcnet/`: opt-in deployment onboarding and non-secret network configuration; see [setup and migration prerequisites](arcnet/README.md). The engine stays in Zapper.
- `fssstack-mobile/`: mobile setup and release guidance, templates, and snippets for FSS Stack projects.

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
