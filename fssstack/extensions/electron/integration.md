# Electron application integration

Use these Electron Kit integrations for the capabilities the application needs. Preserve existing behavior and adapt the installed main process, preload and renderer; browser authentication and updater UI are conditional. Signing, publishing and update feeds belong to [ArcNet desktop releases](../../../arcnet/desktop-releases.md).

## Install and build

Install `@mp-lb/electron-kit` 0.1.10 or later as a dependency of the desktop package. Install it in the frontend package as well if that package imports the browser, React, or Clerk entry points. Replace the example filters with the target workspace names:

```sh
pnpm --filter <desktop-package> add @mp-lb/electron-kit
pnpm --filter <frontend-package> add @mp-lb/electron-kit
```

The kit is ESM. When the desktop package uses the extension's CommonJS `tsup` build and only `dist/` is packaged, bundle the kit into the desktop output: add `"@mp-lb/electron-kit"` to `noExternal` in `tsup.config.ts`. Keep Electron external. Add the preload entry to `entry` when introducing a preload, and set `webPreferences.preload` to its built path. Retain `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`.

Use the dedicated `@mp-lb/electron-kit/preload` entry in a sandboxed preload. Do not import the package root there: the root also exports main-process code that uses Node modules unavailable to a sandboxed preload. Verify the bundled preload only requires modules Electron exposes to sandboxed preloads.

## Updates dialog

Electron Kit owns update checks, downloads, installation, and shared renderer state. When ArcNet desktop releases are activated, call `setupDesktopUpdates` with the feed URL recorded by [ArcNet desktop release setup](../../../arcnet/desktop-releases.md). For another distributor, use its configured feed; do not enable an updater without a real release source. Enable the updater bridge for macOS and both Linux package types. Windows builds without a signed update channel use the installer for upgrades. Existing Linux installs shipped without an updater need a one-time manual upgrade. Check and download in the background, then explicitly install Linux updates from **Install and quit**, which may ask for administrator authorization. Reopen the app from its application menu. Electron Kit skips Chromium’s Linux relaunch so its inherited `NoNewPrivs` flag cannot block the next update. Electron Kit keeps internal download promises out of IPC responses. Keep one `createAutoUpdater` controller for the app and consume it with `useUpdates`; dispose it when the renderer integration is torn down. Follow the [Electron Kit updater guide](https://github.com/mp-lb/tools/tree/main/packages/electron-kit#updates) for the main process, preload bridge, and renderer setup.

Install the shadcn `dialog`, `button`, and `progress` components in the frontend package. Build a small application-owned dialog showing the app version and update status. While downloading, show a labeled `Progress` with the percentage clamped to 0–100. In the footer, show an outline **Check for updates** button, disabled while checking or downloading. When an update is ready, replace it with a primary **Reload update**, **Install and quit** (when ready status has `reopenManually: true`), or **Restart and update** button calling `installUpdate`; disable it while installation is in progress. Display updater errors and distinguish a desktop restart from a hosted-app reload. Use the application's theme and installed component variants.

## Loading screen

Apply the [Shad augmentation](../../../augmentations/shad.md) to the renderer. Re-run its install
command from the frontend package to ensure `FullScreenLoading` and the
standard dot-matrix loader are present, preserving customized files when
prompted. Use `FullScreenLoading` for session readiness before showing browser
sign-in or the signed-in app, and for root Suspense/startup gates.

This presentation belongs to Shad and the renderer, not Electron Kit. The kit
remains headless. Use the same loading screen in desktop and web; do not add a
plain “Loading <app>…” branch. This React loading screen does not replace the
packaged offline fallback described below.

## Window state

If the app keeps its macOS window alive after closing it, use Electron Kit’s `keepWindowAvailable(app, window, nativeAutoUpdater)` with Electron’s native `autoUpdater`. It handles normal quits and updater-triggered quits before the window closes. If an app has a custom close handler, it must also allow `before-quit-for-update`; do not assume the normal `before-quit` event fires first. Verify normal close, quit, and the platform’s update flow in the packaged app. Test two consecutive Linux package updates, reopening from the application menu after each install.

After `app.whenReady()`, restore the previous position and dimensions when constructing the main window, then attach persistence immediately:

```ts
import { BrowserWindow } from "electron";
import { getWindowOptionsWithSavedState, rememberWindowState } from "@mp-lb/electron-kit";

const win = new BrowserWindow(getWindowOptionsWithSavedState({
  width: 1280,
  height: 850,
  webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: preloadPath },
}));
rememberWindowState(win);
```

`preloadPath` is the project's built preload path. The helper saves normal bounds and maximized/fullscreen state under Electron's user-data directory, and ignores saved bounds that no longer intersect a display. Use it for the main window; if the app has multiple independently persisted windows, give them separate storage rather than sharing this helper's default file.

## Failed initial load and offline recovery

The hosted frontend may be unavailable when the app opens, especially at computer startup. Create an offline fallback that is packaged locally with the desktop app; a React screen hosted on the network cannot render when its initial load fails. A minimal local HTML page is sufficient. Show a clear connection message and explain that the app retries automatically. If providing a manual retry, expose a narrow preload method and validate that the request came from the intended window and fallback page before calling `retry()`.

Copy the fallback HTML and all of its required assets into the desktop build output and include them in the packaged app. Never depend on a CDN or hosted frontend for the fallback. Replace the example path below with the actual packaged file path:

```ts
import { join } from "node:path";
import { recoverWindowLoad } from "@mp-lb/electron-kit";

const recovery = recoverWindowLoad({
  window: win,
  url: appUrl,
  retryDelayMs: 5_000,
  showFailure: async () => {
    await win.loadFile(join(__dirname, "offline.html"));
  },
  onFailure: ({ error, attempt }) => {
    // Send useful diagnostics to the application's logger.
  },
});
```

`appUrl` is the hosted URL selected by the base extension. `recoverWindowLoad` starts the initial load, retries after failed loads, and stops its timer when the window closes. Use `recovery.retry()` for an authorized manual retry and `recovery.dispose()` if replacing the recovery controller before the window closes. Display diagnostic details only when useful; a secondary **View details** control can reveal them without overwhelming the main message. Do not expose secrets or authentication tickets in diagnostics.

## Top-level errors

Handle failures at both boundaries. In the main process, observe a renderer crash and reload or show a local recovery page:

```ts
import { handleRendererFailure } from "@mp-lb/electron-kit";

const stopObserving = handleRendererFailure({
  window: win,
  onFailure: (details) => {
    // Electron Kit defers this callback until Chromium finishes teardown.
    recovery.retry();
  },
});
win.once("closed", stopObserving);
```

Capture window IDs for diagnostics when creating the window. Electron can destroy native window properties before the `closed` handler runs. Include closing and reopening a packaged window in the smoke test.

For React rendering failures, wrap the application root in the kit's `AppErrorBoundary` from `@mp-lb/electron-kit/react`. Supply an application-owned fallback with a retry action calling `reset`, and use `onError` to forward the error and component stack to the project's monitoring service. React boundaries do not catch event-handler or asynchronous callback errors; handle those where they occur. Preserve any existing monitoring integration when adopting the boundary.

## Browser sign-in

Use this flow only when the application needs browser-based desktop authentication. The handoff is provider-independent; Clerk is optional. The app's server must authenticate the browser user and issue a short-lived, single-use credential appropriate to its provider. Never pass a long-lived session token or the provider's secret key through the deep link.

1. Choose an app-specific protocol and add it to electron-builder's `build.protocols` configuration. Enforce Electron's single-instance lock before installing the kit's auth handler. If the lock is denied, quit that process and do not create the handler or window.
2. In the main process, before the browser can return, call `createDesktopAuth({ protocol, appUrl, getWindow })`. `getWindow` must return the authorized main window. The kit registers the protocol, opens the browser with a random state, validates callbacks and IPC senders, and focuses the window. After app readiness, pass cold-start command-line arguments to `auth.receive`; call `auth.dispose()` during shutdown. A callback without an active matching sign-in attempt is rejected, including after a cold restart; start sign-in again in that case.
3. In the preload, expose only `createAuthBridge()` from `@mp-lb/electron-kit/preload` via `contextBridge`. Type the bridge on `window`; do not expose `ipcRenderer` itself. In the desktop sign-in screen, call `begin()` from the user's button. Subscribe to `onTicket` before calling `getPending()`, unsubscribe on cleanup, and deduplicate tickets: a ticket sent as an event may also be returned as pending.
4. Serve an authenticated browser page at `/desktop-auth` (or configure `browserPath` in the handler). Preserve its `state` query parameter through browser sign-in. Have it request a one-time ticket from an authenticated server endpoint, then call `createDesktopAuthReturnUrl(protocol, state, ticket)` from `@mp-lb/electron-kit/browser` and navigate to that URL. Provide a retry button: the browser cannot confirm whether the desktop app opened.
5. Consume the ticket in the desktop renderer using the auth provider's supported flow. For Clerk's **legacy** sign-in API, `consumeClerkTicket` from `@mp-lb/electron-kit/clerk` accepts the ticket, `signIn`, and `setActive`; use the Clerk SDK entry and provider appropriate to the app's installed version. A server using Clerk can mint a short-lived sign-in token for the authenticated user with its server-side Clerk client. Keep its secret key on the server. The core Electron kit does not require Clerk.

On Linux, Electron Kit opens sign-in through the system HTTPS handler using GIO when available. Confirm that both installed packages associate the callback scheme with the app, that the sign-in button launches the default browser, and that the browser returns to the running app.

A minimal main-process and preload integration looks like this. Adapt the existing app lifecycle and preload rather than adding a second single-instance lock or a second `exposeInMainWorld` for the same name:

```ts
// main process: initialize only in the process that owns the lock
import { createDesktopAuth } from "@mp-lb/electron-kit";

const auth = createDesktopAuth({
  protocol: "example",
  appUrl,
  getWindow: () => mainWindow,
});
// Once ready, also check the initial arguments. The handler already listens
// for macOS open-url and subsequent launches.
process.argv.forEach(auth.receive);
app.once("will-quit", auth.dispose);
```

```ts
// preload: add auth to the project's existing contextBridge object
import { contextBridge } from "electron";
import { createAuthBridge } from "@mp-lb/electron-kit/preload";

contextBridge.exposeInMainWorld("desktop", { auth: createAuthBridge() });
```

```ts
// browser return page, after the authenticated server has issued a ticket
import { createDesktopAuthReturnUrl } from "@mp-lb/electron-kit/browser";

const state = new URLSearchParams(window.location.search).get("state");
if (!state) throw new Error("Start sign-in from the desktop app.");
// Get this short-lived ticket from the authenticated application server.
window.location.href = createDesktopAuthReturnUrl("example", state, ticket);
```

Register `example` consistently in the builder protocol configuration and both code paths; use the project's actual scheme and validated URL instead of the placeholder. The browser server endpoint and ticket consumption are application/provider-specific.

For a hosted frontend that also serves older installed desktop versions, preserve compatibility with their existing preload and handoff until those desktop versions have updated. Verify both paths before deploying the frontend.

## Optional presentation

The kit is headless. Supply application-owned screens, or install the Shad registry's generic component from the frontend package:

```sh
pnpm dlx shadcn@latest add https://shad.mp-lb.dev/r/full-screen-state.json
```

`FullScreenState` accepts application-provided icon, title, description, actions, and children; it does not supply copy or behavior. Pass multiple buttons in `actions`. For expandable diagnostics, put a **View details** button in `actions`, manage the disclosure state in the application, and connect it to the details panel with `aria-expanded` and `aria-controls`. Suitable copy includes “Could not connect” with automatic-retry guidance, “Sign in” with a browser action, and “Something went wrong” with a retry action; adapt it to the application.

This React component works only where its renderer and assets are available. To use it for a failed initial load, build it as a separate local renderer entry, package its HTML, JavaScript, and CSS, and load that local file from `showFailure`. Otherwise use a local HTML fallback; do not make offline recovery depend on installing the Shad component.

## Offline renderer build safety

Vite library mode preserves `process.env.NODE_ENV` in dependencies such as React.
A sandboxed Electron renderer has no `process` global: the fallback itself can
crash to a white screen even while main-process retries keep working.

Use Electron Kit 0.1.3 or newer and add `offlineRenderer()` from
`@mp-lb/electron-kit/vite` to the offline Vite configuration. Install the kit in the
frontend package that owns the config and retain its existing React/CSS plugins:

```ts
import { offlineRenderer } from "@mp-lb/electron-kit/vite";

// Within the existing offline config:
// plugins: [offlineRenderer(), react(), tailwindcss(), ...]
```

The plugin replaces the environment check at build time and rejects emitted
JavaScript that retains it. For an older kit without this entry, explicitly set
`define: { "process.env.NODE_ENV": JSON.stringify("production") }` in the offline
config. Never expose Node globals or disable sandboxing to fix the fallback.
See [Vite library-mode environment behavior](https://vite.dev/guide/build#library-mode).

Keep a regression test that builds the renderer and executes the resulting
JavaScript without Node globals; a component test alone will not catch this
bundling failure. Verify all fallback assets exist in the packaged archive and
exercise offline startup and recovery. A source or web deployment cannot fix an
already installed desktop bundle: rebuild and distribute a new desktop version.

## Verify

Run the target project's lint, typecheck, tests, and desktop build through its normal task runner. Verify the packaged app, not just the TypeScript build:

- Move, resize, maximize, and reopen the window; also check recovery after a monitor is disconnected.
- Start with the hosted frontend unreachable, confirm the local fallback appears, then restore connectivity and confirm the app loads. Exercise manual retry if provided.
- Trigger a React error and a renderer failure and check that recovery and reporting work. On Linux, verify startup and icon lookup on an installed package under Wayland and X11 with the sandbox enabled.
- From an older installed Linux build with updates enabled, verify that the live feed selects the same package type, downloads and checks its hash, runs the authorized package-manager install, and restarts into the new version. Report any part of this check that could not be exercised.
- If auth is enabled, verify browser sign-in, callback state validation, one-time ticket consumption, repeat attempts, and delivery while the renderer is still starting. Exercise the installed protocol on each supported OS.
- If releasing macOS builds, verify signing and notarization using the project's release workflow.

