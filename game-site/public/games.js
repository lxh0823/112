// ========== 游戏管理器 ==========
let currentGameLoop = null;
let currentCleanup = null;

function startGame(name) {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const info = document.getElementById('gameInfo');

  // 默认画布
  canvas.width = 800;
  canvas.height = 550;

  // 停止之前的游戏
  if (currentGameLoop) { clearInterval(currentGameLoop); currentGameLoop = null; }
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }

  switch (name) {
    case 'snake': startSnake(canvas, ctx, info); break;
    case 'tetris': startTetris(canvas, ctx, info); break;
    case 'brick': startBrick(canvas, ctx, info); break;
    case 'racing': startRacing(canvas, ctx, info); break;
    case 'memory': startMemory(canvas, ctx, info); break;
    case '2048': start2048(canvas, ctx, info); break;
    case 'tictactoe': startTicTacToe(canvas, ctx, info); break;
    case 'shooter': startShooter(canvas, ctx, info); break;
    case 'target': startTarget(canvas, ctx, info); break;
    default:
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.textAlign = 'center';
      ctx.fillText('游戏加载中...', canvas.width / 2, canvas.height / 2);
  }
}

function stopCurrentGame() {
  if (currentGameLoop) { clearInterval(currentGameLoop); currentGameLoop = null; }
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  document.getElementById('gameInfo').textContent = '';
}

// ========== 🐍 贪吃蛇（1200×1200） ==========
function startSnake(canvas, ctx, info) {
  canvas.width = 1200;
  canvas.height = 1200;
  const gridSize = 30;
  const tileCount = 40; // 1200/30

  let snake = [{ x: 20, y: 20 }];
  let velocity = { x: 0, y: 0 };
  let food = { x: 15, y: 15 };
  let score = 0;
  let speed = 80;

  info.textContent = '🐍 贪吃蛇 | 方向键/WASD 移动 | 场���: 1200×1200';

  const keyHandler = (e) => {
    const k = e.key.toLowerCase();
    if ((k === 'arrowup' || k === 'w') && velocity.y !== 1) velocity = { x: 0, y: -1 };
    if ((k === 'arrowdown' || k === 's') && velocity.y !== -1) velocity = { x: 0, y: 1 };
    if ((k === 'arrowleft' || k === 'a') && velocity.x !== 1) velocity = { x: -1, y: 0 };
    if ((k === 'arrowright' || k === 'd') && velocity.x !== -1) velocity = { x: 1, y: 0 };
  };
  document.addEventListener('keydown', keyHandler);
  currentCleanup = () => document.removeEventListener('keydown', keyHandler);

  function draw() {
    // 背景
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, 1200, 1200);

    // 网格
    ctx.strokeStyle = '#1b2838';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 1200; i += gridSize) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1200); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1200, i); ctx.stroke();
    }

    // 食物（发光效果）
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 蛇身
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const isHead = i === 0;
      const ratio = i / snake.length;

      if (isHead) {
        ctx.fillStyle = '#4a9eff';
      } else {
        // 渐变尾巴
        const r = Math.floor(46 + (74 - 46) * ratio);
        const g = Math.floor(213 + (158 - 213) * ratio);
        const b = Math.floor(115 + (255 - 115) * ratio);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      }

      const px = seg.x * gridSize;
      const py = seg.y * gridSize;

      if (isHead) {
        // 圆角头部
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, gridSize - 2, gridSize - 2, 6);
        ctx.fill();
        // 眼睛
        ctx.fillStyle = '#fff';
        const ex = velocity.x === 1 ? 4 : velocity.x === -1 ? -4 : 0;
        const ey = velocity.y === 1 ? 4 : velocity.y === -1 ? -4 : 0;
        ctx.beginPath();
        ctx.arc(px + gridSize / 2 + (ex || 4), py + gridSize / 2 + (ey || -4), 3, 0, Math.PI * 2);
        ctx.arc(px + gridSize / 2 + (ex || -4), py + gridSize / 2 + (ey || 4), 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(px + 1, py + 1, gridSize - 2, gridSize - 2);
      }
    }

    // 分数（固定在左上角）
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10, 10, 180, 45);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('🐍 得分: ' + score, 20, 42);

    // 移动逻辑
    if (velocity.x === 0 && velocity.y === 0) return; // 还没开始

    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    // 撞墙
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
      gameOver();
      return;
    }
    // 撞自己
    for (const seg of snake) {
      if (head.x === seg.x && head.y === seg.y) { gameOver(); return; }
    }

    snake.unshift(head);

    // 吃食物
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };
      // 确保食物不出现在蛇身上
      while (snake.some(s => s.x === food.x && s.y === food.y)) {
        food = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount)
        };
      }
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    clearInterval(currentGameLoop);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 1200, 1200);
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💀 游戏结束', 600, 550);
    ctx.fillStyle = '#fff';
    ctx.font = '36px Arial';
    ctx.fillText('最终得分: ' + score, 600, 620);
    ctx.font = '24px Arial';
    ctx.fillText('按方向键重新开始', 600, 680);
    velocity = { x: 0, y: 0 };
    setTimeout(() => {
      snake = [{ x: 20, y: 20 }];
      velocity = { x: 0, y: 0 };
      score = 0;
      food = { x: 15, y: 15 };
      currentGameLoop = setInterval(draw, speed);
    }, 2000);
  }

  currentGameLoop = setInterval(draw, speed);
}

// ========== 🧩 俄罗斯方块 ==========
function startTetris(canvas, ctx, info) {
  canvas.width = 400;
  canvas.height = 600;
  const COLS = 10, ROWS = 20, SIZE = 30;
  const SHAPES = [
    [[1,1,1,1]], // I
    [[1,1],[1,1]], // O
    [[0,1,0],[1,1,1]], // T
    [[1,0,0],[1,1,1]], // L
    [[0,0,1],[1,1,1]], // J
    [[0,1,1],[1,1,0]], // S
    [[1,1,0],[0,1,1]]  // Z
  ];
  const COLORS = ['#00f0f0','#f0f000','#a000f0','#f0a000','#0000f0','#00f000','#f00000'];

  let board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
  let piece = newPiece();
  let score = 0;
  let dropSpeed = 500;
  let gameOver = false;

  info.textContent = '🧩 俄罗斯方块 | 方向键移动/旋转 | 空格硬降';

  function newPiece() {
    const idx = Math.floor(Math.random() * SHAPES.length);
    return { shape: SHAPES[idx], color: COLORS[idx], x: 3, y: 0 };
  }

  const keyHandler = (e) => {
    if (gameOver) { board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0)); piece = newPiece(); score = 0; gameOver = false; return; }
    const k = e.key.toLowerCase();
    if (k === 'arrowleft') tryMove(-1, 0);
    if (k === 'arrowright') tryMove(1, 0);
    if (k === 'arrowdown') tryMove(0, 1);
    if (k === 'arrowup' || k === 'x') rotate();
    if (k === ' ') hardDrop();
  };
  document.addEventListener('keydown', keyHandler);
  currentCleanup = () => document.removeEventListener('keydown', keyHandler);

  function tryMove(dx, dy) {
    piece.x += dx; piece.y += dy;
    if (collide()) { piece.x -= dx; piece.y -= dy; if (dy === 1) lock(); }
  }
  function collide() {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c]) {
          const ny = piece.y + r, nx = piece.x + c;
          if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx])) return true;
        }
    return false;
  }
  function rotate() {
    const rotated = piece.shape[0].map((_, i) => piece.shape.map(row => row[i]).reverse());
    const old = piece.shape;
    piece.shape = rotated;
    if (collide()) piece.shape = old;
  }
  function hardDrop() {
    while (!collide()) piece.y++;
    piece.y--; lock();
  }
  function lock() {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c]) {
          const ny = piece.y + r, nx = piece.x + c;
          if (ny >= 0) board[ny][nx] = piece.color;
        }
    // 消行
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        score += 100;
        r++;
      }
    }
    piece = newPiece();
    if (collide()) { gameOver = true; }
  }

  function draw() {
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 400, 600);
    // 网格
    ctx.strokeStyle = '#1a1a3a';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * SIZE, r * SIZE, SIZE, SIZE);
        if (board[r][c]) { ctx.fillStyle = board[r][c]; ctx.fillRect(c * SIZE + 1, r * SIZE + 1, SIZE - 2, SIZE - 2); }
      }
    }
    // 当前方块
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c]) {
          ctx.fillStyle = piece.color;
          ctx.fillRect((piece.x + c) * SIZE + 1, (piece.y + r) * SIZE + 1, SIZE - 2, SIZE - 2);
        }
    // 分数
    ctx.fillStyle = '#fff'; ctx.font = '18px Arial'; ctx.textAlign = 'left';
    ctx.fillText('得分: ' + score, 10, 20);
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, 400, 600);
      ctx.fillStyle = '#ff4757'; ctx.font = '28px Arial'; ctx.textAlign = 'center';
      ctx.fillText('游戏结束', 200, 280);
      ctx.fillStyle = '#fff'; ctx.font = '20px Arial';
      ctx.fillText('得分: ' + score, 200, 320);
      ctx.fillText('按任意键重来', 200, 360);
    }
  }
  currentGameLoop = setInterval(() => { if (!gameOver) tryMove(0, 1); draw(); }, dropSpeed);
  draw();
}

// ========== 🧱 打砖块 ==========
function startBrick(canvas, ctx, info) {
  canvas.width = 800; canvas.height = 550;
  const PADDLE_W = 120, PADDLE_H = 15;
  let paddleX = 340, ballX = 400, ballY = 300, ballDX = 5, ballDY = -5, ballR = 8;
  let bricks = [], score = 0, lives = 3;
  const BRICK_ROWS = 5, BRICK_COLS = 10, BRICK_W = 72, BRICK_H = 25, BRICK_PAD = 6;

  info.textContent = '🧱 打砖块 | 方向键/A D 移动挡板';

  for (let r = 0; r < BRICK_ROWS; r++)
    for (let c = 0; c < BRICK_COLS; c++)
      bricks.push({ x: 40 + c * (BRICK_W + BRICK_PAD), y: 50 + r * (BRICK_H + BRICK_PAD), w: BRICK_W, h: BRICK_H, alive: true, color: `hsl(${r * 50 + 100}, 70%, 55%)` });

  const keyHandler = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') paddleX = Math.max(0, paddleX - 30);
    if (k === 'arrowright' || k === 'd') paddleX = Math.min(800 - PADDLE_W, paddleX + 30);
  };
  document.addEventListener('keydown', keyHandler);
  currentCleanup = () => document.removeEventListener('keydown', keyHandler);

  function draw() {
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 800, 550);
    // 挡板
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(paddleX, 520, PADDLE_W, PADDLE_H);
    // 球
    ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.fillStyle = '#ff6b6b'; ctx.fill();
    // 砖块
    bricks.forEach(b => {
      if (b.alive) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); }
    });
    // 碰撞
    ballX += ballDX; ballY += ballDY;
    if (ballX < ballR || ballX > 800 - ballR) ballDX *= -1;
    if (ballY < ballR) ballDY *= -1;
    if (ballY > 550) { lives--; ballX = 400; ballY = 300; ballDX = 5; ballDY = -5; }
    // 挡板碰撞
    if (ballY + ballR >= 520 && ballX >= paddleX && ballX <= paddleX + PADDLE_W) { ballDY = -Math.abs(ballDY); ballDX += (ballX - paddleX - PADDLE_W / 2) * 0.05; }
    // 砖块碰撞
    bricks.forEach(b => {
      if (b.alive && ballX >= b.x && ballX <= b.x + b.w && ballY >= b.y && ballY <= b.y + b.h) {
        b.alive = false; ballDY *= -1; score += 10;
      }
    });
    // 显示
    ctx.fillStyle = '#fff'; ctx.font = '18px Arial'; ctx.textAlign = 'left';
    ctx.fillText('得分: ' + score + '  生命: ' + lives, 10, 25);
    if (lives <= 0 || bricks.every(b => !b.alive)) {
      clearInterval(currentGameLoop);
      ctx.fillStyle = lives <= 0 ? '#ff4757' : '#2ed573';
      ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
      ctx.fillText(lives <= 0 ? '游戏结束' : '🎉 通关!', 400, 275);
      ctx.fillStyle = '#fff'; ctx.font = '24px Arial';
      ctx.fillText('得分: ' + score, 400, 320);
    }
  }
  currentGameLoop = setInterval(draw, 16);
}

// ========== 🏎️ 极速赛车 ==========
function startRacing(canvas, ctx, info) {
  canvas.width = 400; canvas.height = 600;
  let carX = 175, carY = 500, speed = 0, obstacles = [], score = 0, gameOver = false;
  const LANES = [60, 140, 220, 300];

  info.textContent = '🏎️ 极速赛车 | A/D 或方向键左右换道';

  const keyHandler = (e) => {
    const k = e.key.toLowerCase();
    if (gameOver) { gameOver = false; score = 0; obstacles = []; speed = 0; carX = 175; return; }
    if (k === 'arrowleft' || k === 'a') carX = Math.max(20, carX - 80);
    if (k === 'arrowright' || k === 'd') carX = Math.min(340, carX + 80);
  };
  document.addEventListener('keydown', keyHandler);
  currentCleanup = () => document.removeEventListener('keydown', keyHandler);

  function draw() {
    ctx.fillStyle = '#333'; ctx.fillRect(0, 0, 400, 600);
    // 车道线
    ctx.strokeStyle = '#fff'; ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -speed;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 80, 0); ctx.lineTo(i * 80, 600); ctx.stroke(); }
    ctx.setLineDash([]);

    speed += 0.2;
    score += 1;

    // 障碍物
    if (Math.random() < 0.03) obstacles.push({ x: LANES[Math.floor(Math.random() * 4)], y: -50 });
    obstacles.forEach(o => o.y += speed);
    obstacles = obstacles.filter(o => o.y < 650);

    // 碰撞检测
    obstacles.forEach(o => {
      if (Math.abs(o.x - carX) < 40 && Math.abs(o.y - carY) < 40) gameOver = true;
    });

    // 画车
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(carX, carY, 40, 70);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(carX + 5, carY + 10, 30, 15);
    ctx.fillRect(carX + 5, carY + 45, 30, 15);

    // 障碍物
    obstacles.forEach(o => { ctx.fillStyle = '#2ed573'; ctx.fillRect(o.x, o.y, 40, 40); });

    ctx.fillStyle = '#fff'; ctx.font = '18px Arial'; ctx.textAlign = 'left';
    ctx.fillText('距离: ' + Math.floor(score / 10) + 'm', 10, 25);
    ctx.fillText('速度: ' + Math.floor(speed) + 'km/h', 10, 50);

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, 400, 600);
      ctx.fillStyle = '#ff4757'; ctx.font = '32px Arial'; ctx.textAlign = 'center';
      ctx.fillText('💥 撞车!', 200, 270);
      ctx.fillStyle = '#fff'; ctx.font = '20px Arial';
      ctx.fillText('距离: ' + Math.floor(score / 10) + 'm', 200, 320);
      ctx.fillText('按任意键再来', 200, 360);
    }
  }
  currentGameLoop = setInterval(draw, 30);
}

// ========== 🃏 翻翻乐 ==========
function startMemory(canvas, ctx, info) {
  canvas.width = 600; canvas.height = 500;
  const symbols = ['🐶','🐱','🦊','🐻','🐼','🦁','🐯','🐸','🦄','🐨','🐵','🐧'];
  let cards = [...symbols, ...symbols].sort(() => Math.random() - 0.5);
  let flipped = [], matched = 0, moves = 0;

  info.textContent = '🃏 翻翻乐 | 点击翻牌，找出所有配对';

  const clickHandler = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const col = Math.floor(mx / 100), row = Math.floor(my / 125);
    const idx = row * 6 + col;
    if (idx < 0 || idx >= 24 || flipped.length >= 2) return;
    if (flipped.includes(idx) || cards[idx] === null) return;
    flipped.push(idx);
    if (flipped.length === 2) {
      moves++;
      const [a, b] = flipped;
      if (cards[a] === cards[b]) {
        cards[a] = null; cards[b] = null;
        matched += 2;
        flipped = [];
      } else {
        setTimeout(() => { flipped = []; }, 800);
      }
    }
  };
  canvas.addEventListener('click', clickHandler);
  currentCleanup = () => canvas.removeEventListener('click', clickHandler);

  function draw() {
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 600, 500);
    for (let i = 0; i < 24; i++) {
      const col = i % 6, row = Math.floor(i / 6);
      const x = col * 100, y = row * 125;
      const isFlipped = flipped.includes(i) || cards[i] === null;
      ctx.fillStyle = isFlipped ? '#1a2a4a' : '#4a9eff';
      ctx.fillRect(x + 5, y + 5, 90, 115);
      if (isFlipped && cards[i] !== null) {
        ctx.font = '40px Arial'; ctx.textAlign = 'center';
        ctx.fillText(cards[i], x + 50, y + 70);
      }
    }
    ctx.fillStyle = '#fff'; ctx.font = '18px Arial'; ctx.textAlign = 'left';
    ctx.fillText('步数: ' + moves, 10, 20);
    if (matched === 24) {
      ctx.fillStyle = '#2ed573'; ctx.font = 'bold 36px Arial'; ctx.textAlign = 'center';
      ctx.fillText('🎉 完成! 用了 ' + moves + ' 步', 300, 250);
    }
  }
  currentGameLoop = setInterval(draw, 50);
}

// ========== 🔢 2048 ==========
function start2048(canvas, ctx, info) {
  canvas.width = 400; canvas.height = 500;
  let grid = Array(4).fill(null).map(() => Array(4).fill(0));
  let score = 0, won = false;

  function addTile() {
    const empty = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) empty.push([r, c]);
    if (empty.length) { const [r, c] = empty[Math.floor(Math.random() * empty.length)]; grid[r][c] = Math.random() < 0.9 ? 2 : 4; }
  }
  addTile(); addTile();

  info.textContent = '🔢 2048 | 方向键滑动合并方块';

  function move(dir) {
    let moved = false;
    const rotate = (g) => g[0].map((_, i) => g.map(row => row[i]).reverse());
    let g = grid;
    if (dir === 'up') g = rotate(rotate(rotate(g)));
    if (dir === 'down') g = rotate(g);
    if (dir === 'right') g = rotate(rotate(g));

    for (let r = 0; r < 4; r++) {
      let row = g[r].filter(v => v);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) { row[i] *= 2; score += row[i]; row.splice(i + 1, 1); moved = true; }
      }
      while (row.length < 4) row.push(0);
      if (g[r].some((v, i) => v !== row[i])) moved = true;
      g[r] = row;
    }

    if (dir === 'up') g = rotate(g);
    if (dir === 'down') g = rotate(rotate(rotate(g)));
    if (dir === 'right') g = rotate(rotate(g));
    grid = g;
    if (moved) addTile();
  }

  const keyHandler = (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)) {
      e.preventDefault();
      if (k.includes('up') || k === 'w') move('up');
      if (k.includes('down') || k === 's') move('down');
      if (k.includes('left') || k === 'a') move('left');
      if (k.includes('right') || k === 'd') move('right');
    }
  };
  document.addEventListener('keydown', keyHandler);
  currentCleanup = () => document.removeEventListener('keydown', keyHandler);

  const COLORS = { 0:'#1a1a2e', 2:'#eee4da', 4:'#ede0c8', 8:'#f2b179', 16:'#f59563', 32:'#f67c5f', 64:'#f65e3b', 128:'#edcf72', 256:'#edcc61', 512:'#edc850', 1024:'#edc53f', 2048:'#edc22e' };

  function draw() {
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 400, 500);
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(10, 60, 380, 380);
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const x = 15 + c * 94, y = 65 + r * 94;
        const val = grid[r][c];
        ctx.fillStyle = COLORS[val] || '#3c3a32';
        ctx.fillRect(x, y, 88, 88);
        if (val) {
          ctx.fillStyle = val > 4 ? '#fff' : '#776e65';
          ctx.font = val > 99 ? 'bold 28px Arial' : 'bold 36px Arial';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(val, x + 44, y + 44);
          ctx.textBaseline = 'alphabetic';
        }
      }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left';
    ctx.fillText('2048', 15, 40);
    ctx.font = '18px Arial'; ctx.fillStyle = '#aaa';
    ctx.fillText('得分: ' + score, 120, 38);
  }
  currentGameLoop = setInterval(draw, 50);
}

// ========== ⭕ 井字棋 ==========
function startTicTacToe(canvas, ctx, info) {
  canvas.width = 400; canvas.height = 500;
  let board = Array(9).fill('');
  let current = 'X';
  let gameOver = false;

  info.textContent = '⭕ 井字棋 | 点击空格放置棋子';

  const clickHandler = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const idx = Math.floor(mx / 133) + Math.floor((my - 80) / 133) * 3;
    if (idx < 0 || idx > 8 || board[idx] || gameOver) return;
    board[idx] = current;
    // 检查胜负
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const win = wins.find(w => w.every(i => board[i] === current));
    if (win) { gameOver = true; }
    else if (board.every(c => c)) { gameOver = 'draw'; }
    else current = current === 'X' ? 'O' : 'X';
  };
  canvas.addEventListener('click', clickHandler);
  currentCleanup = () => canvas.removeEventListener('click', clickHandler);

  function draw() {
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 400, 500);
    ctx.strokeStyle = '#4a9eff'; ctx.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 133, 80); ctx.lineTo(i * 133, 479); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 80 + i * 133); ctx.lineTo(400, 80 + i * 133); ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      if (board[i]) {
        ctx.fillStyle = board[i] === 'X' ? '#ff6b6b' : '#4a9eff';
        ctx.font = 'bold 50px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(board[i], (i % 3) * 133 + 66, 80 + Math.floor(i / 3) * 133 + 66);
        ctx.textBaseline = 'alphabetic';
      }
    }
    ctx.fillStyle = gameOver ? '#2ed573' : '#aaa'; ctx.font = '18px Arial'; ctx.textAlign = 'left';
    ctx.fillText(gameOver === 'draw' ? '平局!' : gameOver ? current + ' 获胜!' : '当前: ' + current, 10, 35);
    if (gameOver) {
      ctx.fillText('点击任意处重新开始', 10, 55);
      canvas.onclick = () => { board = Array(9).fill(''); current = 'X'; gameOver = false; canvas.onclick = clickHandler; };
    }
  }
  currentGameLoop = setInterval(draw, 50);
}

// ========== 🚀 太空射击 ==========
function startShooter(canvas, ctx, info) {
  canvas.width = 600; canvas.height = 550;
  let player = { x: 275, y: 500 }, bullets = [], enemies = [], score = 0, lives = 3;

  info.textContent = '🚀 太空射击 | 方向键移动，空格/J 射击';

  const keyHandler = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') player.x = Math.max(0, player.x - 15);
    if (k === 'arrowright' || k === 'd') player.x = Math.min(540, player.x + 15);
    if (k === ' ' || k === 'j') bullets.push({ x: player.x + 25, y: player.y });
  };
  document.addEventListener('keydown', keyHandler);
  currentCleanup = () => document.removeEventListener('keydown', keyHandler);

  function draw() {
    ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, 600, 550);
    // 星星
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * 600, Math.random() * 550, 1, 1);
    }
    // 玩家
    ctx.fillStyle = '#4a9eff';
    ctx.beginPath();
    ctx.moveTo(player.x + 25, player.y);
    ctx.lineTo(player.x, player.y + 40);
    ctx.lineTo(player.x + 50, player.y + 40);
    ctx.closePath(); ctx.fill();

    // 子弹
    bullets.forEach(b => b.y -= 8);
    bullets = bullets.filter(b => b.y > 0);
    ctx.fillStyle = '#ffeb3b';
    bullets.forEach(b => { ctx.fillRect(b.x, b.y, 4, 12); });

    // 敌人
    if (Math.random() < 0.02) enemies.push({ x: Math.random() * 560, y: -30 });
    enemies.forEach(e => e.y += 2);
    enemies = enemies.filter(e => e.y < 580);

    ctx.fillStyle = '#ff4757';
    enemies.forEach(e => {
      ctx.fillRect(e.x, e.y, 30, 30);
      // 碰撞
      if (e.x > player.x - 10 && e.x < player.x + 60 && e.y > player.y && e.y < player.y + 50) { lives--; e.y = 600; }
      bullets.forEach(b => { if (b.x > e.x && b.x < e.x + 30 && b.y > e.y && b.y < e.y + 30) { e.y = 600; score += 10; b.y = -999; } });
    });

    ctx.fillStyle = '#fff'; ctx.font = '18px Arial'; ctx.textAlign = 'left';
    ctx.fillText('得分: ' + score + '  生命: ' + lives, 10, 25);
    if (lives <= 0) {
      clearInterval(currentGameLoop);
      ctx.fillStyle = '#ff4757'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
      ctx.fillText('游戏结束', 300, 275);
      ctx.fillStyle = '#fff'; ctx.font = '24px Arial';
      ctx.fillText('得分: ' + score, 300, 320);
    }
  }
  currentGameLoop = setInterval(draw, 30);
}

// ========== 🎯 打靶 ==========
function startTarget(canvas, ctx, info) {
  canvas.width = 600; canvas.height = 500;
  let targets = [], score = 0, time = 30, hits = 0, misses = 0, running = true;

  info.textContent = '🎯 打靶 | 点击靶子得分，30秒倒计时';

  for (let i = 0; i < 5; i++) spawnTarget();

  function spawnTarget() {
    targets.push({ x: 50 + Math.random() * 500, y: 50 + Math.random() * 350, r: 20 + Math.random() * 20, alive: true });
  }

  const clickHandler = (e) => {
    if (!running) { running = true; score = 0; time = 30; hits = 0; misses = 0; targets = []; for (let i = 0; i < 5; i++) spawnTarget(); return; }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let hit = false;
    targets.forEach(t => {
      if (t.alive && Math.hypot(mx - t.x, my - t.y) < t.r) { t.alive = false; score += Math.floor(50 - t.r); hits++; hit = true; }
    });
    if (!hit) misses++;
  };
  canvas.addEventListener('click', clickHandler);
  currentCleanup = () => canvas.removeEventListener('click', clickHandler);

  const timer = setInterval(() => { if (running) { time--; if (time <= 0) running = false; } }, 1000);

  function draw() {
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 600, 500);
    targets.forEach(t => {
      if (!t.alive) return;
      const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
      grad.addColorStop(0, '#ff6b6b'); grad.addColorStop(0.5, '#ffa502'); grad.addColorStop(1, '#fff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    });
    // 补充靶子
    if (running && targets.filter(t => t.alive).length < 3) spawnTarget();
    ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`得分: ${score}  时间: ${time}s  命中: ${hits}  失误: ${misses}`, 10, 30);
    if (!running) {
      clearInterval(timer);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 600, 500);
      ctx.fillStyle = '#2ed573'; ctx.font = 'bold 36px Arial'; ctx.textAlign = 'center';
      ctx.fillText('⏰ 时间到!', 300, 220);
      ctx.fillStyle = '#fff'; ctx.font = '24px Arial';
      ctx.fillText(`最终得分: ${score}`, 300, 270);
      ctx.fillText(`命中率: ${hits + misses ? Math.round(hits / (hits + misses) * 100) : 0}%`, 300, 310);
      ctx.fillText('点击任意处再来一局', 300, 360);
    }
  }
  currentGameLoop = setInterval(draw, 30);
}
