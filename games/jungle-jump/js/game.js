/* ============================================
   JUNGLE JUMP — Full Game Engine
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('jj-canvas');
const ctx = canvas.getContext('2d');
const W = 400, H = 600;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ----- DOM Refs -----
const dom = {
    score:     document.getElementById('jj-score'),
    highScore: document.getElementById('jj-high'),
    wrapper:   document.getElementById('jj-canvas-wrapper'),
    startOverlay:    document.getElementById('jj-start-overlay'),
    gameoverOverlay: document.getElementById('jj-gameover-overlay'),
    gameoverStats:   document.getElementById('jj-gameover-stats'),
    startBtn:  document.getElementById('jj-start-btn'),
    restartBtn:document.getElementById('jj-restart-btn'),
    muteBtn:   document.getElementById('jj-mute-btn'),
    resetBtn:  document.getElementById('jj-reset-btn')
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('jj_muted') === 'true';
if (dom.muteBtn) dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTone(f, d, t, v) {
    if (isMuted) return;
    try {
        const a = getAudioCtx();
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

function playJump()  { playTone(520, 0.1, 'sine', 0.07); playTone(680, 0.08, 'sine', 0.05); }
function playDie()   { playTone(300, 0.15, 'sawtooth', 0.06); playTone(200, 0.25, 'sawtooth', 0.05); }
function playCoin()  { playTone(880, 0.06, 'sine', 0.06); playTone(1100, 0.05, 'sine', 0.04); }

// ===== GAME STATE =====
const state = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('jj_high')) || 0,
    gameOver: false,
    player: { x: 200, y: 300, vy: 0, w: 18, h: 18 },
    platforms: [],
    scrollY: 0,
    baseY: 0,
    coins: [],
    animFrame: null,
    lastTime: 0,
    left: false,
    right: false
};

// ===== PLATFORMS =====
const PLAT_W = 60, PLAT_H = 10;

function spawnInitialPlatforms() {
    state.platforms = [];
    // Ground
    state.platforms.push({ x: 0, y: H - 20, w: W, h: 20, type: 'ground' });
    // Starting platform
    state.platforms.push({ x: 160, y: H - 80, w: PLAT_W, h: PLAT_H, type: 'normal' });
    // Generate upward
    let y = H - 160;
    while (y > -200) {
        addPlatformRow(y);
        y -= 60 + Math.random() * 40;
    }
}

function addPlatformRow(y) {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
        const x = 20 + Math.random() * (W - PLAT_W - 40) + i * 70;
        if (x + PLAT_W > W) continue;
        // Check overlap with existing platforms at this y level
        const overlap = state.platforms.some(p => Math.abs(p.y - y) < 20 && Math.abs(p.x - x) < PLAT_W + 10);
        if (!overlap) {
            const type = Math.random() < 0.15 ? 'coin' : 'normal';
            state.platforms.push({ x, y, w: PLAT_W, h: PLAT_H, type });
        }
    }
}

function spawnCoins() {
    state.coins = [];
    state.platforms.forEach(p => {
        if (p.type === 'coin') {
            state.coins.push({ x: p.x + PLAT_W / 2 - 6, y: p.y - 18, w: 12, h: 12, collected: false });
        }
    });
}

// ===== GAME LOOP =====
function gameLoop(timestamp) {
    if (!state.running) return;
    if (!state.lastTime) state.lastTime = timestamp;
    const dt = Math.min(timestamp - state.lastTime, 33);
    state.lastTime = timestamp;

    const p = state.player;

    // Gravity
    p.vy += 0.5 * (dt / 16);
    if (p.vy > 12) p.vy = 12;

    // Horizontal movement
    if (state.left) p.x -= 4 * (dt / 16);
    if (state.right) p.x += 4 * (dt / 16);
    if (p.x < 0) p.x = W - p.w;
    if (p.x > W - p.w) p.x = 0;

    // Vertical
    p.y += p.vy * (dt / 16);

    // Platform collision
    if (p.vy > 0) {
        for (const pl of state.platforms) {
            if (p.y + p.h > pl.y && p.y + p.h < pl.y + pl.h + p.vy &&
                p.x + p.w > pl.x && p.x < pl.x + pl.w) {
                if (pl.type !== 'ground') {
                    p.y = pl.y - p.h;
                    p.vy = -9;
                    playJump();
                    state.score++;
                    dom.score.textContent = state.score;
                    if (state.score > state.highScore) {
                        state.highScore = state.score;
                        localStorage.setItem('jj_high', state.highScore);
                        dom.highScore.textContent = '🏆 ' + state.highScore;
                    }
                } else {
                    // Hit ground = game over
                    gameOver();
                    return;
                }
            }
        }
    }

    // Coin collection
    for (const c of state.coins) {
        if (!c.collected && p.x + p.w > c.x && p.x < c.x + c.w &&
            p.y + p.h > c.y && p.y < c.y + c.h) {
            c.collected = true;
            state.score += 3;
            playCoin();
            dom.score.textContent = state.score;
            if (state.score > state.highScore) {
                state.highScore = state.score;
                localStorage.setItem('jj_high', state.highScore);
                dom.highScore.textContent = '🏆 ' + state.highScore;
            }
        }
    }

    // Scroll up when player reaches upper half
    if (p.y < H * 0.4) {
        const diff = H * 0.4 - p.y;
        p.y = H * 0.4;
        state.scrollY += diff;
        // Remove off-screen platforms, add new ones above
        state.platforms = state.platforms.filter(pl => pl.y + pl.h + state.scrollY > -100);
        const highestY = Math.min(...state.platforms.map(pl => pl.y));
        while (highestY + state.scrollY < 200) {
            state.scrollY -= 80;
            // Actually let's just check the highest
        }
        // Add platforms above
        const topMost = Math.min(...state.platforms.map(p => p.y));
        while (topMost > -state.scrollY - 200) {
            // platforms below viewport are removed, add above
        }
    }

    // Fall off screen
    if (p.y > H + 50) {
        gameOver();
        return;
    }

    // Ensure platforms ahead exist
    const minPlatY = Math.min(...state.platforms.map(p => p.y));
    while (minPlatY > state.scrollY - H) {
        const newY = minPlatY - 60 - Math.random() * 40;
        addPlatformRow(newY);
    }

    // Clean up platforms far below
    state.platforms = state.platforms.filter(pl => pl.y < state.scrollY + H + 100);
    state.coins = state.coins.filter(c => !c.collected);

    draw();
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== DRAW =====
function draw() {
    ctx.clearRect(0, 0, W, H);

    // Sky gradient (jungle canopy)
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.3, '#4ade80');
    grad.addColorStop(0.7, '#166534');
    grad.addColorStop(1, '#0a2e0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative vines
    ctx.strokeStyle = 'rgba(34, 120, 34, 0.3)';
    ctx.lineWidth = 2;
    for (let v = 0; v < 3; v++) {
        const vx = 30 + v * 150;
        ctx.beginPath();
        ctx.moveTo(vx, 0);
        for (let y = 0; y < H; y += 20) {
            ctx.lineTo(vx + Math.sin(y * 0.03 + v) * 8, y);
        }
        ctx.stroke();
    }

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let c = 0; c < 3; c++) {
        const cx = 40 + c * 130 + Math.sin(Date.now() * 0.0003 + c * 2) * 15;
        const cy = 20 + c * 25;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 15, cy - 5, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Platforms
    for (const pl of state.platforms) {
        const drawY = pl.y + state.scrollY;
        if (drawY < -20 || drawY > H + 20) continue;

        if (pl.type === 'ground') {
            // Ground with grass
            ctx.fillStyle = '#4a7c3f';
            ctx.fillRect(pl.x, drawY, pl.w, pl.h);
            ctx.fillStyle = '#5a9c4f';
            ctx.fillRect(pl.x, drawY, pl.w, 4);
            // Grass blades
            ctx.strokeStyle = '#6abf5f';
            ctx.lineWidth = 1.5;
            for (let g = 0; g < pl.w; g += 8) {
                ctx.beginPath();
                ctx.moveTo(pl.x + g, drawY);
                ctx.lineTo(pl.x + g + 2, drawY - 4 - Math.sin(g) * 2);
                ctx.stroke();
            }
        } else {
            // Wooden platform
            ctx.fillStyle = '#8B5E3C';
            ctx.fillRect(pl.x, drawY, pl.w, pl.h);
            // Wood grain
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            for (let g = 0; g < pl.w; g += 12) {
                ctx.beginPath();
                ctx.moveTo(pl.x + g, drawY);
                ctx.lineTo(pl.x + g, drawY + pl.h);
                ctx.stroke();
            }
            // Vines hanging from platform
            if (Math.random() < 0.3) {
                ctx.strokeStyle = 'rgba(34, 150, 34, 0.2)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const vx = pl.x + Math.random() * pl.w;
                ctx.moveTo(vx, drawY);
                ctx.quadraticCurveTo(vx + Math.sin(Date.now() * 0.001) * 3, drawY + 15, vx + 2, drawY + 25);
                ctx.stroke();
            }
        }
    }

    // Coins
    for (const c of state.coins) {
        const drawY = c.y + state.scrollY;
        if (drawY < -10 || drawY > H + 10) continue;
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.15;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(c.x + 6, drawY + 6, 7 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff8dc';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', c.x + 6, drawY + 7);
    }

    // Player (little monkey/jumper)
    const px = state.player.x;
    const py = state.player.y + state.scrollY;
    // Body
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(px + 2, py + 6, 14, 10);
    // Head
    ctx.fillStyle = '#D2A679';
    ctx.beginPath();
    ctx.arc(px + 9, py + 4, 8, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(px + 6, py + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 12, py + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(px + 6, py + 3, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 12, py + 3, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Hat (leaf)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(px + 9, py - 2, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(px + 4, py + 16, 4, 3);
    ctx.fillRect(px + 10, py + 16, 4, 3);
}

// ===== GAME OVER =====
function gameOver() {
    state.running = false;
    state.gameOver = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    playDie();

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('jj_high', state.highScore);
        dom.highScore.textContent = '🏆 ' + state.highScore;
    }

    dom.gameoverStats.innerHTML = 'Height: ' + state.score + ' 🌴';
    dom.gameoverOverlay.classList.remove('hidden');

    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('jungle-jump', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('jungle-jump', 'lb-jj-content', 'Jungle Jump');
    }
}

// ===== RESET =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.scrollY = 0;
    state.player = { x: 200, y: 300, vy: 0, w: 18, h: 18 };
    state.coins = [];
    state.lastTime = 0;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    dom.score.textContent = '0';
    dom.gameoverOverlay.classList.add('hidden');
    dom.startOverlay.classList.remove('hidden');
    spawnInitialPlatforms();
    spawnCoins();
    draw();
}

// ===== START =====
function startGame() {
    if (state.running) return;
    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.scrollY = 0;
    state.player = { x: 200, y: 300, vy: 0, w: 18, h: 18 };
    state.coins = [];
    state.lastTime = 0;
    state.left = false;
    state.right = false;
    dom.score.textContent = '0';
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    spawnInitialPlatforms();
    spawnCoins();
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    state.animFrame = requestAnimationFrame(gameLoop);
    draw();
}

// ===== CONTROLS =====
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowLeft':  case 'a': case 'A': state.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': state.right = true; e.preventDefault(); break;
    }
});
document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowLeft':  case 'a': case 'A': state.left = false; e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': state.right = false; e.preventDefault(); break;
    }
});

// Touch controls
let touchX = null;
canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchX = t.clientX;
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (touchX === null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchX;
    if (dx > 5) { state.right = true; state.left = false; }
    else if (dx < -5) { state.left = true; state.right = false; }
    else { state.left = false; state.right = false; }
    touchX = t.clientX;
}, { passive: false });
canvas.addEventListener('touchend', () => {
    touchX = null;
    state.left = false;
    state.right = false;
}, { passive: true });

// ----- Mute -----
if (dom.muteBtn) {
    dom.muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('jj_muted', isMuted);
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
spawnInitialPlatforms();
spawnCoins();
draw();
dom.highScore.textContent = '🏆 ' + state.highScore;

dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.resetBtn.addEventListener('click', resetGame);
dom.startBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });
dom.restartBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });

if (typeof renderLeaderboard === 'function') {
    renderLeaderboard('jungle-jump', 'lb-jj-content', 'Jungle Jump');
}
