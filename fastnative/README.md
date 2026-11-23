# FastNative

Set up a standalone Expo app with npm. Use [ArcNative](../arcnative/README.md) when the app is ready for signed builds and store delivery.

1. Create and clone the mobile repository, then run `npx create-expo-app@latest . --template tabs@latest --no-install` and `npm install`.
2. Add one native flow against the existing API. Install the backend's published mobile-safe tRPC client if the app uses one. Forum's [client package](https://github.com/mp-lb/forum/tree/main/packages/trpc) is an example.
3. Install [mobile-kit](https://github.com/mp-lb/tools/tree/main/packages/mobile-kit) for shared native UI and runtime helpers if needed. For Clerk auth, use [mobile-clerk](https://github.com/mp-lb/tools/tree/main/packages/mobile-clerk).
4. Run `npx expo lint` and `npx tsc --noEmit`. Verify the core flow on a device with an Expo development build.
