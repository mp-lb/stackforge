## Doctrine Payload Rules

Do not add `AGENTS.md` files inside `fssstack/` or `mp-lb-run/`. Those folders are published payloads, not standalone working repos in this checkout.

For Doctrine payload changes:

1. Edit the relevant docs, templates, shell files, deployment files, or authoring source in this repository.
2. If generated script behavior changes, edit the source under `authoring-tools/` rather than hand-editing built artifacts.
3. Run focused validation for the changed surface.
4. If generated Doctrine artifacts are still involved, run `pnpm -C authoring-tools build:docs`.
5. Commit changes in this repository.
6. Publish Doctrine payloads with `fm pull`, `fm push`, or `fm git sync` as appropriate.

Do not edit built `.mjs` files directly unless doing an emergency published-artifact patch.
