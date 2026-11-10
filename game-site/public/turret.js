// ========== 联机炮台（V2.0） ==========
let turretSocket = null;
let turretRoomId = null;
let turretLoop = null;
let turretCanvas = null;
let turretCtx = null;
let turretName = '玩家';

// 本玩家
let turretPlayer = { x: 400, y: 250, angle: 0, hp: 100, kills: 0 };
// 其他玩家 { socketId: {x, y, angle, hp, kills, name} }
let turretOthers = {};
// 炮弹列表
let turretBullets = [];

const TURRET_SPEED = 4;
const BULLET_SPEED = 8;
const TURRET_RADIUS = 16;

// 供 app.js 设置昵称
window.turretSetName = function(name) { turretName = name; };

function turretInit() {
  if (turretSocket) return;

  const isLocal = window.location.protocol === 'file:';
  turretSocket = isLocal ? io('http://localhost:3000') : io();

  turretSocket.on('connect', () => {
    console.log('[炮台] 已连接到服务器');
    const roomMsg = document.getElementById('roomMsg');
    if (roomMsg && roomMsg.textContent === '') {
      roomMsg.style.color = '#2ed573';
      roomMsg.textContent = '已连接服务器';
    }
  });

  turretSocket.on('connect_error', () => {
    const roomMsg = document.getElementById('roomMsg');
    if (roomMsg) {
      roomMsg.style.color = '#ff4757';
      roomMsg.innerHTML = '连接失败！请确认已启动服务器: <b>npm start</b>';
    }
  });

  // 房间创建成功
  turretSocket.on('roomCreated', (data) => {
    turretRoomId = data.roomId;
    turretOthers = {};
    turretBullets = [];
    document.getElementById('roomInput').value = data.roomId;
    document.getElementById('roomMsg').style.color = '#2ed573';
    document.getElementById('roomMsg').textContent = '房间已创建: ' + data.roomId + '，等待玩家加入...';
    startTurretGame();
  });

  // 加入成功
  turretSocket.on('joinedRoom', (data) => {
    turretRoomId = data.roomId;
    turretOthers = {};
    turretBullets = [];
    // 同步当前房间内其他玩家
    (data.players || []).forEach(p => {
      if (p.id !== turretSocket.id) turretOthers[p.id] = p;
    });
    document.getElementById('roomMsg').style.color = '#2ed573';
    document.getElementById('roomMsg').textContent = '已加入房间: ' + data.roomId;
    startTurretGame();
  });

  // 加入失败
  turretSocket.on('joinFailed', (msg) => {
    const roomMsg = document.getElementById('roomMsg');
    roomMsg.style.color = '#ff4757';
    roomMsg.textContent = msg;
  });

  // 房间更新（人数）
  turretSocket.on('roomUpdate', (room) => {
    const count = room.players ? room.players.length : 0;
    document.getElementById('roomMsg').innerHTML =
      '玩家: ' + count + '/4 &nbsp; <small style="color:#888">房间号: ' + room.id + '</small>';
  });

  // 其他玩家位置同步
  turretSocket.on('gameUpdate', (data) => {
    if (!turretOthers[data.id]) {
      turretOthers[data.id] = { x: data.x, y: data.y, angle: 0, hp: 100, kills: 0, name: '玩家' };
    }
    turretOthers[data.id].x = data.x;
    turretOthers[data.id].y = data.y;
    if (data.angle !== undefined) turretOthers[data.id].angle = data.angle;
  });

  // 玩家离开
  turretSocket.on('playerLeft', (id) => {
    delete turretOthers[id];
  });

  // 其他玩家开炮 → 生成炮弹
  turretSocket.on('shoot', (data) => {
    turretBullets.push({
      x: data.x, y: data.y,
      angle: data.angle || 0,
      owner: data.playerId || 'other'
    });
  });
}

function startTurretGame() {
  showPage('turret-game');
  turretCanvas = document.getElementById('turretCanvas');
  turretCtx = turretCanvas.getContext('2d');
  turretPlayer = { x: 400, y: 250, angle: -Math.PI / 2, hp: 100, kills: 0 };
  turretBullets = [];
  for (const k in turretOthers) delete turretOthers[k];

  updateHud();

  document.addEventListener('keydown', turretKeyDown);
  document.addEventListener('keyup', turretKeyUp);
  turretCanvas.addEventListener('mousemove', turretMouseMove);

  if (turretLoop) clearInterval(turretLoop);
  turretLoop = setInterval(turretTick, 1000 / 60);
}

function turretKeyDown(e) {
  const key = e.key.toLowerCase();
  turretKeys[key] = true;
  if (key === 'j' || key === ' ' || key === 'k') {
    e.preventDefault();
    turretShoot();
  }
}
function turretKeyUp(e) { turretKeys[e.key.toLowerCase()] = false; }

function turretMouseMove(e) {
  if (!turretCanvas) return;
  const rect = turretCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (turretCanvas.width / rect.width);
  const my = (e.clientY - rect.top) * (turretCanvas.height / rect.height);
  turretPlayer.angle = Math.atan2(my - turretPlayer.y, mx - turretPlayer.x);
}

function turretMove(dir) {
  const step = 10;
  if (dir === 'left') { turretPlayer.x -= step; turretPlayer.angle = Math.PI; }
  if (dir === 'right') { turretPlayer.x += step; turretPlayer.angle = 0; }
  if (dir === 'up') { turretPlayer.y -= step; turretPlayer.angle = -Math.PI / 2; }
  if (dir === 'down') { turretPlayer.y += step; turretPlayer.angle = Math.PI / 2; }
  clampPlayer();
  syncState();
}

function clampPlayer() {
  turretPlayer.x = Math.max(TURRET_RADIUS, Math.min(800 - TURRET_RADIUS, turretPlayer.x));
  turretPlayer.y = Math.max(TURRET_RADIUS, Math.min(500 - TURRET_RADIUS, turretPlayer.y));
}

function turretShoot() {
  if (!turretSocket || !turretRoomId) return;
  turretBullets.push({
    x: turretPlayer.x,
    y: turretPlayer.y,
    angle: turretPlayer.angle,
    owner: turretSocket.id
  });
  // 通知其他玩家
  turretSocket.emit('shoot', {
    roomId: turretRoomId,
    x: turretPlayer.x,
    y: turretPlayer.y,
    angle: turretPlayer.angle
  });
}

function syncState() {
  if (turretSocket && turretRoomId) {
    turretSocket.emit('gameUpdate', {
      roomId: turretRoomId,
      x: turretPlayer.x,
      y: turretPlayer.y,
      angle: turretPlayer.angle
    });
  }
}

function updateHud() {
  document.getElementById('turretScore').textContent = '击杀: ' + turretPlayer.kills;
  document.getElementById('turretHealth').textContent = 'HP: ' + turretPlayer.hp;
  document.getElementById('turretRoom').textContent = '房间: ' + (turretRoomId || '-');
}

function checkBulletHits() {
  for (let i = turretBullets.length - 1; i >= 0; i--) {
    const b = turretBullets[i];
    if (b.owner === turretSocket.id) continue; // 不判自己的弹
    const other = turretOthers[b.owner];
    const target = other; // 击中其他玩家
    // 这里简化为：敌方炮弹打到我（在房主逻辑下用距离判断）
    const dx = b.x - turretPlayer.x;
    const dy = b.y - turretPlayer.y;
    if (dx * dx + dy * dy < (TURRET_RADIUS + 4) * (TURRET_RADIUS + 4)) {
      turretPlayer.hp -= 10;
      turretBullets.splice(i, 1);
      if (turretPlayer.hp <= 0) {
        turretPlayer.hp = 0;
        updateHud();
        // 对方得分：由发射者逻辑；这里本端只做受击反馈
        turretPlayer.hp = 100; // 简单重生
      }
      updateHud();
      continue;
    }
  }
}

function turretTick() {
  // 移动
  let moved = false;
  if (turretKeys['a'] || turretKeys['arrowleft']) { turretPlayer.x -= TURRET_SPEED; turretPlayer.angle = Math.PI; moved = true; }
  if (turretKeys['d'] || turretKeys['arrowright']) { turretPlayer.x += TURRET_SPEED; turretPlayer.angle = 0; moved = true; }
  if (turretKeys['w'] || turretKeys['arrowup']) { turretPlayer.y -= TURRET_SPEED; turretPlayer.angle = -Math.PI / 2; moved = true; }
  if (turretKeys['s'] || turretKeys['arrowdown']) { turretPlayer.y += TURRET_SPEED; turretPlayer.angle = Math.PI / 2; moved = true; }
  clampPlayer();
  if (moved) syncState();

  // 炮弹移动 + 清理越界
  for (let i = turretBullets.length - 1; i >= 0; i--) {
    const b = turretBullets[i];
    b.x += Math.cos(b.angle) * BULLET_SPEED;
    b.y += Math.sin(b.angle) * BULLET_SPEED;
    if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 500) {
      turretBullets.splice(i, 1);
    }
  }

  // 判定受击
  checkBulletHits();

  draw();
}

function draw() {
  const ctx = turretCtx;
  // 背景
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, 800, 500);
  // 网格
  ctx.strokeStyle = '#151540';
  ctx.lineWidth = 1;
  for (let i = 0; i < 800; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 500); ctx.stroke(); }
  for (let j = 0; j < 500; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(800, j); ctx.stroke(); }

  // 炮弹
  turretBullets.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = b.owner === turretSocket.id ? '#ffd93d' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    // 弹尾
    ctx.fillStyle = 'rgba(255,200,0,0.5)';
    ctx.fillRect(-10, -2, 8, 4);
    ctx.restore();
  });

  // 其他玩家
  Object.keys(turretOthers).forEach(id => {
    const p = turretOthers[id];
    drawTurret(p.x, p.y, p.angle || 0, '#ff6b6b', p.name || '玩家');
  });

  // 本玩家
  drawTurret(turretPlayer.x, turretPlayer.y, turretPlayer.angle, '#4a9eff', turretName);

  // 准星
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(turretPlayer.x, turretPlayer.y);
  ctx.lineTo(
    turretPlayer.x + Math.cos(turretPlayer.angle) * 400,
    turretPlayer.y + Math.sin(turretPlayer.angle) * 400
  );
  ctx.stroke();
}

function drawTurret(x, y, angle, color, name) {
  const ctx = turretCtx;
  ctx.save();
  ctx.translate(x, y);
  // 底座
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  // 炮塔
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  // 炮管（随角度转动）
  ctx.rotate(angle);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(0, -4, 30, 8);
  ctx.restore();
  // 名字
  ctx.fillStyle = color;
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(name || '', x, y - 30);
}

function turretStop() {
  if (turretLoop) { clearInterval(turretLoop); turretLoop = null; }
  document.removeEventListener('keydown', turretKeyDown);
  document.removeEventListener('keyup', turretKeyUp);
  if (turretCanvas) turretCanvas.removeEventListener('mousemove', turretMouseMove);
  if (turretSocket) { turretSocket.disconnect(); turretSocket = null; }
  turretRoomId = null;
  for (const k in turretOthers) delete turretOthers[k];
  turretBullets = [];
}
