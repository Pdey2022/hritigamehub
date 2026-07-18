/* ============================================
   BUBBLE POP — Full Game Engine v2
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('bp-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 550;

// ----- High-DPI Support -----
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ----- DOM Refs -----
const dom = {
    score:      document.getElementById('bp-score'),
    level:      document.getElementById('bp-level'),
    lives:      document.getElementById('bp-lives'),
    progress:   document.getElementById('bp-progress-fill'),
    progressTxt: document.getElementById('bp-progress-text'),
    combo:      document.getElementById('bp-combo-display'),
    startOverlay:  document.getElementById('bp-start-overlay'),
    gameoverOverlay: document.getElementById('bp-gameover-overlay'),
    levelupOverlay: document.getElementById('bp-levelup-overlay'),
    gameoverStats:  document.getElementById('bp-gameover-stats'),
    levelupStats:   document.getElementById('bp-levelup-stats'),
    startBtn:    document.getElementById('bp-start-btn'),
    restartBtn:  document.getElementById('bp-restart-btn'),
    nextBtn:     document.getElementById('bp-next-btn'),
    canvasWrapper: document.getElementById('bp-canvas-wrapper')
};

// ===== BUBBLE DEFINITIONS =====
const BUBBLE_TYPES = {
    red:    { color: '#e74c3c', glow: '#ff6b6b', points: 10, weight: 35, label: '🔴' },
    blue:   { color: '#3498db', glow: '#5dade2', points: 10, weight: 30, label: '🔵' },
    green:  { color: '#2ecc71', glow: '#58d68d', points: 15, weight: 20, label: '🟢' },
    purple: { color: '#9b59b6', glow: '#af7ac5', points: 20, weight: 10, label: '🟣' },
    gold:   { color: '#ffd700', glow: '#fff176', points: 50, weight: 3,  label: '⭐' },
    bomb:   { color: '#2c3e50', glow: '#555',     points: 0,  weight: 1.5, label: '💣' },
    freeze: { color: '#a8e6ff', glow: '#d4f1ff', points: 0,  weight: 0.5, label: '❄️' },
    shield: { color: '#1abc9c', glow: '#48e5c2', points: 0,  weight: 0.8, label: '🛡' },
    rainbow:{ color: '#ffffff', glow: 'rainbow',  points: 0,  weight: 0.4, label: '🌈' }
};

// ===== LEVEL CONFIG =====
function getLevelConfig(level) {
    const d = Math.min(level, 10);
    return {
        target: 8 + d * 2,
        spawnInterval: Math.max(800 - d * 55, 220),
        speedMultiplier: 1 + (d - 1) * 0.2,
        maxBubbles: 10 + d * 2,
        bombWeight: d >= 3 ? 1.5 + (d - 3) * 0.3 : 0,
        smallChance: d >= 6 ? (d - 5) * 0.04 : 0,
        scoreMultiplier: 1 + (d - 1) * 0.15,
        goldWeight: Math.max(3 - d * 0.2, 0.5)
    };
}

// ===== GAME STATE =====
const state = {
    running: false,
    level: 1,
    score: 0,
    lives: 3,
    popped: 0,
    combo: 0,
    comboTimer: 0,
    bubbles: [],
    particles: [],
    floatingTexts: [],
    freezeTimer: 0,
    spawnTimer: 0,
    animFrame: null,
    highScore: parseInt(localStorage.getItem('bubblepop_high')) || 0,
    shield: 0,            // shield charges
    totalPops: 0,          // total pops across all levels
    lifeRestoreAt: 25,     // restore 1 life every 25 pops
    warningFlash: 0,       // flash counter when lives = 1
    dangerPulse: 0
};

// ===== AUDIO (Web Audio) =====
let audioCtx = null;
let isMuted = localStorage.getItem('bp_muted') === 'true';

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('bp_muted', isMuted);
    const btn = document.getElementById('bp-mute-btn');
    if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
}

function playPop(pitch = 500) {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
}

function playBomb() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
}

function playLevelUp() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [523, 659, 784, 1047].forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
            g.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.12);
            o.stop(ctx.currentTime + i * 0.12 + 0.25);
        });
    } catch (e) {}
}

// ===== SPAWN BUBBLES =====
function spawnBubble() {
    const cfg = getLevelConfig(state.level);
    if (state.bubbles.length >= cfg.maxBubbles) return;

    // Build dynamic weights based on level
    const weights = {
        red: 35, blue: 30, green: 20, purple: 10,
        gold: cfg.goldWeight,
        bomb: cfg.bombWeight,
        freeze: 0.5 + state.level * 0.05,
        shield: 0.8,
        rainbow: 0.4
    };

    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((s, [, v]) => s + v, 0);
    let r = Math.random() * totalWeight;
    let type = 'red';
    for (const [key, val] of entries) {
        r -= val;
        if (r <= 0) { type = key; break; }
    }

    // Small bubbles at high levels (harder to click, bonus points)
    const isSmall = state.level >= 6 && Math.random() < cfg.smallChance;
    const radius = isSmall ? 8 + Math.random() * 5 : 14 + Math.random() * 10;
    const baseSpeed = isSmall ? (1.2 + Math.random() * 1.0) : (0.8 + Math.random() * 0.8);
    const speed = baseSpeed * cfg.speedMultiplier;

    state.bubbles.push({
        type,
        x: radius + Math.random() * (W - radius * 2),
        y: H + radius + 10,
        radius,
        speed,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.03,
        wobbleAmp: 0.3 + Math.random() * 0.5,
        isSmall
    });
}

// ===== PARTICLES =====
function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        state.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            color,
            radius: 2 + Math.random() * 4
        });
    }
}

// ===== FLOATING TEXT =====
function addFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -2 });
}

// ===== CHAIN REACTION =====
function triggerChainReaction(x, y, type, radius) {
    const range = radius * 3.5;
    let chained = 0;
    for (let i = state.bubbles.length - 1; i >= 0; i--) {
        const b = state.bubbles[i];
        if (b.type !== type) continue;
        const dx = b.x - x;
        const dy = b.y - y;
        if (dx * dx + dy * dy < range * range) {
            const info = BUBBLE_TYPES[b.type];
            if (!info) continue;
            const pts = Math.floor(info.points * 1.5);
            state.score += pts;
            state.popped++;
            state.totalPops++;
            spawnParticles(b.x, b.y, info.color, 6);
            addFloatingText(b.x, b.y, `+${pts}`, info.glow);
            state.bubbles.splice(i, 1);
            chained++;
        }
    }
    if (chained > 0) {
        addFloatingText(x, y - 30, `🔥 Chain x${chained}!`, '#ffd700');
        playPop(700);
        checkLevelProgress();
        checkLifeRestore();
    }
}

// ===== UPDATE =====
function update() {
    const cfg = getLevelConfig(state.level);

    // Freeze timer
    if (state.freezeTimer > 0) state.freezeTimer--;

    // Danger pulse when 1 life left
    if (state.lives === 1) {
        state.dangerPulse = (state.dangerPulse + 1) % 120;
    }

    // Spawn
    state.spawnTimer++;
    const spawnRate = state.freezeTimer > 0 ? cfg.spawnInterval * 2 : cfg.spawnInterval;
    const spawnFrames = Math.max(12, Math.floor(spawnRate / 16));
    if (state.spawnTimer % spawnFrames === 0) spawnBubble();

    // Combo timer
    if (state.comboTimer > 0) {
        state.comboTimer--;
        if (state.comboTimer === 0) {
            state.combo = 0;
            updateHUD();
        }
    }

    // Move bubbles
    for (let i = state.bubbles.length - 1; i >= 0; i--) {
        const b = state.bubbles[i];
        const speedMul = state.freezeTimer > 0 ? 0.25 : 1;
        b.y -= b.speed * speedMul;
        b.wobble += b.wobbleSpeed;
        b.x += Math.sin(b.wobble) * b.wobbleAmp;

        // Bubble escaped top — shield can absorb
        if (b.y + b.radius < 0) {
            if (b.type !== 'bomb' && b.type !== 'freeze' && b.type !== 'shield' && b.type !== 'rainbow') {
                if (state.shield > 0) {
                    state.shield--;
                    addFloatingText(W / 2, 30, '🛡 Shield lost!', '#1abc9c');
                } else {
                    state.lives--;
                    updateLives();
                    triggerShake();
                    if (state.lives <= 0) { gameOver(); return; }
                }
            }
            state.bubbles.splice(i, 1);
        }
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 0.025;
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Update floating text
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const t = state.floatingTexts[i];
        t.y += t.vy;
        t.life -= 0.02;
        if (t.life <= 0) state.floatingTexts.splice(i, 1);
    }
}

// ===== PROGRESS & LIFE RESTORE =====
function checkLevelProgress() {
    const cfg = getLevelConfig(state.level);
    if (state.popped >= cfg.target) levelComplete();
}

function checkLifeRestore() {
    if (state.lives < 3 && state.totalPops >= state.lifeRestoreAt) {
        state.lives++;
        state.lifeRestoreAt += 25;
        updateLives();
        addFloatingText(W / 2, H / 2, '❤️ Extra life!', '#ff6b81');
        playPop(600);
    }
}

// ===== RENDER =====
function render() {
    ctx.clearRect(0, 0, W, H);

    // Background gradient — danger pulse when 1 life left
    if (state.lives === 1 && state.dangerPulse % 30 < 15) {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#3c0c0c');
        bg.addColorStop(0.3, '#6b1a1a');
        bg.addColorStop(0.6, '#db3434');
        bg.addColorStop(1, '#e25d5d');
        ctx.fillStyle = bg;
    } else {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0c3b5c');
        bg.addColorStop(0.3, '#1a6b9a');
        bg.addColorStop(0.6, '#3498db');
        bg.addColorStop(1, '#5dade2');
        ctx.fillStyle = bg;
    }
    ctx.fillRect(0, 0, W, H);

    // Underwater light rays
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 4; i++) {
        const x = 30 + i * 120 + Math.sin(Date.now() / 3000 + i * 2) * 20;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 25, H);
        ctx.lineTo(x + 25, H);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    ctx.restore();

    // Sandy bottom
    ctx.fillStyle = 'rgba(194, 178, 128, 0.25)';
    ctx.fillRect(0, H - 12, W, 12);

    // Shield indicator
    if (state.shield > 0) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#1abc9c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 160, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.font = 'bold 13px Fredoka, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1abc9c';
        ctx.fillText(`🛡 x${state.shield}`, 10, 24);
    }

    // Bubbles
    state.bubbles.forEach(b => drawBubble(b));

    // Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Floating texts
    state.floatingTexts.forEach(t => {
        ctx.globalAlpha = t.life;
        ctx.font = 'bold 22px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = t.color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 6;
        ctx.fillText(t.text, t.x, t.y);
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // Freeze indicator
    if (state.freezeTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#a8e6ff';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        ctx.font = 'bold 14px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#a8e6ff';
        ctx.fillText('❄️ FROZEN', W / 2, 30);
    }
}

function drawBubble(b) {
    const info = BUBBLE_TYPES[b.type];
    if (!info) return;
    ctx.save();

    // Glow for special types
    if (b.type === 'gold' || b.type === 'freeze' || b.type === 'shield') {
        ctx.shadowColor = info.glow;
        ctx.shadowBlur = 20;
    }
    if (b.type === 'rainbow') {
        ctx.shadowColor = '#ff6bff';
        ctx.shadowBlur = 25;
    }

    // Determine fill color — rainbow cycles through hues
    let fillColor = info.color;
    if (b.type === 'rainbow') {
        const hue = (Date.now() / 20 + b.x) % 360;
        fillColor = `hsl(${hue}, 100%, 65%)`;
    }

    // Main circle
    const grad = ctx.createRadialGradient(
        b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1,
        b.x, b.y, b.radius
    );
    if (b.type === 'rainbow') {
        const hue1 = (Date.now() / 15) % 360;
        const hue2 = (hue1 + 120) % 360;
        grad.addColorStop(0, `hsl(${hue1}, 100%, 85%)`);
        grad.addColorStop(0.6, `hsl(${hue2}, 100%, 65%)`);
        grad.addColorStop(1, `hsl(${(hue2 + 120) % 360}, 100%, 45%)`);
    } else {
        grad.addColorStop(0, lightenColor(info.color, 40));
        grad.addColorStop(0.6, info.color);
        grad.addColorStop(1, darkenColor(info.color, 30));
    }

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = b.type === 'rainbow' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Highlight/shine
    ctx.beginPath();
    ctx.arc(b.x - b.radius * 0.25, b.y - b.radius * 0.25, b.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    // Small bubble indicator (tiny diamond)
    if (b.isSmall) {
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#fff';
        ctx.fillText('✨', b.x, b.y - b.radius - 2);
    }

    // Center emoji for special types
    const emojiSize = b.isSmall ? b.radius * 0.7 : b.radius * 0.85;
    if (b.type === 'bomb') {
        // Hand-drawn bomb: dark body + fuse + spark
        ctx.beginPath();
        ctx.arc(b.x, b.y + 2, b.radius * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Fuse
        ctx.beginPath();
        ctx.moveTo(b.x + b.radius * 0.3, b.y - b.radius * 0.35);
        ctx.quadraticCurveTo(b.x + b.radius * 0.5, b.y - b.radius * 0.7, b.x + b.radius * 0.15, b.y - b.radius * 0.8);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // Animated spark
        const sparkSize = 3 + Math.sin(Date.now() / 100) * 1.5;
        ctx.shadowColor = '#ff6b00';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x + b.radius * 0.15, b.y - b.radius * 0.8, sparkSize, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.shadowBlur = 0;
        // Skull icon
        ctx.font = `${b.radius * 0.45}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☠', b.x, b.y + 3);
    } else if (b.type === 'freeze') {
        ctx.font = `${emojiSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❄️', b.x, b.y + 2);
    } else if (b.type === 'shield') {
        ctx.font = `${emojiSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡', b.x, b.y + 2);
    } else if (b.type === 'rainbow') {
        ctx.font = `${emojiSize * 0.8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌈', b.x, b.y + 2);
    }

    ctx.restore();
}

// ===== INTERACTION =====
function handleClick(e) {
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (let i = state.bubbles.length - 1; i >= 0; i--) {
        const b = state.bubbles[i];
        const dx = mx - b.x;
        const dy = my - b.y;
        if (dx * dx + dy * dy < b.radius * b.radius) {
            // === BOMB ===
            if (b.type === 'bomb') {
                if (state.shield > 0) {
                    state.shield--;
                    spawnParticles(b.x, b.y, '#1abc9c', 15);
                    addFloatingText(b.x, b.y, '🛡 Shield blocked!', '#1abc9c');
                    playPop(600);
                } else {
                    state.lives--;
                    playBomb();
                    spawnParticles(b.x, b.y, '#2c3e50', 25);
                    triggerShake();
                    updateLives();
                    if (state.lives <= 0) { gameOver(); return; }
                }
                state.bubbles.splice(i, 1);
                break;
            }
            // === FREEZE ===
            else if (b.type === 'freeze') {
                state.freezeTimer = 300;
                playPop(800);
                spawnParticles(b.x, b.y, '#a8e6ff', 15);
                addFloatingText(b.x, b.y, '❄️ FREEZE!', '#a8e6ff');
                state.bubbles.splice(i, 1);
                updateHUD();
                return;
            }
            // === SHIELD ===
            else if (b.type === 'shield') {
                state.shield++;
                playPop(700);
                spawnParticles(b.x, b.y, '#1abc9c', 18);
                addFloatingText(b.x, b.y, '🛡 Shield +1!', '#1abc9c');
                state.bubbles.splice(i, 1);
                updateHUD();
                return;
            }
            // === RAINBOW ===
            else if (b.type === 'rainbow') {
                playLevelUp();
                spawnParticles(b.x, b.y, '#ff6bff', 30);
                addFloatingText(b.x, b.y, '🌈 RAINBOW!', '#ff6bff');
                state.bubbles.splice(i, 1);
                // Pop all bubbles of a random color
                const colors = ['red', 'blue', 'green', 'purple'];
                const targetColor = colors[Math.floor(Math.random() * colors.length)];
                let popped = 0;
                for (let j = state.bubbles.length - 1; j >= 0; j--) {
                    const ob = state.bubbles[j];
                    if (ob.type === targetColor) {
                        const oInfo = BUBBLE_TYPES[ob.type];
                        state.score += oInfo.points;
                        state.popped++;
                        state.totalPops++;
                        spawnParticles(ob.x, ob.y, oInfo.color, 5);
                        state.bubbles.splice(j, 1);
                        popped++;
                    }
                }
                addFloatingText(b.x, b.y - 30, `💥 Popped ${popped} ${targetColor}!`, '#ffd700');
                updateHUD();
                checkLevelProgress();
                checkLifeRestore();
                return;
            }
            // === NORMAL BUBBLE ===
            else {
                const info = BUBBLE_TYPES[b.type];
                const cfg = getLevelConfig(state.level);
                const comboMul = 1 + state.combo * 0.1;
                const points = Math.floor(info.points * comboMul * cfg.scoreMultiplier);
                
                state.score += points;
                state.popped++;
                state.totalPops++;
                state.combo++;
                state.comboTimer = 60;

                playPop(400 + state.combo * 40);
                spawnParticles(b.x, b.y, info.color, 10);
                addFloatingText(b.x, b.y, 
                    state.combo > 1 ? `+${points} 🔥${state.combo}x` : `+${points}`,
                    info.glow
                );
                state.bubbles.splice(i, 1);
                updateHUD();

                // Small bubbles bonus
                if (b.isSmall) {
                    addFloatingText(b.x, b.y - 25, '✨ Small bonus!', '#ffd700');
                    state.score += 5;
                }

                // Chain reaction: pop nearby same-color bubbles
                triggerChainReaction(b.x, b.y, b.type, b.radius);

                checkLevelProgress();
                checkLifeRestore();
                return;
            }
        }
    }
}

// ===== LEVEL MANAGEMENT =====
function levelComplete() {
    state.running = false;
    playLevelUp();
    dom.levelupStats.textContent = `Level ${state.level} → Level ${state.level + 1}`;
    dom.levelupOverlay.classList.remove('hidden');
}

function startNextLevel() {
    dom.levelupOverlay.classList.add('hidden');
    state.level++;
    state.popped = 0;
    state.bubbles = [];
    state.particles = [];
    state.floatingTexts = [];
    state.combo = 0;
    state.comboTimer = 0;
    state.spawnTimer = 0;
    state.running = true;
    updateHUD();
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop();
}

// ===== GAME OVER =====
function gameOver() {
    state.running = false;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);

    // Dramatic slow-motion render of remaining bubbles
    let slowFrames = 0;
    function slowMoEnd() {
        slowFrames++;
        if (slowFrames > 30) {
            // Update high score
            if (state.score > state.highScore) {
                state.highScore = state.score;
                localStorage.setItem('bubblepop_high', state.score);
            }
            dom.gameoverStats.textContent = `Score: ${state.score} | Level: ${state.level} | Best: ${state.highScore} | Pops: ${state.totalPops}`;
            dom.gameoverOverlay.classList.remove('hidden');
            if (state.score > 0) {
                if (typeof saveScore === 'function') saveScore('bubble-pop', state.score);
                if (typeof renderLeaderboard === 'function') renderLeaderboard('bubble-pop', 'lb-bp-content', 'Bubble Pop');
            }
            return;
        }
        // Render with slow-motion effect
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, W, H);
        state.bubbles.forEach(b => {
            b.y -= b.speed * 0.1;
            drawBubble(b);
        });
        ctx.font = 'bold 36px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e74c3c';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText('💥', W / 2, H / 2 - 20);
        ctx.font = 'bold 24px Fredoka, sans-serif';
        ctx.fillText('GAME OVER', W / 2, H / 2 + 30);
        ctx.shadowBlur = 0;
        requestAnimationFrame(slowMoEnd);
    }
    requestAnimationFrame(slowMoEnd);
}

// ===== SHARE (screenshot) =====
function triggerShake() {
    const el = dom.canvasWrapper;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

// ===== HUD UPDATES =====
function updateHUD() {
    dom.score.textContent = state.score;
    dom.level.textContent = state.level;
    const cfg = getLevelConfig(state.level);
    const pct = Math.min(100, (state.popped / cfg.target) * 100);
    dom.progress.style.width = pct + '%';
    dom.progressTxt.textContent = `${state.popped} / ${cfg.target}`;
    if (state.combo > 1) {
        dom.combo.textContent = `🔥 ${state.combo}x`;
        dom.combo.className = 'bp-combo active';
    } else {
        dom.combo.textContent = '';
        dom.combo.className = 'bp-combo';
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
    if (!state.running) { state.animFrame = null; return; }
    update();
    render();
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== START GAME =====
function startGame() {
    state.level = 1;
    state.score = 0;
    state.lives = 3;
    state.popped = 0;
    state.bubbles = [];
    state.particles = [];
    state.floatingTexts = [];
    state.combo = 0;
    state.comboTimer = 0;
    state.freezeTimer = 0;
    state.spawnTimer = 0;
    state.shield = 0;
    state.totalPops = 0;
    state.lifeRestoreAt = 25;
    state.dangerPulse = 0;

    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    dom.levelupOverlay.classList.add('hidden');

    updateLives();
    updateHUD();
    state.running = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop();
}

// ===== INIT =====
function init() {
    // Event listeners
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', (e) => {
        if (e.target.closest('button, a, input')) return;
        e.preventDefault();
        const touch = e.touches[0];
        handleClick({ clientX: touch.clientX, clientY: touch.clientY });
    });

    dom.startBtn.addEventListener('click', startGame);
    dom.restartBtn.addEventListener('click', startGame);
    dom.nextBtn.addEventListener('click', startNextLevel);
    
    // Mute button
    document.getElementById('bp-mute-btn').addEventListener('click', toggleMute);
    if (isMuted) document.getElementById('bp-mute-btn').textContent = '🔇';
    
    // Reset button
    document.getElementById('bp-reset-btn').addEventListener('click', () => {
        if (confirm('🔄 Reset all progress? This cannot be undone!')) {
            state.running = false;
            if (state.animFrame) cancelAnimationFrame(state.animFrame);
            localStorage.removeItem('bubblepop_high');
            state.highScore = 0;
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

    // Initial draw
    drawStartScreen();

    // Load leaderboard
    if (typeof renderLeaderboard === 'function') renderLeaderboard('bubble-pop', 'lb-bp-content', 'Bubble Pop');

    // Share button
    document.getElementById('bp-share-btn')?.addEventListener('click', () => {
        const score = state.highScore || 0;
        if (typeof shareScore === 'function') shareScore('Bubble Pop', score, 'https://hritihub.uk/games/bubble-pop/');
    });
}

function drawStartScreen() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0c3b5c');
    bg.addColorStop(0.3, '#1a6b9a');
    bg.addColorStop(0.6, '#3498db');
    bg.addColorStop(1, '#5dade2');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative bubbles
    for (let i = 0; i < 8; i++) {
        const bx = 40 + i * 55 + Math.sin(i * 3) * 15;
        const by = 50 + i * 55;
        ctx.globalAlpha = 0.15;
        const grad = ctx.createRadialGradient(bx, by, 2, bx, by, 18);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, i % 2 === 0 ? '#e74c3c' : '#3498db');
        ctx.beginPath();
        ctx.arc(bx, by, 18, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // High score
    if (state.highScore > 0) {
        ctx.font = 'bold 18px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(`🏆 Best: ${state.highScore}`, W / 2, H - 40);
    }
}

// ===== UTILITY =====
function lightenColor(hex, pct) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + pct);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + pct);
    const b = Math.min(255, (num & 0x0000FF) + pct);
    return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, pct) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - pct);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - pct);
    const b = Math.max(0, (num & 0x0000FF) - pct);
    return `rgb(${r},${g},${b})`;
}

// Start
document.addEventListener('DOMContentLoaded', init);
