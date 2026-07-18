/* ============================================
   DART DASH — Full Game Engine
   ============================================ */

const canvas = document.getElementById('dd-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 550;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

const dom = {
    score: document.getElementById('dd-score'),
    level: document.getElementById('dd-level'),
    lives: document.getElementById('dd-lives'),
    darts: document.getElementById('dd-darts'),
    hits: document.getElementById('dd-hits'),
    accuracy: document.getElementById('dd-accuracy'),
    combo: document.getElementById('dd-combo-display'),
    wrapper: document.getElementById('dd-canvas-wrapper'),
    startOverlay: document.getElementById('dd-start-overlay'),
    levelupOverlay: document.getElementById('dd-levelup-overlay'),
    gameoverOverlay: document.getElementById('dd-gameover-overlay'),
    levelupTitle: document.getElementById('dd-levelup-title'),
    levelupStats: document.getElementById('dd-levelup-stats'),
    gameoverStats: document.getElementById('dd-gameover-stats'),
    startBtn: document.getElementById('dd-start-btn'),
    restartBtn: document.getElementById('dd-restart-btn'),
    nextBtn: document.getElementById('dd-next-btn'),
    resetBtn: document.getElementById('dd-reset-btn')
};

// ===== LEVEL CONFIG =====
function getLevelConfig(level) {
    const d = Math.min(level, 10);
    return {
        darts: 8 + d * 2,
        targetSpeed: 1 + d * 0.25,
        targetRadius: 38 - d * 1.5,
        balloonCount: Math.min(Math.floor(d / 2), 4),
        balloonSpeed: 1 + d * 0.2,
        hitsRequired: 5 + d,
        missLimit: 5
    };
}

// ===== STATE =====
const state = {
    running: false, level: 1, score: 0, lives: 3,
    dartsLeft: 10, hits: 0, misses: 0, totalThrows: 0,
    combo: 0, streak: 0,
    target: null, balloons: [], darts: [],
    particles: [], floatingTexts: [],
    animFrame: null,
    highScore: parseInt(localStorage.getItem('dd_high')) || 0
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('dd_muted') === 'true';
function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('dd_muted', isMuted);
    document.getElementById('dd-mute-btn').textContent = isMuted ? '🔇' : '🔊';
}
function playThrow() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(300, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.12);
    } catch (e) {}
}
function playHit(pitch = 600) {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [pitch, pitch * 1.25].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);
            g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.1);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.06);
            o.stop(ctx.currentTime + i * 0.06 + 0.1);
        });
    } catch (e) {}
}
function playMiss() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(200, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.25);
    } catch (e) {}
}
function playLevelUp() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [523, 659, 784, 1047].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
            g.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.12);
            o.stop(ctx.currentTime + i * 0.12 + 0.25);
        });
    } catch (e) {}
}

// ===== SPAWN TARGET =====
function spawnTarget() {
    const cfg = getLevelConfig(state.level);
    const r = Math.max(20, cfg.targetRadius);
    state.target = {
        x: r + Math.random() * (W - r * 2),
        y: r + 40 + Math.random() * (H - r * 2 - 60),
        vx: (Math.random() > 0.5 ? 1 : -1) * cfg.targetSpeed * (0.5 + Math.random()),
        vy: (Math.random() > 0.5 ? 1 : -1) * cfg.targetSpeed * (0.5 + Math.random()),
        radius: r,
        isGolden: Math.random() < 0.15
    };
}

// ===== SPAWN BALLOON =====
function spawnBalloon() {
    const cfg = getLevelConfig(state.level);
    if (state.balloons.length >= cfg.balloonCount) return;
    const r = 14 + Math.random() * 8;
    const isBomb = Math.random() < 0.15;
    state.balloons.push({
        x: r + Math.random() * (W - r * 2),
        y: H + r,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(1 + Math.random() * cfg.balloonSpeed),
        radius: r,
        isBomb,
        color: isBomb ? '#2c3e50' : ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6'][Math.floor(Math.random() * 5)]
    });
}

// ===== THROW DART =====
function throwDart(mx, my) {
    if (!state.running || state.dartsLeft <= 0 || state.dartFlying) return;
    state.dartsLeft--;
    state.totalThrows++;
    state.dartFlying = true;

    playThrow();

    // Animate dart flight
    const startX = W / 2, startY = H - 20;
    const duration = 200; // ms
    const startTime = Date.now();

    function animateDart() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Ease-out quadratic
        const ease = t * (2 - t);
        const cx = startX + (mx - startX) * ease;
        const cy = startY + (my - startY) * ease;

        // Check what we hit at the end
        if (t >= 1) {
            state.dartFlying = false;
            checkHit(mx, my);
            return;
        }

        // Draw a frame
        ctx.clearRect(0, 0, W, H);
        drawBackground();
        drawTarget();
        drawBalloons();
        // Draw dart
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(my - startY, mx - startX));
        ctx.fillStyle = '#333';
        ctx.fillRect(-8, -1.5, 16, 3);
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(16, -4);
        ctx.lineTo(16, 4);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.restore();
        drawHUD();
        ctx.restore();

        requestAnimationFrame(animateDart);
    }
    animateDart();
}

// ===== CHECK HIT =====
function checkHit(mx, my) {
    let hitSomething = false;

    // Check target
    if (state.target) {
        const dx = mx - state.target.x;
        const dy = my - state.target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < state.target.radius) {
            hitSomething = true;
            const pct = dist / state.target.radius; // 0=center 1=edge
            let ringPts;
            if (pct < 0.2) ringPts = 50;
            else if (pct < 0.5) ringPts = 30;
            else ringPts = 10;
            const multiplier = state.target.isGolden ? 2 : 1;
            const comboMul = 1 + state.combo * 0.15;
            const earned = Math.floor(ringPts * multiplier * comboMul);
            state.score += earned;
            state.hits++;
            state.combo++;
            state.streak++;
            playHit(400 + ringPts * 8);
            spawnParticles(state.target.x, state.target.y,
                state.target.isGolden ? '#ffd700' : '#e74c3c', 15);
            addFloatingText(state.target.x, state.target.y - 20,
                state.combo > 1 ? `🎯 +${earned} 🔥${state.combo}x` : `🎯 +${earned}`,
                state.target.isGolden ? '#ffd700' : '#fff');
            // Respawn target
            spawnTarget();
            checkLevelProgress();
        }
    }

    // Check balloons
    for (let i = state.balloons.length - 1; i >= 0; i--) {
        const b = state.balloons[i];
        const dx = mx - b.x;
        const dy = my - b.y;
        if (dx * dx + dy * dy < b.radius * b.radius) {
            hitSomething = true;
            if (b.isBomb) {
                state.lives--;
                playMiss();
                triggerShake();
                spawnParticles(b.x, b.y, '#2c3e50', 20);
                addFloatingText(b.x, b.y, '💥 Bomb!', '#e74c3c');
                updateLives();
                if (state.lives <= 0) { gameOver(); return; }
            } else {
                const earned = 15 + Math.floor(state.combo * 2);
                state.score += earned;
                state.hits++;
                state.combo++;
                playHit(700);
                spawnParticles(b.x, b.y, b.color, 10);
                addFloatingText(b.x, b.y, `🎈 +${earned}`, '#fff');
            }
            state.balloons.splice(i, 1);
            checkLevelProgress();
            break;
        }
    }

    if (!hitSomething) {
        // Miss
        state.combo = 0;
        state.misses++;
        playMiss();
        triggerShake();
        addFloatingText(mx, my - 10, '💨 Miss!', '#e74c3c');
        if (state.misses >= getLevelConfig(state.level).missLimit) {
            gameOver(); return;
        }
    }

    updateHUD();
    checkDartsEmpty();
}

// ===== LEVEL PROGRESS =====
function checkLevelProgress() {
    if (state.hits >= getLevelConfig(state.level).hitsRequired) {
        levelComplete();
    }
}

function checkDartsEmpty() {
    if (state.dartsLeft <= 0 && state.hits < getLevelConfig(state.level).hitsRequired) {
        gameOver();
    }
}

function levelComplete() {
    state.running = false;
    playLevelUp();
    const acc = state.totalThrows > 0 ? Math.round(state.hits / state.totalThrows * 100) : 0;
    dom.levelupTitle.textContent = `🎉 Level ${state.level} Complete!`;
    dom.levelupStats.textContent = `Score: ${state.score} | Accuracy: ${acc}% | Streak: ${state.streak}`;
    dom.levelupOverlay.classList.remove('hidden');
}

function startNextLevel() {
    dom.levelupOverlay.classList.add('hidden');
    state.level++;
    resetRound();
    state.running = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop();
}

function gameOver() {
    state.running = false;
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('dd_high', state.score);
    }
    dom.gameoverStats.textContent = `Score: ${state.score} | Level: ${state.level} | Best: ${state.highScore}`;
    dom.gameoverOverlay.classList.remove('hidden');
}

// ===== RESET ROUND =====
function resetRound() {
    const cfg = getLevelConfig(state.level);
    state.dartsLeft = cfg.darts;
    state.hits = 0;
    state.misses = 0;
    state.totalThrows = 0;
    state.combo = 0;
    state.balloons = [];
    state.dartFlying = false;
    spawnTarget();
    updateHUD();
    updateLives();
}

// ===== PARTICLES =====
function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 4;
        state.particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, color, radius: 2 + Math.random() * 4 });
    }
}

function addFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -2 });
}

function triggerShake() {
    const el = dom.wrapper;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

// ===== UPDATE =====
function update() {
    // Move target
    if (state.target) {
        state.target.x += state.target.vx;
        state.target.y += state.target.vy;
        if (state.target.x - state.target.radius < 0 || state.target.x + state.target.radius > W) state.target.vx *= -1;
        if (state.target.y - state.target.radius < 40 || state.target.y + state.target.radius > H - 10) state.target.vy *= -1;
    }

    // Spawn balloons
    if (Math.random() < 0.02 && state.balloons.length < getLevelConfig(state.level).balloonCount) {
        spawnBalloon();
    }

    // Move balloons
    for (let i = state.balloons.length - 1; i >= 0; i--) {
        const b = state.balloons[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.x - b.radius < 0 || b.x + b.radius > W) b.vx *= -1;
        if (b.y + b.radius < 0) { state.balloons.splice(i, 1); continue; }
    }

    // Update particles
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
}

// ===== RENDER =====
function drawBackground() {
    // Wooden board background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#3e2723');
    bg.addColorStop(0.3, '#4e342e');
    bg.addColorStop(0.7, '#5d4037');
    bg.addColorStop(1, '#3e2723');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Wood grain lines
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 20; i++) {
        const y = 20 + i * 26 + Math.sin(i * 2) * 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y + Math.sin(i) * 8);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.restore();

    // Dart rail at bottom
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, H - 30, W, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, H - 30, W, 2);
}

function drawTarget() {
    if (!state.target) return;
    const t = state.target;

    ctx.save();

    // Golden glow
    if (t.isGolden) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 25;
    }

    // Outer ring (red)
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.fillStyle = t.isGolden ? '#b8860b' : '#c0392b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Middle ring (white)
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = '#f8f9fa';
    ctx.fill();
    ctx.stroke();

    // Inner ring (red)
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = t.isGolden ? '#ffd700' : '#e74c3c';
    ctx.fill();
    ctx.stroke();

    // Bullseye
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = t.isGolden ? '#fff' : '#ffd700';
    ctx.fill();

    ctx.shadowBlur = 0;

    // Golden star
    if (t.isGolden) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', t.x, t.y - t.radius - 14);
    }

    ctx.restore();
}

function drawBalloons() {
    state.balloons.forEach(b => {
        ctx.save();
        if (b.isBomb) {
            // Dark bomb
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#2c3e50';
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = `${b.radius * 0.8}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', b.x, b.y + 2);
        } else {
            const grad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, 1, b.x, b.y, b.radius);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.3, b.color);
            grad.addColorStop(1, b.color);
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // String
            ctx.beginPath();
            ctx.moveTo(b.x, b.y + b.radius);
            ctx.lineTo(b.x + 3, b.y + b.radius + 10);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    });
}

function drawHUD() {
    // Dart reticle at mouse position would need event tracking — skip for auto-play
    // Lives on canvas
    ctx.save();
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`🎯 ${state.dartsLeft} darts`, 10, H - 28);
    ctx.textAlign = 'right';
    ctx.fillText(`🔥 ${state.streak} streak`, W - 10, H - 28);

    // Miss indicator
    const cfg = getLevelConfig(state.level);
    const missesLeft = cfg.missLimit - state.misses;
    if (missesLeft <= 2) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`⚠️ ${missesLeft} miss${missesLeft > 1 ? 'es' : ''} left!`, W / 2, 10);
    }
    ctx.restore();
}

// ===== HUD =====
function updateHUD() {
    dom.score.textContent = state.score;
    dom.level.textContent = state.level;
    dom.darts.textContent = state.dartsLeft;
    dom.hits.textContent = state.hits;
    const acc = state.totalThrows > 0 ? Math.round(state.hits / state.totalThrows * 100) : 0;
    dom.accuracy.textContent = acc + '%';
    if (state.combo > 1) {
        dom.combo.textContent = `🎯 ${state.combo}x`;
        dom.combo.className = 'dd-combo active';
    } else {
        dom.combo.textContent = '';
        dom.combo.className = 'dd-combo';
    }
}
function updateLives() {
    let h = '';
    for (let i = 0; i < state.lives; i++) h += '❤️';
    for (let i = state.lives; i < 3; i++) h += '🖤';
    dom.lives.textContent = h;
}

// ===== GAME LOOP =====
function gameLoop() {
    if (!state.running && !state.dartFlying) { state.animFrame = null; return; }
    if (!state.dartFlying) update();
    if (!state.dartFlying) {
        ctx.clearRect(0, 0, W, H);
        drawBackground();
        drawTarget();
        drawBalloons();
        state.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
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
        drawHUD();
    }
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== START =====
function startGame() {
    state.level = 1; state.score = 0; state.lives = 3;
    state.streak = 0; state.combo = 0; state.particles = [];
    state.floatingTexts = []; state.dartFlying = false;
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    dom.levelupOverlay.classList.add('hidden');
    updateLives();
    resetRound();
    state.running = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop();
}

// ===== INIT =====
function init() {
    // Click to throw
    function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            mx: (clientX - rect.left) * (W / rect.width),
            my: (clientY - rect.top) * (H / rect.height)
        };
    }

    canvas.addEventListener('click', (e) => {
        const { mx, my } = getCanvasCoords(e.clientX, e.clientY);
        throwDart(mx, my);
    });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        if (e.target.closest('button, a, input')) return;
        e.preventDefault();
        const touch = e.touches[0];
        const { mx, my } = getCanvasCoords(touch.clientX, touch.clientY);
        throwDart(mx, my);
    }, { passive: false });

    // Handle resize for mobile
    function handleResize() {
        const maxWidth = Math.min(W, window.innerWidth - 20);
        const scale = maxWidth / W;
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (H * scale) + 'px';
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    dom.startBtn.addEventListener('click', startGame);
    dom.restartBtn.addEventListener('click', startGame);
    dom.nextBtn.addEventListener('click', startNextLevel);
    document.getElementById('dd-mute-btn').addEventListener('click', toggleMute);
    if (isMuted) document.getElementById('dd-mute-btn').textContent = '🔇';

    dom.resetBtn.addEventListener('click', () => {
        if (confirm('🔄 Reset all progress? This cannot be undone!')) {
            state.running = false;
            localStorage.removeItem('dd_high');
            state.highScore = 0;
            startGame();
        }
    });

    drawStartScreen();
}

function drawStartScreen() {
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, W, H);
    // Decorative dartboard
    for (let i = 0; i < 3; i++) {
        const cx = 100 + i * 150;
        const cy = 150 + i * 80;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#c0392b';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#f8f9fa';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
    }
    if (state.highScore > 0) {
        ctx.font = 'bold 18px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`🏆 Best: ${state.highScore}`, W / 2, H - 60);
    }
}

document.addEventListener('DOMContentLoaded', init);
