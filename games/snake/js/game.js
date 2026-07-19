/* ============================================
   SNAKE — Full Game Engine
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('sk-canvas');
const ctx = canvas.getContext('2d');
const CELL = 20;           // pixels per grid cell
const COLS = 25;
const ROWS = 25;
const W = COLS * CELL;     // 500
const H = ROWS * CELL;     // 500

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ----- DOM Refs -----
const dom = {
    score:       document.getElementById('sk-score'),
    highScore:   document.getElementById('sk-high'),
    wrapper:     document.getElementById('sk-canvas-wrapper'),
    startOverlay:   document.getElementById('sk-start-overlay'),
    gameoverOverlay: document.getElementById('sk-gameover-overlay'),
    gameoverStats:   document.getElementById('sk-gameover-stats'),
    startBtn:    document.getElementById('sk-start-btn'),
    restartBtn:  document.getElementById('sk-restart-btn'),
    muteBtn:     document.getElementById('sk-mute-btn'),
    resetBtn:    document.getElementById('sk-reset-btn')
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('sk_muted') === 'true';
if (dom.muteBtn) dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTone(freq, duration, type, vol) {
    if (isMuted) return;
    try {
        const a = getAudioCtx();
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, a.currentTime);
        g.gain.setValueAtTime(vol || 0.08, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
        o.connect(g);
        g.connect(a.destination);
        o.start();
        o.stop(a.currentTime + duration);
    } catch(e) { /* silent */ }
}

function playEat()  { playTone(600, 0.08, 'square', 0.1); }
function playDie()  { playTone(200, 0.3, 'sawtooth', 0.1); playTone(100, 0.4, 'sawtooth', 0.08); }
function playBoost(){ playTone(800, 0.1, 'sine', 0.06); }

// ===== GAME STATE =====
const state = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('sk_high')) || 0,
    gameOver: false,
    speed: 400,           // ms per tick
    minSpeed: 120,
    tickId: null,
    dir: { dx: 1, dy: 0 },
    nextDir: { dx: 1, dy: 0 },
    snake: [],
    food: null,
    specialFood: null,
    specialTimer: 0,
    growing: 0,
    scoreFeed: null
};

// ===== SNAKE HELPERS =====
function initSnake() {
    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(ROWS / 2);
    state.snake = [
        { x: midX, y: midY },
        { x: midX - 1, y: midY },
        { x: midX - 2, y: midY }
    ];
    state.dir = { dx: 1, dy: 0 };
    state.nextDir = { dx: 1, dy: 0 };
}

function spawnFood() {
    const occupied = new Set(state.snake.map(s => s.x + ',' + s.y));
    if (state.specialFood) occupied.add(state.specialFood.x + ',' + state.specialFood.y);
    const free = [];
    for (let x = 0; x < COLS; x++)
        for (let y = 0; y < ROWS; y++)
            if (!occupied.has(x + ',' + y)) free.push({ x, y });
    if (free.length) state.food = free[Math.floor(Math.random() * free.length)];
    else state.food = null;
}

function spawnSpecialFood() {
    if (state.specialFood) return;
    const occupied = new Set(state.snake.map(s => s.x + ',' + s.y));
    if (state.food) occupied.add(state.food.x + ',' + state.food.y);
    const free = [];
    for (let x = 0; x < COLS; x++)
        for (let y = 0; y < ROWS; y++)
            if (!occupied.has(x + ',' + y)) free.push({ x, y });
    if (free.length) {
        state.specialFood = free[Math.floor(Math.random() * free.length)];
        state.specialTimer = 80; // ticks before it disappears
    }
}

function adjustSpeed() {
    const newSpeed = Math.max(state.minSpeed, 400 - Math.floor(state.score / 10) * 5);
    if (newSpeed !== state.speed) {
        state.speed = newSpeed;
        clearInterval(state.tickId);
        state.tickId = setInterval(tick, state.speed);
    }
}

// ===== GAME TICK =====
function tick() {
    if (!state.running) return;

    // Apply queued direction (no 180° reversal)
    const nd = state.nextDir;
    if (!(nd.dx === -state.dir.dx && nd.dy === -state.dir.dy)) {
        state.dir = { dx: nd.dx, dy: nd.dy };
    }

    // Move head
    const head = state.snake[0];
    const nx = head.x + state.dir.dx;
    const ny = head.y + state.dir.dy;

    // Wall wrapping (classic mode)
    // Actually, let's do wall death — more challenging
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        gameOver();
        return;
    }

    // Self collision
    const hitSelf = state.snake.some(s => s.x === nx && s.y === ny);
    if (hitSelf) {
        gameOver();
        return;
    }

    // Move: add new head
    state.snake.unshift({ x: nx, y: ny });

    // Check food
    let ate = false;
    if (state.food && nx === state.food.x && ny === state.food.y) {
        state.score += 10;
        state.growing += 2;
        ate = true;
        playEat();
        showFeed('+10');
        spawnFood();
        adjustSpeed();
    }

    // Check special food
    if (state.specialFood && nx === state.specialFood.x && ny === state.specialFood.y) {
        state.score += 30;
        state.growing += 4;
        ate = true;
        playBoost();
        showFeed('+30 ⭐');
        state.specialFood = null;
        state.specialTimer = 0;
        adjustSpeed();
    }

    // Update special food timer
    if (state.specialFood) {
        state.specialTimer--;
        if (state.specialTimer <= 0) {
            state.specialFood = null;
        }
    }

    // Remove tail unless growing
    if (state.growing > 0) {
        state.growing--;
    } else {
        state.snake.pop();
    }

    // Occasionally spawn special food
    if (!state.specialFood && state.score > 0 && Math.random() < 0.005) {
        spawnSpecialFood();
    }

    // Update score display
    dom.score.textContent = state.score;
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('sk_high', state.highScore);
        dom.highScore.textContent = '🏆 ' + state.highScore;
    }

    draw();
}

// ===== SCORE FEED =====
function showFeed(text) {
    if (!dom.wrapper) return;
    const el = document.createElement('div');
    el.className = 'sk-feed';
    el.textContent = text;
    el.style.left = '50%';
    el.style.top = '40%';
    el.style.transform = 'translateX(-50%)';
    dom.wrapper.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// ===== DRAW =====
function draw() {
    ctx.clearRect(0, 0, W, H);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, H);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL);
        ctx.lineTo(W, y * CELL);
        ctx.stroke();
    }

    // Snake body
    state.snake.forEach((s, i) => {
        const pad = 1;
        const isHead = i === 0;
        const isTail = i === state.snake.length - 1;

        // Body gradient: head is brighter
        const ratio = 1 - (i / state.snake.length) * 0.6;
        const g = Math.floor(180 * ratio + 40);
        ctx.fillStyle = isHead ? '#4ade80' : `rgb(40, ${g}, 60)`;

        const radius = isHead ? 5 : 3;
        const x = s.x * CELL + pad;
        const y = s.y * CELL + pad;
        const w = CELL - pad * 2;
        const h = CELL - pad * 2;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fill();

        // Eyes on head
        if (isHead) {
            ctx.fillStyle = 'white';
            const eyeSize = 3;
            let ex1, ey1, ex2, ey2;
            if (state.dir.dx === 1) {
                ex1 = x + w - 6; ey1 = y + 4; ex2 = x + w - 6; ey2 = y + h - 4;
            } else if (state.dir.dx === -1) {
                ex1 = x + 6; ey1 = y + 4; ex2 = x + 6; ey2 = y + h - 4;
            } else if (state.dir.dy === -1) {
                ex1 = x + 4; ey1 = y + 6; ex2 = x + w - 4; ey2 = y + 6;
            } else {
                ex1 = x + 4; ey1 = y + h - 6; ex2 = x + w - 4; ey2 = y + h - 6;
            }
            ctx.fillRect(ex1 - 1, ey1 - 1, eyeSize, eyeSize);
            ctx.fillRect(ex2 - 1, ey2 - 1, eyeSize, eyeSize);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex1, ey1, 1.5, 1.5);
            ctx.fillRect(ex2, ey2, 1.5, 1.5);
        }
    });

    // Food
    if (state.food) {
        const fx = state.food.x * CELL + CELL / 2;
        const fy = state.food.y * CELL + CELL / 2;
        const pulse = 7 + Math.sin(Date.now() / 200) * 1.5;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(fx, fy, pulse, 0, Math.PI * 2);
        ctx.fill();
        // Inner shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(fx - 2, fy - 2, pulse * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Special food (golden star)
    if (state.specialFood) {
        const sx = state.specialFood.x * CELL + CELL / 2;
        const sy = state.specialFood.y * CELL + CELL / 2;
        const pulse = 8 + Math.sin(Date.now() / 150) * 2;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
        ctx.fill();
        // Star
        ctx.fillStyle = '#ffd700';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', sx, sy);
    }
}

// ===== GAME OVER =====
function gameOver() {
    state.running = false;
    state.gameOver = true;
    clearInterval(state.tickId);
    playDie();

    // Save high score
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('sk_high', state.highScore);
        dom.highScore.textContent = '🏆 ' + state.highScore;
    }

    dom.gameoverStats.innerHTML = 'Score: ' + state.score + ' 🐍 ' + state.snake.length;
    dom.gameoverOverlay.classList.remove('hidden');

    // Leaderboard
    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('snake', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('snake', 'lb-sk-content', 'Snake');
    }
}

// ===== RESET =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.growing = 0;
    state.speed = 400;
    state.specialFood = null;
    state.specialTimer = 0;
    if (state.tickId) clearInterval(state.tickId);
    dom.score.textContent = '0';
    dom.gameoverOverlay.classList.add('hidden');
    dom.startOverlay.classList.remove('hidden');
    initSnake();
    spawnFood();
    draw();
}

// ===== START =====
function startGame() {
    if (state.running) return;
    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.growing = 0;
    state.specialFood = null;
    state.specialTimer = 0;
    dom.score.textContent = '0';
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    initSnake();
    spawnFood();
    state.speed = 400;
    if (state.tickId) clearInterval(state.tickId);
    state.tickId = setInterval(tick, state.speed);
    draw();
}

// ===== CONTROLS =====
function setDirection(dx, dy) {
    if (state.running || state.gameOver) {
        // Allow queuing direction even during game over (for restart)
    }
    // Prevent 180° reversal
    if (dx === -state.dir.dx && dy === -state.dir.dy) return;
    state.nextDir = { dx, dy };
}

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); setDirection(0, -1); break;
        case 'ArrowDown':  case 's': case 'S': e.preventDefault(); setDirection(0, 1); break;
        case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); setDirection(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); setDirection(1, 0); break;
        case ' ': e.preventDefault(); if (!state.running && state.gameOver) startGame(); break;
    }
});

// ----- Touch/Swipe -----
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    if (!touchStartX) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 15) return; // too short
    if (absDx > absDy) {
        setDirection(dx > 0 ? 1 : -1, 0);
    } else {
        setDirection(0, dy > 0 ? 1 : -1);
    }
    touchStartX = 0; touchStartY = 0;
}, { passive: true });

// ----- Mute Toggle -----
if (dom.muteBtn) {
    dom.muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('sk_muted', isMuted);
        dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });
}

// ===== RESIZE =====
function handleResize() {
    const maxWidth = Math.min(W, window.innerWidth - 20);
    const scale = maxWidth / W;
    canvas.style.width = maxWidth + 'px';
    canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', handleResize);
handleResize();

// ===== INIT =====
initSnake();
spawnFood();
draw();
dom.highScore.textContent = '🏆 ' + state.highScore;

// Button events
dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.resetBtn.addEventListener('click', resetGame);

// Also restart on touch for overlay buttons
dom.startBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });
dom.restartBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });

// Load leaderboard
if (typeof renderLeaderboard === 'function') {
    renderLeaderboard('snake', 'lb-sk-content', 'Snake');
}
