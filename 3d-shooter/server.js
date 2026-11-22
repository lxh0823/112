const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('3D 枪战游戏已启动: http://localhost:' + PORT);
  console.log('打开浏览器开始游戏！');
});
