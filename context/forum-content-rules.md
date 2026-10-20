## Forum Content Rules

Do not add `AGENTS.md` files inside `fssstack/`. That folder is published Forum
content, not a standalone working repo in this checkout.

For Forum content changes:

1. Edit the relevant docs, templates, or shell files in this repository.
2. Run focused validation for the changed surface.
3. Commit changes in this repository.
4. Publish Forum content with `fm pull`, `fm push`, or `fm git sync` as appropriate.

Do not add generated setup scripts. The setup process must remain directly
followable from the published instructions.
