// ========== 3D 枪战游戏 ==========
// 使用 Three.js 实现第一人称射击

let scene, camera, renderer;
let player = {
  health: 100,
  maxHealth: 100,
  speed: 0.15,
  sprintMul: 2.0,
  radius: 1.0,
  velocity: new THREE.Vector3(),
  onGround: true,
  yaw: 0,
  pitch: 0,
  height: 1.7
};
let keys = {};
let gameRunning = false;
let gameOver = false;

// 武器
let weapon = {
  ammoInMag: 30,
  magSize: 30,
  ammoReserve: 90,
  reloading: false,
  fireRate: 150,       // 毫秒
  lastShot: 0,
  damage: 25,
  spread: 0.02
};

// 游戏对象
let enemies = [];
let bullets = [];
let muzzles = [];
let clock;
let floor, walls = [];
let score = 0;
let wave = 1;
let enemiesPerWave = 3;
let spawnPoints = [];
let raycaster;

// 枪口模型（第一人称手臂+枪）
let gunGroup;

// ========== 初始化场景 ==========
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);
  scene.fog = new THREE.Fog(0x0a0a1a, 20, 80);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, player.height, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();

  // 光照
  const ambient = new THREE.AmbientLight(0x404060, 1.2);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  scene.add(dirLight);

  // 半球光（天空/地面颜色）
  const hemi = new THREE.HemisphereLight(0x6688ff, 0x223322, 0.5);
  scene.add(hemi);

  buildArena();
  buildGun();
}

// ========== 建造竞技场 ==========
function buildArena() {
  const size = 60;
  const half = size / 2;

  // 地面
  const floorGeo = new THREE.PlaneGeometry(size, size);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x333344,
    roughness: 0.8,
    metalness: 0.2
  });
  floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 地面网格线
  const grid = new THREE.GridHelper(size, 60, 0x444466, 0x222233);
  grid.position.y = 0.01;
  scene.add(grid);

  // 围墙
  const wallH = 8;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x554466, roughness: 0.7 });
  const wallT = 2;

  const wallDefs = [
    { p: [0, wallH/2, -half], s: [size, wallH, wallT] },
    { p: [0, wallH/2, half], s: [size, wallH, wallT] },
    { p: [-half, wallH/2, 0], s: [wallT, wallH, size] },
    { p: [half, wallH/2, 0], s: [wallT, wallH, size] },
  ];

  wallDefs.forEach(w => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...w.s), wallMat);
    m.position.set(...w.p);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    walls.push(m);
  });

  // 障碍物（箱子）
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.6 });
  const boxPositions = [
    [-10, 1, -8], [12, 1.5, 5], [-5, 2, 15], [8, 1, -15],
    [0, 1, 0], [-18, 1.5, -2], [18, 1, 10], [5, 2, 20],
    [-22, 1, 18], [22, 1.5, -18], [-12, 1, -20], [15, 2, -5]
  ];
  boxPositions.forEach((p, i) => {
    const s = 1.5 + (i % 3) * 0.5;
    const box = new THREE.Mesh(new THREE.BoxGeometry(s*2, s*2, s*2), boxMat);
    box.position.set(p[0], s, p[2]);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
    walls.push(box);
  });

  // 柱子
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x665577, roughness: 0.5, metalness: 0.3 });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 20;
    const px = Math.cos(angle) * r;
    const pz = Math.sin(angle) * r;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 10, 12), pillarMat);
    pillar.position.set(px, 5, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
    walls.push(pillar);
  }

  // 生成敌人出生点（围墙内随机位置）
  spawnPoints = [];
  for (let i = 0; i < 20; i++) {
    spawnPoints.push(new THREE.Vector3(
      (Math.random() - 0.5) * (size - 10),
      0,
      (Math.random() - 0.5) * (size - 10)
    ));
  }
}

// ========== 建造第一人称枪械 ==========
function buildGun() {
  gunGroup = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness:0.6, roughness:0.4 });

  // 枪身
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.5), bodyMat);
  body.position.set(0.25, -0.2, -0.4);
  gunGroup.add(body);

  // 枪管
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), accentMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.25, -0.18, -0.75);
  gunGroup.add(barrel);

  // 握把
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.09), accentMat);
  grip.position.set(0.25, -0.32, -0.28);
  grip.rotation.x = 0.3;
  gunGroup.add(grip);

  // 瞄准镜
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.12), accentMat);
  sight.position.set(0.25, -0.08, -0.45);
  gunGroup.add(sight);

  camera.add(gunGroup);
  scene.add(camera);
}

// ========== 生成敌人 ==========
function spawnEnemy() {
  const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  // 不要太靠近玩家
  const dist = sp.distanceTo(camera.position);
  if (dist < 15) { spawnEnemy(); return; }

  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe94560, roughness: 0.5 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffaaaa, roughness: 0.5 });

  // 身体
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2, 8, 16), bodyMat);
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);

  // 头
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), headMat);
  head.position.y = 2.3;
  head.castShadow = true;
  group.add(head);

  // 眼睛（发光）
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
  eyeL.position.set(-0.15, 2.35, -0.3);
  group.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
  eyeR.position.set(0.15, 2.35, -0.3);
  group.add(eyeR);

  group.position.copy(sp);
  scene.add(group);

  enemies.push({
    mesh: group,
    body: body,
    speed: 0.04 + Math.random() * 0.03,
    health: 100,
    attackCooldown: 0,
    bobPhase: Math.random() * Math.PI * 2
  });
}

// ========== 射击 ==========
function shoot() {
  if (gameOver) return;
  if (weapon.reloading) return;
  if (weapon.ammoInMag <= 0) { reload(); return; }

  const now = Date.now();
  if (now - weapon.lastShot < weapon.fireRate) return;
  weapon.lastShot = now;

  weapon.ammoInMag--;
  updateHUD();

  // 枪口后坐力动画
  gunGroup.position.z = 0.05;
  gunGroup.position.y = 0.02;
  setTimeout(() => { if (gunGroup) { gunGroup.position.z = 0; gunGroup.position.y = 0; } }, 50);

  // 创建子弹轨迹
  const bulletGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const bullet = new THREE.Mesh(bulletGeo, bulletMat);
  bullet.rotation.x = Math.PI / 2;

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  // 散射
  dir.x += (Math.random() - 0.5) * weapon.spread;
  dir.y += (Math.random() - 0.5) * weapon.spread;
  dir.normalize();

  bullet.position.copy(camera.position).add(dir.clone().multiplyScalar(1));
  scene.add(bullet);

  bullets.push({ mesh: bullet, dir: dir, life: 60, damage: weapon.damage });

  // 枪口闪光
  createMuzzleFlash();

  // 射线检测命中
  raycaster.set(camera.position, dir);
  const enemyMeshes = [];
  enemies.forEach(e => {
    enemyMeshes.push(e.body);
    e.mesh.children.forEach(c => { if (c.isMesh) enemyMeshes.push(c); });
  });
  const hits = raycaster.intersectObjects(enemyMeshes, true);
  if (hits.length > 0 && hits[0].distance < 100) {
    // 找到对应敌人
    let hitObj = hits[0].object;
    let enemy = enemies.find(e => {
      let found = false;
      e.mesh.traverse(c => { if (c === hitObj) found = true; });
      if (hitObj === e.body) found = true;
      return found;
    });
    if (enemy) {
      enemy.health -= weapon.damage;
      // 受击闪烁
      enemy.body.material.emissive = new THREE.Color(0xffffff);
      setTimeout(() => { if (enemy.body) enemy.body.material.emissive = new THREE.Color(0x000000); }, 80);
      if (enemy.health <= 0) {
        killEnemy(enemy);
      }
    }
  }
}

function createMuzzleFlash() {
  const flashGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  flash.position.copy(camera.position).add(dir.clone().multiplyScalar(1.2));
  scene.add(flash);
  muzzles.push({ mesh: flash, life: 3 });
}

// ========== 击杀敌人 ==========
function killEnemy(enemy) {
  // 死亡粒子
  for (let i = 0; i < 15; i++) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xe94560 })
    );
    p.position.copy(enemy.mesh.position);
    p.position.y += 1;
    const v = new THREE.Vector3(
      (Math.random()-0.5)*0.3, Math.random()*0.4, (Math.random()-0.5)*0.3
    );
    scene.add(p);
    particles.push({ mesh: p, vel: v, life: 30 });
  }

  scene.remove(enemy.mesh);
  enemies = enemies.filter(e => e !== enemy);
  score++;
  updateHUD();

  // 检查波次
  if (enemies.length === 0 && !gameOver) {
    setTimeout(nextWave, 2000);
  }
}

let particles = [];
function updateParticles() {
  particles = particles.filter(p => {
    p.life--;
    p.vel.y -= 0.01;
    p.mesh.position.add(p.vel);
    p.mesh.scale.multiplyScalar(0.95);
    if (p.life <= 0) { scene.remove(p.mesh); return false; }
    return true;
  });
}

// ========== 换弹 ==========
function reload() {
  if (weapon.reloading) return;
  if (weapon.ammoInMag === weapon.magSize) return;
  if (weapon.ammoReserve <= 0) return;

  weapon.reloading = true;
  document.getElementById('reloadHint').style.display = 'block';

  setTimeout(() => {
    const need = weapon.magSize - weapon.ammoInMag;
    const give = Math.min(need, weapon.ammoReserve);
    weapon.ammoInMag += give;
    weapon.ammoReserve -= give;
    weapon.reloading = false;
    document.getElementById('reloadHint').style.display = 'none';
    updateHUD();
  }, 1500);
}

// ========== 玩家受伤 ==========
function damagePlayer(amt) {
  player.health -= amt;
  // 屏幕红闪
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;z-index:120;background:rgba(255,0,0,0.4);pointer-events:none;transition:opacity 0.3s;';
  document.body.appendChild(flash);
  setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 300); }, 50);

  updateHUD();
  if (player.health <= 0) {
    player.health = 0;
    endGame();
  }
}

// ========== 下一波 ==========
function nextWave() {
  if (gameOver) return;
  wave++;
  enemiesPerWave = 3 + wave * 2;
  announceWave(wave);
  for (let i = 0; i < enemiesPerWave; i++) {
    setTimeout(spawnEnemy, i * 500);
  }
}

function announceWave(w) {
  const el = document.getElementById('waveAnnounce');
  el.textContent = '第 ' + w + ' 波';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}

// ========== HUD 更新 ==========
function updateHUD() {
  document.getElementById('healthFill').style.width = (player.health / player.maxHealth * 100) + '%';
  document.getElementById('ammoCurrent').textContent = weapon.ammoInMag;
  document.getElementById('ammoTotal').textContent = weapon.ammoReserve;
  document.getElementById('scoreNum').textContent = score;
  document.getElementById('waveNum').textContent = wave;

  if (weapon.ammoInMag <= 0 && !weapon.reloading) {
    document.getElementById('reloadHint').style.display = 'block';
  } else if (!weapon.reloading) {
    document.getElementById('reloadHint').style.display = 'none';
  }
}

// ========== 结束游戏 ==========
function endGame() {
  gameOver = true;
  gameRunning = false;
  document.exitPointerLock();
  document.getElementById('hud').style.display = 'none';
  document.getElementById('deathScreen').style.display = 'flex';
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalWave').textContent = wave;
}

// ========== 输入处理 ==========
function setupInput() {
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyR') reload();
    if (e.code === 'Space' && player.onGround && gameRunning) {
      player.velocity.y = 0.25;
      player.onGround = false;
    }
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  document.addEventListener('mousedown', e => {
    if (!gameRunning) return;
    if (e.button === 0) shoot();
  });

  document.addEventListener('mousemove', e => {
    if (!gameRunning) return;
    if (document.pointerLockElement !== renderer.domElement) return;
    const sens = 0.002;
    player.yaw -= e.movementX * sens;
    player.pitch -= e.movementY * sens;
    player.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, player.pitch));
  });

  // 点击锁定指针
  renderer.domElement.addEventListener('click', () => {
    if (gameRunning) renderer.domElement.requestPointerLock();
  });
}

// ========== 玩家移动 ==========
function updatePlayer() {
  const speed = player.speed * (keys['ShiftLeft'] || keys['ShiftRight'] ? player.sprintMul : 1);

  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

  const move = new THREE.Vector3();
  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyD']) move.add(right);
  if (keys['KeyA']) move.sub(right);
  if (move.length() > 0) move.normalize().multiplyScalar(speed);

  // 重力
  player.velocity.y -= 0.012;
  camera.position.y += player.velocity.y;
  if (camera.position.y <= player.height) {
    camera.position.y = player.height;
    player.velocity.y = 0;
    player.onGround = true;
  }

  // 碰撞检测（简单圆柱 vs 盒子）
  const newPos = camera.position.clone().add(move);
  let blocked = false;
  for (const w of walls) {
    if (!w.geometry) continue;
    const box = new THREE.Box3().setFromObject(w);
    const center = new THREE.Vector3(); box.getCenter(center);
    const size = new THREE.Vector3(); box.getSize(size);
    const halfW = size.x / 2 + player.radius;
    const halfD = size.z / 2 + player.radius;
    if (newPos.x > box.min.x - halfW && newPos.x < box.max.x + halfW &&
        newPos.z > box.min.z - halfD && newPos.z < box.max.z + halfD &&
        camera.position.y - player.height < box.max.y &&
        camera.position.y > box.min.y) {
      blocked = true; break;
    }
  }
  if (!blocked) {
    camera.position.x = newPos.x;
    camera.position.z = newPos.z;
  } else {
    // 尝试单向滑动
    const tryX = camera.position.clone(); tryX.x = newPos.x;
    let bx = false;
    for (const w of walls) {
      if (!w.geometry) continue;
      const box = new THREE.Box3().setFromObject(w);
      const size = new THREE.Vector3(); box.getSize(size);
      const halfW = size.x/2+player.radius, halfD = size.z/2+player.radius;
      if (tryX.x > box.min.x-halfW && tryX.x < box.max.x+halfW &&
          camera.position.z > box.min.z-halfD && camera.position.z < box.max.z+halfD &&
          camera.position.y-player.height < box.max.y && camera.position.y > box.min.y) { bx=true; break; }
    }
    if (!bx) camera.position.x = tryX.x;

    const tryZ = camera.position.clone(); tryZ.z = newPos.z;
    let bz = false;
    for (const w of walls) {
      if (!w.geometry) continue;
      const box = new THREE.Box3().setFromObject(w);
      const size = new THREE.Vector3(); box.getSize(size);
      const halfW = size.x/2+player.radius, halfD = size.z/2+player.radius;
      if (camera.position.x > box.min.x-halfW && camera.position.x < box.max.x+halfW &&
          tryZ.z > box.min.z-halfD && tryZ.z < box.max.z+halfD &&
          camera.position.y-player.height < box.max.y && camera.position.y > box.min.y) { bz=true; break; }
    }
    if (!bz) camera.position.z = tryZ.z;
  }

  // 边界限制
  camera.position.x = Math.max(-28, Math.min(28, camera.position.x));
  camera.position.z = Math.max(-28, Math.min(28, camera.position.z));

  // 应用旋转
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

// ========== 更新敌人 ==========
function updateEnemies() {
  enemies.forEach(enemy => {
    // 朝向玩家
    const target = camera.position.clone();
    target.y = enemy.mesh.position.y + 1;
    enemy.mesh.lookAt(target);

    // 移动向玩家
    const dir = camera.position.clone().sub(enemy.mesh.position);
    dir.y = 0;
    const dist = dir.length();
    dir.normalize();

    if (dist > 2.5) {
      enemy.mesh.position.add(dir.multiplyScalar(enemy.speed));
    }

    // 攻击
    if (enemy.attackCooldown > 0) enemy.attackCooldown--;
    if (dist < 3 && enemy.attackCooldown === 0) {
      damagePlayer(10);
      enemy.attackCooldown = 60;
    }

    // 身体上下浮动
    enemy.bobPhase += 0.1;
    enemy.body.position.y = 1.1 + Math.sin(enemy.bobPhase) * 0.05;
  });
}

// ========== 更新子弹 ==========
function updateBullets() {
  bullets = bullets.filter(b => {
    b.life--;
    b.mesh.position.add(b.dir.clone().multiplyScalar(2));
    if (b.life <= 0) { scene.remove(b.mesh); return false; }

    // 检测子弹击中敌人
    let hit = false;
    for (const enemy of enemies) {
      const box = new THREE.Box3().setFromObject(enemy.mesh);
      if (box.containsPoint(b.mesh.position)) {
        enemy.health -= b.damage;
        enemy.body.material.emissive = new THREE.Color(0xffffff);
        setTimeout(() => { if (enemy.body) enemy.body.material.emissive = new THREE.Color(0x000000); }, 80);
        if (enemy.health <= 0) killEnemy(enemy);
        hit = true; break;
      }
    }
    if (hit) { scene.remove(b.mesh); return false; }
    return true;
  });
}

// ========== 主循环 ==========
function animate() {
  requestAnimationFrame(animate);
  if (!gameRunning) return;

  const dt = clock.getDelta();
  updatePlayer();
  updateEnemies();
  updateBullets();
  updateParticles();

  // 枪口闪光更新
  muzzles = muzzles.filter(m => {
    m.life--;
    m.mesh.scale.multiplyScalar(0.85);
    if (m.life <= 0) { scene.remove(m.mesh); return false; }
    return true;
  });

  renderer.render(scene, camera);
}

// ========== 开始游戏 ==========
function startGame() {
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';

  initScene();
  setupInput();

  // 第一波
  announceWave(1);
  for (let i = 0; i < enemiesPerWave; i++) setTimeout(spawnEnemy, i * 500);

  gameRunning = true;
  updateHUD();
  animate();

  // 锁定指针
  renderer.domElement.requestPointerLock();
}

// 窗口自适应
window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});
