// ========== 页面切换 ==========
function showPage(pageId) {
  const pages = ['lobby', 'forum', 'turret-lobby', 'turret-game', 'gameArea'];
  pages.forEach(p => {
    document.getElementById(p).classList.toggle('page-hidden', p !== pageId);
  });
}

function backToLobby() {
  // 停止所有游戏
  if (window.stopCurrentGame) stopCurrentGame();
  if (window.turretStop) turretStop();
  showPage('lobby');
}

// ========== 打开游戏 ==========
function openGame(name) {
  showPage('gameArea');
  startGame(name);
}

// ========== 打开联机炮台 ==========
function openTurret() {
  showPage('turret-lobby');
  document.getElementById('roomMsg').textContent = '';
  document.getElementById('roomMsg').style.color = '#aaa';
}

function exitTurret() {
  turretStop();
  showPage('lobby');
}

function createRoom() {
  const name = document.getElementById('playerName').value.trim() || '玩家';
  turretInit();
  turretSocket.emit('createRoom', name);
  document.getElementById('roomMsg').style.color = '#ffa502';
  document.getElementById('roomMsg').textContent = '创建中...';
}

function joinRoom() {
  const name = document.getElementById('playerName').value.trim() || '玩家';
  const roomId = document.getElementById('roomInput').value.trim().toUpperCase();
  if (!roomId) {
    document.getElementById('roomMsg').style.color = '#ff4757';
    document.getElementById('roomMsg').textContent = '请输入房间号';
    return;
  }
  turretInit();
  turretSocket.emit('joinRoom', { roomId, name });
  document.getElementById('roomMsg').style.color = '#ffa502';
  document.getElementById('roomMsg').textContent = '加入中...';
}
