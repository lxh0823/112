// ========== 联机炮台 - 前端逻辑 ==========
let turretSocket = null;
let turretRoomId = null;
let turretCanvas = null;
let turretCtx = null;
let turretPlayer = { x: 400, y: 450, angle: 0, hp: 100, kills: 0, name: '玩家' };
let turretKeys = {};
let turretLoop = null;
let turretBullets = [];
let turretEnemies = [];
let otherPlayers = {};
let myId = null;
let isLocalMode = false;

function initTurret(isLocal) {
  isLocalMode = isLocal;
  try {
    // 线上自动用 wss，本地连 localhost:3000
    turretSocket = isLocal
      ? io('http://localhost:3000')
      : io();

    turretSocket.on('connect', () => {
      myId = turretSocket.id;
      document.getElementById('roomMsg').innerHTML = '<span style="color:#4a9eff;">✅ 已连接到服务器</span>';
    });

    turretSocket.on('connect_error', () => {
      document.getElementById('roomMsg').innerHTML =
        '<span style="color:#ff6b6b;">❌ 连接失败！请确认已启动服务器：npm start</span>';
    });

    turretSocket.on('roomCreated', (id) => {
      turretRoomId = id;
      document.getElementById('roomInput').value = id;
      document.getElementById('roomMsg').innerHTML =
        '<span style="color:#4a9eff;">✅ 房间已创建: <b>' + id + '</b>，等待其他玩家...</span>';
      startTurretGame();
    });

    turretSocket.on('roomUpdate', (room) => {
      // 更新其他玩家信息
      otherPlayers = {};
      room.players.forEach(p => {
        if (p.id !== myId) otherPlayers[p.id] = p;
      });
      updateScoreboard(room.players);
    });

    turretSocket.on('playerMoved', ({ id, x, y }) => {
      if (otherPlayers[id]) {
        otherPlayers[id].x = x;
        otherPlayers[id].y = y;
      }
    });

    turretSocket.on('playerShoot', ({ id, angle }) => {
      if (otherPlayers[id]) {
        // 在其他玩家位置生成子弹动画
        turretBullets.push({
          x: otherPlayers[id].x,
          y: otherPlayers[id].y,
          angle: angle,
          color: '#ff6b6b',
          life: 60
        });
      }
    });

    turretSocket.on('scoreUpdate', ({ scores }) => {
      updateScoreboardFromScores(scores);
    });

    turretSocket.on('playerLeft', ({ id }) => {
      delete otherPlayers[id];
    });

    turretSocket.on('joinFailed', (msg) => {
      document.getElementById('roomMsg').innerHTML =
        '<span style="color:#ff6b6b;">❌ ' + msg + '</span>';
    });

  } catch (e) {
    document.getElementById('roomMsg').innerHTML =
      '<span style="color:#ffa500;">⚠️ 需要连接服务器才能联机。本地请运行: npm install && npm start</span>';
  }
}

function createRoom() {
  const name = document.getElementById('playerName').value || '玩家';
  turretPlayer.name = name;
  if (!turretSocket || !turretSocket.connected) {
    document.getElementById('roomMsg').innerHTML =
      '<span style="color:#ff6b6b;">❌ 未连接到服务器，请先启动服务器</span>';
    return;
  }
  turretSocket.emit('createRoom', name);
}

function joinRoom() {
  const name = document.getElementById('playerName').value || '玩家';
  const roomId = document.getElementById('roomInput').value.trim().toUpperCase();
  turretPlayer.name = name;
  if (!roomId) {
    document.getElementById('roomMsg').innerHTML =
      '<span style="color:#ff6b6b;">❌ 请输入房间号</span>';
    return;
  }
  if (!turretSocket || !turretSocket.connected) {
    document.getElementById('roomMsg').innerHTML =
      '<span style="color:#ff6b6b;">❌ 未连接到服务器，请先启动服务器</span>';
    return;
  }
  turretSocket.emit('joinRoom', { roomId, name });
  turretRoomId = roomId;
  document.getElementById('roomMsg').innerHTML =
    '<span style="color:#4a9eff;">正在加入房间: ' + roomId + '...</span>';
  startTurretGame();
}

function startTurretGame() {
  document.getElementById('turret-lobby').style.display = 'none';
  document.getElementById('turret-game').style.display = 'block';
  turretCanvas = document.getElementById('turretCanvas');
  turretCtx = turretCanvas.getContext('2d');
  turretPlayer = { x: 400, y: 450, angle: 0, hp: 100, kills: 0, name: turretPlayer.name };
  turretBullets = [];
  turretEnemies = [];
  otherPlayers = {};
  document.getElementById('turretScore').innerText = '击杀: 0';

  document.addEventListener('keydown', turretKeyDown);
  document.addEventListener('keyup', turretKeyUp);

  turretLoop = setInterval(turretTick, 1000 / 60);
}

function turretKeyDown(e) {
  const key = e.key.toLowerCase();
  turretKeys[key] = true;
  if (key === 'j' || key === ' ' || key === 'spacebar') {
    e.preventDefault();
    turretShoot();
  }
}
function turretKeyUp(e) { turretKeys[e.key.toLowerCase()] = false; }

function turretMove(dir) {
  if (dir === 'left') turretPlayer.x -= 15;
  if (dir === 'right') turretPlayer.x += 15;
  if (dir === 'up') turretPlayer.y -= 15;
  if (dir === 'down') turretPlayer.y += 15;
  turretPlayer.x = Math.max(20, Math.min(780, turretPlayer.x));
  turretPlayer.y = Math.max(20, Math.min(480, turretPlayer.y));
}

function turretShoot() {
  // 本地子弹
  turretBullets.push({
    x: turretPlayer.x,
    y: turretPlayer.y - 20,
    vy: -6,
    color: '#4a9eff',
    life: 100
  });
  // 通知服务器
  if (turretSocket && turretRoomId) {
    const angle = -Math.PI / 2;
    turretSocket.emit('shoot', { roomId: turretRoomId, angle });
  }
}

function turretShootBtn() { turretShoot(); }

function turretTick() {
  // 移动
  if (turretKeys['a'] || turretKeys['arrowleft']) turretPlayer.x -= 4;
  if (turretKeys['d'] || turretKeys['arrowright']) turretPlayer.x += 4;
  if (turretKeys['w'] || turretKeys['arrowup']) turretPlayer.y -= 4;
  if (turretKeys['s'] || turretKeys['arrowdown']) turretPlayer.y += 4;
  turretPlayer.x = Math.max(20, Math.min(780, turretPlayer.x));
  turretPlayer.y = Math.max(20, Math.min(480, turretPlayer.y));

  // 同步位置
  if (turretSocket && turretSocket.connected && turretRoomId) {
    turretSocket.emit('gameUpdate', {
      roomId: turretRoomId,
      x: turretPlayer.x,
      y: turretPlayer.y
    });
  }

  // 渲染
  drawTurret();

  // 子弹更新
  turretBullets = turretBullets.filter(b => b.life > 0);
  turretBullets.forEach(b => {
    if (b.vy !== undefined) {
      b.y += b.vy;
    } else if (b.angle !== undefined) {
      b.x += Math.cos(b.angle) * 5;
      b.y += Math.sin(b.angle) * 5;
    }
    b.life--;
  });
}

function drawTurret() {
  const ctx = turretCtx;
  // 背景
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, 800, 500);
  // 网格
  ctx.strokeStyle = '#1a1a4a';
  ctx.lineWidth = 1;
  for (let i = 0; i < 800; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 500); ctx.stroke(); }
  for (let j = 0; j < 500; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(800, j); ctx.stroke(); }

  // 其他玩家
  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    ctx.save();
    ctx.translate(p.x || 400, p.y || 250);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    // 名字
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.name || '玩家', 0, -22);
    ctx.restore();
  }

  // 自己
  ctx.save();
  ctx.translate(turretPlayer.x, turretPlayer.y);
  // 炮台底座
  ctx.fillStyle = '#4a9eff';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  // 炮管
  ctx.fillStyle = '#ffa500';
  ctx.fillRect(-3, -30, 6, 20);
  ctx.restore();

  // 自己名字
  ctx.fillStyle = '#4a9eff';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(turretPlayer.name + ' (你)', turretPlayer.x, turretPlayer.y - 28);

  // 子弹
  turretBullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateScoreboard(players) {
  const sb = document.getElementById('scoreboard');
  if (!sb || !players) return;
  let html = '<b>🏆 排行榜</b><br>';
  players
    .slice()
    .sort((a, b) => (b.kills || 0) - (a.kills || 0))
    .forEach(p => {
      const isMe = p.id === myId;
      html += `<div style="${isMe ? 'color:#4a9eff;font-weight:bold;' : ''}">${p.name}${isMe ? '(你)' : ''}: ${p.kills || 0} 杀</div>`;
    });
  sb.innerHTML = html;
}

function updateScoreboardFromScores(scores) {
  const sb = document.getElementById('scoreboard');
  if (!sb) return;
  let html = '<b>🏆 排行榜</b><br>';
  scores
    .slice()
    .sort((a, b) => (b.kills || 0) - (a.kills || 0))
    .forEach(p => {
      const isMe = p.id === myId;
      html += `<div style="${isMe ? 'color:#4a9eff;font-weight:bold;' : ''}">${p.name}${isMe ? '(你)' : ''}: ${p.kills || 0} 杀</div>`;
    });
  sb.innerHTML = html;

  // 更新自己击杀数
  const me = scores.find(s => s.id === myId);
  if (me) {
    turretPlayer.kills = me.kills;
    document.getElementById('turretScore').innerText = '击杀: ' + me.kills;
  }
}

function turretStop() {
  if (turretLoop) { clearInterval(turretLoop); turretLoop = null; }
  document.removeEventListener('keydown', turretKeyDown);
  document.removeEventListener('keyup', turretKeyUp);
  if (turretSocket) { turretSocket.disconnect(); turretSocket = null; }
  turretRoomId = null;
  myId = null;
}
