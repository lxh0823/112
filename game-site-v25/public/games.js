window.startSnake = function () {
  var c = document.getElementById("gameCanvas");
  c.width = 1200; c.height = 1200;
  var x = c.getContext("2d");
  var g = 30, n = 40, s = [{ x: 20, y: 20 }], v = { x: 0, y: 0 }, f = { x: 15, y: 15 }, sc = 0;

  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") { if (v.y !== 1) v = { x: 0, y: -1 }; }
    if (k === "arrowdown" || k === "s") { if (v.y !== -1) v = { x: 0, y: 1 }; }
    if (k === "arrowleft" || k === "a") { if (v.x !== 1) v = { x: -1, y: 0 }; }
    if (k === "arrowright" || k === "d") { if (v.x !== -1) v = { x: 1, y: 0 }; }
  });

  function loop() {
    x.fillStyle = "#0a0a2a"; x.fillRect(0, 0, 1200, 1200);
    x.strokeStyle = "#1a1a4a";
    for (var i = 0; i < 1200; i += g) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1200); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(1200, i); x.stroke();
    }
    x.fillStyle = "#ff4757"; x.fillRect(f.x * g, f.y * g, g - 2, g - 2);
    s.forEach(function (p, i) {
      x.fillStyle = i === 0 ? "#4a9eff" : "#66a6ff";
      x.fillRect(p.x * g, p.y * g, g - 2, g - 2);
    });
    x.fillStyle = "#fff"; x.font = "24px Arial"; x.fillText("得分:" + sc, 20, 35);

    var h = { x: s[0].x + v.x, y: s[0].y + v.y };
    if (h.x < 0 || h.x >= n || h.y < 0 || h.y >= n || s.some(function (p, i) { return i > 0 && p.x === h.x && p.y === h.y; })) {
      s = [{ x: 20, y: 20 }]; v = { x: 0, y: 0 }; sc = 0; return;
    }
    s.unshift(h);
    if (h.x === f.x && h.y === f.y) {
      sc += 10; f = { x: Math.floor(Math.random() * n), y: Math.floor(Math.random() * n) };
    } else { s.pop(); }
  }

  window.stopGame = function () { clearInterval(t); document.removeEventListener("keydown", loop); };
  var t = setInterval(loop, 80);
};
