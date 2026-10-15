# Library and CLI releases

Publishable npm packages release automatically on pushes to `main`. There is no changeset, release note, or manual version bump. The release workflow runs checks, builds each public package, and compares its packed files with the latest version on npm. An unchanged package is skipped. A changed package gets the next patch version and is published. Packages are processed in workspace dependency order, so a dependency update can trigger a dependent package release.

The release logic lives in `scripts/auto-publish.mjs` in the target repository. It ignores only the `version` field when comparing package manifests; a changed README, export, type declaration, or other packed file counts as a release. Generated files must be deterministic. If a build embeds timestamps or other changing data, fix that build before enabling automatic publishing.

CI uses the npm token or trusted publishing identity configured for that repository. FSS Stack does not require ArcNet for releases. An ArcNet project can supply the npm token through its `publish` secret consumer.

To preview the comparison without publishing, run `node scripts/auto-publish.mjs --dry-run`. After CI, inspect the release run and verify changed packages with `npm view <package-name> version dist.tarball --json`. The script chooses patch versions from npm's latest published version; it does not commit version-only changes back to the repository.
