# Conditional context payloads

The always-present baseline lives in `shell/context/`. Project setup adds `ui.md`, `backend.md`, `library-cli.md` and `docs-website.md` only when the selected project types need them. Adapt commands and paths, import each block explicitly, then compile.

Optional capabilities own their payloads under `extensions/<extension>/context/`. MAP Lab’s public standards and code style ship in the shell baseline. MapLab workflow, mise setup, account choices and documentation-layout additions belong to the augmentation store.

The canonical ownership and legacy-block mapping are in [Context files](../standards/context-files.md). Do not recreate generic global, tech-stack, process-management or Forum blocks here; their applicable rules belong in the shell baseline, selected project type or organization augmentation.
