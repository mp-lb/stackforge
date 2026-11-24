## Package publishing

When package releases are selected, push `main` to run the configured release
workflow. ArcNet builds packages, compares their packed files with published
versions and publishes the next patch for changed packages. Run
`pnpm exec arcnet packages publish --dry-run` to preview. Credentials come from
the project's configured registry authentication; use the ArcNet `publish`
consumer when configured. For public npm, verify the workflow and exact published
versions with `arcnet packages verify` and its `ARCNET_RELEASE_RESULT` report input.
For private GitHub Packages, use `arcnet packages publish --registry github` and
authenticated exact-version download/install checks from the consumer context;
the current verifier is public-npm-only. ArcNet owns registry routing, publishing
credentials and local/CI consumer access. Read
`fm read private-package-publishing.md --store mp-lb/arcnet`.
`private: true` in a package manifest disables publishing entirely; registry
visibility is a separate setting.

Setup and migration: `fm read package-releases.md --store mp-lb/arcnet`.
FSS Stack supplies package preparation, not a publisher. Preserve intentional
manual release policies, registry selection, and publication holds.

### First publish

When adding a public package, publish its initial version with an npm account that has publish access to the scope. Build it from the workspace root, then publish from the package directory.

```sh
pnpm --filter '<package-name>...' build
cd 'packages/<package-directory>'
npm publish --access public
```

For a package with `workspace:` dependencies, run `pnpm pack` from its directory first. Publish the resulting archive with `npm publish ./<archive>.tgz --access public` so the published manifest uses resolved versions.

If npm shows only `0.0.0-stage`, approve the staged version with 2FA in **Staged Packages** on npmjs.com. Check `npm view '<package-name>' version` for the initial stable version before relying on CI for later releases.
