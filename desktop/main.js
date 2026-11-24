const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

// 线上大厅地址(联机炮台、论坛需要服务器,所以桌面版直接载入线上站点)
const SITE = process.env.GAME_HUB_URL || 'https://small-game-lxh11001.up.railway.app/';
const HOST = new URL(SITE).host;

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: '小游戏大厅', icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#080d1a', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.loadURL(SITE);

  // 站外链接用系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).host !== HOST) shell.openExternal(url);
    return { action: new URL(url).host === HOST ? 'allow' : 'deny' };
  });
  win.webContents.on('did-fail-load', (_e, code, desc, _url, isMain) => {
    if (!isMain || code === -3) return;
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
      '<body style="background:#080d1a;color:#fff;font-family:sans-serif;text-align:center;padding-top:20vh">' +
      '<h1>无法连接小游戏大厅</h1><p>请检查网络后按 F5 重试</p></body>'));
  });
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5') win.webContents.isLoading() || win.loadURL(SITE);
    if (input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}

app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
