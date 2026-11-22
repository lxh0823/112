#!/bin/bash
# 3D 枪战游戏 - 一键启动（Mac/Linux）

cd "$(dirname "$0")"

echo "========================================"
echo "  3D 枪战游戏 - 一键启动"
echo "========================================"
echo ""

# 尝试 Python3
if command -v python3 &> /dev/null; then
  echo "使用 Python3 启动服务器..."
  echo "浏览器将打开 http://localhost:8000"
  sleep 1
  open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null
  python3 -m http.server 8000
  exit 0
fi

# 尝试 Python
if command -v python &> /dev/null; then
  echo "使用 Python 启动服务器..."
  echo "请访问 http://localhost:8000"
  python -m http.server 8000
  exit 0
fi

# 尝试 Node.js
if command -v node &> /dev/null; then
  echo "使用 Node.js 启动服务器..."
  echo "请访问 http://localhost:8000"
  node -e "const h=require('http'),f=require('fs'),p=require('path');const s=h.createServer((q,r)=>{let fp=p.join(__dirname,'public',q.url==='/'?'index.html':q.url);f.readFile(fp,(e,d)=>{if(e){r.writeHead(404);r.end('Not Found');return;}r.writeHead(200);r.end(d);});});s.listen(8000,()=>console.log('Server running on http://localhost:8000'));"
  exit 0
fi

echo "错误：未找到 Python 或 Node.js"
echo "请先安装其中一个再运行此脚本"
exit 1
