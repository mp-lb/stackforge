# Optional Starter App

Use this when you want a new Expo app to have the MAP Lab default mobile
scaffolding on day one: Clerk auth, an account/user menu, sign out, update
checks, debug sections, and a push-token helper.

This is optional. The packages are starter components, not a design system or a
product requirement. They are meant to get a real app shell working quickly, and
then be copied, replaced, or removed as the product finds its own shape.

## Packages

- `@mp-lb/mobile-kit` is provider-agnostic. It includes starter buttons, debug
  rows/sections, runtime update diagnostics, the EAS update checker, JWT decode
  helper, and Expo push-token request helper.
- `@mp-lb/mobile-clerk` is Clerk-specific. It includes the Clerk provider,
  native auth screen, account screen, user menu, sign out, update button, and
  Clerk debug section.

If the app does not use Clerk, skip `@mp-lb/mobile-clerk` and compose your own
auth screens around `@mp-lb/mobile-kit`.

## Preconditions

Start after the base React Native setup has created the Expo Router app,
configured EAS, and added the normal Expo native modules.

Clerk's native auth components require a development build or store build. Expo
Go is useful for quick UI checks, but it is not enough for the full starter
shell.

The app should have:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` when using Clerk.
- `EXPO_PUBLIC_API_BASE_URL` for backend/debug display.
- `EXPO_PUBLIC_APP_ENV` for runtime/debug display.
- The native scheme in Expo config.
- `@clerk/expo` in Expo plugins when using Clerk.
- `expo-secure-store`, `expo-updates`, and, if push is used,
  `expo-notifications`, `expo-device`, and `expo-constants`.

## Install

```bash
npx expo install @clerk/expo expo-secure-store expo-updates
npx expo install expo-notifications expo-device expo-constants
npm install @mp-lb/mobile-kit @mp-lb/mobile-clerk
```

If the app only needs the provider-agnostic pieces:

```bash
npm install @mp-lb/mobile-kit
```

Add public runtime environment values:

```text
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Configure Expo

Add the Clerk plugin and make sure the app has a native scheme:

```json
{
  "expo": {
    "scheme": "example",
    "plugins": ["@clerk/expo", "expo-secure-store"]
  }
}
```

For OAuth, add the native redirect URL in the Clerk dashboard:

```text
example://oauth-native-callback
```

Use the real project scheme, not `example`.

## Root Layout

Wrap the router in `ClerkMobileProvider`, then protect signed-in and signed-out
route groups. This assumes Expo Router protected routes.

```tsx
// app/_layout.tsx
import { useAuth } from "@clerk/expo";
import { ClerkMobileProvider } from "@mp-lb/mobile-clerk";
import { Stack } from "expo-router";

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function RootStack() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  return (
    <Stack>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  if (!clerkPublishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  return (
    <ClerkMobileProvider publishableKey={clerkPublishableKey}>
      <RootStack />
    </ClerkMobileProvider>
  );
}
```

If the app is on an Expo Router version without `Stack.Protected`, use the
current Expo Router redirect-guard pattern instead; the provider and screen
components are the same.

## Auth Screen

```tsx
// app/sign-in.tsx
import { ClerkAuthScreen } from "@mp-lb/mobile-clerk";

export default function SignInScreen() {
  return <ClerkAuthScreen appName="Example" />;
}
```

`ClerkAuthScreen` uses Clerk's native `AuthView` from `@clerk/expo/native`.
Replace it with a custom screen when the product needs its own auth flow.

## App Routes

Use the account screen as the default user menu. It includes the Clerk user
button, check-for-updates, debug navigation, and sign out.

```tsx
// app/(app)/account.tsx
import { ClerkAccountScreen } from "@mp-lb/mobile-clerk";

export default function AccountScreen() {
  return <ClerkAccountScreen debugHref="/debug" />;
}
```

Add a debug route. This is intentionally practical: it shows what app/runtime
the tester is running and whether Clerk's active organization and session token
agree.

```tsx
// app/(app)/debug.tsx
import { ClerkDebugSection } from "@mp-lb/mobile-clerk";
import { StarterRuntimeDebugSection } from "@mp-lb/mobile-kit";
import { ScrollView, StyleSheet } from "react-native";

export default function DebugScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <StarterRuntimeDebugSection
        apiBaseUrl={process.env.EXPO_PUBLIC_API_BASE_URL}
        appEnv={process.env.EXPO_PUBLIC_APP_ENV}
      />
      <ClerkDebugSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 16,
  },
});
```

Then expose the account route from the app's tabs, drawer, or header. The
starter package does not prescribe navigation chrome; it only gives the account
and debug screens something useful to render.

## Push Tokens

`@mp-lb/mobile-kit` includes a helper for requesting an Expo push token. Call it
after sign-in, then send the token to the backend endpoint owned by the app.

```tsx
import { requestExpoPushToken } from "@mp-lb/mobile-kit";

async function registerPushToken() {
  const result = await requestExpoPushToken();

  if (result.status !== "granted") return result;

  await api.pushTokens.register({
    platform: result.platform,
    token: result.token,
  });

  return result;
}
```

Push token registration should be user/device aware. Remove tokens on sign out
and test on a physical device.

## Validation

```bash
npm run lint
npx tsc --noEmit
npx expo-doctor
npx expo run:ios
```

Use an EAS development build when testing Clerk native auth, update checks, or
push notifications. Expo Go does not exercise those paths reliably.
