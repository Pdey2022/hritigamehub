/* ============================================
   MAGIC CANVAS — Glow Chase Game
   ⭐ Paint over glowing orbs to collect them!
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('mc-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 500;
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ----- DOM Refs -----
const dom = {
    score:        document.getElementById('mc-score'),
    scoreBottom:  document.getElementById('mc-score-bottom'),
    lives:        document.getElementById('mc-lives'),
    wave:         document.getElementById('mc-wave'),
    startOverlay: document.getElementById('mc-start-overlay'),
    gameoverOverlay: document.getElementById('mc-gameover-overlay'),
    gameoverStats:   document.getElementById('mc-gameover-stats'),
    startBtn:     document.getElementById('mc-start-btn'),
    restartBtn:   document.getElementById('mc-restart-btn'),
    muteBtn:      document.getElementById('mc-mute-btn')
};

// ===== State =====
const state = {
    score: 0, highScore: 0, lives: 3, wave: 1, combo: 0, maxCombo: 0,
    running: false, gameOver: false,
    orbs: [], particles: [], stars: [], trail: [],
    spawnTimer: 0, orbInterval: 55, orbLifetime: 160, pulse: 0,
    muted: false, rainbowHue: 0
};
try {
    const hs = localStorage.getItem('mc_high');
    if (hs) state.highScore = parseInt(hs) || 0;
    if (localStorage.getItem('mc_muted') === '1') state.muted = true;
} catch(e) {}

// ===== Audio =====
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function tone(freq, dur, type, vol) {
    if (state.muted || !audioCtx) return;
    try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type || 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + dur);
    } catch(e) {}
}
function sndCollect() { tone(880,0.08,'sine',0.1); setTimeout(()=>tone(1100,0.1,'sine',0.08),60); }
function sndMiss() { tone(200,0.2,'sawtooth',0.06); }
function sndOver() {
    tone(400,0.15,'sine',0.08); setTimeout(()=>tone(300,0.15,'sine',0.08),150);
    setTimeout(()=>tone(200,0.3,'sine',0.08),300);
}
function sndWave() { [523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,0.1,'sine',0.08),i*100)); }
function sndBrush() { tone(600+Math.random()*400,0.03,'sine',0.04); }

// ===== Orb Colors =====
const ORB_COLORS = [
    {fill:'#ff6b6b',glow:'rgba(255,107,107,0.6)'},
    {fill:'#feca57',glow:'rgba(254,202,87,0.6)'},
    {fill:'#48dbfb',glow:'rgba(72,219,251,0.6)'},
    {fill:'#ff9ff3',glow:'rgba(255,159,243,0.6)'},
    {fill:'#54a0ff',glow:'rgba(84,160,255,0.6)'},
    {fill:'#5f27cd',glow:'rgba(95,39,205,0.6)'},
    {fill:'#1dd1a1',glow:'rgba(29,209,161,0.6)'},
    {fill:'#f368e0',glow:'rgba(243,104,224,0.6)'}
];

// ===== Particles =====
function burst(x,y,color,n,speed) {
    for(let i=0;i<(n||15);i++) {
        const a=Math.random()*Math.PI*2, sp=(speed||3)+Math.random()*3;
        state.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,life:1,decay:0.015+Math.random()*0.02,size:2+Math.random()*5,color:color||'#fff'});
    }
}

function initStars() {
    state.stars=[];
    for(let i=0;i<80;i++) state.stars.push({x:Math.random()*W,y:Math.random()*H,size:0.5+Math.random()*1.5,speed:0.2+Math.random()*0.5,phase:Math.random()*Math.PI*2});
}

// ===== Orb Management =====
function spawnOrb() {
    const c=ORB_COLORS[Math.floor(Math.random()*ORB_COLORS.length)], s=16+Math.random()*16, p=s+10;
    state.orbs.push({x:p+Math.random()*(W-p*2),y:p+Math.random()*(H-p*2),size:s,color:c,life:state.orbLifetime,maxLife:state.orbLifetime,collected:false});
}

function collectOrb(orb) {
    orb.collected=true;
    state.score+=10+Math.floor(state.wave*2)+state.combo*2;
    state.combo++;
    if(state.combo>state.maxCombo) state.maxCombo=state.combo;
    sndCollect();
    burst(orb.x,orb.y,orb.color.fill,20,4);
    updateHUD();
}

function missOrb() {
    state.lives--; state.combo=0; sndMiss();
    burst(W/2,H-30,'#e74c3c',8,2);
    updateHUD();
    if(state.lives<=0) gameOver();
}

// ===== Game Flow =====
function startGame() {
    state.score=0; state.lives=3; state.wave=1; state.combo=0; state.maxCombo=0;
    state.running=true; state.gameOver=false; state.orbs=[]; state.particles=[]; state.trail=[];
    state.spawnTimer=0; state.orbInterval=55; state.orbLifetime=160;
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    document.getElementById('mc-game-hud').classList.remove('hidden');
    document.getElementById('mc-draw-tools').classList.add('hidden');
    initAudio(); initStars(); updateHUD();
}

function gameOver() {
    state.running=false; state.gameOver=true; sndOver();
    if(state.score>state.highScore) { state.highScore=state.score; localStorage.setItem('mc_high',state.highScore); }
    dom.gameoverStats.innerHTML=`Score: ${state.score} | Wave: ${state.wave}<br>🏆 Best: ${state.highScore} | 🔥 Best Combo: ${state.maxCombo}x`;
    dom.gameoverOverlay.classList.remove('hidden');
    if(state.score>0 && typeof saveScore==='function') saveScore('magic-canvas',state.score);
    if(typeof renderLeaderboard==='function') renderLeaderboard('magic-canvas','lb-mc-content','Magic Canvas');
}

// ===== Render =====
function render() {
    ctx.clearRect(0,0,W,H);
    // Dark space bg
    const g=ctx.createRadialGradient(W/2,H/2,50,W/2,H/2,350);
    g.addColorStop(0,'#1a1a3e'); g.addColorStop(0.5,'#0f0f2a'); g.addColorStop(1,'#050510');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // Stars
    state.stars.forEach(s=>{
        const a=0.3+0.7*Math.sin(Date.now()*s.speed*0.001+s.phase);
        ctx.fillStyle=`rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
    });
    // Orbs
    state.pulse+=0.05;
    state.orbs.forEach(orb=>{
        if(orb.collected) return;
        const lr=orb.life/orb.maxLife, ps=1+0.08*Math.sin(state.pulse);
        const gl=ctx.createRadialGradient(orb.x,orb.y,0,orb.x,orb.y,orb.size*2);
        gl.addColorStop(0,orb.color.glow); gl.addColorStop(1,'transparent');
        ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(orb.x,orb.y,orb.size*2*ps,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=orb.color.fill; ctx.globalAlpha=lr;
        ctx.beginPath(); ctx.arc(orb.x,orb.y,orb.size*ps,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(orb.x-orb.size*0.2,orb.y-orb.size*0.2,orb.size*0.35,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
    });
    // Trail
    state.trail.forEach((t,i)=>{ctx.fillStyle=`rgba(255,255,255,${t.life*0.3})`;ctx.beginPath();ctx.arc(t.x,t.y,4*t.life,0,Math.PI*2);ctx.fill();});
    // Particles
    for(let i=state.particles.length-1;i>=0;i--){
        const p=state.particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.life-=p.decay;
        if(p.life<=0){state.particles.splice(i,1);continue;}
        ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    // Bottom bar
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(0,H-30,W,30);
    ctx.fillStyle='#fff'; ctx.font='bold 13px Fredoka,sans-serif';
    ctx.textAlign='left'; ctx.fillText(`❤️ x${state.lives}`,10,H-8);
    ctx.textAlign='center'; ctx.fillText(`⭐ ${state.score}`,W/2,H-8);
    ctx.textAlign='right'; ctx.fillText(`🔥 ${state.combo}x`,W-10,H-8);
}

// ===== HUD =====
function updateHUD() {
    dom.score.textContent=state.score;
    dom.scoreBottom.textContent=state.score;
    if(dom.lives) dom.lives.textContent='❤️'.repeat(Math.max(0,state.lives));
    if(dom.wave) dom.wave.textContent=state.wave;
}

// ===== Input =====
function getPos(e) {
    const r=canvas.getBoundingClientRect();
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return {x:(cx-r.left)*(W/r.width),y:(cy-r.top)*(H/r.height)};
}

function onPointerDown(pos) {
    if(!state.running||state.gameOver) return;
    let hit=false;
    for(const orb of state.orbs){
        if(orb.collected) continue;
        const dx=pos.x-orb.x, dy=pos.y-orb.y;
        if(Math.sqrt(dx*dx+dy*dy)<orb.size+10){collectOrb(orb);hit=true;break;}
    }
    if(!hit) sndBrush();
}

function onPointerMove(pos) {
    state.trail.push({x:pos.x,y:pos.y,life:1});
    if(state.trail.length>15) state.trail.shift();
    if(!state.running||state.gameOver) return;
    for(const orb of state.orbs){
        if(orb.collected) continue;
        const dx=pos.x-orb.x, dy=pos.y-orb.y;
        if(Math.sqrt(dx*dx+dy*dy)<orb.size+12){collectOrb(orb);break;}
    }
}

// ===== Events =====
function bindEvents() {
    canvas.addEventListener('mousedown',e=>onPointerDown(getPos(e)));
    canvas.addEventListener('mousemove',e=>onPointerMove(getPos(e)));
    canvas.addEventListener('touchstart',e=>{if(e.target.closest('button,a,input'))return;e.preventDefault();onPointerDown(getPos(e));},{passive:false});
    canvas.addEventListener('touchmove',e=>{e.preventDefault();onPointerMove(getPos(e));},{passive:false});
    canvas.addEventListener('touchend',e=>{e.preventDefault();},{passive:false});
    dom.startBtn.addEventListener('click',startGame);
    dom.restartBtn.addEventListener('click',startGame);
    dom.muteBtn?.addEventListener('click',()=>{state.muted=!state.muted;localStorage.setItem('mc_muted',state.muted?'1':'0');dom.muteBtn.textContent=state.muted?'🔇':'🔊';});
    if(state.muted) dom.muteBtn.textContent='🔇';
    function resize(){const mw=Math.min(W,window.innerWidth-20),s=mw/W;canvas.style.width=mw+'px';canvas.style.height=(H*s)+'px';}
    window.addEventListener('resize',resize); resize();
}

// ===== Game Loop =====
function gameLoop() {
    if(state.running&&!state.gameOver){
        state.spawnTimer++;
        if(state.spawnTimer>=state.orbInterval&&state.orbs.filter(o=>!o.collected).length<5){spawnOrb();state.spawnTimer=0;}
        let missed=false;
        state.orbs.forEach(orb=>{if(!orb.collected){orb.life--;if(orb.life<=0){orb.collected=true;missed=true;}}});
        if(missed) missOrb();
        const tc=state.orbs.filter(o=>o.collected).length;
        if(tc>0&&tc%10===0){const nw=Math.floor(tc/10)+1;if(nw>state.wave){state.wave=nw;state.orbInterval=Math.max(20,55-state.wave*3);state.orbLifetime=Math.max(80,160-state.wave*6);sndWave();updateHUD();}}
    }
    for(let i=state.trail.length-1;i>=0;i--){state.trail[i].life-=0.06;if(state.trail[i].life<=0)state.trail.splice(i,1);}
    render();
    requestAnimationFrame(gameLoop);
}

// ===== Init =====
function init() {
    ctx.fillStyle='#0f0f2a'; ctx.fillRect(0,0,W,H);
    initStars(); bindEvents(); updateHUD(); gameLoop();
    if(typeof renderLeaderboard==='function') renderLeaderboard('magic-canvas','lb-mc-content','Magic Canvas');
    document.getElementById('mc-share-btn')?.addEventListener('click',()=>{const s=state.highScore||0;if(typeof shareScore==='function') shareScore('Magic Canvas',s,'https://hritihub.uk/games/magic-canvas/');});
}
init();
