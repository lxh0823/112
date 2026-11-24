# 小游戏大厅 桌面版(轻量,Go + WebView2)

用系统自带的 Edge WebView2 载入线上大厅,不自带浏览器内核,所以安装包只有约 1.3MB(Electron 版 80MB,见 `../desktop`)。
需要 Windows 10/11(一般已内置 WebView2 运行时)。

## 构建(在 Linux 上交叉编译)
```
export PATH="$HOME/.local/share/mise/shims:$PATH"      # 需要 Go
GOBIN=/tmp/gobin go install github.com/akavel/rsrc@latest
/tmp/gobin/rsrc -ico icon.ico -arch amd64 -o rsrc_windows_amd64.syso
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags "-H windowsgui -s -w" -o GameHub.exe .
NSISDIR=~/.cache/electron-builder/nsis/nsis-3.0.4.1 $NSISDIR/linux/makensis installer.nsi   # 需 NSIS;OutFile 路径按需修改
```
安装程序带"选择安装目录"页。缓存放在 `%LOCALAPPDATA%\GameHub`,可用环境变量 `GAME_HUB_URL` 改地址。
