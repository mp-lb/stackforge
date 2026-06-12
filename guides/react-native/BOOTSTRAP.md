# Bootstrap: the first deploy

The only genuinely manual deploy. One sitting, in this order — the order
matters because each step feeds the next.

1. **Push main at least once** so `sync-eas-env` has populated the EAS
   environment. Skipping this fails the build at "Install dependencies" with
   a 401 on the private package.

2. **First production build, interactively:**

   ```bash
   eas build --profile production --platform all
   ```

   This is interactive on purpose: it generates the Android keystore
   (refused in `--non-interactive` — it's an irreversible identity decision)
   and walks through Apple sign-in. **Accept the App Store Connect API key
   setup when offered** — that's what lets CI auto-submit forever after.

3. **Finish the Clerk Android registration** (the TODO from `INPUTS.md`):
   `eas credentials --platform android` now shows the keystore's SHA-256 —
   add it to Clerk's native application. Once the app is on Play with
   Google-managed signing, also add the SHA-256 from Play Console → App
   signing.

4. **First Play upload is manual** — Google requires a human for a new app:
   download the AAB (`eas build:download --platform android`), Play Console →
   Testing → Internal testing → Create release → upload. This registers the
   package name and unlocks API submissions for every future release.

5. **iOS submission**: `eas submit --platform ios --latest` (or let the
   workflow's auto-submit do it). First TestFlight processing takes ~10–30
   minutes after upload.

6. **Dispatch the pipeline end-to-end**: `gh workflow run release.yml` and
   confirm it goes green. From here, releases are changeset-driven.

## When the first release misbehaves

| Symptom | Cause → fix |
|---|---|
| Deploy step red, but builds appear on EAS | Android auto-submit can't attach before the first manual Play upload (step 4). Cosmetic until then. |
| Production app hangs on splash forever; dev works | Clerk frontend API unreachable: CNAME proxied in Cloudflare (must be DNS-only), or the native app isn't registered for the production instance. `curl https://clerk.<domain>/v1/environment` from a browser UA should return JSON. |
| Google/Apple OAuth: "redirect URL does not match" | Add `<scheme>://sso-callback` to Clerk → Native applications → SSO allowlist. Server-side; no rebuild. |
| iOS build fails in `pod install` re modular headers | A transitive pod (e.g. `AppCheckCore`/`GoogleUtilities`) drifted — CocoaPods isn't locked under CNG. Add `expo-build-properties` with `extraPods: [{ name, modular_headers: true }]` for the named pods. |
| `eas env:push --non-interactive` fails: "Nonexistent flag" | Unlike most eas-cli commands it rejects the flag; `--force` alone is prompt-free. |
| Env var change doesn't reach the installed app | `EXPO_PUBLIC_*` is baked into the JS bundle at build time. Ship an OTA update (fingerprint unchanged) or a new build — pushing to the EAS environment alone does nothing for installed apps. |
| Submitting to Play `production` track rejected | Newer personal accounts need a 14-day closed test with 12+ testers first. Use `"track": "internal"` in `eas.json` until launch. |
| Fingerprint changed when only config changed | `eas.json`/`app.json`/plugin changes feed the fingerprint, so the deploy builds instead of OTA-ing. Expected; just slower. |
