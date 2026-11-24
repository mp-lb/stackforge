# Clerk authentication

Clerk is an optional augmentation to [Fastnative](../README.md). Automatic updates and the debug page remain mandatory with or without it.

Install the Expo SDK-compatible Clerk package and required native peers using Clerk's Expo setup instructions. Use [@mp-lb/mobile-clerk](https://github.com/mp-lb/tools/tree/main/packages/mobile-clerk) for shared auth screens and diagnostics where appropriate. Keep tokens in the SDK's secure token cache, wait for session readiness and configure native redirect URLs before testing sign-in.

Keep `MobileUpdatesProvider` above `ClerkProvider` and navigation. Do not gate update checks on authentication or duplicate the update provider inside signed-in screens. Protect in-progress sign-in or onboarding forms from reloads using `useMobileUpdateBlocker`.

Map only the publishable key into client configuration. Keep Clerk secret keys on the backend; authentication does not replace backend authorization. Add Clerk diagnostics to the same debug page as `MobileUpdatesDebugPanel`, with appropriate access for sensitive app-specific diagnostics.
