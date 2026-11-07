const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// ========== 房间与玩家管理 ==========
const rooms = {};

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  // 创建房间
  socket.on('createRoom', (name) => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    rooms[roomId] = {
      id: roomId,
      players: [{ id: socket.id, name: name || '玩家', x: 400, y: 250, kills: 0 }]
    };
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    console.log('房间创建:', roomId, '玩家:', name);
  });

  // 加入房间
  socket.on('joinRoom', ({ roomId, name }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('joinFailed', '房间不存在');
      return;
    }
    if (room.players.length >= 4) {
      socket.emit('joinFailed', '房间已满（最多4人）');
      return;
    }
    room.players.push({ id: socket.id, name: name || '玩家', x: 400, y: 250, kills: 0 });
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', room);
    console.log('玩家加入:', roomId, name);
  });

  // 位置同步
  socket.on('gameUpdate', ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room) return;
    const p = room.players.find(p => p.id === socket.id);
    if (p) {
      p.x = x;
      p.y = y;
      socket.to(roomId).emit('playerMoved', { id: socket.id, x, y });
    }
  });

  // 射击
  socket.on('shoot', ({ roomId, angle }) => {
    socket.to(roomId).emit('playerShoot', { id: socket.id, angle });
  });

  // 击中/击杀
  socket.on('kill', ({ roomId, targetId }) => {
    const room = rooms[roomId];
    if (!room) return;
    const killer = room.players.find(p => p.id === socket.id);
    if (killer) {
      killer.kills++;
      io.to(roomId).emit('scoreUpdate', { scores: room.players.map(p => ({ id: p.id, name: p.name, kills: p.kills })) });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('玩家断开:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log('房间解散:', roomId);
        } else {
          io.to(roomId).emit('playerLeft', { id: socket.id });
          io.to(roomId).emit('roomUpdate', room);
        }
      }
    }
  });
});

// ========== 核心：动态端口 + 0.0.0.0 绑定 ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});
