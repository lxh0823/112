const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));
app.use(express.json());


// ========== 账号：注册 / 登录 ==========
// 数据目录：Railway 上挂 Volume 后设置 DATA_DIR 指向挂载路径，账号才能在重新部署后保留
const DATA_DIR = process.env.DATA_DIR || __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
const USERS_FILE = path.join(DATA_DIR, 'users.json');
let users = Object.create(null); // 无原型，避免 constructor 之类的用户名撞到内置属性
try { if (fs.existsSync(USERS_FILE)) Object.assign(users, JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))); } catch (e) {}
function saveUsers() {
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users));
  fs.renameSync(tmp, USERS_FILE);
}
function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = path.join(DATA_DIR, 'session-secret');
  try { return fs.readFileSync(f, 'utf8'); } catch (e) {}
  const s = crypto.randomBytes(32).toString('hex');
  try { fs.writeFileSync(f, s, { mode: 0o600 }); } catch (e) {}
  return s;
}
const SECRET = getSecret();
const TOKEN_TTL = 30 * 24 * 3600 * 1000;

const keyOf = (name) => name.toLowerCase();
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function signToken(name) {
  const body = Buffer.from(JSON.stringify({ u: name, e: Date.now() + TOKEN_TTL })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}
function userFromReq(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig) return null;
  const good = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    const u = users[keyOf(p.u)];
    return p.e > Date.now() && u ? u.name : null;
  } catch (e) { return null; }
}

// 简单限流：同一 IP 每分钟最多 20 次登录/注册
const hits = new Map();
function limited(req) {
  const now = Date.now(), ip = req.ip;
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 20;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 60000)) hits.delete(k); }, 60000).unref();

app.set('trust proxy', 1);
app.post('/api/register', (req, res) => {
  if (limited(req)) return res.status(429).json({ error: '操作太频繁，请稍后再试' });
  const name = String(req.body.username || '').trim();
  const pw = String(req.body.password || '');
  if (!name || name.length > 50) return res.status(400).json({ error: '请输入用户名（最长 50 个字符）' });
  if (!pw || pw.length > 200) return res.status(400).json({ error: '请输入密码' });
  if (users[keyOf(name)]) return res.status(409).json({ error: '用户名已被注册' });
  const salt = crypto.randomBytes(16).toString('hex');
  users[keyOf(name)] = { name, salt, hash: hashPw(pw, salt), created: Date.now() };
  saveUsers();
  res.json({ ok: true, username: name, token: signToken(name) });
});
app.post('/api/login', (req, res) => {
  if (limited(req)) return res.status(429).json({ error: '操作太频繁，请稍后再试' });
  const name = String(req.body.username || '').trim();
  const pw = String(req.body.password || '');
  const u = users[keyOf(name)];
  const ok = u && crypto.timingSafeEqual(Buffer.from(hashPw(pw, u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
  if (!ok) return res.status(401).json({ error: '用户名或密码错误' });
  res.json({ ok: true, username: u.name, token: signToken(u.name) });
});
app.get('/api/me', (req, res) => {
  const name = userFromReq(req);
  if (!name) return res.status(401).json({ error: '未登录' });
  res.json({ username: name });
});

// ========== 论坛留言持久化 ==========
const DATA_FILE = path.join(DATA_DIR, 'forum-data.json');
let forumMessages = [];
try {
  if (fs.existsSync(DATA_FILE)) forumMessages = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) { forumMessages = []; }

function saveMessages() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(forumMessages, null, 2)); } catch (e) {}
}

app.get('/api/forum', (req, res) => res.json({ messages: forumMessages }));
app.post('/api/forum', (req, res) => {
  const me = userFromReq(req);
  const name = me || (req.body.name || '匿名玩家').toString().slice(0, 20);
  if (!me && users[keyOf(name.trim())]) return res.status(409).json({ error: '该昵称已被注册，请登录后使用' });
  const msg = (req.body.msg || '').toString().slice(0, 500);
  if (!msg.trim()) return res.status(400).json({ error: '内容不能为空' });
  const entry = { id: Date.now(), name, msg, member: !!me, time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) };
  forumMessages.unshift(entry);
  if (forumMessages.length > 200) forumMessages = forumMessages.slice(0, 200);
  saveMessages();
  res.json({ ok: true, entry });
});

// ========== 更新公告 ==========
const notices = [
  { version: '3.0', date: '2026-11-24', text: '大厅可安装为 App；新增 3D 枪战与霓虹跑者 3D' },
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

// ========== 联机炮台（服务端判定命中/击杀/胜负） ==========
const rooms = {};
const ARENA_W = 800, ARENA_H = 500;
const BULLET_SPEED = 8, HIT_RADIUS = 20, DAMAGE = 10;
const WIN_KILLS = 20, SHOT_COOLDOWN = 250, SPAWN_PROTECT = 1500, ROUND_RESET = 5000;
let nextBulletId = 1;

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const randSpawn = () => ({ x: 60 + Math.random() * (ARENA_W - 120), y: 60 + Math.random() * (ARENA_H - 120) });

function newPlayer(id, name) {
  return { id, name: String(name || '玩家').slice(0, 20), x: 400, y: 250, angle: -Math.PI / 2, hp: 100, kills: 0, lastShot: 0, protectUntil: 0 };
}
function publicPlayer(p) {
  return { id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle || 0, hp: p.hp, kills: p.kills };
}
function roomView(room) {
  return { id: room.id, players: room.players.map(publicPlayer) };
}

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  // 创建房间
  socket.on('createRoom', (name) => {
    let roomId;
    do { roomId = Math.random().toString(36).substr(2, 6).toUpperCase(); }
    while (rooms[roomId]);
    rooms[roomId] = { id: roomId, players: [newPlayer(socket.id, name)], bullets: [], over: false };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    io.to(roomId).emit('roomUpdate', roomView(rooms[roomId]));
    console.log('创建房间:', roomId);
  });

  // 加入房间（断线重连时客户端也会再次调用）
  socket.on('joinRoom', ({ roomId, name } = {}) => {
    const room = rooms[roomId];
    if (!room) { socket.emit('joinFailed', '房间不存在，请检查房间号'); return; }
    if (!room.players.some(p => p.id === socket.id)) {
      if (room.players.length >= 4) { socket.emit('joinFailed', '房间已满（最多4人）'); return; }
      room.players.push(newPlayer(socket.id, name));
    }
    socket.join(roomId);
    socket.emit('joinedRoom', { roomId, players: room.players.map(publicPlayer) });
    io.to(roomId).emit('roomUpdate', roomView(room));
    console.log('玩家加入:', roomId, '当前', room.players.length, '人');
  });

  // 位置同步（只接受合法数值并限制在场地内）
  socket.on('gameUpdate', ({ roomId, x, y, angle } = {}) => {
    const room = rooms[roomId];
    if (!room) return;
    const p = room.players.find(p => p.id === socket.id);
    if (!p) return;
    p.x = clamp(num(x, p.x), 0, ARENA_W);
    p.y = clamp(num(y, p.y), 0, ARENA_H);
    if (angle !== undefined) p.angle = num(angle, p.angle);
    socket.to(roomId).emit('gameUpdate', publicPlayer(p));
  });

  // 开炮：炮弹由服务端创建（起点取服务端记录的位置），并限制射速
  socket.on('shoot', (data = {}) => {
    const room = rooms[data.roomId];
    if (!room || room.over) return;
    const p = room.players.find(p => p.id === socket.id);
    const now = Date.now();
    if (!p || now - p.lastShot < SHOT_COOLDOWN) return;
    p.lastShot = now;
    p.angle = num(data.angle, p.angle);
    const b = { id: nextBulletId++, owner: socket.id, x: p.x, y: p.y, angle: p.angle };
    room.bullets.push(b);
    io.to(room.id).emit('shoot', { id: b.id, playerId: b.owner, x: b.x, y: b.y, angle: b.angle });
  });

  // 掉线
  socket.on('disconnect', () => {
    console.log('玩家断开:', socket.id);
    for (const rid in rooms) {
      const idx = rooms[rid].players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        rooms[rid].players.splice(idx, 1);
        rooms[rid].bullets = rooms[rid].bullets.filter(b => b.owner !== socket.id);
        if (rooms[rid].players.length === 0) {
          delete rooms[rid];
          console.log('房间解散:', rid);
        } else {
          io.to(rid).emit('roomUpdate', roomView(rooms[rid]));
          io.to(rid).emit('playerLeft', socket.id);
        }
      }
    }
  });
});

// 服务端炮弹模拟：60Hz 移动炮弹、判定命中、结算击杀与胜负
function tickRooms() {
  const now = Date.now();
  for (const rid in rooms) {
    const room = rooms[rid];
    if (!room.bullets.length) continue;
    for (let i = room.bullets.length - 1; i >= 0; i--) {
      const b = room.bullets[i];
      b.x += Math.cos(b.angle) * BULLET_SPEED;
      b.y += Math.sin(b.angle) * BULLET_SPEED;
      if (b.x < 0 || b.x > ARENA_W || b.y < 0 || b.y > ARENA_H) { room.bullets.splice(i, 1); continue; }
      const victim = room.players.find(p => p.id !== b.owner && now >= p.protectUntil &&
        (p.x - b.x) ** 2 + (p.y - b.y) ** 2 < HIT_RADIUS * HIT_RADIUS);
      if (!victim) continue;
      room.bullets.splice(i, 1);
      victim.hp -= DAMAGE;
      io.to(room.id).emit('hit', { bulletId: b.id, victim: victim.id, hp: Math.max(0, victim.hp) });
      if (victim.hp > 0) continue;
      const killer = room.players.find(p => p.id === b.owner);
      if (killer) killer.kills++;
      const pos = randSpawn();
      victim.hp = 100; victim.x = pos.x; victim.y = pos.y; victim.protectUntil = now + SPAWN_PROTECT;
      io.to(room.id).emit('kill', {
        killer: b.owner, killerName: killer ? killer.name : '', kills: killer ? killer.kills : 0,
        victim: victim.id, victimName: victim.name, x: victim.x, y: victim.y
      });
      if (killer && killer.kills >= WIN_KILLS && !room.over) {
        room.over = true;
        room.bullets = [];
        io.to(room.id).emit('gameOver', { winner: killer.id, winnerName: killer.name });
        setTimeout(() => {
          if (!rooms[rid]) return;
          room.over = false;
          room.players.forEach(p => { Object.assign(p, { kills: 0, hp: 100, x: 400, y: 250, protectUntil: Date.now() + SPAWN_PROTECT }); });
          io.to(room.id).emit('newRound', roomView(room));
        }, ROUND_RESET);
        break;
      }
    }
  }
}
setInterval(tickRooms, 1000 / 60).unref();

// ========== 启动（动态端口 + 0.0.0.0） ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT}`);
});
