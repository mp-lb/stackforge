# Updating agent context

Edit `context/` source blocks and their explicit imports in `context/index.md`. Do not replace a generated agent file with a generic template or discard project-specific instructions.

Run `zap task context-build`, review the generated diff, and commit the source with `AGENTS.base.md`, `AGENTS.md`, and `CLAUDE.md`. See [Context files](context-files.md) for compilation and local additions. Add capability-specific instructions from `extensions/<extension>/context/` only after applying that extension's README.

Before adding another block, classify its content using the standard block contract in [Context files](context-files.md). Merge synonymous legacy blocks into their standard homes, preserve unique constraints, remove unreachable stale blocks, and review the compiled diff for lost or contradictory instructions.
