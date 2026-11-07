/* =========================================================
   所有游戏稳定版实现
   使用 var + 对象字面量，避免 IIFE/闭包陷阱
   每个游戏提供：init / start / loop / draw / onKey / onClick / buttons / dpad
   ========================================================= */

/* ---------- 工具函数 ---------- */
function setScore(v){ document.getElementById('gscore').innerHTML = '得分: ' + v; }

/* ---------- 1. 俄罗斯方块 ---------- */
var Tetris = {
    name:'俄罗斯方块', title:'🧩 俄罗斯方块',
    W:10, H:20, S:26,
    init:function(){ this.cv.width=this.W*this.S; this.cv.height=this.H*this.S; },
    start:function(){
        this.board=[]; for(var i=0;i<this.H;i++){var a=[];for(var j=0;j<this.W;j++)a.push(0);this.board.push(a);}
        this.score=0; this.gameOver=false; setScore(0);
        this.shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[1,1,1],[0,1,0]],[[1,1,1],[1,0,0]],[[1,1,1],[0,0,1]],[[1,1,0],[0,1,1]],[[0,1,1],[1,1,0]]];
        this.colors=['#0ff','#ff0','#a0f','#f80','#00f','#0f0','#f00'];
        this.newPiece(); var self=this;
        clearInterval(this.timer); this.timer=setInterval(function(){self.loop();},500);
    },
    newPiece:function(){
        var id=Math.floor(Math.random()*7);
        this.piece=this.shapes[id]; this.pColor=this.colors[id]; this.px=3; this.py=0;
        if(this.collide()){ this.gameOver=true; clearInterval(this.timer); alert('游戏结束！得分：'+this.score); }
    },
    collide:function(){
        for(var r=0;r<this.piece.length;r++)for(var c=0;c<this.piece[r].length;c++)if(this.piece[r][c]){
            var nx=this.px+c,ny=this.py+r;
            if(nx<0||nx>=this.W||ny>=this.H) return true;
            if(ny>=0&&this.board[ny][nx]) return true;
        }
        return false;
    },
    merge:function(){
        for(var r=0;r<this.piece.length;r++)for(var c=0;c<this.piece[r].length;c++)if(this.piece[r][c]) this.board[this.py+r][this.px+c]=this.pColor;
        for(var r=this.H-1;r>=0;r--){
            var full=true; for(var c=0;c<this.W;c++)if(!this.board[r][c])full=false;
            if(full){ this.board.splice(r,1); var a=[];for(var j=0;j<this.W;j++)a.push(0); this.board.unshift(a); this.score+=100; r++; }
        }
        setScore(this.score); this.newPiece();
    },
    draw:function(){
        this.ctx.clearRect(0,0,this.cv.width,this.cv.height);
        for(var r=0;r<this.H;r++)for(var c=0;c<this.W;c++)if(this.board[r][c]){this.ctx.fillStyle=this.board[r][c];this.ctx.fillRect(c*this.S,r*this.S,this.S,this.S);this.ctx.strokeStyle='#222';this.ctx.strokeRect(c*this.S,r*this.S,this.S,this.S);}
        if(!this.gameOver)for(var r=0;r<this.piece.length;r++)for(var c=0;c<this.piece[r].length;c++)if(this.piece[r][c]){this.ctx.fillStyle=this.pColor;this.ctx.fillRect((this.px+c)*this.S,(this.py+r)*this.S,this.S,this.S);this.ctx.strokeStyle='#fff';this.ctx.strokeRect((this.px+c)*this.S,(this.py+r)*this.S,this.S,this.S);}
    },
    loop:function(){ if(this.gameOver)return; this.py++; if(this.collide()){this.py--;this.merge();} if(!this.gameOver)this.draw(); },
    move:function(d){ if(this.gameOver)return; this.px+=d; if(this.collide())this.px-=d; this.draw(); },
    rotate:function(){
        if(this.gameOver)return;
        var old=this.piece,N=this.piece.length,rot=[];
        for(var i=0;i<N;i++){rot.push([]);for(var j=0;j<N;j++)rot[i].push(0);}
        for(var r=0;r<N;r++)for(var c=0;c<N;c++) rot[c][N-1-r]=this.piece[r][c];
        this.piece=rot; if(this.collide()) this.piece=old; this.draw();
    },
    drop:function(){ if(this.gameOver)return; this.py++; if(this.collide()){this.py--;this.merge();} this.draw(); },
    onKey:function(k){ if(k=='a'||k=='A'||k=='ArrowLeft')this.move(-1); if(k=='d'||k=='D'||k=='ArrowRight')this.move(1); if(k=='s'||k=='S'||k=='ArrowDown')this.drop(); if(k=='w'||k=='W'||k=='ArrowUp'||k==' ')this.rotate(); },
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[{label:'⬅️',key:'a'},{label:'🔄',key:'w'},{label:'➡️',key:'d'},{label:'⬇️',key:'s'}]
};

/* ---------- 2. 贪吃蛇 ---------- */
var Snake = {
    name:'贪吃蛇', title:'🐍 贪吃蛇',
    W:20, H:20, S:18,
    init:function(){ this.cv.width=this.W*this.S; this.cv.height=this.H*this.S; },
    start:function(){
        this.snake=[{x:8,y:10},{x:7,y:10},{x:6,y:10}];
        this.dir={x:1,y:0}; this.score=0; this.gameOver=false; this.food={}; setScore(0);
        this.placeFood(); var self=this;
        clearInterval(this.timer); this.timer=setInterval(function(){self.loop();},130);
    },
    placeFood:function(){ this.food={x:Math.floor(Math.random()*this.W),y:Math.floor(Math.random()*this.H)}; },
    loop:function(){
        var head={x:this.snake[0].x+this.dir.x,y:this.snake[0].y+this.dir.y};
        if(head.x<0||head.x>=this.W||head.y<0||head.y>=this.H){this.over();return;}
        for(var i=0;i<this.snake.length;i++)if(this.snake[i].x==head.x&&this.snake[i].y==head.y){this.over();return;}
        this.snake.unshift(head);
        if(head.x==this.food.x&&head.y==this.food.y){this.score+=10;setScore(this.score);this.placeFood();}else this.snake.pop();
        this.draw();
    },
    draw:function(){
        this.ctx.fillStyle='#000'; this.ctx.fillRect(0,0,this.cv.width,this.cv.height);
        this.ctx.fillStyle='#f80'; this.ctx.fillRect(this.food.x*this.S,this.food.y*this.S,this.S-1,this.S-1);
        this.ctx.fillStyle='#0f0';
        for(var i=0;i<this.snake.length;i++) this.ctx.fillRect(this.snake[i].x*this.S,this.snake[i].y*this.S,this.S-1,this.S-1);
    },
    over:function(){ this.gameOver=true; clearInterval(this.timer); alert('游戏结束！得分：'+this.score); },
    onKey:function(k){
        var key=k.toLowerCase();
        if((key=='a'||k=='ArrowLeft')&&this.dir.x!=1)this.dir={x:-1,y:0};
        if((key=='d'||k=='ArrowRight')&&this.dir.x!=-1)this.dir={x:1,y:0};
        if((key=='w'||k=='ArrowUp')&&this.dir.y!=1)this.dir={x:0,y:-1};
        if((key=='s'||k=='ArrowDown')&&this.dir.y!=-1)this.dir={x:0,y:1};
    },
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[{label:'⬆️',key:'w'},{label:'⬇️',key:'s'},{label:'⬅️',key:'a'},{label:'➡️',key:'d'}]
};

/* ---------- 3. 2048 ---------- */
var Game2048 = {
    name:'2048', title:'🔢 2048',
    size:4,
    colorMap:{0:'#252545',2:'#eee',4:'#fcc',8:'#fa9',16:'#f86',32:'#f75',64:'#f53',128:'#ec7',256:'#ed7',512:'#ea5',1024:'#fd7',2048:'#ff0'},
    init:function(){
        this.cell=Math.floor(Math.min(400,window.innerWidth-20)/this.size);
        var cw=this.cell*this.size+10*(this.size+1);
        this.cv.width=cw; this.cv.height=cw;
    },
    start:function(){
        this.board=[]; for(var i=0;i<this.size;i++){var a=[];for(var j=0;j<this.size;j++)a.push(0);this.board.push(a);}
        this.score=0; this.gameOver=false; setScore(0);
        this.addTile(); this.addTile(); this.draw();
    },
    colorOf:function(v){ return this.colorMap[v]||'#a0f'; },
    addTile:function(){
        var empty=[];
        for(var r=0;r<this.size;r++)for(var c=0;c<this.size;c++)if(this.board[r][c]==0)empty.push({r:r,c:c});
        if(empty.length==0)return;
        var p=empty[Math.floor(Math.random()*empty.length)];
        this.board[p.r][p.c]=Math.random()<0.9?2:4;
    },
    slide:function(dx,dy){
        var moved=false,size=this.size;
        var comp=function(a){var b=[];for(var i=0;i<a.length;i++)if(a[i])b.push(a[i]);for(i=b.length;i<size;i++)b.push(0);for(i=0;i<size-1;i++)if(b[i]&&b[i]==b[i+1]){b[i]*=2;Game2048.score+=b[i];b.splice(i+1,1);b.push(0);moved=true;}return b;};
        for(var i=0;i<size;i++){
            var line=[];
            for(var j=0;j<size;j++){var r=dy!=0?j:i,c=dx!=0?j:i;if(dx==1)c=size-1-j;if(dy==1)r=size-1-j;line.push(this.board[r][c]);}
            var res=comp(line);
            for(j=0;j<size;j++){var r=dy!=0?j:i,c=dx!=0?j:i;if(dx==1)c=size-1-j;if(dy==1)r=size-1-j;this.board[r][c]=res[j];}
        }
        setScore(this.score); return moved;
    },
    onKey:function(k){
        var key=k.toLowerCase(),moved=false;
        if(key=='a'||k=='ArrowLeft')moved=this.slide(-1,0);
        if(key=='d'||k=='ArrowRight')moved=this.slide(1,0);
        if(key=='w'||k=='ArrowUp')moved=this.slide(0,-1);
        if(key=='s'||k=='ArrowDown')moved=this.slide(0,1);
        if(moved){this.addTile();this.draw();this.check();}
    },
    check:function(){
        var full=true;
        for(var r=0;r<this.size;r++)for(var c=0;c<this.size;c++){
            if(this.board[r][c]==0)full=false;
            if(r<this.size-1&&this.board[r][c]==this.board[r+1][c])full=false;
            if(c<this.size-1&&this.board[r][c]==this.board[r][c+1])full=false;
            if(this.board[r][c]==2048)alert('🎉 恭喜合成2048！得分：'+this.score);
        }
        if(full){this.gameOver=true;alert('游戏结束！得分：'+this.score);}
    },
    draw:function(){
        var g=10,cell=this.cell;
        this.ctx.fillStyle='#1b1b35'; this.ctx.fillRect(0,0,this.cv.width,this.cv.height);
        for(var r=0;r<this.size;r++)for(var c=0;c<this.size;c++){
            var x=g+c*(cell+g),y=g+r*(cell+g);
            this.ctx.fillStyle=this.colorOf(this.board[r][c]);
            this.ctx.fillRect(x,y,cell,cell);
            if(this.board[r][c]){this.ctx.fillStyle=this.board[r][c]>4?'#fff':'#333';this.ctx.font='bold '+Math.floor(cell*0.4)+'px sans-serif';this.ctx.textAlign='center';this.ctx.textBaseline='middle';this.ctx.fillText(this.board[r][c],x+cell/2,y+cell/2);}
        }
    },
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[{label:'⬅️',key:'a'},{label:'⬆️',key:'w'},{label:'➡️',key:'d'},{label:'⬇️',key:'s'}]
};

/* ---------- 4. 打砖块 ---------- */
var Brick = {
    name:'打砖块', title:'🧱 打砖块',
    W:12, H:22, S:22,
    init:function(){ this.cv.width=this.W*this.S; this.cv.height=this.H*this.S; },
    start:function(){
        this.pad={x:this.W*this.S/2-30,y:this.H*this.S-20,w:60,h:8};
        this.ball={x:this.W*this.S/2,y:this.H*this.S-30}; this.vx=3; this.vy=-3;
        this.score=0; this.gameOver=false; setScore(0); this.bricks=[];
        for(var r=0;r<5;r++)for(var c=0;c<this.W;c++) this.bricks.push({x:c*this.S+2,y:r*this.S+2,w:this.S-4,h:this.S-4,alive:true,color:['#f00','#fa0','#ff0','#0f0','#0ff'][r]});
        var self=this;
        clearInterval(this.timer); this.timer=setInterval(function(){self.loop();},16);
    },
    loop:function(){
        this.ball.x+=this.vx; this.ball.y+=this.vy;
        if(this.ball.x<5||this.ball.x>this.W*this.S-5)this.vx=-this.vx;
        if(this.ball.y<5)this.vy=-this.vy;
        if(this.ball.y>this.pad.y&&this.ball.x>this.pad.x&&this.ball.x<this.pad.x+this.pad.w&&this.ball.y<this.pad.y+this.pad.h)this.vy=-Math.abs(this.vy);
        if(this.ball.y>this.cv.height){this.over();return;}
        for(var i=0;i<this.bricks.length;i++){var b=this.bricks[i];if(b.alive&&this.ball.x>b.x&&this.ball.x<b.x+b.w&&this.ball.y>b.y&&this.ball.y<b.y+b.h){b.alive=false;this.score+=10;setScore(this.score);this.vy=-this.vy;}}
        var left=0; for(i=0;i<this.bricks.length;i++)if(this.bricks[i].alive)left++;
        if(left==0){alert('🎉 你赢了！得分：'+this.score);this.over();return;}
        this.draw();
    },
    draw:function(){
        this.ctx.fillStyle='#000'; this.ctx.fillRect(0,0,this.cv.width,this.cv.height);
        for(var i=0;i<this.bricks.length;i++){var b=this.bricks[i];if(b.alive){this.ctx.fillStyle=b.color;this.ctx.fillRect(b.x,b.y,b.w,b.h);}}
        this.ctx.fillStyle='#0ff'; this.ctx.fillRect(this.pad.x,this.pad.y,this.pad.w,this.pad.h);
        this.ctx.fillStyle='#fff'; this.ctx.beginPath(); this.ctx.arc(this.ball.x,this.ball.y,5,0,Math.PI*2); this.ctx.fill();
    },
    over:function(){ this.gameOver=true; clearInterval(this.timer); alert('游戏结束！得分：'+this.score); },
    onKey:function(k){
        var key=k.toLowerCase();
        if(key=='a'||k=='ArrowLeft')this.pad.x-=20;
        if(key=='d'||k=='ArrowRight')this.pad.x+=20;
        if(this.pad.x<0)this.pad.x=0; if(this.pad.x>this.W*this.S-this.pad.w)this.pad.x=this.W*this.S-this.pad.w;
    },
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[{label:'⬅️',key:'a'},{label:'➡️',key:'d'}]
};

/* ---------- 5. 极速赛车 ---------- */
var Race = {
    name:'极速赛车', title:'🏎️ 极速赛车',
    W:10, H:22, S:24,
    init:function(){ this.cv.width=this.W*this.S; this.cv.height=this.H*this.S; },
    start:function(){
        this.car={x:4,y:this.H-2};
        this.road=[]; for(var i=0;i<this.H;i++)this.road.push(-1);
        this.score=0; this.gameOver=false; setScore(0); this.speed=90;
        var self=this;
        clearInterval(this.timer); this.timer=setInterval(function(){self.loop();},this.speed);
    },
    loop:function(){
        this.road.unshift(Math.random()<0.35?Math.floor(Math.random()*this.W):-1);
        this.road.pop();
        if(this.road[this.H-2]===this.car.x){this.over();return;}
        this.score+=1; setScore(this.score);
        if(this.score%50==0&&this.speed>35){clearInterval(this.timer);this.speed-=10;var self=this;this.timer=setInterval(function(){self.loop();},this.speed);}
        this.draw();
    },
    draw:function(){
        this.ctx.fillStyle='#333'; this.ctx.fillRect(0,0,this.cv.width,this.cv.height);
        this.ctx.strokeStyle='#fff'; this.ctx.setLineDash([12,12]);
        for(var i=1;i<this.W;i++){this.ctx.beginPath();this.ctx.moveTo(i*this.S,0);this.ctx.lineTo(i*this.S,this.cv.height);this.ctx.stroke();}
        this.ctx.setLineDash([]);
        for(var r=0;r<this.H;r++)if(this.road[r]>=0){this.ctx.fillStyle='#f00';this.ctx.fillRect(this.road[r]*this.S,r*this.S,this.S-2,this.S-2);}
        this.ctx.fillStyle='#0ff'; this.ctx.fillRect(this.car.x*this.S,this.car.y*this.S,this.S-2,this.S-2);
        this.ctx.fillStyle='#fa0'; this.ctx.fillRect(this.car.x*this.S,this.car.y*this.S+4,this.S-2,this.S-10);
    },
    over:function(){ this.gameOver=true; clearInterval(this.timer); alert('游戏结束！得分：'+this.score); },
    onKey:function(k){
        var key=k.toLowerCase();
        if((key=='a'||k=='ArrowLeft')&&this.car.x>0)this.car.x--;
        if((key=='d'||k=='ArrowRight')&&this.car.x<this.W-1)this.car.x++;
    },
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[{label:'⬅️',key:'a'},{label:'➡️',key:'d'}]
};

/* ---------- 6. 翻翻乐（记忆翻牌） ---------- */
var Memory = {
    name:'翻翻乐', title:'🃏 翻翻乐',
    cols:4, rows:4,
    syms:['🍎','🍌','🍇','🍊','🍓','🍑','🥝','🍒'],
    colors:['#f44','#fb0','#a0f','#0a8','#0af','#f0a','#ff5','#5ff'],
    init:function(){
        this.cardW=Math.floor((Math.min(420,window.innerWidth-20)-6*(this.cols+1))/this.cols);
        this.cardH=this.cardW;
        this.cv.width=this.cardW*this.cols+6*(this.cols+1);
        this.cv.height=this.cardH*this.rows+6*(this.rows+1);
    },
    start:function(){
        var vals=[]; for(var i=1;i<=this.cols*this.rows/2;i++){vals.push(i);vals.push(i);}
        vals.sort(function(){return Math.random()-0.5;});
        this.cards=[]; for(var r=0;r<this.rows;r++)for(var c=0;c<this.cols;c++) this.cards.push({r:r,c:c,v:vals.pop(),shown:false,matched:false});
        this.first=null; this.second=null; this.lock=false; this.pairs=0; this.score=0; setScore(0); this.draw();
    },
    sym:function(v){ return this.syms[(v-1)%this.syms.length]; },
    colorOf:function(v){ return this.colors[(v-1)%this.colors.length]; },
    onClick:function(mx,my){
        if(this.lock||this.gameOver)return;
        var c=Math.floor(mx/(this.cardW+6)),r=Math.floor(my/(this.cardH+6));
        if(mx<6||my<6||mx%(this.cardW+6)<6||my%(this.cardH+6)<6)return;
        var cd=null; for(var i=0;i<this.cards.length;i++)if(this.cards[i].c==c&&this.cards[i].r==r&&!this.cards[i].matched&&!this.cards[i].shown){cd=this.cards[i];break;}
        if(!cd)return;
        cd.shown=true;
        if(!this.first)this.first=cd;
        else if(!this.second&&cd!==this.first){this.second=cd;this.lock=true;var self=this;setTimeout(function(){self.checkPair();},600);}
        this.draw();
    },
    checkPair:function(){
        if(this.first.v==this.second.v){this.first.matched=true;this.second.matched=true;this.pairs++;this.score+=20;setScore(this.score);if(this.pairs==this.cols*this.rows/2)alert('🎉 全部配对完成！得分：'+this.score);}
        else{this.first.shown=false;this.second.shown=false;}
        this.first=null;this.second=null;this.lock=false;this.draw();
    },
    draw:function(){
        var g=6,cw=this.cardW,ch=this.cardH;
        this.ctx.fillStyle='#1b1b35'; this.ctx.fillRect(0,0,this.cv.width,this.cv.height);
        for(var i=0;i<this.cards.length;i++){
            var cd=this.cards[i],x=g+cd.c*(cw+g),y=g+cd.r*(ch+g);
            if(cd.matched)this.ctx.fillStyle='#264';
            else if(cd.shown||cd===this.first||cd===this.second)this.ctx.fillStyle=this.colorOf(cd.v);
            else this.ctx.fillStyle='#445';
            this.ctx.fillRect(x,y,cw,ch);
            if(cd.shown||cd.matched||cd===this.first||cd===this.second){this.ctx.fillStyle='#fff';this.ctx.font='bold '+Math.floor(cw*0.4)+'px sans-serif';this.ctx.textAlign='center';this.ctx.textBaseline='middle';this.ctx.fillText(this.sym(cd.v),x+cw/2,y+ch/2);}
        }
    },
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[]
};

/* ---------- 7. 井字棋 ---------- */
var TicTacToe = {
    name:'井字棋', title:'⭕ 井字棋',
    init:function(){ this.S=Math.min(420,window.innerWidth-20)/3; this.cv.width=this.S*3; this.cv.height=this.S*3; },
    start:function(){ this.board=[0,0,0,0,0,0,0,0,0]; this.turn=1; this.over=false; this.draw(); },
    draw:function(){
        this.ctx.fillStyle='#1b1b35'; this.ctx.fillRect(0,0,this.cv.width,this.cv.height);
        this.ctx.strokeStyle='#fff'; this.ctx.lineWidth=4;
        for(var i=1;i<3;i++){this.ctx.beginPath();this.ctx.moveTo(i*this.S,0);this.ctx.lineTo(i*this.S,this.cv.height);this.ctx.stroke();this.ctx.beginPath();this.ctx.moveTo(0,i*this.S);this.ctx.lineTo(this.cv.width,i*this.S);this.ctx.stroke();}
        this.ctx.font='bold '+this.S*0.6+'px sans-serif'; this.ctx.textAlign='center'; this.ctx.textBaseline='middle';
        for(var i=0;i<9;i++)if(this.board[i]){this.ctx.fillStyle=this.board[i]==1?'#0ff':'#f80';this.ctx.fillText(this.board[i]==1?'✕':'◯',(i%3)*this.S+this.S/2,Math.floor(i/3)*this.S+this.S/2);}
    },
    onClick:function(mx,my){
        if(this.over)return;
        var i=Math.floor(mx/this.S)+Math.floor(my/this.S)*3;
        if(i>=0&&i<9&&this.board[i]==0){this.board[i]=this.turn;this.turn=this.turn==1?2:1;this.check();this.draw();}
    },
    check:function(){
        var w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for(var n=0;n<w.length;n++){var a=w[n][0],b=w[n][1],c=w[n][2];if(this.board[a]&&this.board[a]==this.board[b]&&this.board[a]==this.board[c]){this.over=true;alert((this.board[a]==1?'✕':'◯')+' 获胜！');return;}}
        var full=true;for(var i=0;i<9;i++)if(!this.board[i])full=false;
        if(full){this.over=true;alert('平局！');}
    },
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[]
};

/* ---------- 8. 太空射击（键盘） ---------- */
var SpaceShooter = {
    name:'太空射击', title:'🚀 太空射击',
    W:12, H:20, S:24,
    init:function(){ this.cv.width=this.W*this.S; this.cv.height=this.H*this.S; },
    start:function(){
        this.player={x:this.W*this.S/2,y:this.H*this.S-40};
        this.bullets=[]; this.enemies=[]; this.stars=[];
        for(var i=0;i<40;i++) this.stars.push({x:Math.random()*this.W*this.S,y:Math.random()*this.H*this.S,s:Math.random()*2+1});
        this.score=0; this.gameOver=false; this.cooldown=0; setScore(0);
        var self=this;
        clearInterval(this.timer); this.timer=setInterval(function(){self.loop();},40);
    },
    loop:function(){
        if(this.cooldown>0) this.cooldown--;
        // 星星背景
        for(var i=0;i<this.stars.length;i++){this.stars[i].y+=this.stars[i].s;if(this.stars[i].y>this.cv.height)this.stars[i].y=0;}
        // 子弹上移
        for(i=0;i<this.bullets.length;i++) this.bullets[i].y-=8;
        this.bullets=this.bullets.filter(function(b){return b.y>-10;});
        // 敌机生成
        if(Math.random()<0.04){
            this.enemies.push({x:Math.random()*(this.W*this.S-30)+15,y:-20,vx:(Math.random()-0.5)*2,type:Math.random()<0.8?0:1});
        }
        // 敌机移动 + 击杀判定
        for(i=0;i<this.enemies.length;i++){
            var e=this.enemies[i];
            e.y+=e.type==1?1.2:2;
            e.x+=e.vx;
            if(e.x<15)e.x=15,e.vx*=-1;
            if(e.x>this.W*this.S-15)e.x=this.W*this.S-15,e.vx*=-1;
            // 子弹击中
            for(var j=0;j<this.bullets.length;j++){
                var b=this.bullets[j];
                if(!b.dead&&Math.abs(b.x-e.x)<18&&Math.abs(b.y-e.y)<18){
                    b.dead=true; e.dead=true; this.score+=e.type==1?30:10; setScore(this.score);
                }
            }
        }
        this.bullets=this.bullets.filter(function(b){return !b.dead;});
        this.enemies=this.enemies.filter(function(e){return !e.dead;});
        // 敌机撞到玩家
        for(i=0;i<this.enemies.length;i++){
            var e=this.enemies[i];
            if(Math.abs(e.x-this.player.x)<20&&Math.abs(e.y-this.player.y)<20){this.over();return;}
            if(e.y>this.cv.height){this.score=Math.max(0,this.score-5);setScore(this.score);e.dead=true;}
        }
        this.enemies=this.enemies.filter(function(e){return !e.dead;});
        this.draw();
    },
    fire:function(){
        if(this.cooldown==0&&!this.gameOver){
            this.bullets.push({x:this.player.x,y:this.player.y-15});
            this.cooldown=6;
        }
    },
    draw:function(){
        // 背景
        var grd=this.ctx.createLinearGradient(0,0,0,this.cv.height);
        grd.addColorStop(0,'#050520');grd.addColorStop(1,'#1a0a3a');
        this.ctx.fillStyle=grd; this.ctx.fillRect(0,0,this.cv.width,this.cv.height);
        // 星星
        this.ctx.fillStyle='#fff';
        for(var i=0;i<this.stars.length;i++){this.ctx.fillRect(this.stars[i].x,this.stars[i].y,2,2);}
        // 敌机
        for(i=0;i<this.enemies.length;i++){var e=this.enemies[i];
            this.ctx.fillStyle=e.type==1?'#f0f':'#f44';
            this.ctx.beginPath();this.ctx.moveTo(e.x,e.y-12);this.ctx.lineTo(e.x-12,e.y+8);this.ctx.lineTo(e.x+12,e.y+8);this.ctx.closePath();this.ctx.fill();
        }
        // 子弹
        this.ctx.fillStyle='#ff0';
        for(i=0;i<this.bullets.length;i++){this.ctx.fillRect(this.bullets[i].x-2,this.bullets[i].y-8,4,12);}
        // 玩家飞船
        this.ctx.fillStyle='#0ff';
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x,this.player.y-16);
        this.ctx.lineTo(this.player.x-14,this.player.y+12);
        this.ctx.lineTo(this.player.x-6,this.player.y+6);
        this.ctx.lineTo(this.player.x+6,this.player.y+6);
        this.ctx.lineTo(this.player.x+14,this.player.y+12);
        this.ctx.closePath();this.ctx.fill();
        // 引擎火焰
        this.ctx.fillStyle='#fa0';
        this.ctx.beginPath();this.ctx.moveTo(this.player.x-4,this.player.y+6);this.ctx.lineTo(this.player.x,this.player.y+20);this.ctx.lineTo(this.player.x+4,this.player.y+6);this.ctx.closePath();this.ctx.fill();
    },
    over:function(){ this.gameOver=true; clearInterval(this.timer); alert('游戏结束！得分：'+this.score); },
    onKey:function(k){
        if(this.gameOver) return;
        var key=k.toLowerCase();
        if(key=='a'||k=='ArrowLeft') this.player.x-=16;
        if(key=='d'||k=='ArrowRight') this.player.x+=16;
        if(key=='w'||k=='ArrowUp') this.player.y-=12;
        if(key=='s'||k=='ArrowDown') this.player.y+=12;
        if(k==' '||k=='Spacebar'||key=='j') this.fire();
        if(this.player.x<14) this.player.x=14;
        if(this.player.x>this.W*this.S-14) this.player.x=this.W*this.S-14;
        if(this.player.y<16) this.player.y=16;
        if(this.player.y>this.H*this.S-16) this.player.y=this.H*this.S-16;
    },
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[{label:'⬅️',key:'a'},{label:'🔼',key:'w'},{label:'➡️',key:'d'},{label:'💥',key:'j'}]
};

/* ---------- 9. 打靶游戏（鼠标点击） ---------- */
var ShootingRange = {
    name:'打靶游戏', title:'🎯 打靶游戏',
    W:20, H:14, S:24,
    init:function(){ this.cv.width=this.W*this.S; this.cv.height=this.H*this.S; },
    start:function(){
        this.targets=[]; this.time=30; this.score=0; this.gameOver=false; this.spawned=0; setScore(0);
        this.nextSpawn=0;
        var self=this;
        clearInterval(this.timer); this.timer=setInterval(function(){self.loop();},50);
    },
    loop:function(){
        // 生成靶子
        this.nextSpawn--;
        if(this.nextSpawn<=0&&this.targets.length<6){
            var r=Math.random();
            var type=r<0.2?2:r<0.6?1:0; // 2=金色高分 1=红色 0=普通
            this.targets.push({x:30+Math.random()*(this.W*this.S-60),y:30+Math.random()*(this.H*this.S-80),r:0,maxR:type==2?22:type==1?30:38,type:type,life:60+Math.random()*40,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2});
            this.nextSpawn=20+Math.random()*30;
        }
        // 靶子移动+缩放动画
        for(var i=0;i<this.targets.length;i++){
            var t=this.targets[i];
            t.x+=t.vx; t.y+=t.vy;
            if(t.x<t.maxR)t.x=t.maxR,t.vx*=-1;
            if(t.x>this.W*this.S-t.maxR)t.x=this.W*this.S-t.maxR,t.vx*=-1;
            if(t.y<t.maxR)t.y=t.maxR,t.vy*=-1;
            if(t.y>this.H*this.S-t.maxR)t.y=this.H*this.S-t.maxR,t.vy*=-1;
            t.life--;
            if(t.r<t.maxR) t.r+=2;
        }
        this.targets=this.targets.filter(function(t){return t.life>0&&t.r>0;});
        // 倒计时
        this._ticks=(this._ticks||0)+1;
        if(this._ticks%20==0){
            this.time--;
            if(this.time<=0){this.time=0;this.over();return;}
        }
        this.draw();
    },
    onClick:function(mx,my){
        if(this.gameOver) return;
        for(var i=0;i<this.targets.length;i++){
            var t=this.targets[i];
            var dist=Math.sqrt((mx-t.x)*(mx-t.x)+(my-t.y)*(my-t.y));
            if(dist<t.r){
                var hit=dist<t.r*0.35?3:dist<t.r*0.7?2:1;
                var pts=hit*(t.type==2?50:t.type==1?30:10);
                this.score+=pts; setScore(this.score+' (时间:'+this.time+'s)');
                this.targets.splice(i,1);
                return;
            }
        }
        // 脱靶扣分
        this.score=Math.max(0,this.score-2); setScore(this.score+' (时间:'+this.time+'s)');
    },
    draw:function(){
        // 草地背景
        var grd=this.ctx.createLinearGradient(0,0,0,this.cv.height);
        grd.addColorStop(0,'#87ceeb');grd.addColorStop(0.6,'#6ab04c');grd.addColorStop(1,'#4a8c2a');
        this.ctx.fillStyle=grd; this.ctx.fillRect(0,0,this.cv.width,this.cv.height);
        // 靶子
        for(var i=0;i<this.targets.length;i++){
            var t=this.targets[i];
            var cols=t.type==2?['#ffd700','#fff','#ffd700']:t.type==1?['#f00','#fff','#f00']:['#4a90d9','#fff','#4a90d9'];
            for(var ring=2;ring>=0;ring--){
                this.ctx.beginPath();
                this.ctx.arc(t.x,t.y,t.r*(1-ring*0.33),0,Math.PI*2);
                this.ctx.fillStyle=cols[ring];
                this.ctx.fill();
            }
        }
        // 准星
        this.ctx.strokeStyle='rgba(255,255,255,0.5)';
        this.ctx.lineWidth=1;
        this.ctx.beginPath();this.ctx.arc(this.cv.width/2,this.cv.height/2,20,0,Math.PI*2);this.ctx.stroke();
        // 时间条
        this.ctx.fillStyle='#0008'; this.ctx.fillRect(5,5,this.cv.width-10,6);
        this.ctx.fillStyle='#0ff'; this.ctx.fillRect(5,5,(this.cv.width-10)*(this.time/30),6);
    },
    over:function(){ this.gameOver=true; clearInterval(this.timer); alert('🎯 时间到！总得分：'+this.score); },
    onKey:function(k){},
    buttons:[{label:'重新开始',action:'start'}],
    dpad:[]
};

/* 游戏注册表 */
var GAMES = {
    'tetris': Tetris,
    'snake': Snake,
    '2048': Game2048,
    'brick': Brick,
    'race': Race,
    'memory': Memory,
    'tictactoe': TicTacToe,
    'spaceshooter': SpaceShooter,
    'shootingrange': ShootingRange
};
