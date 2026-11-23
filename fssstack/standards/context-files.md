# Context files

Keep recurring project-specific instructions in `context/`, especially `project.md`. `context/index.md` combines local `@filename.md` blocks and standalone links to shared Forum blocks; keep blank lines around remote links.

Use the shared standards, development, validation, scripts, documentation blocks by default. Add local instructions for project-specific setup, tests, documentation mappings and delivery. Import shared UI blocks when that capability applies; deployment-specific context belongs to the selected deployment integration. Do not install a library/CLI block.

Compile once during new-project setup with `zap task context-build` (local blocks use `mdcompile`, remote links use `fm compile`). After that, recompilation is opt-in: shared updates do not invalidate committed snapshots. When refreshing, check that both generated files match and commit them together with any source changes.

The Standards block describes remote discovery and lookup. Target projects do not need a Forum store, documentation sync configuration, or local skills/examples mirrors. The shell includes the shared code style, development/tool-selection and documentation conventions directly. Company-specific Clerk and Shad setup can still use augmentations. Do not replace the default development or standards imports with organization copies.
