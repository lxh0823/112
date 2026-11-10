// ========== 联机炮台 ==========
let turretSocket = null;
let turretRoomId = null;
let turretLoop = null;
let turretCanvas = null;
let turretCtx = null;
let turretPlayer = { x: 400, y: 250, angle: 0 };
let turretKeys = {};
let turretKills = 0;

function turretInit() {
  if (turretSocket) return; // 已连接

  // 线上自动匹配域名(wss)，本地连 localhost
  const isLocal = window.location.protocol === 'file:';
  turretSocket = isLocal ? io('http://localhost:3000') : io();

  turretSocket.on('connect', () => {
    console.log('已连接到服务器');
  });

  turretSocket.on('connect_error', () => {
    document.getElementById('roomMsg').style.color = '#ff4757';
    document.getElementById('roomMsg').textContent = '连接失败！请确认已启动服务器: npm start';
  });

  turretSocket.on('roomCreated', (roomId) => {
    turretRoomId = roomId;
    document.getElementById('roomInput').value = roomId;
    document.getElementById('roomMsg').style.color = '#2ed573';
    document.getElementById('roomMsg').textContent = '房间已创建: ' + roomId + '，等待玩家...';
    startTurretGame();
  });

  turretSocket.on('joinFailed', (msg) => {
    document.getElementById('roomMsg').style.color = '#ff4757';
    document.getElementById('roomMsg').textContent = msg;
  });

  turretSocket.on('roomUpdate', (room) => {
    const count = room.players ? room.players.length : 0;
    document.getElementById('roomMsg').innerHTML =
      '玩家: ' + count + '/4 <br><small style="color:#888">房间号: ' + room.id + '</small>';
  });

  turretSocket.on('gameUpdate', (data) => {
    // 其他玩家位置（可用于多人渲染）
  });
}

function startTurretGame() {
  showPage('turret-game');
  turretCanvas = document.getElementById('turretCanvas');
  turretCtx = turretCanvas.getContext('2d');
  turretPlayer = { x: 400, y: 250, angle: 0 };
  turretKills = 0;
  document.getElementById('turretScore').textContent = '击杀: 0';
  document.getElementById('turretRoom').textContent = '房间: ' + turretRoomId;

  document.addEventListener('keydown', turretKeyDown);
  document.addEventListener('keyup', turretKeyUp);

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

function turretMove(dir) {
  if (dir === 'left') turretPlayer.x -= 10;
  if (dir === 'right') turretPlayer.x += 10;
  if (dir === 'up') turretPlayer.y -= 10;
  if (dir === 'down') turretPlayer.y += 10;
  clampPlayer();
}

function clampPlayer() {
  turretPlayer.x = Math.max(20, Math.min(780, turretPlayer.x));
  turretPlayer.y = Math.max(20, Math.min(480, turretPlayer.y));
}

function turretShoot() {
  if (!turretSocket || !turretRoomId) return;
  turretSocket.emit('shoot', {
    roomId: turretRoomId,
    x: turretPlayer.x,
    y: turretPlayer.y,
    angle: turretPlayer.angle
  });
  turretKills++;
  document.getElementById('turretScore').textContent = '击杀: ' + turretKills;
}

function turretTick() {
  const speed = 4;
  if (turretKeys['a'] || turretKeys['arrowleft']) turretPlayer.x -= speed;
  if (turretKeys['d'] || turretKeys['arrowright']) turretPlayer.x += speed;
  if (turretKeys['w'] || turretKeys['arrowup']) turretPlayer.y -= speed;
  if (turretKeys['s'] || turretKeys['arrowdown']) turretPlayer.y += speed;
  clampPlayer();

  // 渲染
  const ctx = turretCtx;
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, 800, 500);

  // 网格
  ctx.strokeStyle = '#151540';
  for (let i = 0; i < 800; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 500); ctx.stroke(); }
  for (let j = 0; j < 500; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(800, j); ctx.stroke(); }

  // 炮台
  ctx.save();
  ctx.translate(turretPlayer.x, turretPlayer.y);
  // 底座
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  // 炮管
  ctx.fillStyle = '#4a9eff';
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(-3, -35, 6, 25);
  ctx.restore();

  // 同步
  if (turretSocket && turretRoomId) {
    turretSocket.emit('gameUpdate', {
      roomId: turretRoomId,
      x: turretPlayer.x,
      y: turretPlayer.y
    });
  }
}

function turretStop() {
  if (turretLoop) { clearInterval(turretLoop); turretLoop = null; }
  document.removeEventListener('keydown', turretKeyDown);
  document.removeEventListener('keyup', turretKeyUp);
  if (turretSocket) { turretSocket.disconnect(); turretSocket = null; }
  turretRoomId = null;
}
