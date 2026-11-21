import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'node:path';

const productionUrl = "https://example.com";
const appUrl = !app.isPackaged && process.env.DESKTOP_DEV_URL ? process.env.DESKTOP_DEV_URL : productionUrl;
const allowedOrigin = new URL(appUrl).origin;

app.whenReady().then(() => {
  // Keep Electron's development icon; packaged macOS apps use the bundle icon.
  // Do not override it with app.dock.setIcon().
  const linux = process.platform === "linux";
  if (process.platform !== "darwin") Menu.setApplicationMenu(null);
  const window = new BrowserWindow({
    width: 1280,
    height: 850,
    show: !linux,
    icon: app.isPackaged && linux ? join(__dirname, "../assets/icon-linux.png") : undefined,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  if (linux) window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== allowedOrigin) {
      event.preventDefault();
      if (url.startsWith('https://')) void shell.openExternal(url);
    }
  });
  void window.loadURL(appUrl);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
