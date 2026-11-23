# Prepare libraries and CLIs for publishing

FSS Stack owns package preparation: build and test commands, declarations,
exports, executable entrypoints, package contents and `pnpm pack`. Keep generated
files deterministic and inspect the packed archive before distributing it.

A package can be published manually with pnpm/npm using the registry's normal
workflow. FSS Stack supplies no release command, automatic versioning policy,
Changesets configuration, CI workflow, or publishing credentials.

Choose release orchestration separately and follow that integration’s setup
and credential instructions.
