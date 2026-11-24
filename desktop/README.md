# 小游戏大厅 桌面版 (Electron)

Windows 安装包,安装时可以自选安装目录。桌面版载入线上大厅 https://small-game-lxh11001.up.railway.app/ 。

- 本地运行: `cd desktop && npm install && npm start`
- 本地打包(需在 Windows 上): `npm run dist`,输出到 `dist/`
- 云端打包: 把 `build-windows.yml.example` 复制为 `.github/workflows/desktop.yml` 后,在仓库 Actions 页选 "Build Windows installer" 点 Run workflow,完成后在运行页底部 Artifacts 下载;推送标签 `desktop-v3.0.0` 会同时发布到 Releases。

## 在 Linux 上直接生成安装包(不需要 wine)

```
cd desktop && npm install
npx electron-builder --win dir --x64          # 生成 dist/win-unpacked
export NSISDIR=~/.cache/electron-builder/nsis/nsis-3.0.4.1
$NSISDIR/linux/makensis installer.nsi         # 生成 dist/GameHub-Setup-3.0.0.exe
```

注意: Linux 的 makensis 遇到中文文件名会崩溃,所以可执行文件名用 `GameHub.exe`(package.json 里 `executableName`)。
