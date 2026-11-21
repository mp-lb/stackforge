## Package publishing

For public npm packages, push `main` to run the release workflow. It builds the workspace packages, compares the packed files with the published versions, and releases the next patch for each changed package. ArcNet supplies CI credentials through the `publish` consumer. Run `zap t publish-packages -- --dry-run` to preview the FSS Stack publisher and check the release run and npm after delivery.

### First publish

When adding a public package, publish its initial version with an npm account that has publish access to the scope. Build it from the workspace root, then publish from the package directory.

```sh
pnpm --filter '<package-name>...' build
cd 'packages/<package-directory>'
npm publish --access public
```

For a package with `workspace:` dependencies, run `pnpm pack` from its directory first. Publish the resulting archive with `npm publish ./<archive>.tgz --access public` so the published manifest uses resolved versions.

If npm shows only `0.0.0-stage`, approve the staged version with 2FA in **Staged Packages** on npmjs.com. Check `npm view '<package-name>' version` for the initial stable version before relying on CI for later releases.
