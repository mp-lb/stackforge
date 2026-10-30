# Library and CLI releases

Push to `main`. CI checks the project, builds public npm packages, and compares their packed files with the latest published versions. If a package changed, CI publishes the next patch version. If it did not, CI skips it. There are no changesets, release notes, or manual version bumps.

The target repository's `packages/scripts/autoPublish.ts` handles comparison and publishing. It processes workspace dependencies first and ignores only the package manifest's `version` field. Keep generated package files deterministic; a timestamp that changes on every build would cause a release on every push.

Run `zap t publish-packages -- --dry-run` to preview. After CI, check the release workflow and `npm view <package-name> version`. The workflow needs an npm credential or trusted publishing. ArcNet setup wires its `publish` secret consumer for the marked FSS Stack workflow when a secrets configuration exists; the configured secret source must contain `NPM_TOKEN`. FSS Stack does not require ArcNet.
