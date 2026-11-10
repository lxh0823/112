// ========== 页面切换 ==========
function showPage(pageId) {
  const pages = ['lobby', 'forum', 'turret-lobby', 'turret-game', 'gameArea'];
  pages.forEach(p => {
    document.getElementById(p).classList.toggle('page-hidden', p !== pageId);
  });
}

function backToLobby() {
  if (window.stopCurrentGame) stopCurrentGame();
  if (window.turretStop) turretStop();
  showPage('lobby');
  // 关闭公告
  const nb = document.getElementById('noticeBoard');
  if (nb) nb.style.display = 'none';
}

// ========== 打开游戏 ==========
function openGame(name) {
  showPage('gameArea');
  startGame(name);
}

// ========== 打开论坛 ==========
function openForum() {
  showPage('forum');
  if (window.loadMessages) loadMessages();
}

// ========== 打开联机炮台 ==========
function openTurret() {
  showPage('turret-lobby');
  const roomMsg = document.getElementById('roomMsg');
  if (roomMsg) { roomMsg.textContent = ''; roomMsg.style.color = '#aaa'; }
}

function exitTurret() {
  turretStop();
  showPage('lobby');
}

function createRoom() {
  const nameInput = document.getElementById('playerName');
  const name = (nameInput.value || '').trim() || '玩家' + Math.floor(Math.random() * 100);
  // 存到全局供 turret.js 使用
  if (window.turretSetName) turretSetName(name);
  turretInit();
  turretSocket.emit('createRoom', name);
  const roomMsg = document.getElementById('roomMsg');
  roomMsg.style.color = '#ffa502';
  roomMsg.textContent = '创建中...';
}

function joinRoom() {
  const nameInput = document.getElementById('playerName');
  const name = (nameInput.value || '').trim() || '玩家' + Math.floor(Math.random() * 100);
  const roomId = document.getElementById('roomInput').value.trim().toUpperCase();
  if (!roomId) {
    const roomMsg = document.getElementById('roomMsg');
    roomMsg.style.color = '#ff4757';
    roomMsg.textContent = '请输入房间号';
    return;
  }
  if (window.turretSetName) turretSetName(name);
  turretInit();
  turretSocket.emit('joinRoom', { roomId, name });
  const roomMsg = document.getElementById('roomMsg');
  roomMsg.style.color = '#ffa502';
  roomMsg.textContent = '加入中...';
}

// ========== 公告板（更新公告） ==========
const NOTICE_DATA = [
  '🎉 V2.0 上线！联机炮台新增炮弹与转向，支持 2-4 人开房对战',
  '🐍 贪吃蛇场地扩大至 1200×1200，挑战更长身长',
  '💬 玩家论坛已开放，欢迎留言交流', '🏰 联机炮台：WASD 移动，J/空格/鼠标射击，先到 20 杀获胜',
  '🚀 项目持续更新中，欢迎反馈问题'
];

function showNotice() {
  let nb = document.getElementById('noticeBoard');
  if (!nb) {
    nb = document.createElement('div');
    nb.id = 'noticeBoard';
    document.body.appendChild(nb);
  }
  let idx = 0;
  nb.className = 'notice-board';
  nb.innerHTML = '<span class="notice-icon">📢</span><span class="notice-text"></span>';
  const textEl = nb.querySelector('.notice-text');

  function next() {
    textEl.textContent = NOTICE_DATA[idx % NOTICE_DATA.length];
    idx++;
  }
  next();
  nb.style.display = 'flex';
  // 先显示，延迟后再开始滚动
  setTimeout(() => {
    nb.classList.add('notice-show');
  }, 100);
  if (window._noticeTimer) clearInterval(window._noticeTimer);
  window._noticeTimer = setInterval(next, 5000);
}

// 页面加载后显示公告
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(showNotice, 800);
});
