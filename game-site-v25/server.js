const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const USERS_FILE = path.join(__dirname, "data", "users.json");
const loadUsers = () => {
  if (!fs.existsSync(USERS_FILE)) {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, "[]");
    return [];
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
};
const saveUsers = (u) => fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));

app.post("/api/register", (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.json({ ok: false, msg: "请填写完整" });
  if (password.length < 6) return res.json({ ok: false, msg: "密码至少6位" });
  const users = loadUsers();
  if (users.find((u) => u.name === name)) return res.json({ ok: false, msg: "名字已存在" });
  users.push({ name, password: bcrypt.hashSync(password, 10), createdAt: Date.now() });
  saveUsers(users);
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const { name, password } = req.body;
  const user = loadUsers().find((u) => u.name === name);
  if (!user) return res.json({ ok: false, msg: "用户不存在" });
  if (!bcrypt.compareSync(password, user.password)) return res.json({ ok: false, msg: "密码错误" });
  res.json({ ok: true, name: user.name });
});

const MSG_FILE = path.join(__dirname, "data", "messages.json");
const loadMsgs = () => {
  if (!fs.existsSync(MSG_FILE)) { fs.writeFileSync(MSG_FILE, "[]"); return []; }
  return JSON.parse(fs.readFileSync(MSG_FILE, "utf8"));
};
const saveMsgs = (m) => fs.writeFileSync(MSG_FILE, JSON.stringify(m, null, 2));

app.get("/api/forum", (req, res) => res.json(loadMsgs()));
app.post("/api/forum", (req, res) => {
  const { name, msg } = req.body;
  if (!name || !msg) return res.json({ ok: false });
  const msgs = loadMsgs();
  msgs.unshift({ name, msg, time: new Date().toLocaleString("zh-CN") });
  if (msgs.length > 200) msgs.splice(200);
  saveMsgs(msgs);
  res.json({ ok: true });
});

app.get("/api/notices", (req, res) => res.json([
  "V2.5 新增注册登录系统",
  "贪吃蛇升级至1200x1200",
  "联机炮台修复炮弹/转向/加入",
  "论坛自动带登录昵称"
]));

const rooms = {};
io.on("connection", (socket) => {
  socket.on("createRoom", (name) => {
    const roomId = Math.random().toString(36).substr(2, 6);
    rooms[roomId] = { players: [{ id: socket.id, name, x: 400, y: 250, angle: 0 }], bullets: [] };
    socket.join(roomId);
    socket.emit("roomCreated", roomId);
    io.to(roomId).emit("roomUpdate", rooms[roomId]);
  });
  socket.on("joinRoom", ({ roomId, name }) => {
    if (!rooms[roomId]) return socket.emit("joinFailed", "房间不存在");
    if (rooms[roomId].players.length >= 4) return socket.emit("joinFailed", "房间已满");
    rooms[roomId].players.push({ id: socket.id, name, x: 400, y: 250, angle: 0 });
    socket.join(roomId);
    io.to(roomId).emit("roomUpdate", rooms[roomId]);
    socket.emit("joinSuccess", rooms[roomId]);
  });
  socket.on("gameUpdate", ({ roomId, x, y, angle }) => {
    if (!rooms[roomId]) return;
    const p = rooms[roomId].players.find((p) => p.id === socket.id);
    if (p) { p.x = x; p.y = y; p.angle = angle; io.to(roomId).emit("roomUpdate", rooms[roomId]); }
  });
  socket.on("fireBullet", ({ roomId, x, y, angle }) => {
    if (!rooms[roomId]) return;
    const b = { x, y, angle, owner: socket.id, id: Math.random().toString(36).substr(2, 9) };
    rooms[roomId].bullets.push(b);
    io.to(roomId).emit("bulletFired", b);
  });
  socket.on("disconnect", () => {
    for (const rid in rooms) {
      rooms[rid].players = rooms[rid].players.filter((p) => p.id !== socket.id);
      rooms[rid].bullets = rooms[rid].bullets.filter((b) => b.owner !== socket.id);
      if (!rooms[rid].players.length) delete rooms[rid];
      else io.to(rid).emit("roomUpdate", rooms[rid]);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log("V2.5 running on http://0.0.0.0:" + PORT));
