/* =========================================================
   游戏大厅 + 页面控制逻辑（稳定版）
   ========================================================= */
var cv = null;
var ctx = null;
var currentGame = null;
var gmeta = [];

/* 大厅卡片配置 */
var CARDS = [
    {id:'tetris', icon:'🧩'},
    {id:'snake',  icon:'🐍'},
    {id:'2048',   icon:'🔢'},
    {id:'brick',  icon:'🧱'},
    {id:'race',   icon:'🏎️'},
    {id:'spaceshooter', icon:'🚀'},
    {id:'shootingrange', icon:'🎯'},
    {id:'turret', icon:'🏰', tag:'联机'},
    {id:'memory', icon:'🃏'},
    {id:'tictactoe', icon:'⭕'}
];

function buildLobby(){
    var grid = document.getElementById('grid');
    var html = '';
    for(var i=0;i<CARDS.length;i++){
        var c = CARDS[i];
        if(c.id === 'turret'){
            // 联机炮台走独立页面
            html += '<div class="card" data-turret="1"><div class="icon">'+c.icon+'</div><div class="name">联机炮台</div><div class="tag">联机</div></div>';
            continue;
        }
        var g = GAMES[c.id];
        html += '<div class="card" data-id="'+c.id+'"><div class="icon">'+c.icon+'</div><div class="name">'+g.name+'</div></div>';
    }
    grid.innerHTML = html;
    var cards = grid.getElementsByClassName('card');
    for(var i=0;i<cards.length;i++){
        cards[i].onclick = function(){
            var turret = this.getAttribute('data-turret');
            if(turret){
                openTurret();
                return;
            }
            var id = this.getAttribute('data-id');
            openGame(id);
        };
    }
}

function openGame(id){
    currentGame = GAMES[id];
    if(!currentGame) return;
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('gamepage').style.display = 'flex';
    document.getElementById('gtitle').innerHTML = currentGame.title;
    cv = document.getElementById('cv');
    ctx = cv.getContext('2d');
    // 注入 canvas 引用到游戏对象
    currentGame.cv = cv;
    currentGame.ctx = ctx;
    // 按钮
    var html = '';
    for(var i=0;i<currentGame.buttons.length;i++){
        html += '<button data-act="'+currentGame.buttons[i].action+'">'+currentGame.buttons[i].label+'</button>';
    }
    document.getElementById('btns').innerHTML = html;
    var btns = document.getElementById('btns').getElementsByTagName('button');
    for(var i=0;i<btns.length;i++){
        btns[i].onclick = function(){
            var act = this.getAttribute('data-act');
            if(act==='start') currentGame.start();
        };
    }
    // 方向键
    var dhtml = '';
    for(var i=0;i<(currentGame.dpad||[]).length;i++){
        dhtml += '<button data-key="'+currentGame.dpad[i].key+'">'+currentGame.dpad[i].label+'</button>';
    }
    document.getElementById('dpad').innerHTML = dhtml;
    var dpads = document.getElementById('dpad').getElementsByTagName('button');
    for(var i=0;i<dpads.length;i++){
        dpads[i].onclick = function(){
            var key = this.getAttribute('data-key');
            if(key && currentGame && currentGame.onKey) currentGame.onKey(key);
        };
    }
    // 画布点击（记忆翻牌/井字棋）
    cv.onclick = function(e){
        var rect = cv.getBoundingClientRect();
        var mx = (e.clientX - rect.left) * (cv.width / rect.width);
        var my = (e.clientY - rect.top) * (cv.height / rect.height);
        if(currentGame && currentGame.onClick) currentGame.onClick(mx, my);
    };
    // 键盘
    document.onkeydown = function(e){
        if(currentGame && currentGame.onKey) currentGame.onKey(e.key);
        // 阻止方向键和空格键导致页面滚动
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key)>=0){
            e.preventDefault();
        }
    };
    currentGame.init();
    currentGame.start();
}

function backToLobby(){
    if(currentGame && currentGame.timer) clearInterval(currentGame.timer);
    currentGame = null;
    document.getElementById('gamepage').style.display = 'none';
    document.getElementById('turretpage').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    document.onkeydown = null;
}

/* 启动 */
window.onload = function(){
    buildLobby();
};
