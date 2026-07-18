/* ============================================
   RACE RUSH — Full Game Engine
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('rr-canvas');
const ctx = canvas.getContext('2d');
const W = 450, H = 600;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ----- DOM Refs -----
const dom = {
    score:       document.getElementById('rr-score'),
    speed:       document.getElementById('rr-speed'),
    distance:    document.getElementById('rr-distance'),
    coins:       document.getElementById('rr-coins'),
    best:        document.getElementById('rr-best'),
    powerup:     document.getElementById('rr-powerup'),
    wrapper:     document.getElementById('rr-canvas-wrapper'),
    startOverlay:   document.getElementById('rr-start-overlay'),
    gameoverOverlay: document.getElementById('rr-gameover-overlay'),
    gameoverStats:   document.getElementById('rr-gameover-stats'),
    startBtn:     document.getElementById('rr-start-btn'),
    restartBtn:   document.getElementById('rr-restart-btn'),
    resetBtn:     document.getElementById('rr-reset-btn')
};

// ===== GAME STATE =====
const state = {
    running: false,
    score: 0,
    distance: 0,
    coins: 0,
    speed: 0,
    maxSpeed: 6,
    baseSpeed: 4,
    coins: 0,
    lives: 3,
    shieldTimer: 0,
    boostTimer: 0,
    magnetTimer: 0,
    lane: 1,          // 0=left, 1=center, 2=right
    targetLane: 1,
    laneX: [0, 0, 0], // actual x positions per lane
    roadOffset: 0,
    traffic: [],
    roadCoins: [],
    particles: [],
    floatingTexts: [],
    animFrame: null,
    highScore: parseInt(localStorage.getItem('rr_high')) || 0,
    gameOver: false,
    shakeTimer: 0,
    shakeIntensity: 0,
    difficulty: 1,
    spawnTimer: 0,
    coinSpawnTimer: 0,
    keys: { left: false, right: false, up: false },
    roadLines: [],
    combo: 0,
    comboTimer: 0
};

// ===== LANE SETUP =====
const LANE_COUNT = 3;
const LANE_WIDTH = 110;
const ROAD_LEFT = (W - LANE_WIDTH * LANE_COUNT) / 2;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 70;

const LANE_CENTERS = [
    ROAD_LEFT + LANE_WIDTH / 2,
    ROAD_LEFT + LANE_WIDTH * 1.5,
    ROAD_LEFT + LANE_WIDTH * 2.5
];

// ===== PLAYER =====
const player = {
    x: LANE_CENTERS[1],
    y: H - 100,
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    lane: 1
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('rr_muted') === 'true';

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('rr_muted', isMuted);
    document.getElementById('rr-mute-btn').textContent = isMuted ? '🔇' : '🔊';
}

function playEngine() {
    if (isMuted || !audioCtx) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(80 + state.speed * 15, ctx.currentTime);
        g.gain.setValueAtTime(0.03, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.1);
    } catch (e) {}
}

function playCoin() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [800, 1200].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);
            g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.1);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.06);
            o.stop(ctx.currentTime + i * 0.06 + 0.1);
        });
    } catch (e) {}
}

function playCrash() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const src = ctx.createBufferSource();
        const g = ctx.createGain();
        src.buffer = buffer;
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        src.connect(g); g.connect(ctx.destination);
        src.start();
    } catch (e) {}
}

function playPowerup() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [400, 600, 900].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);
            g.gain.setValueAtTime(0.07, ctx.currentTime + i * 0.07);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.12);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.07);
            o.stop(ctx.currentTime + i * 0.07 + 0.12);
        });
    } catch (e) {}
}

// ===== UTILITY =====
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ===== PARTICLES =====
function spawnExplosion(x, y, color, count = 15, speed = 3) {
    for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const spd = rand(0.5, speed);
        state.particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 1,
            decay: rand(0.02, 0.04),
            size: rand(2, 5),
            color
        });
    }
}

function spawnFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -1.5 });
}

// ===== DIFFICULTY =====
function getDifficulty() {
    const d = Math.min(Math.floor(state.distance / 200) + 1, 20);
    return {
        level: d,
        trafficSpeed: 2 + d * 0.2,
        maxTraffic: Math.min(3 + Math.floor(d / 2), 10),
        spawnInterval: Math.max(120 - d * 4, 40),
        coinInterval: Math.max(100 - d * 2, 50),
        speedCap: Math.min(6 + d * 0.3, 12)
    };
}

// ===== ROAD =====
function initRoad() {
    state.roadLines = [];
    for (let y = -40; y < H + 40; y += 60) {
        state.roadLines.push(y);
    }
}

// ===== SPAWNING =====
function spawnTraffic() {
    const diff = getDifficulty();
    if (state.traffic.length >= diff.maxTraffic) return;

    const lane = randInt(0, 2);
    // Don't spawn in same lane as player if too close
    for (const t of state.traffic) {
        if (t.lane === lane && t.y < 200) return;
    }

    const colors = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#1abc9c'];
    const types = ['sedan', 'suv', 'sports'];
    const type = types[randInt(0, 2)];
    const widths = { sedan: 38, suv: 42, sports: 36 };
    const heights = { sedan: 68, suv: 74, sports: 60 };

    state.traffic.push({
        x: LANE_CENTERS[lane],
        y: -rand(60, 200),
        lane,
        width: widths[type],
        height: heights[type],
        speed: diff.trafficSpeed + rand(-0.3, 0.3),
        color: colors[randInt(0, colors.length - 1)],
        type,
        passed: false
    });
}

function spawnCoin() {
    const lane = randInt(0, 2);
    // Don't spawn on top of traffic
    for (const t of state.traffic) {
        if (t.lane === lane && t.y < 100) return;
    }
    state.roadCoins.push({
        x: LANE_CENTERS[lane],
        y: -rand(40, 120),
        lane,
        collected: false,
        bobPhase: Math.random() * Math.PI * 2
    });
}

function spawnPowerupPickup() {
    const lane = randInt(0, 2);
    const types = ['shield', 'boost', 'magnet'];
    const type = types[randInt(0, 2)];
    const colors = { shield: '#2ecc71', boost: '#f39c12', magnet: '#9b59b6' };
    const icons = { shield: '🛡', boost: '⚡', magnet: '🧲' };
    state.roadCoins.push({
        x: LANE_CENTERS[lane],
        y: -rand(40, 120),
        lane,
        collected: false,
        isPowerup: true,
        powerupType: type,
        color: colors[type],
        icon: icons[type],
        bobPhase: Math.random() * Math.PI * 2
    });
}

// ===== DRAWING =====
function drawRoad() {
    const roadW = LANE_WIDTH * LANE_COUNT;

    // Road surface
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(ROAD_LEFT, 0, roadW, H);

    // Road edges
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(ROAD_LEFT - 4, 0, 4, H);
    ctx.fillRect(ROAD_LEFT + roadW, 0, 4, H);

    // Lane markings (dashed)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 25]);

    for (let l = 1; l < LANE_COUNT; l++) {
        const lx = ROAD_LEFT + l * LANE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, H);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Road shoulder (grass/dirt)
    ctx.fillStyle = '#1a5a1a';
    ctx.fillRect(0, 0, ROAD_LEFT - 4, H);
    ctx.fillRect(ROAD_LEFT + roadW + 4, 0, W - ROAD_LEFT - roadW - 4, H);
}

function drawCar(x, y, w, h, color, isPlayer = false) {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

    // Car body
    const r = 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.lineTo(w / 2 - r, -h / 2);
    ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    ctx.lineTo(w / 2, h / 2 - r);
    ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    ctx.lineTo(-w / 2 + r, h / 2);
    ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    ctx.lineTo(-w / 2, -h / 2 + r);
    ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Windshield
    ctx.fillStyle = 'rgba(150, 200, 255, 0.6)';
    const wsX = w * 0.25, wsY = h * 0.15, wsW = w * 0.5, wsH = h * 0.3;
    ctx.beginPath();
    ctx.roundRect(-wsW / 2, -h / 2 + wsY, wsW, wsH, 4);
    ctx.fill();

    // Rear window
    ctx.fillStyle = 'rgba(150, 200, 255, 0.4)';
    ctx.beginPath();
    ctx.roundRect(-wsW / 2, h / 2 - wsY - wsH, wsW, wsH * 0.7, 3);
    ctx.fill();

    if (isPlayer) {
        // Player car glow
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, 6);
        ctx.stroke();

        // Headlights
        ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
        ctx.beginPath();
        ctx.arc(-w / 2 + 6, -h / 2 + 5, 4, 0, Math.PI * 2);
        ctx.arc(w / 2 - 6, -h / 2 + 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Headlight beams
        ctx.fillStyle = 'rgba(255, 255, 200, 0.08)';
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 2, -h / 2);
        ctx.lineTo(-w / 2 - 6, -h / 2 - 30);
        ctx.lineTo(w / 2 + 6, -h / 2 - 30);
        ctx.lineTo(w / 2 - 2, -h / 2);
        ctx.closePath();
        ctx.fill();

        // Tail lights
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(-w / 2 + 6, h / 2 - 5, 3, 0, Math.PI * 2);
        ctx.arc(w / 2 - 6, h / 2 - 5, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawCoin(coin) {
    const bob = Math.sin(Date.now() * 0.005 + coin.bobPhase) * 4;

    if (coin.isPowerup) {
        // Powerup glow
        ctx.save();
        ctx.shadowColor = coin.color;
        ctx.shadowBlur = 25;

        ctx.fillStyle = coin.color + '44';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y + bob, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = coin.color;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y + bob, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(coin.icon, coin.x, coin.y + bob + 1);
        ctx.restore();
    } else {
        // Coin
        ctx.save();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y + bob, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffec8b';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y + bob, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#b8860b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', coin.x, coin.y + bob + 1);
        ctx.restore();
    }
}

// ===== COLLISION =====
function rectCollide(a, b) {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 8 &&
           Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 8;
}

// ===== GAME LOGIC =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.distance = 0;
    state.coins = 0;
    state.speed = state.baseSpeed;
    state.lives = 3;
    state.shieldTimer = 0;
    state.boostTimer = 0;
    state.magnetTimer = 0;
    state.lane = 1;
    state.targetLane = 1;
    state.traffic = [];
    state.roadCoins = [];
    state.particles = [];
    state.floatingTexts = [];
    state.spawnTimer = 0;
    state.coinSpawnTimer = 0;
    state.shakeTimer = 0;
    state.difficulty = 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.keys = { left: false, right: false, up: false };
    player.x = LANE_CENTERS[1];
    player.lane = 1;
    updateHUD();
}

function startGame() {
    resetGame();
    state.running = true;
    initRoad();
}

function gameOver() {
    state.running = false;
    state.gameOver = true;

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('rr_high', state.highScore);
    }

    spawnExplosion(player.x, player.y, '#f39c12', 30, 5);
    playCrash();

    dom.gameoverStats.innerHTML = `
        Distance: ${Math.floor(state.distance)}m | Coins: ${state.coins}<br>
        🏆 Best: ${state.highScore}
    `;
    dom.gameoverOverlay.classList.remove('hidden');
}

function updateHUD() {
    dom.score.textContent = state.score;
    dom.speed.textContent = Math.floor(state.speed * 20);
    dom.distance.textContent = Math.floor(state.distance);
    dom.coins.textContent = state.coins;
    dom.best.textContent = state.highScore || Math.floor(state.distance);

    // Powerup indicator
    if (state.shieldTimer > 0) {
        dom.powerup.textContent = '🛡 Shield';
        dom.powerup.style.color = '#2ecc71';
    } else if (state.boostTimer > 0) {
        dom.powerup.textContent = '⚡ Boost';
        dom.powerup.style.color = '#f39c12';
    } else if (state.magnetTimer > 0) {
        dom.powerup.textContent = '🧲 Magnet';
        dom.powerup.style.color = '#9b59b6';
    } else {
        dom.powerup.textContent = '';
    }
}

// ===== UPDATE =====
function update() {
    if (!state.running) return;

    // Shake
    if (state.shakeTimer > 0) state.shakeTimer--;

    // Timers
    if (state.shieldTimer > 0) state.shieldTimer--;
    if (state.boostTimer > 0) {
        state.boostTimer--;
        if (state.boostTimer <= 0) {
            state.speed = state.baseSpeed;
        }
    }
    if (state.magnetTimer > 0) state.magnetTimer--;
    if (state.comboTimer > 0) {
        state.comboTimer--;
        if (state.comboTimer <= 0) state.combo = 0;
    }

    // Speed
    const diff = getDifficulty();
    const targetSpeed = state.boostTimer > 0
        ? Math.min(state.baseSpeed * 1.8, diff.speedCap)
        : state.keys.up
            ? Math.min(state.baseSpeed + 1.5, diff.speedCap)
            : state.baseSpeed;
    state.speed += (targetSpeed - state.speed) * 0.05;

    // Distance
    state.distance += state.speed * 0.3;

    // Score (distance-based)
    state.score = Math.floor(state.distance * 2 + state.coins * 10);

    // Road scroll
    state.roadOffset = (state.roadOffset + state.speed) % 60;

    // Lane movement
    const moveSpeed = 0.15;
    if (state.keys.left && state.lane > 0) {
        state.targetLane = state.lane - 1;
    } else if (state.keys.right && state.lane < 2) {
        state.targetLane = state.lane + 1;
    }

    // Smooth lane transition
    const targetX = LANE_CENTERS[state.targetLane];
    const dx = targetX - player.x;
    if (Math.abs(dx) > 0.5) {
        player.x += dx * moveSpeed;
    } else {
        player.x = targetX;
        state.lane = state.targetLane;
    }

    player.y = H - 100;

    // Spawn traffic
    state.spawnTimer++;
    if (state.spawnTimer >= diff.spawnInterval / (state.speed / state.baseSpeed)) {
        state.spawnTimer = 0;
        spawnTraffic();
    }

    // Spawn coins
    state.coinSpawnTimer++;
    if (state.coinSpawnTimer >= diff.coinInterval) {
        state.coinSpawnTimer = 0;
        if (Math.random() < 0.15) {
            spawnPowerupPickup();
        } else {
            spawnCoin();
        }
    }

    // Update traffic
    for (let i = state.traffic.length - 1; i >= 0; i--) {
        const t = state.traffic[i];
        t.y += state.speed * 0.8 + t.speed;

        // Passed by player
        if (!t.passed && t.y > player.y + 50) {
            t.passed = true;
            state.combo++;
            state.comboTimer = 60;
        }

        if (t.y > H + 100) {
            state.traffic.splice(i, 1);
            continue;
        }

        // Collision with player
        if (rectCollide(player, { x: t.x, y: t.y, width: t.width, height: t.height })) {
            if (state.shieldTimer > 0) {
                // Shield absorbs hit
                state.shieldTimer = 0;
                spawnExplosion(t.x, t.y, '#2ecc71', 15);
                state.traffic.splice(i, 1);
                spawnFloatingText(player.x, player.y - 40, '🛡 Blocked!', '#2ecc71');
                playPowerup();
                updateHUD();
                continue;
            }

            // Crash!
            state.shakeTimer = 15;
            state.shakeIntensity = 8;
            state.traffic.splice(i, 1);
            gameOver();
            return;
        }
    }

    // Update coins
    for (let i = state.roadCoins.length - 1; i >= 0; i--) {
        const c = state.roadCoins[i];
        c.y += state.speed * 0.8;

        if (c.y > H + 40) {
            state.roadCoins.splice(i, 1);
            continue;
        }

        // Magnetic pull
        if (state.magnetTimer > 0) {
            const dx = player.x - c.x;
            const dy = player.y - c.y;
            const d = Math.hypot(dx, dy);
            if (d < 150 && d > 5) {
                c.x += (dx / d) * 4;
                c.y += (dy / d) * 4;
            }
        }

        // Collection
        if (Math.abs(c.x - player.x) < 28 && Math.abs(c.y - player.y) < 28) {
            if (c.isPowerup) {
                if (c.powerupType === 'shield') {
                    state.shieldTimer = 300; // ~5 seconds
                    spawnFloatingText(c.x, c.y, '🛡 Shield!', '#2ecc71');
                } else if (c.powerupType === 'boost') {
                    state.boostTimer = 240; // ~4 seconds
                    spawnFloatingText(c.x, c.y, '⚡ Boost!', '#f39c12');
                } else if (c.powerupType === 'magnet') {
                    state.magnetTimer = 360; // ~6 seconds
                    spawnFloatingText(c.x, c.y, '🧲 Magnet!', '#9b59b6');
                }
                playPowerup();
            } else {
                state.coins++;
                const bonus = Math.max(1, Math.floor(state.combo / 3));
                const totalCoin = 1 + bonus;
                state.coins += bonus;
                spawnFloatingText(c.x, c.y, `+${totalCoin} 🪙`, '#ffd700');
                playCoin();
            }
            state.roadCoins.splice(i, 1);
            updateHUD();
            continue;
        }
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.vx *= 0.98;
        p.vy *= 0.98;
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y += ft.vy;
        ft.life -= 0.02;
        if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }

    // Engine sound
    if (Math.random() < 0.1) playEngine();

    updateHUD();
}

// ===== RENDER =====
function render() {
    ctx.save();

    // Screen shake
    if (state.shakeTimer > 0) {
        const intensity = state.shakeIntensity * (state.shakeTimer / 15);
        ctx.translate(
            (Math.random() - 0.5) * intensity,
            (Math.random() - 0.5) * intensity
        );
    }

    // Background - grass
    ctx.fillStyle = '#0d2818';
    ctx.fillRect(0, 0, W, H);

    // Road
    drawRoad();

    // Road surface texture (speed lines)
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 5; i++) {
        const ry = ((i * 120 + state.roadOffset * 2) % (H + 120)) - 60;
        ctx.fillRect(ROAD_LEFT + 20, ry, LANE_WIDTH * LANE_COUNT - 40, 2);
    }

    // Coins
    for (const c of state.roadCoins) {
        drawCoin(c);
    }

    // Traffic cars
    for (const t of state.traffic) {
        // Brake lights for cars in front
        const inFront = t.y < player.y && Math.abs(t.x - player.x) < LANE_WIDTH;
        const brakeColor = inFront ? '#ff2222' : t.color;
        drawCar(t.x, t.y, t.width, t.height, brakeColor);
    }

    // Player car
    if (!state.gameOver) {
        // Shield effect
        if (state.shieldTimer > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(46, 204, 113, ${0.3 + Math.sin(Date.now() * 0.01) * 0.15})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Boost flame
        if (state.boostTimer > 0 || state.keys.up) {
            ctx.save();
            const flameH = 15 + Math.random() * 10;
            ctx.fillStyle = state.boostTimer > 0 ? '#f39c12' : '#e74c3c';
            ctx.shadowColor = state.boostTimer > 0 ? '#f39c12' : '#e74c3c';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(player.x - 12, player.y + CAR_HEIGHT / 2);
            ctx.quadraticCurveTo(player.x, player.y + CAR_HEIGHT / 2 + flameH, player.x + 12, player.y + CAR_HEIGHT / 2);
            ctx.fill();
            ctx.restore();
        }

        // Speed lines (side)
        if (state.speed > state.baseSpeed + 0.5) {
            ctx.save();
            ctx.strokeStyle = `rgba(255,255,255,${(state.speed - state.baseSpeed) * 0.03})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const sx = (i < 3 ? ROAD_LEFT - 20 : ROAD_LEFT + LANE_WIDTH * LANE_COUNT + 10) + (i % 3) * 8;
                const sy = rand(0, H);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx, sy + 20);
                ctx.stroke();
            }
            ctx.restore();
        }

        drawCar(player.x, player.y, CAR_WIDTH, CAR_HEIGHT, '#00b4d8', true);
    }

    // Combo display
    if (state.combo >= 3 && state.comboTimer > 0) {
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(`🔥 ${state.combo}x Combo!`, W / 2, 50);
        ctx.restore();
    }

    // Particles
    for (const p of state.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating texts
    for (const ft of state.floatingTexts) {
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 15px Fredoka, sans-serif';
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
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            e.preventDefault();
            state.keys.left = true;
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            e.preventDefault();
            state.keys.right = true;
        }
        if (e.key === 'ArrowUp' || e.key === 'w') {
            e.preventDefault();
            state.keys.up = true;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = false;
        if (e.key === 'ArrowUp' || e.key === 'w') state.keys.up = false;
    });

    // Touch controls
    const wrapper = dom.wrapper;
    let touchStartX = 0;
    let touchCurrentX = 0;

    wrapper.addEventListener('touchstart', (e) => {
        // Don't block button/link touches — let them fire click events
        if (e.target.closest('button, a, input')) return;
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchCurrentX = touch.clientX;
        // Tap top half = boost
        const rect = canvas.getBoundingClientRect();
        const touchY = (touch.clientY - rect.top) / rect.height;
        if (touchY < 0.4) state.keys.up = true;
    }, { passive: false });

    wrapper.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchCurrentX = touch.clientX;
        const diff = touchCurrentX - touchStartX;

        if (diff < -20) { state.keys.left = true; state.keys.right = false; }
        else if (diff > 20) { state.keys.right = true; state.keys.left = false; }
        else { state.keys.left = false; state.keys.right = false; }
    }, { passive: false });

    wrapper.addEventListener('touchend', (e) => {
        e.preventDefault();
        state.keys.left = false;
        state.keys.right = false;
        state.keys.up = false;
    }, { passive: false });

    // Buttons
    dom.startBtn.addEventListener('click', () => {
        dom.startOverlay.classList.add('hidden');
        startGame();
    });

    dom.restartBtn.addEventListener('click', () => {
        dom.gameoverOverlay.classList.add('hidden');
        startGame();
    });

    dom.muteBtn = document.getElementById('rr-mute-btn');
    dom.muteBtn.addEventListener('click', toggleMute);

    dom.resetBtn.addEventListener('click', () => {
        if (confirm('Reset all progress?')) {
            localStorage.removeItem('rr_high');
            resetGame();
            dom.startOverlay.classList.remove('hidden');
            dom.gameoverOverlay.classList.add('hidden');
        }
    });

    // Handle resize
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
    initRoad();
    bindEvents();
    gameLoop();
    updateHUD();

    if (isMuted) document.getElementById('rr-mute-btn').textContent = '🔇';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
