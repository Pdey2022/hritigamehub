/* ============================================
   NINJA JUMP — Full Game Engine
   ============================================ */

const canvas = document.getElementById('nj-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 550;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

const dom = {
    score: document.getElementById('nj-score'),
    scoreB: document.getElementById('nj-score-bottom'),
    height: document.getElementById('nj-height'),
    heightB: document.getElementById('nj-height-bottom'),
    best: document.getElementById('nj-best'),
    stars: document.getElementById('nj-stars'),
    wrapper: document.getElementById('nj-canvas-wrapper'),
    startOverlay: document.getElementById('nj-start-overlay'),
    gameoverOverlay: document.getElementById('nj-gameover-overlay'),
    gameoverStats: document.getElementById('nj-gameover-stats'),
    startBtn: document.getElementById('nj-start-btn'),
    restartBtn: document.getElementById('nj-restart-btn'),
    resetBtn: document.getElementById('nj-reset-btn')
};

// ===== STATE =====
const state = {
    running: false,
    score: 0, height: 0, bestHeight: 0, stars: 0,
    scrollY: 0, // camera scroll
    platforms: [],
    stars: [],
    obstacles: [],
    particles: [],
    floatingTexts: [],
    animFrame: null,
    jumpPower: 0,
    isCharging: false,
    scrollSpeed: 1.5,
    highScore: parseInt(localStorage.getItem('nj_high')) || 0,
    highHeight: parseInt(localStorage.getItem('nj_height')) || 0
};

// ===== NINJA =====
const ninja = { x: 230, y: 400, w: 30, h: 36, vy: 0, vx: 0, onGround: false, dir: 1 };

// ===== THEMES =====
const THEMES = [
    { bg: ['#1a0a2e','#2d1b4e','#4a2c6e'], plat: '#8B4513', platEdge: '#5d3a1a', name: 'Dojo' },
    { bg: ['#0a2e1a','#1b4e2d','#2c6e4a'], plat: '#2ecc71', platEdge: '#1a7a42', name: 'Bamboo' },
    { bg: ['#0c1a2e','#1a2a4a','#2a3a5a'], plat: '#7f8c8d', platEdge: '#5a6a6b', name: 'Rooftops' }
];

function getTheme(height) {
    if (height < 200) return THEMES[0];
    if (height < 500) return THEMES[1];
    return THEMES[2];
}

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('nj_muted') === 'true';
function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function toggleMute() {
    isMuted = !isMuted; localStorage.setItem('nj_muted', isMuted);
    document.getElementById('nj-mute-btn').textContent = isMuted ? '🔇' : '🔊';
}
function playJump() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(400, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.12);
    } catch (e) {}
}
function playCollect() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(880, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(1320, c.currentTime + 0.08);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.1);
    } catch (e) {}
}
function playFall() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(300, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.4);
        g.gain.setValueAtTime(0.12, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.4);
    } catch (e) {}
}

// ===== PLATFORMS =====
function generatePlatform(y) {
    const w = 50 + Math.random() * 70;
    const x = 10 + Math.random() * (W - w - 20);
    const isMoving = Math.random() < 0.15 + state.height * 0.0002;
    const isFragile = Math.random() < 0.1 + state.height * 0.0003;
    return { x, y, w, h: 12, isMoving, isFragile, broken: false,
        vx: isMoving ? (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random()) : 0 };
}

function initPlatforms() {
    state.platforms = [];
    for (let y = H - 40; y > -200; y -= 50 + Math.random() * 60) {
        state.platforms.push(generatePlatform(y));
    }
}

// ===== STARS =====
function spawnStars() {
    state.platforms.forEach(p => {
        if (Math.random() < 0.3 && !state.stars.find(s => Math.abs(s.y - p.y) < 20)) {
            state.stars.push({ x: p.x + p.w / 2, y: p.y - 20, r: 8, collected: false });
        }
    });
}

// ===== UPDATE =====
function update() {
    const gravity = 0.5;
    const speedMul = 1 + state.height * 0.0005;
    state.scrollSpeed = 1.5 * speedMul;

    // Ninja physics
    ninja.vy += gravity;
    ninja.x += ninja.vx;
    ninja.vx *= 0.95;
    ninja.y += ninja.vy;
    ninja.onGround = false;

    // Wall bounce
    if (ninja.x < 0) { ninja.x = 0; ninja.vx = 2; }
    if (ninja.x + ninja.w > W) { ninja.x = W - ninja.w; ninja.vx = -2; }

    // Platform collision
    for (const p of state.platforms) {
        if (p.broken) continue;
        if (ninja.vy > 0 &&
            ninja.x + ninja.w > p.x && ninja.x < p.x + p.w &&
            ninja.y + ninja.h > p.y && ninja.y + ninja.h < p.y + p.h + 10) {
            ninja.y = p.y - ninja.h;
            ninja.vy = 0;
            ninja.onGround = true;
            if (p.isFragile) { setTimeout(() => p.broken = true, 200); }
        }
    }

    // Move platforms
    for (const p of state.platforms) {
        if (p.isMoving) {
            p.x += p.vx * speedMul;
            if (p.x < 0 || p.x + p.w > W) p.vx *= -1;
        }
    }

    // Scroll up when ninja climbs
    if (ninja.y < H * 0.4 && ninja.vy < 0) {
        const diff = H * 0.4 - ninja.y;
        ninja.y = H * 0.4;
        state.scrollY += diff;
        state.height = Math.floor(state.scrollY / 10);
        // Scroll platforms
        for (const p of state.platforms) p.y += diff;
        for (const s of state.stars) s.y += diff;
        for (const o of state.obstacles) o.y += diff;
        // Generate new platforms at top
        while (state.platforms[state.platforms.length - 1]?.y > -100) {
            state.platforms.push(generatePlatform(
                state.platforms[state.platforms.length - 1].y - 50 - Math.random() * 60));
        }
        // Remove off-screen
        state.platforms = state.platforms.filter(p => p.y < H + 50);
        state.stars = state.stars.filter(s => s.y < H + 50 && !s.collected);
        // Score
        state.score += Math.floor(diff) * 2;
    }

    // Fall check
    if (ninja.y > H + 50) { gameOver(); return; }

    // Collect stars
    for (const s of state.stars) {
        if (s.collected) continue;
        if (Math.abs(ninja.x + ninja.w/2 - s.x) < 20 && Math.abs(ninja.y + ninja.h/2 - s.y) < 20) {
            s.collected = true;
            state.stars++;
            state.score += 50;
            playCollect();
            spawnParticles(s.x, s.y, '#ffd700', 8);
            addFloatingText(s.x, s.y, '+50', '#ffd700');
        }
    }

    // Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.025;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const t = state.floatingTexts[i];
        t.y += t.vy; t.life -= 0.02;
        if (t.life <= 0) state.floatingTexts.splice(i, 1);
    }

    updateHUD();
}

// ===== JUMP =====
function startJump(dir) {
    if (!state.running || !ninja.onGround) return;
    ninja.vy = -10;
    ninja.vx = dir * 4;
    ninja.dir = dir;
    ninja.onGround = false;
    playJump();
    spawnParticles(ninja.x + ninja.w/2, ninja.y + ninja.h, 'rgba(200,200,200,0.5)', 5);
}

// ===== RENDER =====
function render() {
    ctx.clearRect(0, 0, W, H);

    const theme = getTheme(state.height);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, theme.bg[0]);
    bg.addColorStop(0.5, theme.bg[1]);
    bg.addColorStop(1, theme.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Background stars/dots
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 30; i++) {
        const sx = (i * 37 + state.scrollY * 0.02) % W;
        const sy = (i * 53 + state.scrollY * 0.05) % H;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + i % 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
    ctx.restore();

    // Platforms
    for (const p of state.platforms) {
        if (p.broken) continue;
        ctx.fillStyle = p.isFragile ? '#e74c3c' : theme.plat;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = p.isFragile ? '#c0392b' : theme.platEdge;
        ctx.fillRect(p.x, p.y, p.w, 3);
        if (p.isMoving) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(p.x + p.w/2 - 6, p.y - 4, 12, 3);
        }
        if (p.isFragile) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(p.x + 2, p.y + 4, p.w - 4, 2);
        }
    }

    // Stars
    for (const s of state.stars) {
        if (s.collected) continue;
        ctx.save();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', s.x, s.y + Math.sin(Date.now()/300 + s.x) * 2);
        ctx.restore();
    }

    // Ninja
    drawNinja();

    // Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Floating texts
    state.floatingTexts.forEach(t => {
        ctx.globalAlpha = t.life;
        ctx.font = 'bold 20px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = t.color;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 5;
        ctx.fillText(t.text, t.x, t.y);
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // Theme name
    ctx.font = '12px Fredoka, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText(theme.name, W - 10, 22);
}

function drawNinja() {
    const nx = ninja.x, ny = ninja.y;
    ctx.save();

    // Body
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(nx + 4, ny + 8, 22, 20);

    // Head
    ctx.fillStyle = '#f5cba7';
    ctx.beginPath();
    ctx.arc(nx + 15, ny + 6, 11, 0, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(nx + 5, ny + 1, 20, 5);
    // Headband tails
    ctx.fillRect(nx + 20, ny + 3, 10 + ninja.dir * 4, 3);

    // Eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(nx + 10, ny + 4, 3, 3);
    ctx.fillRect(nx + 17, ny + 4, 3, 3);

    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(nx + 6, ny + 26, 8, 10);
    ctx.fillRect(nx + 16, ny + 26, 8, 10);

    // Scarf
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(nx + 3, ny + 14, 24, 4);

    ctx.restore();
}

// ===== HUD =====
function updateHUD() {
    dom.score.textContent = state.score;
    dom.scoreB.textContent = state.score;
    const h = Math.max(0, state.height);
    dom.height.textContent = h;
    dom.heightB.textContent = h;
    dom.stars.textContent = state.stars;
    dom.best.textContent = Math.max(state.highHeight, state.height);
}

// ===== PARTICLES =====
function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
    }
}
function addFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -2 });
}

// ===== GAME OVER =====
function gameOver() {
    state.running = false;
    playFall();
    if (state.height > state.highHeight) {
        state.highHeight = state.height;
        localStorage.setItem('nj_height', state.height);
    }
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('nj_high', state.score);
    }
    dom.gameoverStats.textContent = `Height: ${state.height}m | Score: ${state.score} | Best: ${state.highHeight}m`;
    dom.gameoverOverlay.classList.remove('hidden');
}

// ===== GAME LOOP =====
function gameLoop() {
    if (!state.running) { state.animFrame = null; return; }
    update();
    render();
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== START =====
function startGame() {
    state.score = 0; state.height = 0; state.stars = 0;
    state.scrollY = 0; state.scrollSpeed = 1.5;
    state.platforms = []; state.particles = [];
    state.floatingTexts = []; state.obstacles = [];
    ninja.x = 230; ninja.y = 400; ninja.vy = 0; ninja.vx = 0; ninja.onGround = false;
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    initPlatforms();
    spawnStars();
    updateHUD();
    state.running = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop();
}

// ===== INIT =====
function init() {
    canvas.addEventListener('click', (e) => {
        if (!state.running) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        startJump(mx < W / 2 ? -1 : 1);
    });
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!state.running) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.touches[0].clientX - rect.left;
        startJump(mx < W / 2 ? -1 : 1);
    });

    dom.startBtn.addEventListener('click', startGame);
    dom.restartBtn.addEventListener('click', startGame);
    document.getElementById('nj-mute-btn').addEventListener('click', toggleMute);
    if (isMuted) document.getElementById('nj-mute-btn').textContent = '🔇';

    dom.resetBtn.addEventListener('click', () => {
        if (confirm('🔄 Reset all progress? This cannot be undone!')) {
            state.running = false;
            localStorage.removeItem('nj_high');
            localStorage.removeItem('nj_height');
            state.highScore = 0; state.highHeight = 0;
            startGame();
        }
    });

    drawStartScreen();
}

function drawStartScreen() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0a2e');
    bg.addColorStop(1, '#4a2c6e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // Decorative platforms
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(30 + i * 90, 80 + i * 90, 60, 12);
        ctx.fillStyle = '#5d3a1a';
        ctx.fillRect(30 + i * 90, 80 + i * 90, 60, 3);
    }
    // Best height
    if (state.highHeight > 0) {
        ctx.font = '18px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`🏆 Best: ${state.highHeight}m`, W / 2, H - 40);
    }
}

document.addEventListener('DOMContentLoaded', init);
