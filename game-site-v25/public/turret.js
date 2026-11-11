var me = { x: 400, y: 250, angle: 0 }, keys = {}, loop = null, bullets = [];

window.startTurretGame = function () {
  var c = document.getElementById("turretCanvas"), x = c.getContext("2d");
  document.addEventListener("keydown", function (e) { keys[e.key.toLowerCase()] = true; });
  document.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });
  c.addEventListener("mousemove", function (e) {
    var r = c.getBoundingClientRect();
    me.angle = Math.atan2(e.clientY - r.top - me.y, e.clientX - r.left - me.x);
  });
  c.addEventListener("mousedown", function () { fire(); });

  function fire() {
    var bx = me.x + Math.cos(me.angle) * 30, by = me.y + Math.sin(me.angle) * 30;
    turretSocket.emit("fireBullet", { roomId: roomId.value, x: bx, y: by, angle: me.angle });
    bullets.push({ x: bx, y: by, angle: me.angle, owner: "self", life: 100 });
  }

  loop = setInterval(function () {
    if (keys["a"]) me.x -= 4;
    if (keys["d"]) me.x += 4;
    if (keys["w"]) me.y -= 4;
    if (keys["s"]) me.y += 4;
    me.x = Math.max(20, Math.min(780, me.x));
    me.y = Math.max(20, Math.min(480, me.y));

    x.fillStyle = "#0a0a2a"; x.fillRect(0, 0, 800, 500);
    x.strokeStyle = "#1a1a4a";
    for (var i = 0; i < 800; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 500); x.stroke(); }
    for (var j = 0; j < 500; j += 40) { x.beginPath(); x.moveTo(0, j); x.lineTo(800, j); x.stroke(); }

    x.save(); x.translate(me.x, me.y); x.rotate(me.angle);
    x.fillStyle = "#4a9eff"; x.beginPath(); x.arc(0, 0, 18, 0, 7); x.fill();
    x.fillStyle = "#ff6b6b"; x.fillRect(0, -3, 30, 6);
    x.restore();

    for (var k = bullets.length - 1; k >= 0; k--) {
      var b = bullets[k];
      b.x += Math.cos(b.angle) * 8; b.y += Math.sin(b.angle) * 8; b.life--;
      x.fillStyle = b.owner === "self" ? "#ffd93d" : "#ff4757";
      x.beginPath(); x.arc(b.x, b.y, 4, 0, 7); x.fill();
      if (b.life <= 0 || b.x < 0 || b.x > 800 || b.y < 0 || b.y > 500) bullets.splice(k, 1);
    }

    turretSocket.emit("gameUpdate", { roomId: roomId.value, x: me.x, y: me.y, angle: me.angle });
  }, 33);
};

window.renderRemoteBullet = function (b) { bullets.push({ x: b.x, y: b.y, angle: b.angle, owner: b.owner, life: 100 }); };
window.turretStop = function () { clearInterval(loop); loop = null; bullets = []; };
