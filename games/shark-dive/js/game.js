/* ============================================
   SHARK DIVE — Full Game Engine
   ============================================ */

const canvas = document.getElementById('sd-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 500;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

const dom = {
    score:     document.getElementById('sd-score'),
    timer:     document.getElementById('sd-timer'),
    wrapper:   document.getElementById('sd-canvas-wrapper'),
    startOverlay:    document.getElementById('sd-start-overlay'),
    gameoverOverlay: document.getElementById('sd-gameover-overlay'),
    gameoverStats:   document.getElementById('sd-gameover-stats'),
    startBtn:  document.getElementById('sd-start-btn'),
    restartBtn:document.getElementById('sd-restart-btn'),
    muteBtn:   document.getElementById('sd-mute-btn'),
    resetBtn:  document.getElementById('sd-reset-btn')
};

// ===== SHARK TYPES =====
const SHARKS = [
    { id: 'great-white', name: 'Great White', emoji: '🦈', color: '#8899aa', points: 20, size: 36, weight: 30 },
    { id: 'hammerhead',  name: 'Hammerhead',  emoji: '🔨', color: '#aabbcc', points: 25, size: 34, weight: 20 },
    { id: 'tiger',       name: 'Tiger Shark', emoji: '🐅', color: '#99aabb', points: 25, size: 32, weight: 18 },
    { id: 'whale-shark', name: 'Whale Shark', emoji: '🐋', color: '#8899cc', points: 30, size: 42, weight: 8 },
    { id: 'mako',        name: 'Mako',        emoji: '⚡', color: '#7788aa', points: 30, size: 28, weight: 12 },
    { id: 'nurse',       name: 'Nurse Shark', emoji: '🩺', color: '#99aab8', points: 20, size: 30, weight: 15 },
    { id: 'thresher',    name: 'Thresher',    emoji: '🎯', color: '#88aacc', points: 35, size: 34, weight: 5 },
    { id: 'goblin',      name: 'Goblin Shark',emoji: '👹', color: '#bb99aa', points: 40, size: 32, weight: 3 },
];

let audioCtx = null;
let isMuted = localStorage.getItem('sd_muted') === 'true';
if (dom.muteBtn) dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';

function playTone(f, d, t, v) {
    if (isMuted) return;
    try {
        const a = audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)());
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = t || 'sine';
        o.frequency.setValueAtTime(f, a.currentTime);
        g.gain.setValueAtTime(v || 0.06, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d);
        o.connect(g); g.connect(a.destination);
        o.start(); o.stop(a.currentTime + d);
    } catch(e) {}
}
function playTap()   { playTone(440, 0.08, 'sine', 0.06); playTone(660, 0.06, 'sine', 0.04); }
function playRare()  { playTone(550, 0.1, 'sine', 0.06); playTone(880, 0.1, 'sine', 0.05); }
function playEnd()   { playTone(300, 0.2, 'sawtooth', 0.06); playTone(200, 0.3, 'sawtooth', 0.05); }

function pickShark() {
    const total = SHARKS.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * total;
    for (const s of SHARKS) { r -= s.weight; if (r <= 0) return { ...s }; }
    return { ...SHARKS[0] };
}

const state = {
    running: false, score: 0,
    highScore: parseInt(localStorage.getItem('sd_high')) || 0,
    gameOver: false, timeLeft: 45,
    sharks: [], discovered: JSON.parse(localStorage.getItem('sd_discovered') || '[]'),
    spawnTimer: 0, comboTimer: 0, combo: 0,
    animFrame: null, lastTime: 0, timerTick: 0, maxSharks: 3
};

function createShark() {
    const type = pickShark();
    return { ...type, x: W + 40, y: 40 + Math.random() * (H - 120), vy: (Math.random() - 0.5) * 0.3, bob: 0 };
}

function gameLoop(timestamp) {
    if (!state.running) return;
    if (!state.lastTime) state.lastTime = timestamp;
    const dt = Math.min(timestamp - state.lastTime, 33);
    state.lastTime = timestamp;

    state.timerTick += dt;
    if (state.timerTick >= 1000) { state.timerTick -= 1000; state.timeLeft--; dom.timer.textContent = state.timeLeft + 's'; if (state.timeLeft <= 0) { gameOver(); return; } }

    state.spawnTimer += dt;
    const rate = Math.max(60, 140 - state.score * 0.4);
    if (state.sharks.length < state.maxSharks && state.spawnTimer >= rate) {
        state.spawnTimer -= rate;
        state.sharks.push(createShark());
    }

    if (state.combo > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }

    for (let i = state.sharks.length - 1; i >= 0; i--) {
        const s = state.sharks[i];
        s.x -= 0.6 * (dt / 16);
        s.bob += 0.02;
        s.y += Math.sin(s.bob) * 0.2 + s.vy;
        if (s.x < -50) state.sharks.splice(i, 1);
    }

    draw();
    state.animFrame = requestAnimationFrame(gameLoop);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#002244');
    grad.addColorStop(0.4, '#001a33');
    grad.addColorStop(1, '#000d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Light rays
    const t = Date.now() / 3000;
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.02)';
        const lx = 80 + i * 110 + Math.sin(t + i) * 15;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx - 10, H);
        ctx.lineTo(lx + 10, H);
        ctx.closePath();
        ctx.fill();
    }

    // Bubbles
    const bt = Date.now() / 2000;
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.beginPath();
        ctx.arc(50 + i * 80 + Math.sin(bt + i) * 5, H - 20 - i * 60, 2 + Math.sin(bt + i) * 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Sharks
    for (const s of state.sharks) {
        const r = s.size;
        // Body
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, r * 1.1, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.beginPath();
        ctx.moveTo(s.x - r * 1.1, s.y);
        ctx.lineTo(s.x - r * 1.5, s.y - r * 0.35);
        ctx.lineTo(s.x - r * 1.5, s.y + r * 0.35);
        ctx.closePath();
        ctx.fill();
        // Dorsal fin
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(s.x - r * 0.1, s.y - r * 0.4);
        ctx.lineTo(s.x + r * 0.2, s.y - r * 0.7);
        ctx.lineTo(s.x + r * 0.5, s.y - r * 0.4);
        ctx.closePath();
        ctx.fill();
        // Emoji
        ctx.font = (r * 0.6) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, s.x, s.y);
    }

    // Combo
    if (state.combo > 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(8, 6, 70, 18);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔥 x' + state.combo, 14, 15);
    }
}

function spawnParticles(x, y, color, n) {
    // visual only - skip for brevity
}

function handleClick(cx, cy) {
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (cx - rect.left) * W / rect.width;
    const my = (cy - rect.top) * H / rect.height;

    for (let i = state.sharks.length - 1; i >= 0; i--) {
        const s = state.sharks[i];
        if (mx > s.x - s.size && mx < s.x + s.size && my > s.y - s.size * 0.5 && my < s.y + s.size * 0.5) {
            state.combo++;
            state.comboTimer = 1500;
            const mult = Math.min(state.combo, 5);
            const bonus = Math.floor(s.points * (mult - 1) * 0.3);
            state.score += s.points + bonus;
            dom.score.textContent = state.score;

            if (!state.discovered.includes(s.id)) {
                state.discovered.push(s.id);
                localStorage.setItem('sd_discovered', JSON.stringify(state.discovered));
                playRare();
            } else playTap();

            if (state.score > state.highScore) {
                state.highScore = state.score;
                localStorage.setItem('sd_high', state.highScore);
            }
            state.sharks.splice(i, 1);
            return;
        }
    }
}

function gameOver() {
    state.running = false; state.gameOver = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    playEnd();
    if (state.score > state.highScore) { state.highScore = state.score; localStorage.setItem('sd_high', state.highScore); }
    dom.gameoverStats.innerHTML = 'Score: ' + state.score + ' 🦈 | Found: ' + state.discovered.length + '/' + SHARKS.length;
    dom.gameoverOverlay.classList.remove('hidden');
    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('shark-dive', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('shark-dive', 'lb-sd-content', 'Shark Dive');
    }
}

function startGame() {
    if (state.running) return;
    state.running = true; state.gameOver = false; state.score = 0;
    state.sharks = []; state.combo = 0; state.comboTimer = 0;
    state.timeLeft = 45; state.timerTick = 0; state.spawnTimer = 0; state.lastTime = 0;
    dom.score.textContent = '0'; dom.timer.textContent = '45s';
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    state.animFrame = requestAnimationFrame(gameLoop);
    draw();
}

function resetGame() {
    state.running = false; state.gameOver = false; state.score = 0;
    state.sharks = []; state.combo = 0; state.lastTime = 0;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    dom.score.textContent = '0'; dom.timer.textContent = '45s';
    dom.gameoverOverlay.classList.add('hidden');
    dom.startOverlay.classList.remove('hidden');
    draw();
}

canvas.addEventListener('click', e => handleClick(e.clientX, e.clientY));
canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; handleClick(t.clientX, t.clientY); }, { passive: false });

if (dom.muteBtn) dom.muteBtn.addEventListener('click', () => { isMuted = !isMuted; localStorage.setItem('sd_muted', isMuted); dom.muteBtn.textContent = isMuted ? '🔇' : '🔊'; });

function handleResize() {
    const maxW = Math.min(W, window.innerWidth - 20);
    canvas.style.width = maxW + 'px';
    canvas.style.height = (H * maxW / W) + 'px';
}
window.addEventListener('resize', handleResize);
handleResize();

draw();
dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.resetBtn.addEventListener('click', resetGame);
dom.startBtn.addEventListener('touchend', e => { e.preventDefault(); startGame(); });
dom.restartBtn.addEventListener('touchend', e => { e.preventDefault(); startGame(); });
if (typeof renderLeaderboard === 'function') renderLeaderboard('shark-dive', 'lb-sd-content', 'Shark Dive');
