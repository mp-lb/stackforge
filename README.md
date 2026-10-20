# Stackforge

Stackforge is the workbench for FSS Stack: a thin wrapper around separate working projects and Forum content. It authors the `fssstack` Forum store and the landing page.

## Folders

- `fssstack-start/`: Next.js landing page and prompt builder.
- `fssstack-cli/`: Publishable `@mp-lb/fssstack` command-line configurator; see [usage and validation](fssstack-cli/README.md).
- `flatpack-shell/`: Minimal working target-repo shell monorepo.
- `fssstack/`: Forum content (store `mp-lb/fssstack`) for creating FSS Stack target projects.
- `arcnet/`: opt-in deployment onboarding and non-secret network configuration; see [setup and migration prerequisites](arcnet/README.md). The engine stays in Zapper.
- `fssstack-mobile/`: mobile setup and release guidance, templates, and snippets for FSS Stack projects.
- `guides/`: the **advisory** tier — strong-default playbooks where deviation is expected. Contrast with the **canon** tier above (`fssstack/`), which is followed to a tee. Plain git for now.
- `examples/`: local generated repos and experiments.

## Commands

Run commands from the project that owns them:

```bash
pnpm -C fssstack-start dev
pnpm -C fssstack-start build
pnpm -C flatpack-shell test
pnpm -C flatpack-shell build
```

The repository root is not an npm project.
