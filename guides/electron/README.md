# Electron desktop files

The [`shell/`](./shell/) directory has complete example files for a desktop window that loads a hosted web app, an optional macOS release workflow, and an optional Next.js download route. The [Electron extension](../../fssstack/extensions/electron.md) is the short agent recipe for copying and adapting them.

The older [`release-electron.yaml`](./release-electron.yaml) is a Forum-era reference workflow. The shell's `.github/workflows/release-desktop.yml` is the starting file for a new project. Native macOS releases remain a separate case in [`release-macos.yaml`](./release-macos.yaml).
