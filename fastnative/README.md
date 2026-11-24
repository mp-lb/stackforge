# Fastnative

Set up a standalone Expo app with npm. Use [Arcnative](../arcnative/README.md) for signed builds and OTA publication.

1. Create and clone the mobile repository, then run `npx create-expo-app@latest . --template tabs@latest --no-install` and `npm install`.
2. Install `@mp-lb/mobile-updates` and use `npx expo install expo-updates` to select the native module matching the app's Expo SDK. Follow [Automatic updates](updates.md). This is required for every app, including apps without authentication. Mount the provider once above navigation and expose its debug panel from the app's debug page.
3. Add one native flow against the existing API. Install the backend's published mobile-safe tRPC client if needed. Forum's [client package](https://github.com/mp-lb/forum/tree/main/packages/trpc) is an example.
4. Install [mobile-kit](https://github.com/mp-lb/tools/tree/main/packages/mobile-kit) when shared native UI/helpers are useful. Authentication is optional: follow the [Clerk augmentation](augmentations/clerk.md) when selected.
5. Run `npx expo lint` and `npx tsc --noEmit`. Verify the core flow on a device with an Expo development build, then verify automatic updates in a release build using the update acceptance steps.
