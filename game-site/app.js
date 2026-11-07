// ========== 页面切换 ==========
function openGame(name) {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('gameArea').style.display = 'block';
  const canvas = document.getElementById('gameCanvas');
  canvas.width = Math.min(400, window.innerWidth - 40);
  canvas.height = 500;
  if (window.startGame) startGame(name, canvas);
}

function openTurret() {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('turret-lobby').style.display = 'block';
  // 判断本地还是线上
  const isLocal = window.location.protocol === 'file:';
  if (isLocal) {
    document.getElementById('roomMsg').innerHTML =
      '<span style="color:#ffa500;">⚠️ 本地模式：联机需先启动服务器（npm start），然后访问 http://localhost:3000</span>';
  }
  initTurret(isLocal);
}

function backToLobby() {
  document.getElementById('lobby').style.display = 'block';
  document.getElementById('turret-lobby').style.display = 'none';
  document.getElementById('turret-game').style.display = 'none';
  document.getElementById('gameArea').style.display = 'none';
  if (window.stopGame) stopGame();
  if (window.turretStop) turretStop();
}

function backToTurretLobby() {
  document.getElementById('turret-game').style.display = 'none';
  document.getElementById('turret-lobby').style.display = 'block';
  if (window.turretStop) turretStop();
}
