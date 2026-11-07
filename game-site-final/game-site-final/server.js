// 联机炮台射击 - 服务器端
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

// HTTP 服务器：托管静态文件
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    if (filePath === './style.css') filePath = './style.css';
    if (filePath === './game.js') filePath = './game.js';

    const ext = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg'
    };
    const contentType = contentTypes[ext] || 'text/plain';

    fs.readFile(path.join(__dirname, filePath), (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 房间管理
const rooms = {};
const playerSockets = new Map(); // ws -> {playerId, roomId}

function createRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function broadcast(roomId, data) {
    const room = rooms[roomId];
    if (!room) return;
    const msg = JSON.stringify(data);
    room.players.forEach(p => {
        if (p.ws && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(msg);
        }
    });
}

function gameLoop(roomId) {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;

    // 更新子弹
    room.bullets = room.bullets.filter(b => {
        const target = room.players.find(p => p.id === b.targetId);
        if (!target) return false;

        // 移动子弹
        const dx = target.x - b.x;
        const dy = target.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 5) {
            // 击中！
            target.hp -= b.damage;
            broadcast(roomId, {
                type: 'hit',
                targetId: target.id,
                hp: target.hp,
                attackerId: b.ownerId
            });
            if (target.hp <= 0) {
                // 玩家死亡
                broadcast(roomId, {
                    type: 'playerDied',
                    playerId: target.id,
                    killerId: b.ownerId
                });
                target.hp = 100;
                target.deaths = (target.deaths || 0) + 1;
                // 击杀者加分
                const killer = room.players.find(p => p.id === b.ownerId);
                if (killer) killer.kills = (killer.kills || 0) + 1;
                // 通知分数更新
                broadcast(roomId, {
                    type: 'scoreUpdate',
                    players: room.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        kills: p.kills || 0,
                        deaths: p.deaths || 0
                    }))
                });
                // 3秒后重生
                setTimeout(() => {
                    if (rooms[roomId]) {
                        target.x = Math.random() * 600 + 100;
                        target.y = Math.random() * 400 + 100;
                        broadcast(roomId, {
                            type: 'respawn',
                            playerId: target.id,
                            x: target.x,
                            y: target.y
                        });
                    }
                }, 3000);
            }
            return false;
        }

        b.x += (dx / dist) * b.speed;
        b.y += (dy / dist) * b.speed;
        return true;
    });

    // 发送游戏状态
    broadcast(roomId, {
        type: 'gameState',
        players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            x: p.x,
            y: p.y,
            angle: p.angle,
            hp: p.hp,
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            alive: p.hp > 0
        })),
        bullets: room.bullets.map(b => ({
            x: b.x,
            y: b.y,
            ownerId: b.ownerId,
            targetId: b.targetId
        }))
    });
}

wss.on('connection', (ws) => {
    console.log('新连接');
    let playerRoom = null;
    let playerId = null;

    ws.on('message', (msg) => {
        let data;
        try {
            data = JSON.parse(msg);
        } catch (e) {
            return;
        }

        switch (data.type) {
            case 'createRoom': {
                const roomId = createRoomId();
                rooms[roomId] = {
                    id: roomId,
                    players: [],
                    bullets: [],
                    gameInterval: null
                };
                playerId = Math.random().toString(36).substr(2, 9);
                const player = {
                    id: playerId,
                    name: data.name || '玩家',
                    ws: ws,
                    x: 200,
                    y: 200,
                    angle: 0,
                    hp: 100,
                    kills: 0,
                    deaths: 0
                };
                rooms[roomId].players.push(player);
                playerSockets.set(ws, { playerId, roomId });
                playerRoom = roomId;

                ws.send(JSON.stringify({
                    type: 'roomCreated',
                    roomId: roomId,
                    playerId: playerId
                }));
                break;
            }

            case 'joinRoom': {
                const roomId = data.roomId.toUpperCase();
                const room = rooms[roomId];
                if (!room) {
                    ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
                    return;
                }
                if (room.players.length >= 4) {
                    ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
                    return;
                }

                playerId = Math.random().toString(36).substr(2, 9);
                const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
                const player = {
                    id: playerId,
                    name: data.name || '玩家',
                    ws: ws,
                    x: 200 + room.players.length * 150,
                    y: 300,
                    angle: 0,
                    hp: 100,
                    kills: 0,
                    deaths: 0
                };
                room.players.push(player);
                playerSockets.set(ws, { playerId, roomId });
                playerRoom = roomId;

                ws.send(JSON.stringify({
                    type: 'roomJoined',
                    roomId: roomId,
                    playerId: playerId,
                    players: room.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        kills: p.kills || 0,
                        deaths: p.deaths || 0
                    }))
                }));

                // 通知其他人
                broadcast(roomId, {
                    type: 'playerJoined',
                    player: { id: player.id, name: player.name }
                });

                // 如果已有2人，开始游戏循环
                if (room.players.length >= 2 && !room.gameInterval) {
                    broadcast(roomId, { type: 'gameStart' });
                    room.gameInterval = setInterval(() => gameLoop(roomId), 1000 / 60);
                }
                break;
            }

            case 'move': {
                const info = playerSockets.get(ws);
                if (!info) return;
                const room = rooms[info.roomId];
                if (!room) return;
                const player = room.players.find(p => p.id === info.playerId);
                if (!player || player.hp <= 0) return;

                player.x = Math.max(20, Math.min(780, data.x));
                player.y = Math.max(20, Math.min(580, data.y));
                player.angle = data.angle || 0;
                break;
            }

            case 'shoot': {
                const info = playerSockets.get(ws);
                if (!info) return;
                const room = rooms[info.roomId];
                if (!room) return;
                const player = room.players.find(p => p.id === info.playerId);
                if (!player || player.hp <= 0) return;

                // 找到最近的目标
                let nearest = null;
                let nearestDist = Infinity;
                room.players.forEach(p => {
                    if (p.id === player.id || p.hp <= 0) return;
                    const dx = p.x - player.x;
                    const dy = p.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearest = p;
                    }
                });

                if (nearest && nearestDist < 500) {
                    room.bullets.push({
                        x: player.x,
                        y: player.y,
                        speed: 8,
                        ownerId: player.id,
                        targetId: nearest.id,
                        damage: 10
                    });
                    broadcast(info.roomId, {
                        type: 'shoot',
                        playerId: player.id,
                        x: player.x,
                        y: player.y,
                        targetId: nearest.id
                    });
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        console.log('连接断开');
        const info = playerSockets.get(ws);
        if (info) {
            const room = rooms[info.roomId];
            if (room) {
                room.players = room.players.filter(p => p.id !== info.playerId);
                broadcast(info.roomId, {
                    type: 'playerLeft',
                    playerId: info.playerId
                });
                if (room.players.length === 0) {
                    if (room.gameInterval) clearInterval(room.gameInterval);
                    delete rooms[info.roomId];
                } else if (room.players.length < 2 && room.gameInterval) {
                    clearInterval(room.gameInterval);
                    room.gameInterval = null;
                    broadcast(info.roomId, { type: 'gameStop' });
                }
            }
            playerSockets.delete(ws);
        }
    });
});

server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
