import { app, BrowserWindow, shell } from 'electron';

const productionUrl = "https://example.com";
const appUrl = !app.isPackaged && process.env.DESKTOP_DEV_URL ? process.env.DESKTOP_DEV_URL : productionUrl;
const allowedOrigin = new URL(appUrl).origin;

app.whenReady().then(() => {
  const window = new BrowserWindow({ width: 1280, height: 850, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
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
