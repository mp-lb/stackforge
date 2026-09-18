# Stackforge

Stackforge is the workbench for FSS Stack: a thin wrapper around separate working projects and Doctrine payloads. It authors the `fssstack` template store and the landing page.

## Folders

- `fssstack-start/`: Next.js landing page and prompt builder.
- `flatpack-shell/`: Minimal working target-repo shell monorepo.
- `authoring-tools/`: npm project for building and testing generated Doctrine scripts.
- `fssstack/`: Doctrine payload (store `mp-lb/fssstack`) for creating FSS Stack target projects.
- `mp-lb-run/`: tombstone (store `mp-lb/mp-lb-run`). Deployment moved to Zap Arc (zapper repo) on ArcNet (`mgr/arcnet/`, `mgr/processes/deploy.md`).
- `guides/`: the **advisory** tier — strong-default playbooks where deviation is expected (electron, macos, security, publishing as single files; `react-native/` and `observability/` as subfolders because they carry snippets / rollout state). Contrast with the **canon** tier above (`fssstack/`), which is followed to a tee. Plain git for now.
- `examples/`: local generated repos and experiments.

## Commands

Run commands from the project that owns them:

```bash
pnpm -C fssstack-start dev
pnpm -C fssstack-start build
pnpm -C flatpack-shell test
pnpm -C flatpack-shell build
pnpm -C authoring-tools check:docs
pnpm -C authoring-tools build:docs
```

The repository root is not an npm project.
