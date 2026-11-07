// ========== 单机游戏集合 ==========
let gameLoop = null;
let currentGameName = null;

function startGame(name, canvas) {
  currentGameName = name;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameLoop) clearInterval(gameLoop);

  document.getElementById('gameInfo').innerHTML =
    `<h2>${getGameTitle(name)}</h2><p>使用方向键/WASD 控制</p>`;

  switch (name) {
    case 'snake': initSnake(canvas, ctx); break;
    case '2048': init2048(canvas, ctx); break;
    case 'brick': initBrick(canvas, ctx); break;
    case 'tetris': initTetris(canvas, ctx); break;
    case 'racing': initRacing(canvas, ctx); break;
    case 'memory': initMemory(canvas, ctx); break;
    case 'tictactoe': initTicTacToe(canvas, ctx); break;
    case 'shooter': initSpaceShooter(canvas, ctx); break;
    case 'target': initTarget(canvas, ctx); break;
    default: drawPlaceholder(canvas, ctx, name);
  }
}

function stopGame() {
  if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
  document.removeEventListener('keydown', gameKeyDown);
}

function getGameTitle(name) {
  const map = {
    'snake': '🐍 贪吃蛇', '2048': '🔢 2048',
    'brick': '🧱 打砖块', 'tetris': '🧩 俄罗斯方块',
    'racing': '🏎️ 极速赛车', 'memory': '🃏 翻翻乐',
    'tictactoe': '⭕ 井字棋', 'shooter': '🚀 太空射击',
    'target': '🎯 打靶游戏'
  };
  return map[name] || name;
}

function drawPlaceholder(canvas, ctx, name) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#4a9eff';
  ctx.font = '22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(getGameTitle(name), canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '14px Arial';
  ctx.fillStyle = '#8899aa';
  ctx.fillText('单机小游戏', canvas.width / 2, canvas.height / 2 + 20);
  ctx.fillText('完整版可随时扩展', canvas.width / 2, canvas.height / 2 + 45);
}

// ========== 贪吃蛇 ==========
let snake = [], snakeDir = { x: 1, y: 0 }, snakeFood = {}, snakeScore = 0, snakeCanvas, snakeCtx;

function initSnake(canvas, ctx) {
  snakeCanvas = canvas;
  snakeCtx = ctx;
  canvas.width = 400;
  canvas.height = 400;
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  snakeDir = { x: 1, y: 0 };
  snakeScore = 0;
  placeFood();
  document.addEventListener('keydown', gameKeyDown);
  gameLoop = setInterval(updateSnake, 150);
}

function placeFood() {
  snakeFood = {
    x: Math.floor(Math.random() * 20),
    y: Math.floor(Math.random() * 20)
  };
}

function updateSnake() {
  const head = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
  if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) return stopGame();
  if (snake.some(s => s.x === head.x && s.y === head.y)) return stopGame();

  snake.unshift(head);
  if (head.x === snakeFood.x && head.y === snakeFood.y) {
    snakeScore++;
    placeFood();
  } else {
    snake.pop();
  }

  drawSnake();
}

function drawSnake() {
  const ctx = snakeCtx;
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, 400, 400);
  // 网格
  ctx.strokeStyle = '#1a1a3a';
  for (let i = 0; i < 20; i++) {
    ctx.beginPath(); ctx.moveTo(i * 20, 0); ctx.lineTo(i * 20, 400); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 20); ctx.lineTo(400, i * 20); ctx.stroke();
  }
  // 蛇身
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#4a9eff' : '#2d7dd2';
    ctx.fillRect(s.x * 20 + 1, s.y * 20 + 1, 18, 18);
  });
  // 食物
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(snakeFood.x * 20 + 2, snakeFood.y * 20 + 2, 16, 16);
  // 分数
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.fillText('得分: ' + snakeScore, 60, 25);
}

// ========== 打砖块 ==========
let brickPaddle = { x: 175 }, brickBall = { x: 200, y: 300, vx: 3, vy: -3 }, brickBlocks = [], brickCanvas, brickCtx, brickScore = 0;

function initBrick(canvas, ctx) {
  brickCanvas = canvas; brickCtx = ctx;
  canvas.width = 400; canvas.height = 500;
  brickPaddle = { x: 175 };
  brickBall = { x: 200, y: 300, vx: 3, vy: -3 };
  brickScore = 0;
  brickBlocks = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      brickBlocks.push({ x: c * 50, y: r * 25, w: 46, h: 20, alive: true });
    }
  }
  document.addEventListener('keydown', gameKeyDown);
  gameLoop = setInterval(updateBrick, 1000 / 60);
}

function updateBrick() {
  const ctx = brickCtx;
  // 挡板跟随鼠标或键盘
  brickBall.x += brickBall.vx;
  brickBall.y += brickBall.vy;

  if (brickBall.x <= 0 || brickBall.x >= 400) brickBall.vx *= -1;
  if (brickBall.y <= 0) brickBall.vy *= -1;
  if (brickBall.y >= 500) { stopGame(); return; }

  // 挡板碰撞
  if (brickBall.y >= 480 && brickBall.x >= brickPaddle.x && brickBall.x <= brickPaddle.x + 60) {
    brickBall.vy = -Math.abs(brickBall.vy);
    brickBall.vx = (brickBall.x - brickPaddle.x - 30) * 0.15;
  }

  // 砖块碰撞
  brickBlocks.forEach(b => {
    if (b.alive &&
        brickBall.x >= b.x && brickBall.x <= b.x + b.w &&
        brickBall.y >= b.y && brickBall.y <= b.y + b.h) {
      b.alive = false;
      brickBall.vy *= -1;
      brickScore++;
    }
  });

  drawBrick();
}

function drawBrick() {
  const ctx = brickCtx;
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, 400, 500);
  // 挡板
  ctx.fillStyle = '#4a9eff';
  ctx.fillRect(brickPaddle.x, 480, 60, 12);
  // 球
  ctx.fillStyle = '#ffa500';
  ctx.beginPath();
  ctx.arc(brickBall.x, brickBall.y, 6, 0, Math.PI * 2);
  ctx.fill();
  // 砖块
  brickBlocks.forEach(b => {
    if (b.alive) {
      ctx.fillStyle = `hsl(${b.y * 10}, 70%, 50%)`;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  });
  // 分数
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.fillText('得分: ' + brickScore, 60, 20);
}

// ========== 太空射击 ==========
let ssPlayer = { x: 200 }, ssBullets = [], ssEnemies = [], ssCanvas, ssCtx, ssScore = 0;

function initSpaceShooter(canvas, ctx) {
  ssCanvas = canvas; ssCtx = ctx;
  canvas.width = 400; canvas.height = 500;
  ssPlayer = { x: 200 };
  ssBullets = []; ssEnemies = []; ssScore = 0;
  document.addEventListener('keydown', gameKeyDown);
  gameLoop = setInterval(updateSpaceShooter, 1000 / 60);
}

function updateSpaceShooter() {
  // 发射
  if (Math.random() < 0.05) {
    ssBullets.push({ x: ssPlayer.x, y: 480, vy: -5 });
  }
  // 生成敌人
  if (Math.random() < 0.02) {
    ssEnemies.push({ x: Math.random() * 380, y: 0, vy: 2 });
  }

  // 子弹更新
  ssBullets.forEach(b => b.y += b.vy);
  ssBullets = ssBullets.filter(b => b.y > 0);
  // 敌人更新
  ssEnemies.forEach(e => e.y += e.vy);
  ssEnemies = ssEnemies.filter(e => e.y < 500);

  // 碰撞
  ssBullets.forEach(b => {
    ssEnemies.forEach(e => {
      if (e.alive !== false && Math.abs(b.x - e.x) < 20 && Math.abs(b.y - e.y) < 20) {
        e.alive = false;
        b.y = -999;
        ssScore++;
      }
    });
  });
  ssEnemies = ssEnemies.filter(e => e.alive !== false);

  drawSpaceShooter();
}

function drawSpaceShooter() {
  const ctx = ssCtx;
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, 400, 500);
  // 星星
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * 400, Math.random() * 500, 1, 1);
  }
  // 玩家飞船
  ctx.fillStyle = '#4a9eff';
  ctx.beginPath();
  ctx.moveTo(ssPlayer.x, 490);
  ctx.lineTo(ssPlayer.x - 15, 470);
  ctx.lineTo(ssPlayer.x + 15, 470);
  ctx.closePath();
  ctx.fill();
  // 子弹
  ctx.fillStyle = '#ffa500';
  ssBullets.forEach(b => {
    ctx.fillRect(b.x - 2, b.y, 4, 10);
  });
  // 敌人
  ctx.fillStyle = '#ff6b6b';
  ssEnemies.forEach(e => {
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - 12, e.y + 20);
    ctx.lineTo(e.x + 12, e.y + 20);
    ctx.closePath();
    ctx.fill();
  });
  // 分数
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.fillText('得分: ' + ssScore, 60, 20);
}

// ========== 井字棋 ==========
let tttBoard = Array(9).fill(''), tttTurn = 'X', tttCanvas, tttCtx;

function initTicTacToe(canvas, ctx) {
  tttCanvas = canvas; tttCtx = ctx;
  canvas.width = 300; canvas.height = 300;
  tttBoard = Array(9).fill('');
  tttTurn = 'X';
  drawTicTacToe();
}

function drawTicTacToe() {
  const ctx = tttCtx;
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, 300, 300);
  ctx.strokeStyle = '#4a9eff';
  ctx.lineWidth = 3;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(i * 100, 20); ctx.lineTo(i * 100, 280); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, i * 100); ctx.lineTo(280, i * 100); ctx.stroke();
  }
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  tttBoard.forEach((cell, i) => {
    if (cell) {
      ctx.fillStyle = cell === 'X' ? '#ff6b6b' : '#4a9eff';
      ctx.fillText(cell, (i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 65);
    }
  });
}

// ========== 打靶游戏 ==========
let tgTargets = [], tgCanvas, tgCtx, tgScore = 0, tgTime = 30;

function initTarget(canvas, ctx) {
  tgCanvas = canvas; tgCtx = ctx;
  canvas.width = 400; canvas.height = 500;
  tgScore = 0; tgTime = 30;
  tgTargets = [];
  document.addEventListener('keydown', gameKeyDown);
  gameLoop = setInterval(updateTarget, 1000 / 60);
}

function updateTarget() {
  if (Math.random() < 0.03) {
    tgTargets.push({ x: Math.random() * 360, y: Math.random() * 300, r: 25, life: 100 });
  }
  tgTargets.forEach(t => t.life--);
  tgTargets = tgTargets.filter(t => t.life > 0);
  tgTime -= 1 / 60;
  if (tgTime <= 0) { stopGame(); return; }
  drawTarget();
}

function drawTarget() {
  const ctx = tgCtx;
  ctx.fillStyle = '#0a1a0a';
  ctx.fillRect(0, 0, 400, 500);
  tgTargets.forEach(t => {
    const alpha = t.life / 100;
    ctx.fillStyle = `rgba(255, ${Math.floor(100 * alpha)}, ${Math.floor(100 * alpha)}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a9eff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial';
  ctx.fillText('得分: ' + tgScore, 60, 25);
  ctx.fillText('时间: ' + Math.ceil(tgTime), 300, 25);
}

// ========== 键盘控制 ==========
function gameKeyDown(e) {
  if (currentGameName === 'snake') {
    switch (e.key) {
      case 'ArrowUp': case 'w': if (snakeDir.y !== 1) snakeDir = { x: 0, y: -1 }; break;
      case 'ArrowDown': case 's': if (snakeDir.y !== -1) snakeDir = { x: 0, y: 1 }; break;
      case 'ArrowLeft': case 'a': if (snakeDir.x !== 1) snakeDir = { x: -1, y: 0 }; break;
      case 'ArrowRight': case 'd': if (snakeDir.x !== -1) snakeDir = { x: 1, y: 0 }; break;
    }
  } else if (currentGameName === 'brick') {
    if (e.key === 'ArrowLeft' || e.key === 'a') brickPaddle.x = Math.max(0, brickPaddle.x - 20);
    if (e.key === 'ArrowRight' || e.key === 'd') brickPaddle.x = Math.min(340, brickPaddle.x + 20);
  } else if (currentGameName === 'racing') {
    if (e.key === 'ArrowLeft' || e.key === 'a') { /* 赛车左 */ }
    if (e.key === 'ArrowRight' || e.key === 'd') { /* 赛车右 */ }
  } else if (currentGameName === 'shooter') {
    if (e.key === 'ArrowLeft' || e.key === 'a') ssPlayer.x = Math.max(15, ssPlayer.x - 8);
    if (e.key === 'ArrowRight' || e.key === 'd') ssPlayer.x = Math.min(385, ssPlayer.x + 8);
  } else if (currentGameName === 'target') {
    if (e.key === ' ') {
      // 射击最近靶子
      tgTargets.forEach(t => { t.life = 0; tgScore++; });
    }
  }
}
