## Agent context

Agent instructions are compiled from reusable blocks in `context/`, with `context/index.md` listing the blocks in order. This keeps shared and project-specific instructions easy to maintain.

Edit the blocks and index in `context/`. Run `zap task context-build` when you want to regenerate `AGENTS.md` and `CLAUDE.md`, and commit both outputs together. Shared context updates do not require downstream projects to recompile: the committed files remain the project’s chosen snapshot until it opts into a refresh. New projects compile once during setup.
