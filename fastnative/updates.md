# Automatic updates

Every Fastnative app installs [@mp-lb/mobile-updates](https://github.com/mp-lb/tools/tree/main/packages/mobile-updates). Update handling is a baseline capability, not an optional auth augmentation. Tools owns the implementation; apps use the package rather than copying update loops.

## Install and mount

```sh
npm install @mp-lb/mobile-updates
npx expo install expo-updates
```

Mount `MobileUpdatesProvider` once above navigation and authentication so signed-out users receive updates too. Add `MobileUpdatesDebugPanel` to an accessible debug page. It provides manual **Check for updates** and **Install update** actions, status/errors, last check, channel, runtime version, running/downloaded update IDs, embedded-launch and emergency-launch information.

The provider checks on launch, when returning to the foreground, and every five minutes while active. Checks are throttled and serialized; manual checks bypass the interval. It downloads compatible updates and automatically reloads when active and safe. Offline/network failures leave the current app usable and retry on a later check. Web, Expo Go and development sessions without updates support show an explicit disabled state.

Use `useMobileUpdateBlocker(isEditingOrSaving)` for unsaved forms, writes, uploads and other work that must survive a reload. Blockers also prevent manual installation. Remove blockers only when work is safely saved or discarded. A downloaded update waits until all blockers clear. A conservative route-level blocker is appropriate while migrating an app with multiple editors. Never force a reload around a blocker.

## Native setup and delivery

Link the EAS project and set its `updates.url`. Keep `runtimeVersion: { policy: "fingerprint" }`, `updates.enabled: true`, `updates.checkAutomatically: "ON_LOAD"` and `updates.fallbackToCacheTimeout: 0`. Native startup checks remain a fallback; the shared runtime handles foreground checks/application without requiring the user to kill the app. Preserve Expo error recovery, embedded fallback and rollback support. Do not enable anti-bricking overrides.

[Arcnative](../arcnative/README.md) publishes to the production branch/channel and builds/submits a binary when native compatibility changes. An OTA publication and application on a device are separate milestones. Adding the updates native module or changing native configuration requires a new binary; an old binary cannot gain a missing native module through OTA.

## Acceptance

- A production-like native build with a matching channel/runtime starts offline.
- Publish a compatible update, foreground the app and verify it downloads and applies automatically without a manual check.
- Hold a reload blocker while editing: the update downloads, but no automatic or manual installation occurs. Save/discard and verify automatic application.
- The debug page can check manually, install a ready update and display errors without hiding the running app.
- Verify a second foreground/check does not reload the same update repeatedly. Test Expo rollback-to-embedded handling and a failed download with mocked controller tests; use a controlled release for device rollback verification.
- Web/development launches do not call unsupported update APIs.

CI checks and Expo export validate code/bundling. Record signed-build and physical-device results separately; a successful publishing job alone is not proof of installation.
