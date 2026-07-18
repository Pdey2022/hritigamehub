/* ============================================
   SPACE BLASTER — Full Game Engine
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('sb-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 600;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ----- DOM Refs -----
const dom = {
    score:      document.getElementById('sb-score'),
    wave:       document.getElementById('sb-wave'),
    lives:      document.getElementById('sb-lives'),
    healthFill: document.getElementById('sb-health-fill'),
    weapon:     document.getElementById('sb-weapon'),
    wrapper:    document.getElementById('sb-canvas-wrapper'),
    startOverlay:  document.getElementById('sb-start-overlay'),
    gameoverOverlay: document.getElementById('sb-gameover-overlay'),
    waveupOverlay:  document.getElementById('sb-waveup-overlay'),
    gameoverStats:  document.getElementById('sb-gameover-stats'),
    waveupStats:    document.getElementById('sb-waveup-stats'),
    startBtn:    document.getElementById('sb-start-btn'),
    restartBtn:  document.getElementById('sb-restart-btn'),
    nextBtn:     document.getElementById('sb-next-btn'),
    resetBtn:    document.getElementById('sb-reset-btn')
};

// ===== ENEMY DEFINITIONS =====
const ENEMY_TYPES = {
    scout: {
        color: '#e74c3c',  hp: 1,   points: 10,  speed: 1.8,  width: 28, height: 28,
        shootChance: 0,     label: '👾', weight: 40
    },
    fighter: {
        color: '#e67e22',  hp: 2,   points: 25,  speed: 1.2,  width: 34, height: 34,
        shootChance: 0.006, label: '🛸', weight: 25
    },
    tank: {
        color: '#9b59b6',  hp: 4,   points: 50,  speed: 0.7,  width: 40, height: 40,
        shootChance: 0.01,  label: '🛡', weight: 12
    },
    asteroid: {
        color: '#7f8c8d',  hp: 3,   points: 15,  speed: 1.5 + Math.random() * 1.5,
        width: 30, height: 30, shootChance: 0, label: '🪨', weight: 20,
        tumbling: true
    },
    boss: {
        color: '#c0392b',  hp: 20,  points: 200, speed: 0.5,  width: 60, height: 50,
        shootChance: 0.025, label: '👁️', weight: 0
    }
};

// ===== WAVE CONFIG =====
function getWaveConfig(wave) {
    const d = Math.min(wave, 15);
    return {
        enemyCount: 4 + d * 2,
        spawnInterval: Math.max(700 - d * 35, 250),
        speedMultiplier: 1 + (d - 1) * 0.1,
        fighterWeight: Math.min(25 + d * 2, 50),
        tankWeight: d >= 3 ? Math.min(12 + (d - 3) * 2, 30) : 0,
        asteroidWeight: Math.min(20 + d * 2, 40),
        bossWave: wave % 5 === 0,
        enemyBulletSpeed: 2 + d * 0.2
    };
}

// ===== GAME STATE =====
const state = {
    running: false,
    wave: 1,
    score: 0,
    lives: 3,
    shield: 100,       // shield health 0-100
    maxShield: 100,
    weapon: 'normal',  // 'normal', 'spread', 'rapid'
    weaponTimer: 0,
    enemies: [],
    enemyBullets: [],
    playerBullets: [],
    particles: [],
    floatingTexts: [],
    stars: [],
    spawnTimer: 0,
    enemiesSpawned: 0,
    enemiesKilled: 0,
    enemiesNeeded: 0,
    animFrame: null,
    highScore: parseInt(localStorage.getItem('sb_high')) || 0,
    mouseX: W / 2,
    mouseY: H - 80,
    shooting: false,
    shootTimer: 0,
    shootCooldown: 12,  // frames between shots
    gameOver: false,
    shakeTimer: 0,
    shakeIntensity: 0,
    warningFlash: 0
};

// ===== PLAYER =====
const player = {
    x: W / 2,
    y: H - 80,
    width: 32,
    height: 36,
    speed: 5
};

// ===== STARFIELD =====
function initStars() {
    state.stars = [];
    for (let i = 0; i < 120; i++) {
        state.stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: Math.random() * 2.5 + 0.5,
            speed: Math.random() * 2 + 0.5,
            brightness: Math.random() * 0.5 + 0.5
        });
    }
    // Add a few brighter stars
    for (let i = 0; i < 8; i++) {
        state.stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: Math.random() * 1.5 + 3,
            speed: Math.random() * 0.5 + 0.2,
            brightness: 1,
            twinkle: Math.random() * Math.PI * 2
        });
    }
}
initStars();

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('sb_muted') === 'true';

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('sb_muted', isMuted);
    document.getElementById('sb-mute-btn').textContent = isMuted ? '🔇' : '🔊';
}

function playShoot() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(800, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.08);
    } catch (e) {}
}

function playHit() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.15);
    } catch (e) {}
}

function playExplosion() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const src = ctx.createBufferSource();
        const g = ctx.createGain();
        src.buffer = buffer;
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        src.connect(g); g.connect(ctx.destination);
        src.start();
    } catch (e) {}
}

function playPowerup() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [600, 800, 1000].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
            g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.1);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.08);
            o.stop(ctx.currentTime + i * 0.08 + 0.1);
        });
    } catch (e) {}
}

function playDamage() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(150, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.2);
    } catch (e) {}
}

// ===== UTILITY =====
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ===== PARTICLES =====
function spawnExplosion(x, y, color, count = 20, speed = 4) {
    for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const spd = rand(0.5, speed);
        const size = rand(2, 6);
        state.particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 1,
            decay: rand(0.015, 0.035),
            size,
            color,
            type: 'circle'
        });
    }
}

function spawnFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -2 });
}

function spawnPowerup(x, y) {
    const types = ['spread', 'rapid', 'shield'];
    const type = types[randInt(0, 2)];
    const colors = { spread: '#f39c12', rapid: '#e74c3c', shield: '#2ecc71' };
    const icons = { spread: '🔱', rapid: '⚡', shield: '🛡' };
    state.particles.push({
        x, y,
        vx: 0,
        vy: 1.2,
        life: 1,
        decay: 0,
        size: 14,
        color: colors[type],
        type: 'powerup',
        powerupType: type,
        powerupIcon: icons[type],
        bobPhase: Math.random() * Math.PI * 2
    });
}

// ===== DRAWING HELPERS =====
function drawShip(x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Engine glow
    const glowSize = 10 + Math.sin(Date.now() * 0.02) * 3;
    const grad = ctx.createRadialGradient(0, 22, 2, 0, 22, glowSize + 8);
    grad.addColorStop(0, 'rgba(100, 180, 255, 0.9)');
    grad.addColorStop(0.5, 'rgba(50, 120, 255, 0.4)');
    grad.addColorStop(1, 'rgba(50, 120, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 22, glowSize + 8, 0, Math.PI * 2);
    ctx.fill();

    // Ship body
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 20;

    // Main hull (brighter for visibility)
    ctx.fillStyle = '#4a6fa5';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-16, 14);
    ctx.lineTo(-8, 18);
    ctx.lineTo(0, 14);
    ctx.lineTo(8, 18);
    ctx.lineTo(16, 14);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.ellipse(0, -2, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing accents
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(-16, 14);
    ctx.lineTo(-20, 20);
    ctx.lineTo(-8, 18);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(16, 14);
    ctx.lineTo(20, 20);
    ctx.lineTo(8, 18);
    ctx.closePath();
    ctx.fill();

    // Cockpit glow
    ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, -2, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright outline for contrast
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-16, 14);
    ctx.lineTo(-8, 18);
    ctx.lineTo(0, 14);
    ctx.lineTo(8, 18);
    ctx.lineTo(16, 14);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const type = enemy.type;
    const w = enemy.width;
    const h = enemy.height;

    if (type === 'asteroid') {
        // Tumbling asteroid
        ctx.rotate(enemy.rotation || 0);
        ctx.shadowColor = '#95a5a6';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        const pts = 8;
        for (let i = 0; i < pts * 2; i++) {
            const angle = (i / (pts * 2)) * Math.PI * 2;
            const r = i % 2 === 0 ? w / 2 : w / 2 * (0.7 + Math.sin(i * 2.3) * 0.15);
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Crater details
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(-5, -3, 4, 0, Math.PI * 2);
        ctx.arc(6, 4, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'boss') {
        // Boss - big alien mothership
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 20;

        // Main body
        ctx.fillStyle = '#4a0e4e';
        ctx.beginPath();
        ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#8e44ad';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, w / 3, h / 3, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Eye / core
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        ctx.shadowBlur = 0;
        const hpPct = enemy.hp / enemy.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-w / 2, -h / 2 - 10, w, 6);
        ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(-w / 2, -h / 2 - 10, w * hpPct, 6);
    } else {
        // Regular enemies
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 10;

        if (type === 'scout') {
            // Small agile ship
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(-w / 2, -h / 2);
            ctx.lineTo(0, -h / 3);
            ctx.lineTo(w / 2, -h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'fighter') {
            // Fighter ship
            ctx.fillStyle = '#e67e22';
            ctx.beginPath();
            ctx.moveTo(0, -h / 2);
            ctx.lineTo(-w / 2, h / 2);
            ctx.lineTo(0, h / 3);
            ctx.lineTo(w / 2, h / 2);
            ctx.closePath();
            ctx.fill();
            // Wings
            ctx.fillStyle = '#d35400';
            ctx.beginPath();
            ctx.moveTo(-w / 2, h / 2);
            ctx.lineTo(-w / 2 - 6, h / 2 + 6);
            ctx.lineTo(0, h / 3);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w / 2, h / 2);
            ctx.lineTo(w / 2 + 6, h / 2 + 6);
            ctx.lineTo(0, h / 3);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'tank') {
            // Heavy tank ship
            ctx.fillStyle = '#8e44ad';
            ctx.beginPath();
            ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6c3483';
            ctx.beginPath();
            ctx.arc(0, 0, w / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // HP indicator for damaged enemies
    if (enemy.hp > 1 && enemy.hp < enemy.maxHp) {
        ctx.shadowBlur = 0;
        const hpPct = enemy.hp / enemy.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-w / 2, -h / 2 - 6, w, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(-w / 2, -h / 2 - 6, w * hpPct, 4);
    }

    ctx.restore();
}

function drawBullet(bullet) {
    ctx.save();
    ctx.shadowColor = bullet.color || '#f1c40f';
    ctx.shadowBlur = 10;

    if (bullet.isEnemy) {
        // Trail
        ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
        ctx.beginPath();
        ctx.arc(bullet.x - bullet.vx * 0.5, bullet.y - bullet.vy * 0.5, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = '#ff3333';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,200,200,0.6)';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Bright core
        ctx.shadowColor = bullet.color || '#f1c40f';
        ctx.shadowBlur = 18;
        const len = bullet.spread ? 6 : 14;
        ctx.fillStyle = bullet.spread ? '#f39c12' : '#f1c40f';
        ctx.fillRect(bullet.x - 2.5, bullet.y - len, 5, len * 2);

        // Glow
        ctx.shadowBlur = 0;
        ctx.fillStyle = (bullet.spread ? '#f39c12' : '#f1c40f') + '22';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Tip flash
        ctx.fillStyle = '#fff';
        ctx.fillRect(bullet.x - 1.5, bullet.y - len - 2, 3, 4);
    }

    ctx.restore();
}

// ===== SPAWNING =====
function spawnEnemy() {
    const cfg = getWaveConfig(state.wave);
    const isBoss = cfg.bossWave && state.enemiesSpawned === 0;

    let type;
    if (isBoss) {
        type = 'boss';
    } else {
        const roll = Math.random() * 100;
        if (roll < cfg.asteroidWeight) {
            type = 'asteroid';
        } else if (roll < cfg.asteroidWeight + cfg.fighterWeight) {
            type = 'fighter';
        } else if (roll < cfg.asteroidWeight + cfg.fighterWeight + cfg.tankWeight) {
            type = 'tank';
        } else {
            type = 'scout';
        }
    }

    const tpl = ENEMY_TYPES[type];
    const spdMult = cfg.speedMultiplier;

    const x = rand(40, W - 40);
    const y = -40;

    // Movement pattern
    let moveType = 'straight';
    let moveParams = {};
    if (type === 'scout') {
        moveType = 'zigzag';
        moveParams = { amplitude: rand(30, 80), frequency: rand(0.02, 0.04) };
    } else if (type === 'fighter') {
        moveType = 'sine';
        moveParams = { amplitude: rand(40, 100), frequency: rand(0.015, 0.03) };
    } else if (type === 'boss') {
        moveType = 'boss';
        moveParams = { amplitude: 120, frequency: 0.01, startY: 60 };
    }

    const enemy = {
        x, y,
        type,
        width: isBoss ? 60 : tpl.width,
        height: isBoss ? 50 : tpl.height,
        hp: isBoss ? 15 + state.wave * 2 : tpl.hp,
        maxHp: isBoss ? 15 + state.wave * 2 : tpl.hp,
        speed: (tpl.speed || 1) * spdMult,
        points: isBoss ? 150 + state.wave * 20 : tpl.points,
        shootChance: tpl.shootChance,
        moveType,
        moveParams,
        rotation: 0,
        rotSpeed: type === 'asteroid' ? rand(-0.05, 0.05) : 0,
        color: tpl.color
    };

    state.enemies.push(enemy);
    state.enemiesSpawned++;
}

function spawnEnemyBullet(enemy) {
    const cfg = getWaveConfig(state.wave);
    const speed = cfg.enemyBulletSpeed;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    state.enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        isEnemy: true,
        color: '#e74c3c'
    });
}

function spawnPlayerBullet() {
    const bx = player.x;
    const by = player.y - 18;

    if (state.weapon === 'spread') {
        for (let angle = -0.3; angle <= 0.3; angle += 0.15) {
            state.playerBullets.push({
                x: bx, y: by,
                vx: Math.sin(angle) * 6,
                vy: -6,
                spread: true,
                color: '#f39c12'
            });
        }
    } else {
        state.playerBullets.push({
            x: bx, y: by,
            vx: 0,
            vy: state.weapon === 'rapid' ? -8 : -6,
            spread: false,
            color: '#f1c40f'
        });
    }
    playShoot();
}

// ===== COLLISION =====
function rectCollide(a, b) {
    return a.x - a.width / 2 < b.x + b.width / 2 &&
           a.x + a.width / 2 > b.x - b.width / 2 &&
           a.y - a.height / 2 < b.y + b.height / 2 &&
           a.y + a.height / 2 > b.y - b.height / 2;
}

// ===== GAME LOGIC =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.wave = 1;
    state.score = 0;
    state.lives = 3;
    state.shield = 100;
    state.weapon = 'normal';
    state.weaponTimer = 0;
    state.enemies = [];
    state.enemyBullets = [];
    state.playerBullets = [];
    state.particles = [];
    state.floatingTexts = [];
    state.spawnTimer = 0;
    state.enemiesSpawned = 0;
    state.enemiesKilled = 0;
    state.shootTimer = 0;
    state.shakeTimer = 0;
    player.x = W / 2;
    player.y = H - 80;
    updateHUD();
}

function startWave() {
    const cfg = getWaveConfig(state.wave);
    state.enemies = [];
    state.enemyBullets = [];
    state.spawnTimer = 0;
    state.enemiesSpawned = 0;
    state.enemiesKilled = 0;
    state.enemiesNeeded = cfg.enemyCount;
    updateHUD();
}

function updateHUD() {
    dom.score.textContent = state.score;
    dom.wave.textContent = state.wave;
    dom.lives.textContent = '❤️'.repeat(Math.max(0, state.lives));
    const shieldPct = (state.shield / state.maxShield) * 100;
    dom.healthFill.style.width = shieldPct + '%';
    if (shieldPct > 50) dom.healthFill.style.background = '#2ecc71';
    else if (shieldPct > 25) dom.healthFill.style.background = '#f39c12';
    else dom.healthFill.style.background = '#e74c3c';

    const weaponNames = { normal: '🔫 Normal', spread: '🔱 Spread', rapid: '⚡ Rapid' };
    dom.weapon.textContent = weaponNames[state.weapon] || '🔫 Normal';
}

function playerHit(damage = 25) {
    if (state.shakeTimer > 0) return; // invincibility frames

    state.shield -= damage;
    state.shakeTimer = 10;
    state.shakeIntensity = 6;

    playDamage();

    if (state.shield <= 0) {
        state.shield = 0;
        state.lives--;
        state.shield = state.maxShield;
        state.shakeTimer = 15;
        state.shakeIntensity = 10;
        spawnExplosion(player.x, player.y, '#3498db', 30, 5);

        if (state.lives <= 0) {
            gameOver();
            return;
        }
    }

    updateHUD();
}

function gameOver() {
    state.running = false;
    state.gameOver = true;

    // Save high score
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('sb_high', state.highScore);
    }

    spawnExplosion(player.x, player.y, '#f39c12', 50, 6);
    playExplosion();

    dom.gameoverStats.innerHTML = `
        Score: ${state.score} | Wave: ${state.wave}<br>
        🏆 Best: ${state.highScore}
    `;
    dom.gameoverOverlay.classList.remove('hidden');
}

function waveComplete() {
    state.running = false;
    state.weapon = 'normal';
    state.weaponTimer = 0;

    dom.waveupStats.textContent = `Wave ${state.wave} → Wave ${state.wave + 1}`;
    dom.waveupOverlay.classList.remove('hidden');
}

function nextWave() {
    state.wave++;
    dom.waveupOverlay.classList.add('hidden');
    startWave();
    state.running = true;
}

// ===== UPDATE =====
function update() {
    if (!state.running) return;

    // Shake timer
    if (state.shakeTimer > 0) state.shakeTimer--;

    // Weapon timer
    if (state.weaponTimer > 0) {
        state.weaponTimer--;
        if (state.weaponTimer <= 0) {
            state.weapon = 'normal';
            updateHUD();
        }
    }

    // Shooting
    if (state.shooting) {
        state.shootTimer++;
        const cooldown = state.weapon === 'rapid' ? 6 :
                         state.weapon === 'spread' ? 18 : 12;
        if (state.shootTimer >= cooldown) {
            state.shootTimer = 0;
            spawnPlayerBullet();
        }
    }

    // Move player toward mouse
    const dx = state.mouseX - player.x;
    const dy = state.mouseY - player.y;
    const d = Math.hypot(dx, dy);
    if (d > 2) {
        player.x += (dx / d) * Math.min(player.speed, d);
        player.y += (dy / d) * Math.min(player.speed, d);
    }
    player.x = clamp(player.x, 20, W - 20);
    player.y = clamp(player.y, 40, H - 30);

    // Update stars
    for (const star of state.stars) {
        star.y += star.speed;
        if (star.y > H) { star.y = 0; star.x = Math.random() * W; }
    }

    // Spawn enemies
    const cfg = getWaveConfig(state.wave);
    if (state.enemiesSpawned < state.enemiesNeeded) {
        state.spawnTimer++;
        if (state.spawnTimer >= cfg.spawnInterval / 16) {
            state.spawnTimer = 0;
            spawnEnemy();
        }
    }

    // Update enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const speed = e.speed;

        switch (e.moveType) {
            case 'zigzag':
                e.x += Math.sin(e.y * e.moveParams.frequency) * 1.5;
                e.y += speed;
                break;
            case 'sine':
                e.x += Math.sin(Date.now() * e.moveParams.frequency) * e.moveParams.amplitude * 0.01;
                e.y += speed;
                break;
            case 'boss':
                e.x += Math.sin(Date.now() * e.moveParams.frequency) * 0.8;
                if (e.y < e.moveParams.startY) e.y += speed;
                break;
            default:
                e.y += speed;
        }

        e.x = clamp(e.x, 20, W - 20);

        // Rotation for asteroids
        if (e.rotSpeed) e.rotation = (e.rotation || 0) + e.rotSpeed;

        // Enemy shooting
        if (e.shootChance > 0 && Math.random() < e.shootChance && e.y > 0) {
            spawnEnemyBullet(e);
        }

        // Remove if off screen
        if (e.y > H + 60) {
            state.enemies.splice(i, 1);
            continue;
        }

        // Collision with player
        if (rectCollide(player, e)) {
            const dmg = e.type === 'boss' ? 40 : 25;
            playerHit(dmg);
            if (e.type !== 'boss') {
                spawnExplosion(e.x, e.y, e.color, 25);
                state.enemies.splice(i, 1);
            }
            continue;
        }
    }

    // Update player bullets
    for (let i = state.playerBullets.length - 1; i >= 0; i--) {
        const b = state.playerBullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.y < -20 || b.x < -20 || b.x > W + 20) {
            state.playerBullets.splice(i, 1);
            continue;
        }

        // Hit detection
        let hit = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e = state.enemies[j];
            if (b.x > e.x - e.width / 2 && b.x < e.x + e.width / 2 &&
                b.y > e.y - e.height / 2 && b.y < e.y + e.height / 2) {
                e.hp--;
                hit = true;

                if (e.hp <= 0) {
                    // Enemy destroyed
                    const isBoss = e.type === 'boss';
                    spawnExplosion(e.x, e.y, e.color, isBoss ? 40 : 20, isBoss ? 6 : 4);
                    playExplosion();

                    state.score += e.points;
                    state.enemiesKilled++;

                    spawnFloatingText(e.x, e.y, `+${e.points}`);

                    // Drop powerup chance
                    if (!isBoss && Math.random() < 0.12) {
                        spawnPowerup(e.x, e.y);
                    }
                    if (isBoss) {
                        spawnPowerup(e.x - 20, e.y);
                        spawnPowerup(e.x + 20, e.y);
                    }

                    state.enemies.splice(j, 1);
                } else {
                    playHit();
                    spawnExplosion(e.x, e.y, '#fff', 5, 2);
                }
                break;
            }
        }

        if (hit) {
            state.playerBullets.splice(i, 1);
        }
    }

    // Update enemy bullets
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const b = state.enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.y > H + 20 || b.x < -20 || b.x > W + 20 || b.y < -20) {
            state.enemyBullets.splice(i, 1);
            continue;
        }

        // Collision with player
        if (Math.abs(b.x - player.x) < 16 && Math.abs(b.y - player.y) < 16) {
            playerHit(15);
            state.enemyBullets.splice(i, 1);
        }
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];

        if (p.type === 'powerup') {
            p.y += p.vy;
            p.x += Math.sin(p.bobPhase + Date.now() * 0.003) * 0.5;

            // Collision with player
            if (Math.abs(p.x - player.x) < 24 && Math.abs(p.y - player.y) < 24) {
                if (p.powerupType === 'shield') {
                    state.shield = Math.min(state.shield + 30, state.maxShield);
                    spawnFloatingText(p.x, p.y, '+30 Shield', '#2ecc71');
                } else {
                    state.weapon = p.powerupType;
                    state.weaponTimer = 600; // ~10 seconds
                    spawnFloatingText(p.x, p.y, p.powerupIcon + ' ' + p.powerupType.toUpperCase(), p.color);
                }
                playPowerup();
                updateHUD();
                state.particles.splice(i, 1);
                continue;
            }

            // Remove if off screen
            if (p.y > H + 20) {
                state.particles.splice(i, 1);
                continue;
            }
        } else {
            p.x += p.vx || 0;
            p.y += p.vy || 0;
            p.life -= p.decay || 0.02;
            p.vx *= 0.98;
            p.vy *= 0.98;

            if (p.life <= 0) {
                state.particles.splice(i, 1);
            }
        }
    }

    // Update floating texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y += ft.vy;
        ft.life -= 0.02;
        if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }

    // Check wave complete
    if (state.enemiesSpawned >= state.enemiesNeeded && state.enemies.length === 0) {
        waveComplete();
    }

    updateHUD();
}

// ===== RENDER =====
function render() {
    ctx.save();

    // Screen shake
    if (state.shakeTimer > 0) {
        const intensity = state.shakeIntensity * (state.shakeTimer / 10);
        ctx.translate(
            (Math.random() - 0.5) * intensity,
            (Math.random() - 0.5) * intensity
        );
    }

    // Background - deep space
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0a0018');
    bgGrad.addColorStop(0.3, '#10002a');
    bgGrad.addColorStop(0.6, '#180040');
    bgGrad.addColorStop(1, '#080010');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Nebula effects (multiple for richer depth)
    const nebulae = [
        { x: 150, y: 200, r: 250, c: 'rgba(100, 0, 180, ' },
        { x: 380, y: 400, r: 200, c: 'rgba(0, 80, 180, ' },
        { x: 80,  y: 480, r: 180, c: 'rgba(180, 0, 100, ' }
    ];
    for (const neb of nebulae) {
        const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
        grad.addColorStop(0, neb.c + '0.07)');
        grad.addColorStop(0.5, neb.c + '0.04)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // Stars
    for (const star of state.stars) {
        let alpha = star.brightness;
        if (star.twinkle !== undefined) {
            alpha *= 0.5 + 0.5 * Math.sin(Date.now() * 0.003 + star.twinkle);
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        // Glow on brighter stars
        if (star.size > 2.5) {
            ctx.globalAlpha = alpha * 0.2;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;

    // Enemies
    for (const e of state.enemies) {
        drawEnemy(e);
    }

    // Bullets
    for (const b of state.playerBullets) drawBullet(b);
    for (const b of state.enemyBullets) drawBullet(b);

    // Player ship (if game not over)
    if (!state.gameOver) {
        // Crosshair cursor (dot + ring)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(state.mouseX, state.mouseY, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(state.mouseX, state.mouseY, 2, 0, Math.PI * 2);
        ctx.fill();
        // Crosshair lines
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(state.mouseX - 20, state.mouseY);
        ctx.lineTo(state.mouseX - 16, state.mouseY);
        ctx.moveTo(state.mouseX + 16, state.mouseY);
        ctx.lineTo(state.mouseX + 20, state.mouseY);
        ctx.moveTo(state.mouseX, state.mouseY - 20);
        ctx.lineTo(state.mouseX, state.mouseY - 16);
        ctx.moveTo(state.mouseX, state.mouseY + 16);
        ctx.lineTo(state.mouseX, state.mouseY + 20);
        ctx.stroke();
        ctx.restore();

        // Warning flash when lives are low
        if (state.lives === 1) {
            state.warningFlash += 0.05;
            if (Math.sin(state.warningFlash * Math.PI * 4) > 0.5) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(4, 4, W - 8, H - 8);
            }
        }
        drawShip(player.x, player.y);
    }

    // Particles
    for (const p of state.particles) {
        if (p.type === 'powerup') {
            // Powerup glow
            ctx.save();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 20;

            // Outer glow ring
            ctx.fillStyle = p.color + '33';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + 6, 0, Math.PI * 2);
            ctx.fill();

            // Inner circle
            ctx.shadowBlur = 0;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Icon
            ctx.fillStyle = '#fff';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.powerupIcon, p.x, p.y);
            ctx.restore();
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // Floating texts
    for (const ft of state.floatingTexts) {
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 16px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

// ===== GAME LOOP =====
function gameLoop() {
    update();
    render();
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== EVENT BINDING =====
function bindEvents() {
    const wrapper = dom.wrapper;

    // Mouse move
    wrapper.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        state.mouseX = (e.clientX - rect.left) * scaleX;
        state.mouseY = (e.clientY - rect.top) * scaleY;
    });

    // Mouse down / up (shooting)
    wrapper.addEventListener('mousedown', (e) => {
        if (e.button === 0 && state.running) {
            state.shooting = true;
            state.shootTimer = state.shootCooldown; // fire immediately
        }
    });

    wrapper.addEventListener('mouseup', (e) => {
        if (e.button === 0) state.shooting = false;
    });

    wrapper.addEventListener('mouseleave', () => {
        state.shooting = false;
    });

    // Touch support
    wrapper.addEventListener('touchstart', (e) => {
        // Don't block button/link touches — let them fire click events
        if (e.target.closest('button, a, input')) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        state.mouseX = (touch.clientX - rect.left) * scaleX;
        state.mouseY = (touch.clientY - rect.top) * scaleY;
        if (state.running) {
            state.shooting = true;
            state.shootTimer = state.shootCooldown;
        }
    }, { passive: false });

    wrapper.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        state.mouseX = (touch.clientX - rect.left) * scaleX;
        state.mouseY = (touch.clientY - rect.top) * scaleY;
    }, { passive: false });

    wrapper.addEventListener('touchend', (e) => {
        e.preventDefault();
        state.shooting = false;
    }, { passive: false });

    // Buttons
    dom.startBtn.addEventListener('click', () => {
        dom.startOverlay.classList.add('hidden');
        resetGame();
        startWave();
        state.running = true;
    });

    dom.restartBtn.addEventListener('click', () => {
        dom.gameoverOverlay.classList.add('hidden');
        resetGame();
        startWave();
        state.running = true;
    });

    dom.nextBtn.addEventListener('click', nextWave);

    dom.muteBtn = document.getElementById('sb-mute-btn');
    dom.muteBtn.addEventListener('click', toggleMute);

    dom.resetBtn.addEventListener('click', () => {
        if (confirm('Reset all progress?')) {
            localStorage.removeItem('sb_high');
            resetGame();
            dom.startOverlay.classList.remove('hidden');
            dom.gameoverOverlay.classList.add('hidden');
            dom.waveupOverlay.classList.add('hidden');
        }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Space') {
            e.preventDefault();
            if (state.running) {
                state.shooting = true;
                state.shootTimer = state.shootCooldown;
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.key === 'Space') {
            state.shooting = false;
        }
    });

    // Handle resize for responsive canvas
    function handleResize() {
        const maxWidth = Math.min(W, window.innerWidth - 20);
        const scale = maxWidth / W;
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (H * scale) + 'px';
    }
    window.addEventListener('resize', handleResize);
    handleResize();
}

// ===== INIT =====
function init() {
    resetGame();
    initStars();
    bindEvents();
    gameLoop();
    updateHUD();

    // Restore mute state
    if (isMuted) document.getElementById('sb-mute-btn').textContent = '🔇';
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
