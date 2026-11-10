# 游戏大厅 V2.0

一个包含论坛、9款单机小游戏和联机炮台的网页游戏站点。

## 🎮 功能

- 💬 **玩家论坛** - 可留言交流，支持昵称
- 🐍 **贪吃蛇** - 1200×1200 超大场地
- 🧩 **俄罗斯方块**
- 🧱 **打砖块**
- 🏎️ **极速赛车**
- 🃏 **翻翻乐**
- 🔢 **2048**
- ⭕ **井字棋**
- 🚀 **太空射击**
- 🎯 **打靶**
- 🏰 **联机炮台** - 2-4人对战

## 🚀 使用

### 本地运行
```bash
npm install
npm start
```
打开 http://localhost:3000

### 部署到 Railway
1. 上传所有文件到 GitHub 仓库根目录
2. Railway: Root Directory 留空，Start Command 填 `npm start`
3. 点 Deploy

## 📁 文件结构
```
game-site/
├── package.json
├── server.js
├── forum-data.json (自动生成)
└── public/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── games.js
    ├── turret.js
    └── forum.js
```
