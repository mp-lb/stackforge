# Context files

Keep recurring project-specific instructions in `context/`, especially `project.md`. `context/index.md` combines local `@filename.md` blocks and standalone links to shared Forum blocks; keep blank lines around remote links.

Use the shared standards, development, validation, scripts, documentation blocks by default. Add local instructions for project-specific setup, tests, documentation mappings and delivery. Import shared UI blocks when that capability applies; deployment-specific context belongs to the selected deployment integration. Do not install a library/CLI block.

Run `zap task context-build` to compile local blocks with `mdcompile` and remote links with `fm compile`. Check that both generated files match and commit them with the source changes.

The Standards block describes remote discovery and lookup. Target projects do not need a Forum store, documentation sync configuration, or local skills/examples mirrors. Organization-specific standards and code-style imports belong in an optional organization augmentation, not the public shell.
