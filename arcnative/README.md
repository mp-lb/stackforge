# ArcNative

Set up CI, signed builds, and updates for a [FastNative](../fastnative/README.md) app. The shared GitHub Actions code and templates live in [Expo release tooling](https://github.com/mp-lb/tools/tree/main/packages/expo-release).

1. Run `npm exec --yes --package=@mp-lb/expo-release -- expo-release-setup .`. Add `--replace-app-json` when replacing the config from a fresh scaffold.
2. Fill `inputs.env` from the generated example. Run `eas init` to link the Expo project, then run `npm exec --yes --package=@mp-lb/expo-release -- expo-release-apply-inputs inputs.env .`. Verify the selected platform's app identifier and store submission profile.
3. If the app installs private GitHub packages, follow [Standard package access](#standard-package-access).
4. Use **Test EAS Connection** and run **Release** in `sync` mode to configure the Expo production environment. To create a first signed binary, run `eas build --profile production --platform ios` for iOS or `eas build --profile production --platform android` for Android.
5. Use the [mobile app release skill](https://hyperdoc.forumlabs.net/57afee86-5a3b-423c-8a6e-95560c90e1c5) for TestFlight or Play testing, store forms, review, and launch.

## Standard package access

1. In GitHub, open the organization’s **Packages** tab and select the private package. Under **Package settings → Manage Actions access → Add repository**, add the mobile repository and set its role to **Read**. Repeat for each private GitHub package the app installs. [GitHub package access](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility#github-actions-access-for-packages-scoped-to-organizations)
2. Configure the pull-request workflow with `packages: read` and pass `github.token` as `npm-token`. Verify that `npm ci` passes in **CI**. On a pull request, use `gh pr checks --watch` to follow the result. If the registry returns `permission_denied: read_package`, check the workflow permission and the package’s **Manage Actions access** list.
3. For Expo builds, create `.arcnet/arcnet.yaml` with `version: 1`, `project`, `repository`, `environment: mp-lb`, and an `expo` consumer under `secrets.consumers`. Map the registry variable from the app’s `.npmrc` to `READ_PACKAGES_GITHUB_PAT`.
4. Run `arcnet secrets add --key ARCNET_STANDARD_SECRETS_KEY --store mp-lb/mp-lb --path /admin/standard-secrets.json.enc --repository <owner/repo>` and enter the Forum encryption password in your terminal. Commit the generated encrypted snapshot and validation workflow, then wire the trusted main-branch callers to the `expo` consumer. [Shared action inputs](https://github.com/mp-lb/tools/tree/main/packages/expo-release#github-actions)
5. After editing or rotating the standard token, run `arcnet secrets sync`, commit the refreshed ciphertext, and run **Release** in `sync` mode.
