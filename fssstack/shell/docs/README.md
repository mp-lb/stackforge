# Project documentation

Keep project-specific engineering notes, architecture, and runbooks in
`docs/internals/`. Shared FSS Stack standards and extensions live in Forum;
read them from their stores rather than copying them into this project.

The frontend examples in `docs/internals/examples/frontend/` are starting
points to adapt, not code to import directly.

For a library with a documentation site, place the published guides and
generated API reference in `docs/public/`. The site renders only that folder;
other files in `docs/` stay internal. Projects without a docs site do not need
`docs/public/`.
