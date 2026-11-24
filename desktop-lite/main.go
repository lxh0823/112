//go:build windows

package main

import (
	"os"
	"path/filepath"

	"github.com/jchv/go-webview2"
)

// 线上大厅地址(联机炮台、论坛需要服务器)。可用环境变量 GAME_HUB_URL 覆盖。
const defaultURL = "https://small-game-lxh11001.up.railway.app/"

func main() {
	url := os.Getenv("GAME_HUB_URL")
	if url == "" {
		url = defaultURL
	}
	// WebView2 的缓存目录必须可写,安装目录可能在 Program Files,所以放到 LOCALAPPDATA。
	data := filepath.Join(os.Getenv("LOCALAPPDATA"), "GameHub", "WebView2")
	_ = os.MkdirAll(data, 0o755)

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  data,
		WindowOptions: webview2.WindowOptions{
			Title:  "小游戏大厅",
			Width:  1280,
			Height: 800,
			Center: true,
		},
	})
	if w == nil {
		// 没有 WebView2 运行时
		os.Exit(1)
	}
	defer w.Destroy()
	w.SetSize(1280, 800, webview2.HintNone)
	w.Navigate(url)
	w.Run()
}
