/* ============================================
   OCEAN EXPLORER — Full Game Engine
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('oe-canvas');
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
    score:     document.getElementById('oe-score'),
    timer:     document.getElementById('oe-timer'),
    wrapper:   document.getElementById('oe-canvas-wrapper'),
    startOverlay:    document.getElementById('oe-start-overlay'),
    gameoverOverlay: document.getElementById('oe-gameover-overlay'),
    gameoverStats:   document.getElementById('oe-gameover-stats'),
    startBtn:  document.getElementById('oe-start-btn'),
    restartBtn:document.getElementById('oe-restart-btn'),
    muteBtn:   document.getElementById('oe-mute-btn'),
    resetBtn:  document.getElementById('oe-reset-btn'),
    collectionGrid: document.getElementById('oe-collection-grid')
};

// ===== FISH TYPES =====
const FISH_TYPES = [
    { id: 'clownfish',  name: 'Clownfish',   emoji: '🐠', color: '#f97316', points: 10, speed: 1.2, weight: 30, minSize: 20 },
    { id: 'tang',       name: 'Blue Tang',   emoji: '🐟', color: '#0ea5e9', points: 10, speed: 1.0, weight: 30, minSize: 22 },
    { id: 'puffer',     name: 'Pufferfish',  emoji: '🐡', color: '#eab308', points: 15, speed: 0.7, weight: 15, minSize: 24 },
    { id: 'jellyfish',  name: 'Jellyfish',   emoji: '🪼',  color: '#d946ef', points: 20, speed: 0.9, weight: 12, minSize: 26 },
    { id: 'seahorse',   name: 'Seahorse',    emoji: '🐴', color: '#f472b6', points: 25, speed: 0.6, weight: 8,  minSize: 18 },
    { id: 'turtle',     name: 'Sea Turtle',  emoji: '🐢', color: '#22c55e', points: 30, speed: 0.5, weight: 4,  minSize: 30 },
    { id: 'dolphin',    name: 'Dolphin',     emoji: '🐬', color: '#06b6d4', points: 50, speed: 1.8, weight: 1,  minSize: 28 },
    { id: 'whale',      name: 'Whale',       emoji: '🐋', color: '#3b82f6', points: 80, speed: 0.4, weight: 1,  minSize: 36 }
];

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('oe_muted') === 'true';
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
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, a.currentTime);
        g.gain.setValueAtTime(vol || 0.06, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
        o.connect(g);
        g.connect(a.destination);
        o.start();
        o.stop(a.currentTime + duration);
    } catch(e) { /* silent */ }
}

function playCatch()  { playTone(880, 0.08, 'sine', 0.08); playTone(1100, 0.06, 'sine', 0.06); }
function playRare()   { playTone(660, 0.1, 'sine', 0.08); playTone(880, 0.1, 'sine', 0.06); playTone(1100, 0.12, 'sine', 0.05); }
function playGameOver(){ playTone(400, 0.2, 'sawtooth', 0.08); playTone(300, 0.3, 'sawtooth', 0.06); }

// ===== WEIGHTED PICK =====
function pickFish() {
    const total = FISH_TYPES.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * total;
    for (const f of FISH_TYPES) {
        r -= f.weight;
        if (r <= 0) return { ...f };
    }
    return { ...FISH_TYPES[0] };
}

// ===== GAME STATE =====
const state = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('oe_high')) || 0,
    gameOver: false,
    timeLeft: 45,
    fish: [],
    discovered: JSON.parse(localStorage.getItem('oe_discovered') || '[]'),
    spawnTimer: 0,
    spawnInterval: 120,
    animFrame: null,
    lastTime: 0,
    timerTick: 0
};

// ===== FISH ENTITY =====
function createFish() {
    const type = pickFish();
    return {
        ...type,
        x: W + 30,
        y: 30 + Math.random() * (H - 80),
        size: type.minSize + Math.random() * 8,
        vy: (Math.random() - 0.5) * 0.6,
        bob: Math.random() * Math.PI * 2,
        caught: false
    };
}

// ===== GAME LOOP =====
function gameLoop(timestamp) {
    if (!state.running) return;

    if (!state.lastTime) state.lastTime = timestamp;
    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;

    // Timer (every ~1 second)
    state.timerTick += dt;
    if (state.timerTick >= 1000) {
        state.timerTick -= 1000;
        state.timeLeft--;
        dom.timer.textContent = state.timeLeft + 's';
        if (state.timeLeft <= 0) {
            gameOver();
            return;
        }
    }

    // Spawn fish
    state.spawnTimer += dt;
    const spawnRate = Math.max(60, state.spawnInterval - state.score * 0.5);
    if (state.fish.length < 10) {
        while (state.spawnTimer >= spawnRate) {
            state.spawnTimer -= spawnRate;
            state.fish.push(createFish());
        }
    }

    // Update fish
    for (let i = state.fish.length - 1; i >= 0; i--) {
        const f = state.fish[i];
        f.x -= f.speed * (dt / 16);
        f.bob += 0.03;
        f.y += Math.sin(f.bob) * 0.3 + f.vy;

        // Remove if off-screen
        if (f.x < -40) {
            state.fish.splice(i, 1);
        }
    }

    // Draw
    draw();

    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== DRAW =====
function draw() {
    ctx.clearRect(0, 0, W, H);

    // Ocean background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#00284a');
    grad.addColorStop(0.5, '#001a33');
    grad.addColorStop(1, '#000d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Light rays
    for (let i = 0; i < 5; i++) {
        const lx = 60 + i * 100 + Math.sin(Date.now() / 3000 + i) * 20;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx - 15, H);
        ctx.lineTo(lx + 15, H);
        ctx.closePath();
        ctx.fill();
    }

    // Sea floor
    ctx.fillStyle = '#001a2e';
    ctx.fillRect(0, H - 20, W, 20);
    // Sand
    ctx.fillStyle = '#1a3a2e';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 20) {
        const sy = H - 20 + Math.sin(x * 0.05) * 3;
        x === 0 ? ctx.moveTo(x, sy) : ctx.lineTo(x, sy);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Bubbles (decorative)
    for (let i = 0; i < 8; i++) {
        const bx = 30 + i * 60 + Math.sin(Date.now() / 2000 + i * 2) * 10;
        const by = H - 30 - i * 50 + Math.sin(Date.now() / 1500 + i) * 5;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.beginPath();
        ctx.arc(bx, by, 3 + Math.sin(Date.now() / 1000 + i) * 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw fish
    for (const f of state.fish) {
        const fx = f.x;
        const fy = f.y;

        // Body (oval)
        ctx.save();
        ctx.translate(fx, fy);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(2, 3, f.size * 0.9 + 2, f.size * 0.5 + 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fish body
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size * 0.9, f.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.8, 0);
        ctx.lineTo(-f.size * 1.3, -f.size * 0.4);
        ctx.lineTo(-f.size * 1.3, f.size * 0.4);
        ctx.closePath();
        ctx.fill();

        // Dorsal fin
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.2, -f.size * 0.4);
        ctx.lineTo(f.size * 0.1, -f.size * 0.7);
        ctx.lineTo(f.size * 0.4, -f.size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(f.size * 0.35, -f.size * 0.1, f.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(f.size * 0.4, -f.size * 0.1, f.size * 0.07, 0, Math.PI * 2);
        ctx.fill();

        // Emoji overlay
        ctx.font = (f.size * 0.7) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, 0, 0);

        ctx.restore();
    }

    // HUD on canvas - collected
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.roundRect(8, 6, 100, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐ ' + state.score, 14, 17);
}

// ===== HANDLE CLICK/TAP =====
function handleClick(clientX, clientY) {
    if (!state.running) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    // Check fish (from topmost = last in array)
    for (let i = state.fish.length - 1; i >= 0; i--) {
        const f = state.fish[i];
        const halfW = f.size;
        const halfH = f.size * 0.5;
        if (mx >= f.x - halfW && mx <= f.x + halfW &&
            my >= f.y - halfH && my <= f.y + halfH) {

            f.caught = true;
            state.score += f.points;

            // Track discovered species
            if (!state.discovered.includes(f.id)) {
                state.discovered.push(f.id);
                localStorage.setItem('oe_discovered', JSON.stringify(state.discovered));
                renderCollection();
                playRare();
                showFeed(f.emoji + ' ' + f.name + ' discovered! +' + f.points);
            } else {
                playCatch();
                showFeed('+' + f.points);
            }

            if (state.score > state.highScore) {
                state.highScore = state.score;
                localStorage.setItem('oe_high', state.highScore);
            }

            dom.score.textContent = state.score;
            state.fish.splice(i, 1);

            // Spawn interval gets faster as score grows
            break;
        }
    }
}

// ===== SHOW FEED =====
function showFeed(text) {
    if (!dom.wrapper) return;
    const el = document.createElement('div');
    el.className = 'oe-feed';
    el.textContent = text;
    el.style.left = '50%';
    el.style.top = '40%';
    el.style.transform = 'translateX(-50%)';
    dom.wrapper.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

// ===== COLLECTION =====
function renderCollection() {
    if (!dom.collectionGrid) return;
    dom.collectionGrid.innerHTML = FISH_TYPES.map(f =>
        '<div class="oe-collection-item ' + (state.discovered.includes(f.id) ? 'discovered' : 'unseen') + '" title="' + f.name + '">' +
        f.emoji + '</div>'
    ).join('');
}

// ===== GAME OVER =====
function gameOver() {
    state.running = false;
    state.gameOver = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    playGameOver();

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('oe_high', state.highScore);
    }

    const totalFish = FISH_TYPES.length;
    const found = state.discovered.length;
    dom.gameoverStats.innerHTML = 'Score: ' + state.score + ' 🐠 | Discovered: ' + found + '/' + totalFish;
    dom.gameoverOverlay.classList.remove('hidden');

    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('ocean-explorer', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('ocean-explorer', 'lb-oe-content', 'Ocean Explorer');
    }
}

// ===== RESET =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.fish = [];
    state.spawnTimer = 0;
    state.timeLeft = 45;
    state.timerTick = 0;
    state.lastTime = 0;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    dom.score.textContent = '0';
    dom.timer.textContent = '45s';
    dom.gameoverOverlay.classList.add('hidden');
    dom.startOverlay.classList.remove('hidden');
    draw();
}

// ===== START =====
function startGame() {
    if (state.running) return;
    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.fish = [];
    state.spawnTimer = 0;
    state.timeLeft = 45;
    state.timerTick = 0;
    state.lastTime = 0;
    dom.score.textContent = '0';
    dom.timer.textContent = '45s';
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    state.lastTime = 0;
    state.animFrame = requestAnimationFrame(gameLoop);
    draw();
}

// ===== EVENTS =====
canvas.addEventListener('click', (e) => {
    handleClick(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    handleClick(t.clientX, t.clientY);
}, { passive: false });

// ----- Mute Toggle -----
if (dom.muteBtn) {
    dom.muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('oe_muted', isMuted);
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
renderCollection();
draw();
dom.timer.textContent = '45s';

dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.resetBtn.addEventListener('click', resetGame);
dom.startBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });
dom.restartBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });

if (typeof renderLeaderboard === 'function') {
    renderLeaderboard('ocean-explorer', 'lb-oe-content', 'Ocean Explorer');
}
