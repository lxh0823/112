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
let users = {};
try { if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) { users = {}; }
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

const NAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9_]{2,16}$/;
app.set('trust proxy', 1);
app.post('/api/register', (req, res) => {
  if (limited(req)) return res.status(429).json({ error: '操作太频繁，请稍后再试' });
  const name = String(req.body.username || '').trim();
  const pw = String(req.body.password || '');
  if (!NAME_RE.test(name)) return res.status(400).json({ error: '用户名需为 2-16 位的中文、字母、数字或下划线' });
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
