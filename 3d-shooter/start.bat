@echo off
chcp 65001 >nul
echo ========================================
echo   3D 枪战游戏 - 一键启动
echo ========================================
echo.

cd /d "%~dp0"

echo 正在启动本地服务器...
echo 浏览器将自动打开 http://localhost:8000
echo.
echo 如果没有自动打开，请手动访问上面的地址
echo 按 Ctrl+C 停止服务器
echo.

REM 尝试用 Python3
where python3 >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000
  python3 -m http.server 8000
  goto :eof
)

REM 尝试用 Python
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000
  python -m http.server 8000
  goto :eof
)

REM 尝试用 Node.js
where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000
  node -e "const h=require('http'),f=require('fs'),p=require('path');const s=h.createServer((q,r)=>{let fp=p.join(__dirname,'public',q.url==='/'?'index.html':q.url);f.readFile(fp,(e,d)=>{if(e){r.writeHead(404);r.end('Not Found');return;}r.writeHead(200);r.end(d);});});s.listen(8000,()=>console.log('Server running on http://localhost:8000'));"
  goto :eof
)

echo.
echo [错误] 未找到 Python 或 Node.js
echo 请先安装其中一个：
echo   Python: https://www.python.org/downloads/
echo   Node.js: https://nodejs.org/
echo.
pause
