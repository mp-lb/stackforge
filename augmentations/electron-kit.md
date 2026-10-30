# Electron Kit augmentation

Apply this MAP Lab augmentation after adding Electron with the FSS Stack Electron extension.

Install `@mp-lb/electron-kit` and implement the applicable desktop behavior by following the [Electron Kit README](https://github.com/mp-lb/tools/blob/main/packages/electron-kit/README.md). It covers browser sign-in, load recovery, error handling, and window state. Clerk integration is optional.

For presentation, applications may use their own UI or install the optional [Full Screen State](https://shad.mp-lb.dev/docs/components/full-screen-state) from the Shad registry. A fallback for a failed initial load must be bundled locally so it is available before the hosted frontend loads.
