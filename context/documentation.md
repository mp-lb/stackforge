## Documentation

Stackforge authors shared Forum content. Its two sync targets publish `fssstack/` to `mp-lb/fssstack` and `arcnet/` to `mp-lb/arcnet`; these are source trees, rather than a project-specific `docs/` folder. Run `fm sync` from the repository root before changing mapped content and again after committing it. Resolve conflicts before continuing.

Do not add `AGENTS.md` inside `fssstack/` or generate setup scripts. Edit the relevant source documents or templates, run focused validation, commit the change, and publish the mapped files. The setup process must remain followable from the published instructions.

Read shared standards with `fm read <file>.md --store mp-lb/dev` and shared extensions with `fm read extensions/<file>.md --store mp-lb/fssstack`.
