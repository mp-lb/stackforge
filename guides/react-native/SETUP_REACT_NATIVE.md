# React Native Mobile Setup

Use this when the web/backend app already exists and the mobile app should live in a separate repo. The normal shape is:

- Main FSS repo owns backend, web, database, jobs, and release of the API contract.
- Mobile repo is a standalone Expo app, usually npm-based, not inside the pnpm monorepo.
- Mobile consumes a published internal package for the backend tRPC router/client types.
- Mobile usually trails web. Ship a dummy app to store review early, then replace screens as web flows stabilize.

## 1. Prepare the backend repo

1. Make the tRPC/API package publishable. In the shell this is the package shaped like `packages/trpc`.
2. Export only mobile-safe types and client helpers. Do not export server-only code, env loading, database clients, or Node-only utilities.
3. Publish the package to the private registry:

```bash
pnpm -C <main-repo> --filter <trpc-package> build
pnpm -C <main-repo> changeset
pnpm -C <main-repo> version-packages
pnpm -C <main-repo> release
```

4. Create a read-only package token for the mobile repo. Store it as `NODE_AUTH_TOKEN` locally (`.env`) and add it to the shared encrypted secrets file (section 9); CI and EAS get it from there.
5. Confirm the backend has stable public URLs for mobile:

```text
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_APP_ENV=production
```

If Clerk/OAuth/push are used, the backend also needs native redirect URLs and push token endpoints before mobile can be complete.

## 2. Create the mobile repo

```bash
npx create-expo-app@latest <app-mobile> --template tabs@latest --no-install
cd <app-mobile>
npm install
npx expo install expo-dev-client expo-updates expo-secure-store expo-web-browser expo-auth-session
npx expo install expo-notifications expo-device expo-constants expo-linking
npm install @tanstack/react-query @trpc/client @trpc/react-query superjson
npm install <published-trpc-package>
```

Use `--no-install` and run `npm install` explicitly. `create-expo-app` chooses
the install command from the invoking environment and can pick pnpm on machines
where npm is shimmed through pnpm; this flow should start with `package-lock.json`.

Use Expo Router unless the project has a strong reason not to:

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens react-native-gesture-handler
```

Optional starter shell: after the base app is configured, `STARTER_APP.md`
shows how to sketch the first working app with `@mp-lb/mobile-kit` and
`@mp-lb/mobile-clerk` for Clerk auth, account/debug screens, update checks, and
push-token registration. Use it when those defaults help; skip it when the app
needs a different auth/navigation shape.

Keep this repo out of pnpm workspaces unless there is a specific React Native expert owning the dependency/debugging cost. Changesets (used for releases in section 9) works fine with npm, so a pnpm switch is never required for the release flow. If pnpm is used anyway, set `node-linker=hoisted` in `.npmrc`; Metro and native builds do not cope well with pnpm's symlinked layout.

Make sure exactly one lockfile exists. A stray `pnpm-lock.yaml` or `yarn.lock` next to `package-lock.json` (common when files are copied from the main monorepo) can make EAS detect the wrong package manager.

Add a small project manifest so mgr/dash can identify the standalone mobile repo:

```json5
{
  type: 'react-native',
  name: 'Example Mobile',
  emoji: '📱',
  description: 'Standalone Expo app for Example',
  homepageUrl: null,
}
```

This is intentionally smaller than the full Fssstack manifest. `homepageUrl` can
stay `null` until there is a useful mobile home link, such as the Expo project
page, a store listing, or a release dashboard.

## 3. Configure package auth

Add `.npmrc` using the snippet in `snippets/npmrc.example`.

Rules:

- Never commit a literal token.
- Use `NODE_AUTH_TOKEN` locally and in CI/EAS.
- Prefer `npm ci` in the mobile repo for reproducible installs.

Local install:

```bash
export NODE_AUTH_TOKEN=<github-or-registry-read-token>
npm ci
```

## 4. Configure Expo

Start from `snippets/eas.json` and `snippets/app.json`. Add `snippets/app.config.ts` next to `app.json`: it mirrors `package.json`'s version (owned by changesets, section 9) into the Expo config, so the marketing version is bumped by merging the release PR. Build numbers stay remote (`appVersionSource: "remote"` + `autoIncrement`).

- `expo.name`, `slug`, `scheme`
- `expo.owner` (`mp-lb` for normal MAP Lab apps; override for client-owned
  apps like Maddi)
- `expo.version`
- `ios.bundleIdentifier`
- `ios.config.usesNonExemptEncryption`
- `android.package`
- `runtimeVersion: "fingerprint"`
- `updates.url` after `eas init`
- `extra.eas.projectId` after `eas init`
- icons, splash assets, and Android adaptive icon assets

Run:

```bash
npm install -g eas-cli
eas login
eas init --non-interactive --force   # set expo.owner first; default MAP Lab owner is mp-lb
eas update:configure                 # writes updates.url
```

Add `.easignore` (start from `snippets/easignore.example`). When `.easignore`
exists EAS uses it *instead of* `.gitignore`, so it must contain the gitignore
entries too. Critically, exclude the mounted `docs/` store: it is full of
media and inflates the build archive by hundreds of MB for assets the build
never reads.

Add `zap.yaml` from `snippets/zap.yaml`. It is intentionally a small copy-paste
wrapper around npm/Expo commands so local agents can use `zap task install`,
`zap task start`, `zap task ios`, `zap task android`, and `zap task check`
without inventing per-project task names.

For Expo prebuild / Continuous Native Generation, treat native folders as generated unless the project intentionally needs custom native edits:

```gitignore
/ios
/android
.expo/
dist/
*.jks
*.p8
*.p12
*.mobileprovision
```

Local native runs:

```bash
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

Use a development build for real testing:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
npx expo start --dev-client
```

Expo Go is only for quick UI checks. It will not cover native modules, push notifications, many auth flows, or the real app binary.

## 5. Mac setup

Install:

- Xcode from the App Store
- Xcode command line tools: `xcode-select --install`
- Watchman: `brew install watchman`
- Node matching `eas.json`
- EAS CLI: `npm install -g eas-cli`
- Android Studio if Android local runs are required

Then:

```bash
sudo xcodebuild -license accept
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
npx expo-doctor
```

In Xcode, sign in to the Apple Developer account under Settings -&gt; Accounts. EAS can manage most credentials remotely, but local `expo run:ios` often still needs Xcode account/team setup.

## 6. Auth and deep links

For the standard MAP Lab Clerk starter screens, account menu, debug sections,
and update check button, follow `STARTER_APP.md`. The lower-level setup below
is still the source of truth for apps that use custom auth UI or skip the
starter shell.

For Clerk:

1. Install `@clerk/expo` and `expo-secure-store`.
2. Store the publishable key as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
3. Use SecureStore for Clerk token cache.
4. Add the native scheme to `app.json`.
5. Configure Clerk allowed redirect URLs for:

```text
<scheme>://oauth-native-callback
exp://*
```

Use `Linking.createURL("/oauth-native-callback")` for native OAuth redirects.

## 7. Push notifications

Install:

```bash
npx expo install expo-notifications expo-device expo-constants
```

Configure `expo-notifications` in `app.json`, then:

1. Create a Firebase project for Android.
2. Add the Android app with the exact `android.package`.
3. Download `google-services.json` into the repo root.
4. Reference it with `android.googleServicesFile`.
5. Create or upload FCM credentials in Expo/EAS.
6. Add backend endpoints to register/remove Expo push tokens by user/device.
7. Test on a physical device. Simulators are not enough for push.

Recommended backend API shape:

```ts
pushTokens.register({ token, platform: "ios" | "android" })
pushTokens.remove({ token })
```

Store tokens uniquely across users, remove on logout, and include route data in notification payloads so taps can navigate to the right screen.

## 8. Store setup early

Do this before the real mobile build is finished.

Apple:

1. Create bundle ID in Apple Developer.
2. Create the app in App Store Connect.
3. Fill privacy, encryption, support URL, screenshots placeholder, age rating, and review contact.
4. Create App Store Connect API key with App Manager access.
5. Add `ascAppId` to `eas.json`.

Google:

1. Create the app in Play Console.
2. Complete app content, data safety, target audience, ads, privacy policy, and testing setup.
3. Create a Google Cloud service account.
4. Grant it Play Console permissions for the app.
5. Upload the service account JSON to EAS submit credentials.

Dummy app strategy:

- Submit a simple, functional app-store bootstrap build as soon as bundle IDs, icons, privacy policy, and store metadata exist.
- Use internal/closed testing on Google Play early; review and tester approval can be the slowest part.
- Keep the bootstrap build honest: no fake claims, no broken login, no inaccessible core screen, and no metadata promising functionality that is not in the reviewed build.
- Prefer no-login or demo-read-only functionality when the real auth flow is not ready. If login is present, provide stable review credentials and make at least one useful screen accessible.
- The first reviewed build should still be recognizably the same app as the real product: same brand, same basic purpose, same privacy posture, and no hidden/dormant features.
- A link to the web app is fine as a support/continuity affordance, but the native app should not be just a thin website launcher.

Bootstrap release branch:

- Keep a durable `store-bootstrap` Git branch or tag for the exact code that was first approved.
- Keep the embedded app in that branch useful enough to run if an OTA rollback is needed.
- After approval, build real features on the normal mainline and ship JS-only changes with EAS Update only when they fit the reviewed app's purpose and native runtime.
- Use store-submitted binaries for material product changes: new native permissions, new SDKs/native modules, auth/payment/push changes, or anything that changes the app's primary purpose.
- Use EAS rollouts for production OTA updates, starting with a small percentage, then increase after monitoring crashes and support signals.
- During App Review, do not publish an OTA update that changes the reviewed experience.

Policy boundary:

- App Store metadata, screenshots, privacy answers, and review notes must accurately describe the submitted app.
- Do not use OTA updates as a bait-and-switch from a minimal placeholder to a different product.
- OTA is safest for copy, styling, bug fixes, guarded screen replacements, and small feature increments inside the already-reviewed product shape.
- If the next release would surprise App Review compared with the reviewed build, submit a normal app update instead.

## 9. CI/CD

Releases are gated by changesets and deployed by a fingerprint-aware workflow:

- Feature PRs that should ship include a changeset (`npx changeset`).
- When changesets land on `main`, the changesets action opens/updates a
  "Version Packages" PR.
- Merging that PR bumps `package.json` (mirrored into the Expo config by
  `app.config.ts`), tags the commit, and triggers the deploy job.
- The deploy job (`expo/expo-github-action/continuous-deploy-fingerprint`)
  computes the native fingerprint per platform and checks EAS for an existing
  production build with that fingerprint. If one exists, the change is JS-only
  for that runtime and ships as an EAS Update (OTA). If not, it starts store
  builds and auto-submits them. No manual "is this OTA-safe?" judgement call
  is needed for the mechanics; the policy boundary in section 8 still applies
  to content.

Do not gate binary-vs-OTA on whether `eas update` fails: it does not fail when
the runtime changed, it just publishes an update no installed build can
receive. Fingerprint comparison is the reliable signal.

Set up changesets:

```bash
npm install --save-dev @changesets/cli
npx changeset init
```

Then copy `snippets/changeset-config.json` over `.changeset/config.json`. The
`privatePackages: { version: true, tag: true }` setting makes changesets
version and git-tag an app repo that never publishes to a registry.

### Env and secrets (shared encrypted secrets file)

Mirror the main repo's env pattern instead of scattering per-secret GitHub
secrets:

- `.env.production` (committed): non-secret production config, e.g.
  `EXPO_PUBLIC_API_BASE_URL` and the Clerk *publishable* key.
- `docs/secrets.json.enc`: one big encrypted JSON object of secrets, shared
  with the main repo by mounting the same Doctrine store. Add a
  `doctrine.yaml` and sync:

  ```yaml
  git:
    commit-message: Update doctrine docs
  sync:
    - target: docs
      store: <workspace>/<docs-store>
  ```

  ```bash
  dx sync --yes
  ```

  Commit the synced `docs/` so CI can decrypt without Doctrine auth. Add the
  decrypted `secrets.json` to `.gitignore`.
- `env-map.yaml` (committed): which keys each consumer needs (see
  `snippets/env-map.yaml`): `ci` (npm install), `release` (EXPO_TOKEN +
  npm install), and `eas` (what gets pushed to the EAS environment).

Workflows decrypt with `@mp-lb/doctrine-secrets` and export mapped keys with
`@mp-lb/tools-env-mapper`, which masks secret-sourced values:

```bash
npx -y @mp-lb/doctrine-secrets decrypt docs/secrets.json.enc --secret "$SECRETS_KEY" > secrets.json
npm install --prefix ./env-mapper @mp-lb/tools-env-mapper
node ./env-mapper/node_modules/@mp-lb/tools-env-mapper/dist/cli.js github-env release \
  --secrets secrets.json --public .env.production --map env-map.yaml
```

Two traps here:

- If the repo `.npmrc` scopes the org to a private registry (it does, for the
  tRPC package), run these installs from outside the workspace (for example
  `$RUNNER_TEMP`): both tools live on the public npm registry.
- Call the mapper's `dist/cli.js` through `node` directly, not via its bin.
  The published bin guard (`process.argv[1].endsWith("cli.js")`) silently
  no-ops when invoked through the `.bin` symlink (npx, npm scripts), exiting
  0 without writing anything — downstream steps then see empty values.

The release workflow's `sync-eas-env` job pushes the `eas` section to the EAS
`production` environment (`eas env:push production --path <rendered file>
--force`), so EAS-side env is synced from the same source of truth instead of
being maintained by hand in the dashboard. Do not pass `--non-interactive` to
`env:push` — unlike most eas-cli commands it rejects the flag ("Nonexistent
flag") and the job fails; `--force` alone makes it prompt-free. Build profiles bind to EAS
environments via `"environment": "production"` in `eas.json` — do not put
`"$VAR"` placeholders in `eas.json` `env` blocks; EAS treats them as literal
strings and they shadow real environment variables.

Run the env sync on **every push to main**, not only in the deploy job. The
first build of a new project is usually a manual credentials-bootstrap run
(section 10) that happens before any release has deployed — if the sync only
lives in the deploy job, that first build hits an empty EAS environment and
fails in the "Install dependencies" phase with a 401 on the private package.

Two more first-run gotchas:

- When someone changes the shared secrets file (new key, rotated value, new
  recipient), every consuming repo has a stale committed copy until it runs
  `dx sync` and commits. CI decrypts the committed copy, not the store.
  Consider a scheduled job that runs `dx sync --dry-run` and opens a re-sync
  PR when the store has moved.
- The first push to main tags the current version (`changeset tag` with no
  pending changesets) and reports `published=true`, so the deploy job fires
  once at bootstrap. Harmless — but expect it, and make sure EAS is linked
  before that push or kick the first deploy deliberately via
  `workflow_dispatch`.

Copy:

- `snippets/.github/workflows/ci.yml`
- `snippets/.github/workflows/release.yml`
- `snippets/.github/workflows/test-eas-connection.yml`
- `snippets/env-map.yaml`

The only GitHub secret is the decryption key:

```text
SECRETS_KEY
```

The shared secrets file must contain `EXPO_TOKEN` and `NODE_AUTH_TOKEN` (use
the same env var names everywhere; `.npmrc` references
`${NODE_AUTH_TOKEN}` — do not introduce a second name for the same token).

If EAS Submit credentials are not stored in Expo, also add these to the shared
secrets file:

```text
APP_STORE_CONNECT_API_KEY_ID
APP_STORE_CONNECT_ISSUER_ID
APP_STORE_CONNECT_API_KEY_BASE64
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64
```

Create an Expo token:

```bash
eas whoami
# Expo dashboard -> account settings -> access tokens
```

Base64 encode local credential files when needed:

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | tr -d '\n'
base64 -i google-service-account.json | tr -d '\n'
```

The release workflow only deploys after a changesets release (or a manual `workflow_dispatch` for the first deploy). The fingerprint action then publishes an OTA update when a compatible production build exists, and otherwise creates store builds and auto-submits them.

## 10. Release workflow

Development:

```bash
export NODE_AUTH_TOKEN=<token>
npm ci
npx expo start --dev-client
```

Build internal development apps:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

First build (one-time bootstrap — the only genuinely manual step):

```bash
eas build --profile production --platform all
```

Run it interactively once. It generates and stores the Android keystore
(refused in `--non-interactive`: it is an irreversible app-identity decision)
and walks through Apple Developer login for iOS signing (Apple ID 2FA cannot
be headless). Accept the App Store Connect API key setup when offered so EAS
can renew provisioning profiles and run auto-submit without a human. After
this, credentials live on EAS servers and all CI builds are hands-free.

Prerequisites the pipeline already guarantees: the EAS environment is
populated by the `sync-eas-env` job on the first push to main — so push main
at least once before running the bootstrap build, or the build fails
installing the private package.

Release (normal path — changesets decides *when*, fingerprint decides *how*):

```bash
npx changeset            # describe the change, pick patch/minor/major
git push                 # changeset lands on main via PR
# merge the "Release" PR that the bot opens -> deploy runs automatically
```

Manual escape hatches (first deploy, emergencies):

```bash
eas update --channel production --message "Short release note"   # JS-only
eas build --profile production --platform all --auto-submit       # binaries
```

Validate before merging:

```bash
zap task check
```

## 11. Done checklist

- Mobile repo created with Expo Router and development client.
- Private API package installs with `NODE_AUTH_TOKEN`.
- `app.json` has stable scheme, bundle ID, Android package, EAS project ID, and update URL.
- Local iOS run works on simulator.
- Local Android run works if Android is in scope.
- Development EAS builds install on real devices.
- Clerk/OAuth redirects return to the app.
- Push tokens register on the backend from real devices.
- Store records exist before feature work is complete.
- CI runs lint and typecheck on PRs.
- Changesets gate releases: a merged "Release" PR triggers the deploy job.
- The deploy job picks OTA vs store build from the native fingerprint.
- Secrets come from the shared `docs/secrets.json.enc`; the only GitHub
  secret is `SECRETS_KEY`.
- EAS env is synced automatically on every push to main (before any build
  can need it).
- `.easignore` excludes the mounted docs store from build archives.
- One interactive `eas build` ran to bootstrap credentials, with an App
  Store Connect API key stored for renewals and submissions.
- Production EAS builds submit to TestFlight and Play Console.
