# React Native integration

Start with [Expo mobile setup](SETUP.md).

- **API client.** Expose a mobile-safe tRPC client from the backend, publish the package through the backend's existing release workflow, and install it in the Expo app. Use the [Forum client package](https://github.com/mp-lb/forum/tree/main/packages/trpc) as the reference.
- **Auth.** Install `@mp-lb/mobile-clerk` if the app uses Clerk. The [package](https://github.com/mp-lb/tools/tree/main/packages/mobile-clerk) has the Expo integration details.
- **Runtime helpers.** Install `@mp-lb/mobile-kit` for shared update, account/debug, and push helpers. See the [package](https://github.com/mp-lb/tools/tree/main/packages/mobile-kit).
- **Push.** If the app uses notifications, configure them using [Expo's push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) and verify registration on a physical device.
- **CI and releases.** Use the generated callers with the app's store profiles and credentials. The [Expo release package](https://github.com/mp-lb/tools/tree/main/packages/expo-release) documents the shared action and commands.
