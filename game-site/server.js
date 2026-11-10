const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));
app.use(express.json());

// ========== 论坛留言持久化 ==========
const DATA_FILE = path.join(__dirname, 'forum-data.json');
let forumMessages = [];
try {
  if (fs.existsSync(DATA_FILE)) forumMessages = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) { forumMessages = []; }

function saveMessages() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(forumMessages, null, 2)); } catch (e) {}
}

app.get('/api/forum', (req, res) => res.json({ messages: forumMessages }));
app.post('/api/forum', (req, res) => {
  const name = (req.body.name || '匿名玩家').toString().slice(0, 20);
  const msg = (req.body.msg || '').toString().slice(0, 500);
  if (!msg.trim()) return res.status(400).json({ error: '内容不能为空' });
  const entry = { id: Date.now(), name, msg, time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) };
  forumMessages.unshift(entry);
  if (forumMessages.length > 200) forumMessages = forumMessages.slice(0, 200);
  saveMessages();
  res.json({ ok: true, entry });
});

// ========== 更新公告 ==========
const notices = [
  { version: '2.0', date: '2026-11-10', text: '联机炮台新增炮弹与自由转向（鼠标瞄准），支持 2-4 人开房对战' },
  { version: '2.0', date: '2026-11-10', text: '贪吃蛇场地扩大至 1200×1200' },
  { version: '2.0', date: '2026-11-10', text: '玩家论坛上线，留言支持服务端持久化存储' }
];
app.get('/api/notices', (req, res) => res.json({ notices }));

// ========== 房间查询（供加入前校验） ==========
app.get('/api/rooms', (req, res) => {
  const list = Object.values(rooms).map(r => ({ id: r.id, count: r.players.length }));
  res.json({ rooms: list });
});

// ========== 联机炮台 ==========
const rooms = {};

function publicPlayer(p) {
  return { id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle || 0, hp: p.hp, kills: p.kills };
}

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  // 创建房间
  socket.on('createRoom', (name) => {
    let roomId;
    do { roomId = Math.random().toString(36).substr(2, 6).toUpperCase(); }
    while (rooms[roomId]);
    rooms[roomId] = {
      id: roomId,
      players: [{ id: socket.id, name: name || '玩家', x: 400, y: 250, angle: -Math.PI / 2, hp: 100, kills: 0 }]
    };
    socket.join(roomId);
    // 创建者立即拿到房间号
    socket.emit('roomCreated', { roomId });
    io.to(roomId).emit('roomUpdate', rooms[roomId]);
    console.log('创建房间:', roomId);
  });

  // 加入房间
  socket.on('joinRoom', ({ roomId, name }) => {
    const room = rooms[roomId];
    if (!room) { socket.emit('joinFailed', '房间不存在，请检查房间号'); return; }
    if (room.players.length >= 4) { socket.emit('joinFailed', '房间已满（最多4人）'); return; }
    room.players.push({ id: socket.id, name: name || '玩家', x: 400, y: 250, angle: -Math.PI / 2, hp: 100, kills: 0 });
    socket.join(roomId);
    // 新加入者先拿到完整玩家列表
    socket.emit('joinedRoom', {
      roomId,
      players: room.players.map(publicPlayer)
    });
    // 全房间同步
    io.to(roomId).emit('roomUpdate', room);
    console.log('玩家加入:', roomId, '当前', room.players.length, '人');
  });

  // 位置同步
  socket.on('gameUpdate', ({ roomId, x, y, angle }) => {
    const room = rooms[roomId];
    if (!room) return;
    const p = room.players.find(p => p.id === socket.id);
    if (!p) return;
    p.x = x; p.y = y; if (angle !== undefined) p.angle = angle;
    socket.to(roomId).emit('gameUpdate', publicPlayer(p));
  });

  // 开炮
  socket.on('shoot', (data) => {
    const room = rooms[data.roomId];
    if (!room) return;
    socket.to(data.roomId).emit('shoot', {
      playerId: socket.id,
      x: data.x, y: data.y, angle: data.angle
    });
  });

  // 掉线
  socket.on('disconnect', () => {
    console.log('玩家断开:', socket.id);
    for (const rid in rooms) {
      const idx = rooms[rid].players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        rooms[rid].players.splice(idx, 1);
        if (rooms[rid].players.length === 0) {
          delete rooms[rid];
          console.log('房间解散:', rid);
        } else {
          io.to(rid).emit('roomUpdate', rooms[rid]);
          io.to(rid).emit('playerLeft', socket.id);
        }
      }
    }
  });
});

// ========== 启动（动态端口 + 0.0.0.0） ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT}`);
});
