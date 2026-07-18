/* ============================================
   PET RESCUE — Full Game Engine
   ============================================ */

const canvas = document.getElementById('pr-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 550;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

const dom = {
    score: document.getElementById('pr-score'),
    scoreB: document.getElementById('pr-score-bottom'),
    level: document.getElementById('pr-level'),
    best: document.getElementById('pr-best'),
    lives: document.getElementById('pr-lives'),
    combo: document.getElementById('pr-combo'),
    rescued: document.getElementById('pr-rescued'),
    wrapper: document.getElementById('pr-canvas-wrapper'),
    startOverlay: document.getElementById('pr-start-overlay'),
    gameoverOverlay: document.getElementById('pr-gameover-overlay'),
    gameoverStats: document.getElementById('pr-gameover-stats'),
    levelCompleteOverlay: document.getElementById('pr-levelcomplete-overlay'),
    levelCompleteStats: document.getElementById('pr-levelcomplete-stats'),
    wonOverlay: document.getElementById('pr-won-overlay'),
    wonStats: document.getElementById('pr-won-stats'),
    startBtn: document.getElementById('pr-start-btn'),
    restartBtn: document.getElementById('pr-restart-btn'),
    nextLevelBtn: document.getElementById('pr-nextlevel-btn'),
    playAgainBtn: document.getElementById('pr-playagain-btn'),
    resetBtn: document.getElementById('pr-reset-btn')
};

// ===== ANIMAL TYPES =====
const ANIMALS = [
    { emoji: '🐱', name: 'Cat', points: 100, speed: 0.3, size: 1.0, weight: 0.3 },
    { emoji: '🐶', name: 'Dog', points: 150, speed: 0.5, size: 1.1, weight: 0.25 },
    { emoji: '🐰', name: 'Rabbit', points: 200, speed: 0.8, size: 0.8, weight: 0.2 },
    { emoji: '🐦', name: 'Bird', points: 250, speed: 1.2, size: 0.7, weight: 0.15 },
    { emoji: '🐹', name: 'Hamster', points: 350, speed: 1.5, size: 0.6, weight: 0.1 }
];

// ===== LEVEL CONFIG =====
const LEVELS = [
    { animals: 4, spawnRate: 90, time: 45, types: [0,1] },
    { animals: 5, spawnRate: 80, time: 45, types: [0,1,2] },
    { animals: 6, spawnRate: 70, time: 40, types: [0,1,2] },
    { animals: 7, spawnRate: 65, time: 40, types: [0,1,2,3] },
    { animals: 8, spawnRate: 55, time: 35, types: [0,1,2,3] },
    { animals: 9, spawnRate: 50, time: 35, types: [0,1,2,3] },
    { animals: 10, spawnRate: 45, time: 30, types: [0,1,2,3,4] },
    { animals: 11, spawnRate: 40, time: 30, types: [0,1,2,3,4] },
    { animals: 12, spawnRate: 35, time: 25, types: [0,1,2,3,4] },
    { animals: 14, spawnRate: 30, time: 25, types: [0,1,2,3,4] }
];
const TOTAL_LEVELS = LEVELS.length;

// ===== STATE =====
const state = {
    running: false,
    level: 0,
    score: 0,
    lives: 3,
    combo: 0,
    maxCombo: 0,
    rescued: 0,
    best: parseInt(localStorage.getItem('pr_best')) || 0,
    creatures: [],
    timeLeft: 0,
    spawnTimer: 0,
    animFrame: null,
    particles: [],
    floatingTexts: []
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('pr_muted') === 'true';
function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function toggleMute() {
    isMuted = !isMuted; localStorage.setItem('pr_muted', isMuted);
    document.getElementById('pr-mute-btn').textContent = isMuted ? '🔇' : '🔊';
}
function playRescue() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(600, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.15);
    } catch(e) {}
}
function playMiss() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(200, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.3);
        g.gain.setValueAtTime(0.08, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.3);
    } catch(e) {}
}
function playCombo() {
    if (isMuted) return;
    try {
        const c = getAudio();
        [523, 784, 1047].forEach((freq, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(freq, c.currentTime + i * 0.08);
            g.gain.setValueAtTime(0.1, c.currentTime + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.15);
            o.connect(g); g.connect(c.destination);
            o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + i * 0.08 + 0.15);
        });
    } catch(e) {}
}
function playLevelUp() {
    if (isMuted) return;
    try {
        const c = getAudio();
        [523, 659, 784, 1047].forEach((freq, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(freq, c.currentTime + i * 0.12);
            g.gain.setValueAtTime(0.1, c.currentTime + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.2);
            o.connect(g); g.connect(c.destination);
            o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 0.2);
        });
    } catch(e) {}
}
function playGameOver() {
    if (isMuted) return;
    try {
        const c = getAudio();
        [400, 350, 300, 200].forEach((freq, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, c.currentTime + i * 0.2);
            g.gain.setValueAtTime(0.08, c.currentTime + i * 0.2);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 0.3);
            o.connect(g); g.connect(c.destination);
            o.start(c.currentTime + i * 0.2); o.stop(c.currentTime + i * 0.2 + 0.3);
        });
    } catch(e) {}
}

// ===== CREATURE =====
function spawnCreature() {
    const config = LEVELS[state.level];
    const typeIdx = config.types[Math.floor(Math.random() * config.types.length)];
    const type = ANIMALS[typeIdx];

    // Spawn from edges
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const spd = type.speed * (1 + state.level * 0.08);

    switch (side) {
        case 0: // top
            x = 20 + Math.random() * (W - 40);
            y = -20;
            vx = (Math.random() - 0.5) * spd;
            vy = spd * (0.5 + Math.random() * 0.5);
            break;
        case 1: // right
            x = W + 20;
            y = 20 + Math.random() * (H - 40);
            vx = -spd * (0.5 + Math.random() * 0.5);
            vy = (Math.random() - 0.5) * spd;
            break;
        case 2: // bottom
            x = 20 + Math.random() * (W - 40);
            y = H + 20;
            vx = (Math.random() - 0.5) * spd;
            vy = -spd * (0.5 + Math.random() * 0.5);
            break;
        case 3: // left
            x = -20;
            y = 20 + Math.random() * (H - 40);
            vx = spd * (0.5 + Math.random() * 0.5);
            vy = (Math.random() - 0.5) * spd;
            break;
    }

    state.creatures.push({
        x, y, vx, vy,
        type: type,
        size: type.size * (14 + Math.random() * 6),
        alive: true,
        spawnTime: Date.now(),
        wobble: Math.random() * Math.PI * 2
    });
}

// ===== RESCUE / MISS =====
function rescueCreature(idx) {
    const c = state.creatures[idx];
    if (!c || !c.alive) return;

    c.alive = false;
    state.rescued++;

    // Combo
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;

    // Score
    let points = c.type.points;
    const comboBonus = Math.min(state.combo - 1, 10) * 50;
    points += comboBonus;

    state.score += points;

    playRescue();
    if (state.combo >= 3) playCombo();

    spawnParticles(c.x, c.y, ['#2ecc71', '#ffd700', '#3498db'], 10);
    addFloatingText(c.x, c.y - 10, `+${points}`, '#ffd700');

    updateHUD();
}

function missCreature() {
    state.lives--;
    state.combo = 0;
    playMiss();

    if (state.lives <= 0) {
        gameOver();
    }
    updateHUD();
}

// ===== UPDATE =====
function update() {
    const speedMul = 1 + state.level * 0.05;

    // Move creatures
    for (let i = state.creatures.length - 1; i >= 0; i--) {
        const c = state.creatures[i];
        if (!c.alive) continue;

        c.wobble += 0.03;
        c.x += c.vx * speedMul + Math.sin(c.wobble) * 0.2;
        c.y += c.vy * speedMul;

        // Check if creature escaped off screen
        const margin = 40;
        if (c.x < -margin || c.x > W + margin || c.y < -margin || c.y > H + margin) {
            c.alive = false;
            missCreature();
        }
    }

    // Remove dead creatures
    state.creatures = state.creatures.filter(c => c.alive);

    // Spawn new creatures
    const config = LEVELS[state.level];
    state.spawnTimer--;
    if (state.spawnTimer <= 0 && state.creatures.length < config.animals) {
        spawnCreature();
        state.spawnTimer = Math.max(20, config.spawnRate - state.level * 5);
    }

    // Timer
    state.timeLeft -= 1 / 60;
    if (state.timeLeft <= 0) {
        // Level complete - check if we rescued enough
        levelComplete();
    }

    updateParticles();
}

// ===== LEVEL MANAGEMENT =====
function levelComplete() {
    state.running = false;
    if (state.level >= TOTAL_LEVELS - 1) {
        won();
        return;
    }
    playLevelUp();
    dom.levelCompleteStats.textContent = `Score: ${state.score} | Rescued: ${state.rescued}`;
    dom.levelCompleteOverlay.classList.remove('hidden');
}

function nextLevel() {
    state.level++;
    state.running = true;
    state.creatures = [];
    state.spawnTimer = 0;
    state.combo = 0;
    dom.levelCompleteOverlay.classList.add('hidden');
    setupLevel();
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop();
}

function setupLevel() {
    const config = LEVELS[state.level];
    state.timeLeft = config.time;
    state.spawnTimer = 0;
    state.creatures = [];
    // Spawn initial creatures
    for (let i = 0; i < Math.min(3, config.animals); i++) {
        spawnCreature();
    }
    updateHUD();
}

function won() {
    state.running = false;
    if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('pr_best', state.best);
    }
    dom.wonStats.textContent = `Final Score: ${state.score} 🏆`;
    dom.wonOverlay.classList.remove('hidden');
}

function gameOver() {
    state.running = false;
    playGameOver();
    if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('pr_best', state.best);
    }
    dom.gameoverStats.textContent = `Score: ${state.score} | Best: ${state.best}`;
    dom.gameoverOverlay.classList.remove('hidden');

    for (let i = 0; i < 15; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 3;
        state.particles.push({ x: W/2, y: H/2, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, color: '#e74c3c' });
    }
}

// ===== DRAW =====
function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background - grassy field
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#87CEEB');
    bg.addColorStop(0.3, '#87CEEB');
    bg.addColorStop(0.35, '#a8e6a3');
    bg.addColorStop(1, '#2ecc71');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 3; i++) {
        const cx = (i * 170 + state.timeLeft * 5) % (W + 80) - 40;
        const cy = 30 + i * 25;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.arc(cx + 20, cy - 5, 20, 0, Math.PI * 2);
        ctx.arc(cx + 40, cy, 22, 0, Math.PI * 2);
        ctx.fill();
    }

    // Fence
    ctx.strokeStyle = 'rgba(139,69,19,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H - 60);
    ctx.lineTo(W, H - 60);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
        const fx = i * (W / 11);
        ctx.fillStyle = 'rgba(139,69,19,0.2)';
        ctx.fillRect(fx, H - 70, 6, 25);
        ctx.fillStyle = 'rgba(139,69,19,0.15)';
        ctx.fillRect(fx + 3, H - 78, 6, 20);
    }

    // Grass blades
    ctx.strokeStyle = 'rgba(46,204,113,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
        const gx = (i * 27 + 5) % W;
        const gy = H - 60 + Math.sin(i * 1.5) * 5;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + Math.sin(i) * 3, gy - 8 - Math.random() * 6);
        ctx.stroke();
    }

    // Draw creatures
    for (const c of state.creatures) {
        if (!c.alive) continue;
        ctx.save();
        ctx.font = `${c.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;

        // Bounce animation
        const bounce = Math.sin(Date.now() / 300 + c.wobble) * 3;
        ctx.fillText(c.type.emoji, c.x, c.y + bounce);

        ctx.restore();

        // Name tag
        ctx.save();
        ctx.font = '9px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText(c.type.name, c.x, c.y + c.size * 0.5 + 10);
        ctx.restore();
    }

    // Timer bar
    const config = LEVELS[state.level];
    const tw = 300, tx = (W - tw) / 2, ty = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(tx, ty, tw, 8);
    const pct = Math.max(0, state.timeLeft / config.time);
    const tColor = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = tColor;
    ctx.fillRect(tx, ty, tw * pct, 8);
    ctx.font = '10px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`${Math.ceil(state.timeLeft)}s`, W / 2, ty + 22);

    // Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    state.floatingTexts.forEach(t => {
        ctx.globalAlpha = t.life;
        ctx.font = 'bold 18px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = t.color;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 5;
        ctx.fillText(t.text, t.x, t.y);
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
}

// ===== PARTICLES =====
function spawnParticles(x, y, colors, count = 8) {
    if (!Array.isArray(colors)) colors = [colors];
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        state.particles.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 1, color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}
function addFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -2 });
}
function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= 0.025;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const t = state.floatingTexts[i];
        t.y += t.vy; t.life -= 0.02;
        if (t.life <= 0) state.floatingTexts.splice(i, 1);
    }
}

// ===== HUD =====
function updateHUD() {
    dom.score.textContent = state.score;
    dom.scoreB.textContent = state.score;
    dom.level.textContent = state.level + 1;
    dom.best.textContent = state.best;
    dom.lives.textContent = '❤️'.repeat(Math.max(0, state.lives));
    dom.combo.textContent = state.combo;
    dom.rescued.textContent = state.rescued;
}

// ===== GAME LOOP =====
function gameLoop() {
    if (!state.running) { state.animFrame = null; return; }
    update();
    draw();
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== CLICK HANDLER =====
function handleClick(e) {
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check creatures in reverse order (topmost first)
    for (let i = state.creatures.length - 1; i >= 0; i--) {
        const c = state.creatures[i];
        if (!c.alive) continue;
        const dx = mx - c.x;
        const dy = my - (c.y + Math.sin(Date.now() / 300 + c.wobble) * 3);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < c.size * 0.6) {
            rescueCreature(i);
            return;
        }
    }
}

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    handleClick({ clientX: touch.clientX, clientY: touch.clientY });
});

// ===== START =====
function startGame() {
    state.level = 0;
    state.score = 0;
    state.lives = 3;
    state.combo = 0;
    state.maxCombo = 0;
    state.rescued = 0;
    state.creatures = [];
    state.particles = [];
    state.floatingTexts = [];

    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    dom.levelCompleteOverlay.classList.add('hidden');
    dom.wonOverlay.classList.add('hidden');

    setupLevel();
    state.running = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop();
}

// ===== START SCREEN =====
function drawStartScreen() {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#87CEEB');
    bg.addColorStop(0.3, '#a8e6a3');
    bg.addColorStop(1, '#2ecc71');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Animals walking across
    const animals = ['🐱', '🐶', '🐰', '🐦', '🐹'];
    for (let i = 0; i < animals.length; i++) {
        const ax = (i * 100 + Date.now() / 2000) % (W + 60) - 30;
        const ay = 80 + i * 90 + Math.sin(Date.now() / 1000 + i * 2) * 10;
        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 1500 + i) * 0.15;
        ctx.fillText(animals[i], ax, ay);
    }
    ctx.globalAlpha = 1;

    // Fence
    ctx.strokeStyle = 'rgba(139,69,19,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(W, H - 40);
    ctx.stroke();

    if (state.best > 0) {
        ctx.font = '16px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(`🏆 Best: ${state.best}`, W / 2, H - 15);
    }
}

// ===== BUTTONS =====
dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.nextLevelBtn.addEventListener('click', nextLevel);
dom.playAgainBtn.addEventListener('click', startGame);

document.getElementById('pr-mute-btn').addEventListener('click', toggleMute);
if (isMuted) document.getElementById('pr-mute-btn').textContent = '🔇';

dom.resetBtn.addEventListener('click', () => {
    if (confirm('🔄 Reset all progress? This cannot be undone!')) {
        state.running = false;
        if (state.animFrame) cancelAnimationFrame(state.animFrame);
        localStorage.removeItem('pr_best');
        state.best = 0;
        dom.best.textContent = 0;
        startGame();
    }
});

// Handle resize for mobile
function handleResize() {
    const maxWidth = Math.min(W, window.innerWidth - 20);
    const scale = maxWidth / W;
    canvas.style.width = maxWidth + 'px';
    canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', handleResize);
handleResize();

// ===== INIT =====
function init() {
    drawStartScreen();
    dom.best.textContent = state.best;
}

document.addEventListener('DOMContentLoaded', init);
