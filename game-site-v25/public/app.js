var currentUser = localStorage.getItem("gameUser");
if (currentUser) {
  document.getElementById("authStatus").textContent = "已登录: " + currentUser;
  document.getElementById("logoutBtn").classList.remove("hidden");
  document.querySelectorAll("#authBar button").forEach(function (b) { b.style.display = "none"; });
}

function showRegister() { document.getElementById("registerModal").classList.remove("hidden"); }
function hideRegister() { document.getElementById("registerModal").classList.add("hidden"); }
function showLogin() { document.getElementById("loginModal").classList.remove("hidden"); }
function hideLogin() { document.getElementById("loginModal").classList.add("hidden"); }

function doRegister() {
  var n = regName.value.trim(), p = regPwd.value, p2 = regPwd2.value, m = regMsg;
  if (!n || !p) { m.textContent = "请填完整"; m.style.color = "#f66"; return; }
  if (p.length < 6) { m.textContent = "密码至少6位"; m.style.color = "#f66"; return; }
  if (p !== p2) { m.textContent = "两次不一致"; m.style.color = "#f66"; return; }
  fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, password: p }) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok) { m.textContent = "注册成功"; m.style.color = "#4ed"; setTimeout(function () { hideRegister(); showLogin(); }, 800); }
      else { m.textContent = d.msg; m.style.color = "#f66"; }
    });
}

function doLogin() {
  var n = loginName.value.trim(), p = loginPwd.value, m = loginMsg;
  fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, password: p }) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok) { localStorage.setItem("gameUser", d.name); location.reload(); }
      else { m.textContent = d.msg; m.style.color = "#f66"; }
    });
}

function logout() { localStorage.removeItem("gameUser"); location.reload(); }

fetch("/api/notices").then(function (r) { return r.json(); }).then(function (ns) {
  var i = 0; noticeBar.textContent = ns[0];
  setInterval(function () { i = (i + 1) % ns.length; noticeBar.textContent = ns[i]; }, 5000);
});

function openForum() {
  lobby.classList.add("hidden"); forum.classList.remove("hidden");
  if (currentUser) forumName.value = currentUser;
  loadMessages();
}

function backToLobby() {
  lobby.classList.remove("hidden"); forum.classList.add("hidden");
  gameCanvas.classList.add("hidden"); backBtn.classList.add("hidden");
}

function postMessage() {
  var n = forumName.value.trim() || "匿名", m = forumMsg.value.trim();
  if (!m) return;
  fetch("/api/forum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, msg: m }) })
    .then(function () { forumMsg.value = ""; loadMessages(); });
}

function loadMessages() {
  fetch("/api/forum").then(function (r) { return r.json(); }).then(function (ms) {
    var h = "";
    if (!ms.length) h = "<p style=\"color:#aaa\">暂无留言</p>";
    else ms.forEach(function (x) {
      h += "<div><div style=\"color:#4a9eff\">" + x.name + " <span style=\"color:#666;font-size:12px\">" + x.time + "</span></div><div>" + x.msg + "</div></div>";
    });
    forumList.innerHTML = h;
  });
}

var turretSocket = null;
function openTurret() {
  lobby.classList.add("hidden");
  document.getElementById("turret-modal").classList.remove("hidden");
  if (currentUser) playerName.value = currentUser;
  var local = location.protocol === "file:";
  turretSocket = local ? io("http://localhost:3000") : io();
  turretSocket.on("connect", function () { turretStatus.textContent = "已连接"; });
  turretSocket.on("connect_error", function () { turretStatus.textContent = "连接失败"; });
  turretSocket.on("roomCreated", function (id) {
    roomId.value = id; turretStatus.textContent = "房间:" + id; startTurretGame();
  });
  turretSocket.on("joinSuccess", function (r) {
    turretStatus.textContent = "加入成功 人数:" + r.players.length;
    turretCanvas.classList.remove("hidden"); startTurretGame();
  });
  turretSocket.on("joinFailed", function (m) { turretStatus.textContent = "失败:" + m; });
  turretSocket.on("bulletFired", function (b) { window.renderRemoteBullet && window.renderRemoteBullet(b); });
}

function closeTurret() {
  document.getElementById("turret-modal").classList.add("hidden");
  lobby.classList.remove("hidden");
  turretCanvas.classList.add("hidden");
  if (turretSocket) turretSocket.disconnect();
  if (window.turretStop) window.turretStop();
}

function createRoom() { turretSocket.emit("createRoom", playerName.value || "玩家"); }
function joinRoom() { turretSocket.emit("joinRoom", { roomId: roomId.value, name: playerName.value || "玩家" }); }

function startGame(name) {
  lobby.classList.add("hidden"); gameCanvas.classList.remove("hidden"); backBtn.classList.remove("hidden");
  if (name === "snake") startSnake();
}
