# Setup: from inputs to published

Prerequisite: prefer a filled `inputs.env` (see `INPUTS.md`). If vendor access
is blocked, scaffold with stable identifiers and leave unknown values blank;
the interpolation script keeps placeholders visible so they are not forgotten.
The priority running through this file: **a submittable build beats a finished
app.** Store review has a lead time of days to weeks, and Google's tester
requirements can add two more — so a minimal honest app goes to the stores
first, and the real screens ship afterwards as OTA updates and normal releases.

This stack is deliberately less opinionated than fssstack: the snippets are
proven config, not canon. Swap pieces freely; only the publishing pipeline
has real teeth.

## 1. Scaffold (30 minutes)

```bash
npx create-expo-app@latest <APP_SLUG> --template tabs@latest --no-install
cd <APP_SLUG>
npm install
```

`create-expo-app` chooses the install command from the invoking environment and
can pick pnpm on machines where npm is shimmed through pnpm. Use `--no-install`
and run `npm install` explicitly so the standalone mobile repo starts with
`package-lock.json`, matching the npm-based EAS workflow below.

Copy everything in `snippets/` over the new repo (workflows go to
`.github/workflows/`, and `zap.yaml` is the local Zapper wrapper), then
interpolate:

```bash
node <stackforge>/guides/react-native/scripts/apply-inputs.mjs inputs.env .
```

Link EAS and re-run interpolation for the project ID:

```bash
npm install -g eas-cli && eas login
eas init --force    # creates/links under EXPO_OWNER; default MAP Lab owner is mp-lb
eas update:configure
node <stackforge>/guides/react-native/scripts/apply-inputs.mjs inputs.env .
```

Add `.env.production` (committed; no secrets):

```text
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_BASE_URL=<API_BASE_URL>
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<CLERK_PUBLISHABLE_KEY>
```

Mount the shared secrets store (`doctrine.yaml` + `dx sync --yes`), set the
`SECRETS_KEY` GitHub secret, push to main. The release workflow's
`sync-eas-env` job populates the EAS environment on every push — this must
happen before the first build, which is why pushing main comes this early.

Icons: one 1024×1024 squircle source image and `snippets/generate-icons.py`
derives all six assets — full-bleed iOS icon, Android adaptive layers,
splash, favicon.

## 2. Minimum submittable app (days, not weeks)

What review actually requires: the app opens, does something honest, and
matches its store metadata. Auth + one useful read-only screen against the
production API is plenty. Keep it the same brand and purpose as the real
product — no fake claims, no dead screens — and replace screens via OTA
updates later (`SETUP_REACT_NATIVE.md` §8 has the policy boundary).

Wire-up that's already decided by the snippets:

- `app.config.ts` mirrors `package.json`'s version (changesets owns it);
  build numbers are remote and auto-increment.
- Validate with `zap task check` locally; CI runs the same lint/typecheck/doctor
  checks directly through npm/npx.

Everything else (router layout, state, styling, which Clerk flows) is the
project's call.

Optional starter shell: if you want MAP Lab's default mobile components for
Clerk auth, the account/user menu, sign out, check-for-updates, debug screens,
and push-token registration, follow `STARTER_APP.md` after the scaffold/config
steps. It is deliberately optional; skip it for custom UI, no-auth apps, or
apps that should prove a different navigation/auth shape first.

## 3. First build and submission

One manual sitting — follow `BOOTSTRAP.md`. After it, the steady state is:

```bash
npx changeset        # on feature PRs that should ship
# merge the bot's "Release" PR → deploy job runs:
#   fingerprint unchanged → OTA update
#   fingerprint changed   → store builds + auto-submit
```

`gh workflow run release.yml` is the escape hatch to force a deploy without
a changeset.
