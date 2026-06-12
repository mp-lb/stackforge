# Inputs: the front-loaded human work

Everything here happens in vendor consoles and can't be automated — Apple and
Google require a human for most of it. Do it **before** development starts:
the items are ordered by lead time, and the slowest ones take weeks. The
output is a filled `inputs.env` (copy `inputs.example.env`); hand that to
whoever runs `SETUP.md` and everything downstream is automated.

## 1. Accounts (days to weeks — start immediately)

- **Apple Developer Program** ($99/yr): enrolment verification takes 1–2 days.
- **Google Play Console** ($25 once): identity verification can take days.
  ⚠ Personal accounts created after late 2023 must run a closed test with
  12+ testers for 14 days before they're *allowed* to publish to production.
  If that applies, recruit the testers now — it's the longest pole in the
  whole process. (Internal testing and the `internal` track work immediately.)
- **Expo account/org** (free to start) — this is `EXPO_OWNER`.
- **Clerk production instance** — requires a real domain even for
  mobile-only apps.

## 2. Pick the permanent identifiers (5 minutes, irreversible)

These cannot be changed after the first store submission. Fill into
`inputs.env`: `APP_NAME`, `APP_SLUG`, `URL_SCHEME`, `IOS_BUNDLE_ID` (reverse
domain; hyphens allowed), `ANDROID_PACKAGE` (no hyphens allowed — drop them).

## 3. Store records (do early — they gate review, not development)

**App Store Connect** (appstoreconnect.apple.com → Apps → "+"):

- Create the app: platform iOS, your app name, select the bundle ID (register
  it at developer.apple.com → Identifiers if it isn't in the dropdown), any SKU.
- Copy the numeric **Apple ID** from App Information →
  `APP_STORE_CONNECT_APP_ID`.
- Copy the **Team ID** from the Membership page → `APPLE_TEAM_ID`.
- Fill the review metadata while you're here: privacy policy URL, support
  URL, age rating, review contact. Screenshots can wait for the first real
  submission.

**Play Console** (play.google.com/console → Create app):

- Create the app. The package name is locked in by the first AAB upload, not
  at creation.
- Work through the "Set up your app" checklist (app content, data safety,
  target audience, ads, privacy policy). Review won't start without it.
- Create a Google Cloud service account, grant it release permissions on the
  app (Play Console → Users and permissions), download its JSON key. It gets
  uploaded to EAS during bootstrap — don't commit it anywhere.

## 4. Clerk production instance (15 minutes; two traps)

- **DNS**: every Clerk CNAME (`clerk.*`, `accounts.*`, `clkmail.*`,
  `clk._domainkey.*`) must be **DNS only** in Cloudflare. The orange "Proxied"
  cloud breaks the frontend API with Cloudflare error 1000 — and nothing
  notices until the first native build hangs on its splash screen forever.
  Verify in Clerk Dashboard → Domains: all checks green.
- **Native applications** (Dashboard → Configure → Native applications):
  - iOS: bundle ID + "App ID Prefix" (= the Team ID).
  - Android: namespace *and* package name are both `ANDROID_PACKAGE` (they
    only differ in white-label native projects). The SHA-256 certificate
    fingerprints don't exist until the bootstrap build generates the keystore
    — leave a TODO and finish this during `BOOTSTRAP`/first build.
  - **Allowlist for mobile SSO redirect**: add `<URL_SCHEME>://sso-callback`,
    or every OAuth sign-in fails with "redirect URL … does not match".
- Copy the live publishable key → `CLERK_PUBLISHABLE_KEY`. (It's just
  `pk_live_` + base64 of the frontend API domain — if the domain ever
  changes, the key changes with it and the app needs a new build/OTA.)

## 5. Tokens into the shared secrets file (5 minutes)

Add to the shared encrypted secrets file (`docs/secrets.json.enc` via the
Doctrine store — see SETUP_REACT_NATIVE.md §9 for the mechanics):

- `EXPO_TOKEN` — Expo dashboard → account settings → access tokens.
- `GITHUB_PAT` — read-only token for the private tRPC package.

The repo's only GitHub Actions secret is `SECRETS_KEY` (the decryption key).

## Done

`inputs.env` is fully filled except `EAS_PROJECT_ID` (written by `eas init`
during setup) and the Clerk Android SHA-256 TODO. Hand it over — development
and the stores are now unblocked in parallel.
