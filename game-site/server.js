const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 静态文件
app.use(express.static('public'));

// ========== 论坛留言存储（内存 + 文件持久化） ==========
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, 'forum-data.json');

let forumMessages = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    forumMessages = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
} catch (e) {
  forumMessages = [];
}

function saveMessages() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(forumMessages, null, 2));
  } catch (e) {
    console.log('保存留言失败:', e.message);
  }
}

// 论坛 API
app.get('/api/forum', (req, res) => {
  res.json({ messages: forumMessages });
});

app.post('/api/forum', express.json(), (req, res) => {
  const name = (req.body.name || '匿名玩家').toString().slice(0, 20);
  const msg = (req.body.msg || '').toString().slice(0, 500);
  if (!msg.trim()) return res.status(400).json({ error: '内容不能为空' });

  const entry = {
    id: Date.now(),
    name: name,
    msg: msg,
    time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  };
  forumMessages.unshift(entry);
  if (forumMessages.length > 200) forumMessages = forumMessages.slice(0, 200);
  saveMessages();
  res.json({ ok: true, entry });
});

app.delete('/api/forum/:id', (req, res) => {
  const id = parseInt(req.params.id);
  forumMessages = forumMessages.filter(m => m.id !== id);
  saveMessages();
  res.json({ ok: true });
});

// ========== 联机炮台 WebSocket ==========
const rooms = {};

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  socket.on('createRoom', (name) => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    rooms[roomId] = {
      id: roomId,
      players: [{ id: socket.id, name: name || '玩家', x: 400, y: 250 }]
    };
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    io.to(roomId).emit('roomUpdate', rooms[roomId]);
    console.log('创建房间:', roomId);
  });

  socket.on('joinRoom', ({ roomId, name }) => {
    const room = rooms[roomId];
    if (!room) { socket.emit('joinFailed', '房间不存在'); return; }
    if (room.players.length >= 4) { socket.emit('joinFailed', '房间已满'); return; }
    room.players.push({ id: socket.id, name: name || '玩家', x: 400, y: 250 });
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', room);
    console.log('玩家加入:', roomId);
  });

  socket.on('gameUpdate', ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room) return;
    const p = room.players.find(p => p.id === socket.id);
    if (p) {
      p.x = x; p.y = y;
      socket.to(roomId).emit('gameUpdate', { id: socket.id, x, y });
    }
  });

  socket.on('shoot', (data) => {
    socket.to(data.roomId).emit('shoot', {
      playerId: socket.id,
      x: data.x, y: data.y, angle: data.angle
    });
  });

  socket.on('disconnect', () => {
    console.log('玩家断开:', socket.id);
    for (const rid in rooms) {
      const idx = rooms[rid].players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        rooms[rid].players.splice(idx, 1);
        if (rooms[rid].players.length === 0) {
          delete rooms[rid];
        } else {
          io.to(rid).emit('roomUpdate', rooms[rid]);
          io.to(rid).emit('playerLeft', socket.id);
        }
      }
    }
  });
});

// ========== 启动（关键：动态端口 + 0.0.0.0） ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT}`);
});
