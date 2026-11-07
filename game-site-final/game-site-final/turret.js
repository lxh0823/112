/* =========================================================
   联机炮台射击 - 客户端（整合版）
   ========================================================= */
var tws = null;
var tcanvas = null;
var tctx = null;
var tplayerId = null;
var troomId = null;
var tstate = { players: [], bullets: [] };
var tlocal = { x: 400, y: 300, angle: 0, hp: 100, kills: 0, deaths: 0 };
var tkeys = {};
var tmouseX = 400, tmouseY = 300;
var tlastShoot = 0;
var tstarted = false;
var tname = '';
var tframe = null;
var teffects = [];

function openTurret(){
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('turretpage').style.display = 'block';
    document.getElementById('turretLobby').style.display = 'flex';
    document.getElementById('turretWaiting').style.display = 'none';
    document.getElementById('turretGameArea').style.display = 'none';
    document.getElementById('turretGameOver').style.display = 'none';
    tws = null;
    tstarted = false;
}

function turretCreate() {
    tname = document.getElementById('playerName').value || '玩家';
    var url = tgetWsUrl();
    tws = new WebSocket(url);
    tws.onopen = function() {
        tws.send(JSON.stringify({ type: 'createRoom', name: tname }));
    };
    tsetupWs();
}

function turretJoin() {
    tname = document.getElementById('playerName').value || '玩家';
    var code = document.getElementById('roomCode').value.trim().toUpperCase();
    if (!code) { tsetStatus('请输入房间号'); return; }
    var url = tgetWsUrl();
    tws = new WebSocket(url);
    tws.onopen = function() {
        tws.send(JSON.stringify({ type: 'joinRoom', roomId: code, name: tname }));
    };
    tsetupWs();
}

function tgetWsUrl() {
    // 检测是通过 http 服务器访问还是 file:// 本地打开
    var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var host = location.hostname || 'localhost';
    var port = location.port || '3000';
    return protocol + '//' + host + ':' + port;
}

function tsetupWs() {
    tws.onmessage = function(ev) {
        var data = JSON.parse(ev.data);
        thandle(data);
    };
    tws.onerror = function() {
        tsetStatus('连接失败！请确认已启动服务器：在项目目录运行 node server.js');
    };
    tws.onclose = function() {
        console.log('连接关闭');
    };
}

function thandle(data) {
    switch(data.type) {
        case 'roomCreated':
            troomId = data.roomId;
            tplayerId = data.playerId;
            tshowWaiting();
            break;
        case 'roomJoined':
            troomId = data.roomId;
            tplayerId = data.playerId;
            tshowWaiting();
            break;
        case 'error':
            tsetStatus(data.message);
            break;
        case 'playerJoined':
            taddFeed(data.player.name + ' 加入了游戏');
            break;
        case 'playerLeft':
            taddFeed('一名玩家离开了游戏');
            break;
        case 'gameStart':
            tstartGame();
            break;
        case 'gameState':
            tstate.players = data.players;
            tstate.bullets = data.bullets;
            tupdateBoard();
            break;
        case 'hit':
            var target = tfindPlayer(data.targetId);
            if (target) teffects.push({ x: target.x, y: target.y, time: Date.now() });
            break;
        case 'playerDied':
            var killer = tfindPlayer(data.killerId);
            var victim = tfindPlayer(data.targetId);
            if (killer && victim) taddFeed(killer.name + ' 击毁了 ' + victim.name + '!');
            break;
        case 'respawn':
            if (data.playerId === tplayerId) {
                tlocal.x = data.x;
                tlocal.y = data.y;
                tlocal.hp = 100;
            }
            break;
        case 'scoreUpdate':
            tupdateBoardFromData(data.players);
            break;
        case 'shoot':
            break;
        case 'gameStop':
            tstarted = false;
            taddFeed('有玩家离开，游戏暂停');
            break;
    }
}

function tstartGame() {
    document.getElementById('turretWaiting').style.display = 'none';
    document.getElementById('turretGameArea').style.display = 'block';
    document.getElementById('turretGameOver').style.display = 'none';
    tstarted = true;

    tcanvas = document.getElementById('turretCanvas');
    tctx = tcanvas.getContext('2d');

    tsetupInput();
    tloop();
}

function tshowWaiting() {
    document.getElementById('turretLobby').style.display = 'none';
    document.getElementById('turretWaiting').style.display = 'flex';
    document.getElementById('displayRoomId').textContent = troomId;
}

function tsetStatus(msg) {
    document.getElementById('tstatus').textContent = msg;
}

function turretLeave() {
    if (tws) tws.close();
    tstarted = false;
    if (tframe) cancelAnimationFrame(tframe);
    openTurret();
}

function turretBackLobby() {
    document.getElementById('turretGameOver').style.display = 'none';
    backToLobby();
}

function tsetupInput() {
    document.onkeydown = function(e) {
        tkeys[e.key.toLowerCase()] = true;
        if (e.key === ' ') { e.preventDefault(); tshoot(); }
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) >= 0) e.preventDefault();
    };
    document.onkeyup = function(e) {
        tkeys[e.key.toLowerCase()] = false;
    };
    // 移动发送
    setInterval(function() {
        if (!tstarted || !tws || tws.readyState !== 1) return;
        var speed = 4;
        var dx = 0, dy = 0;
        if (tkeys['w'] || tkeys['arrowup']) dy = -speed;
        if (tkeys['s'] || tkeys['arrowdown']) dy = speed;
        if (tkeys['a'] || tkeys['arrowleft']) dx = -speed;
        if (tkeys['d'] || tkeys['arrowright']) dx = speed;
        if (dx !== 0 || dy !== 0) {
            tlocal.x += dx;
            tlocal.y += dy;
            tlocal.x = Math.max(20, Math.min(780, tlocal.x));
            tlocal.y = Math.max(20, Math.min(580, tlocal.y));
            tlocal.angle = Math.atan2(dy, dx);
            tws.send(JSON.stringify({ type:'move', x:tlocal.x, y:tlocal.y, angle:tlocal.angle }));
        }
    }, 16);

    tcanvas.onclick = function() { tshoot(); };
    tcanvas.onmousemove = function(e) {
        var rect = tcanvas.getBoundingClientRect();
        tmouseX = (e.clientX - rect.left) * (800 / rect.width);
        tmouseY = (e.clientY - rect.top) * (600 / rect.height);
    };
}

function tshoot() {
    var now = Date.now();
    if (now - tlastShoot < 300) return;
    tlastShoot = now;
    if (tws && tws.readyState === 1) {
        tws.send(JSON.stringify({ type:'shoot' }));
    }
}

function tloop() {
    if (!tstarted) return;
    tupdate();
    trender();
    tframe = requestAnimationFrame(tloop);
}

function tupdate() {
    var me = tfindPlayer(tplayerId);
    if (me) {
        me.angle = Math.atan2(tmouseY - me.y, tmouseX - me.x);
        me.x = tlocal.x;
        me.y = tlocal.y;
    }
    teffects = teffects.filter(function(e) { return Date.now() - e.time < 300; });
}

function trender() {
    tctx.clearRect(0, 0, 800, 600);
    // 背景网格
    tctx.strokeStyle = '#1a2a3a';
    tctx.lineWidth = 1;
    for (var x = 0; x < 800; x += 40) { tctx.beginPath(); tctx.moveTo(x,0); tctx.lineTo(x,600); tctx.stroke(); }
    for (var y = 0; y < 600; y += 40) { tctx.beginPath(); tctx.moveTo(0,y); tctx.lineTo(800,y); tctx.stroke(); }
    // 子弹
    tstate.bullets.forEach(function(b) { tdrawBullet(b); });
    // 玩家
    tstate.players.forEach(function(p) { tdrawPlayer(p); });
    // 击中效果
    teffects.forEach(function(e) { tdrawEffect(e); });
}

function tdrawGrid() {}

function tdrawPlayer(p) {
    var isMe = p.id === tplayerId;
    var color = isMe ? '#00ff88' : tplayerColor(p.id);
    var alpha = p.alive ? 1 : 0.3;

    tctx.save();
    tctx.globalAlpha = alpha;
    // 底座
    tctx.beginPath();
    tctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    tctx.fillStyle = color;
    tctx.fill();
    tctx.strokeStyle = '#fff';
    tctx.lineWidth = 2;
    tctx.stroke();
    // 炮管
    tctx.translate(p.x, p.y);
    tctx.rotate(p.angle);
    tctx.fillStyle = color;
    tctx.fillRect(0, -4, 30, 8);
    tctx.strokeStyle = '#fff';
    tctx.strokeRect(0, -4, 30, 8);
    tctx.restore();

    // 名字
    tctx.fillStyle = '#fff';
    tctx.font = '11px sans-serif';
    tctx.textAlign = 'center';
    tctx.fillText(p.name, p.x, p.y - 25);
    // 血条
    var bw = 36, bh = 5;
    tctx.fillStyle = '#333';
    tctx.fillRect(p.x - bw/2, p.y + 22, bw, bh);
    var hpPct = Math.max(0, p.hp) / 100;
    tctx.fillStyle = hpPct > 0.5 ? '#00ff00' : hpPct > 0.25 ? '#ffff00' : '#ff0000';
    tctx.fillRect(p.x - bw/2, p.y + 22, bw * hpPct, bh);
    // 击杀数
    tctx.fillStyle = '#ffd93d';
    tctx.font = '10px sans-serif';
    tctx.fillText('击杀: ' + (p.kills || 0), p.x, p.y + 38);
    // 死亡遮罩
    if (!p.alive) {
        tctx.fillStyle = 'rgba(0,0,0,0.5)';
        tctx.fillRect(p.x - 20, p.y - 20, 40, 40);
        tctx.fillStyle = '#ff4444';
        tctx.font = '12px sans-serif';
        tctx.fillText('阵亡', p.x, p.y + 4);
    }
}

function tdrawBullet(b) {
    tctx.save();
    tctx.translate(b.x, b.y);
    tctx.shadowColor = '#ff6600';
    tctx.shadowBlur = 10;
    tctx.beginPath();
    tctx.arc(0, 0, 4, 0, Math.PI * 2);
    tctx.fillStyle = '#ffaa00';
    tctx.fill();
    tctx.restore();
}

function tdrawEffect(e) {
    var elapsed = Date.now() - e.time;
    var radius = (elapsed / 300) * 30;
    var alpha = 1 - (elapsed / 300);
    tctx.save();
    tctx.globalAlpha = alpha;
    tctx.beginPath();
    tctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
    tctx.strokeStyle = '#ff4444';
    tctx.lineWidth = 3;
    tctx.stroke();
    for (var i = 0; i < 8; i++) {
        var angle = (i / 8) * Math.PI * 2;
        var dist = radius * 0.8;
        tctx.beginPath();
        tctx.arc(e.x + Math.cos(angle)*dist, e.y + Math.sin(angle)*dist, 3, 0, Math.PI*2);
        tctx.fillStyle = '#ffaa00';
        tctx.fill();
    }
    tctx.restore();
}

function tplayerColor(id) {
    var colors = ['#ff4444', '#4444ff', '#ffff44', '#ff44ff'];
    var hash = 0;
    for (var i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return colors[hash % colors.length];
}

function tfindPlayer(id) {
    for (var i = 0; i < tstate.players.length; i++) {
        if (tstate.players[i].id === id) return tstate.players[i];
    }
    return null;
}

function tupdateBoard() {
    var board = document.getElementById('scoreBoard');
    var html = '';
    tstate.players.forEach(function(p) {
        var color = p.id === tplayerId ? '#00ff88' : tplayerColor(p.id);
        html += '<div class="score-item"><span class="dot" style="background:'+color+'"></span>' + p.name + ' ('+(p.kills||0)+')</div>';
    });
    board.innerHTML = html;
}

function tupdateBoardFromData(players) {
    var board = document.getElementById('scoreBoard');
    var html = '';
    players.forEach(function(p) {
        var color = p.id === tplayerId ? '#00ff88' : tplayerColor(p.id);
        html += '<div class="score-item"><span class="dot" style="background:'+color+'"></span>' + p.name + ' ('+(p.kills||0)+')</div>';
    });
    board.innerHTML = html;
    var winner = null;
    for (var i = 0; i < players.length; i++) {
        if ((players[i].kills || 0) >= 20) { winner = players[i]; break; }
    }
    if (winner) {
        tstarted = false;
        document.getElementById('turretGameArea').style.display = 'none';
        document.getElementById('turretGameOver').style.display = 'flex';
        document.getElementById('winnerText').textContent = winner.name + ' 获胜! 🏆';
    }
}

function taddFeed(msg) {
    var feed = document.getElementById('killFeed');
    var el = document.createElement('div');
    el.className = 'kill-msg';
    el.textContent = msg;
    feed.appendChild(el);
    setTimeout(function() {
        if (el.parentNode) el.parentNode.removeChild(el);
    }, 4000);
    while (feed.children.length > 5) feed.removeChild(feed.firstChild);
}
