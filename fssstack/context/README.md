# Conditional context payloads

The always-present baseline lives in `shell/context/`. Project setup adds `ui.md`, `backend.md`, `library-cli.md` and `docs-website.md` only when the selected project types need them. Adapt commands and paths, import each block explicitly, then compile.

Optional capabilities own their payloads under `extensions/<extension>/context/`. MapLab workflow, code style and documentation layout belong to the augmentation store, not this public baseline. Older generic blocks here are reference material; do not import all of them into every project.
