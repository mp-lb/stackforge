# Package releases

ArcNet owns package release orchestration: registry comparison, automatic patch
versions, publishing credentials, GitHub Actions, and publication verification.
FSS Stack owns package preparation: build and test commands, exports, declarations,
package contents, and ordinary `pnpm pack`. It installs no release automation.

## Commands

Run commands from the target workspace, or select it with `arcnet --root <path>`.

- `arcnet packages setup --repository owner/repo` installs a package-only GitHub
  Actions workflow. It requires pinned Node/pnpm and an installed ArcNet dependency,
  but no cloud resources or deployment configuration.
- `arcnet packages publish --dry-run` compares packed contents without publishing.
- `arcnet packages publish` publishes changed packages in dependency order and
  restores source manifests, including after a failure.
- `arcnet packages publish --check-first-publish` checks that public packages have
  completed their initial manual npm publication, without building or publishing.
- `arcnet packages publish --registry github` selects GitHub Packages instead of
  public npm. Existing package registry configuration determines eligibility.
- `arcnet packages verify` verifies exact public npm versions and downloadable
  tarballs using `ARCNET_RELEASE_RESULT` from the publisher's `release_report`
  GitHub output. For authenticated GitHub Packages checks and consumer access,
  follow [Private package publishing](private-package-publishing.md).

Packages are discovered under `packages/*` and `apps/*`. Packages with
`"private": true` in their manifest are excluded from all publication; that flag
is different from private registry visibility. Publishable GitHub Packages
packages select `publishConfig.registry: https://npm.pkg.github.com`. Changed
packages receive the next patch version; unchanged packages are
skipped. Existing initial versions are retained for first publications. Builds
must be deterministic. No Changesets or release commits are required.

Credentials stay separate from the publisher. When using Forum-backed credentials,
wrap the command in `arcnet env run --consumer publish -- pnpm exec arcnet packages
publish`. Otherwise supply registry authentication through the existing CI setup.
Setup uses an existing ArcNet publish consumer when present; it does not provision
credentials or select unrelated deployment capabilities.

## Existing projects

Preserve workflow triggers, runners, validation gates, registry choices, and
publication holds. Replace copied publishers with the ArcNet command, then remove
their source and tests. Rename the verifier input to `ARCNET_RELEASE_RESULT`.
Do not install a second publishing workflow. Setup refuses existing release
workflows so customized projects can be migrated deliberately.

Projects without publishable packages retain their validation checks but need no
publisher, publishing credentials, or release workflow. Manual release policies
can continue to use pnpm/npm directly.
