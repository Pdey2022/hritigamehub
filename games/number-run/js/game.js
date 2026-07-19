/* ============================================
   NUMBER RUN — Full Game Engine
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('nr-canvas');
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
    score:     document.getElementById('nr-score'),
    timer:     document.getElementById('nr-timer'),
    nextNum:   document.getElementById('nr-next'),
    wrapper:   document.getElementById('nr-canvas-wrapper'),
    startOverlay:    document.getElementById('nr-start-overlay'),
    gameoverOverlay: document.getElementById('nr-gameover-overlay'),
    gameoverStats:   document.getElementById('nr-gameover-stats'),
    startBtn:  document.getElementById('nr-start-btn'),
    restartBtn:document.getElementById('nr-restart-btn'),
    muteBtn:   document.getElementById('nr-mute-btn'),
    resetBtn:  document.getElementById('nr-reset-btn')
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('nr_muted') === 'true';
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
function playTap()    { playTone(660, 0.06, 'sine', 0.06); playTone(880, 0.05, 'sine', 0.04); }
function playWrong()  { playTone(300, 0.12, 'sawtooth', 0.05); }
function playFinish() { playTone(523, 0.08, 'sine', 0.06); setTimeout(() => playTone(659, 0.08, 'sine', 0.05), 80); setTimeout(() => playTone(784, 0.1, 'sine', 0.05), 160); }
function playGameOver(){ playTone(400, 0.2, 'sawtooth', 0.07); playTone(300, 0.3, 'sawtooth', 0.05); }

// ===== GAME STATE =====
const state = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('nr_high')) || 0,
    gameOver: false,
    timeLeft: 45,
    numbers: [],
    nextTarget: 1,
    totalNumbers: 10,
    round: 1,
    comboCount: 0,
    animFrame: null,
    lastTime: 0,
    timerTick: 0,
    timerInterval: null
};

// ===== SPAWN NUMBERS =====
const NR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];

function spawnNumbers() {
    state.numbers = [];
    const count = Math.min(5 + Math.floor(state.round / 2), 12);
    state.totalNumbers = count;
    state.nextTarget = 1;

    // Generate positions without overlap
    for (let i = 1; i <= count; i++) {
        let x, y, overlap;
        let attempts = 0;
        do {
            x = 30 + Math.random() * (W - 80);
            y = 30 + Math.random() * (H - 80);
            overlap = state.numbers.some(n => Math.abs(n.x - x) < 50 && Math.abs(n.y - y) < 50);
            attempts++;
        } while (overlap && attempts < 20);

        state.numbers.push({
            value: i,
            x, y,
            radius: 22,
            color: NR_COLORS[i % NR_COLORS.length],
            collected: false,
            animScale: 0
        });
    }

    dom.nextNum.textContent = 'Next: ' + state.nextTarget;
}

// ===== GAME LOOP =====
function gameLoop(timestamp) {
    if (!state.running) return;
    if (!state.lastTime) state.lastTime = timestamp;
    const dt = Math.min(timestamp - state.lastTime, 33);
    state.lastTime = timestamp;

    // Timer
    state.timerTick += dt;
    if (state.timerTick >= 1000) {
        state.timerTick -= 1000;
        state.timeLeft--;
        dom.timer.textContent = state.timeLeft + 's';
        if (state.timeLeft <= 0) { gameOver(); return; }
    }

    // Animate collected numbers (scale down)
    for (const n of state.numbers) {
        if (n.collected && n.animScale < 1) {
            n.animScale += 0.08;
        }
    }

    draw();
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== DRAW =====
function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d1f2e');
    grad.addColorStop(0.5, '#0a1628');
    grad.addColorStop(1, '#060d18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < W; x += 30) {
        for (let y = 0; y < H; y += 30) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Round info
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(8, 6, 80, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏁 Round ' + state.round, 14, 16);

    // Numbers
    for (const n of state.numbers) {
        if (n.collected && n.animScale >= 1) continue;

        const scale = n.collected ? 1 - n.animScale : 1;
        if (scale <= 0) continue;

        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.scale(scale, scale);

        // Glow for next target
        if (n.value === state.nextTarget && !n.collected) {
            ctx.fillStyle = 'rgba(250, 204, 21, 0.1)';
            ctx.beginPath();
            ctx.arc(0, 0, n.radius + 6 + Math.sin(Date.now() * 0.005) * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(250, 204, 21, 0.05)';
            ctx.beginPath();
            ctx.arc(0, 0, n.radius + 14, 0, Math.PI * 2);
            ctx.fill();
        }

        // Circle
        ctx.fillStyle = n.collected ? 'rgba(255,255,255,0.1)' : n.color;
        ctx.beginPath();
        ctx.arc(0, 0, n.radius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = n.collected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Number
        ctx.fillStyle = n.collected ? 'rgba(255,255,255,0.2)' : 'white';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.value, 0, 1);

        ctx.restore();
    }

    // Score
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(W - 90, 6, 82, 20);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐ ' + state.score, W - 14, 16);
}

// ===== HANDLE CLICK =====
function handleClick(clientX, clientY) {
    if (!state.running) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    // Check numbers from top to bottom (last drawn = last in array ≈ topmost)
    for (let i = state.numbers.length - 1; i >= 0; i--) {
        const n = state.numbers[i];
        if (n.collected) continue;

        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < n.radius * n.radius) {
            if (n.value === state.nextTarget) {
                // Correct!
                n.collected = true;
                n.animScale = 0;
                state.nextTarget++;
                state.comboCount++;

                const points = 10 + Math.min(state.comboCount - 1, 4) * 3;
                state.score += points;
                dom.score.textContent = state.score;
                dom.nextNum.textContent = state.nextTarget <= state.totalNumbers ? 'Next: ' + state.nextTarget : '✅ Done!';
                playTap();

                if (state.score > state.highScore) {
                    state.highScore = state.score;
                    localStorage.setItem('nr_high', state.highScore);
                }

                // Check if round complete
                if (state.nextTarget > state.totalNumbers) {
                    state.round++;
                    playFinish();
                    setTimeout(() => {
                        if (state.running) spawnNumbers();
                    }, 500);
                }
            } else {
                // Wrong number
                playWrong();
                // Shake feedback via brief visual
            }
            return;
        }
    }
}

// ===== GAME OVER =====
function gameOver() {
    state.running = false;
    state.gameOver = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    playGameOver();

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('nr_high', state.highScore);
    }

    dom.gameoverStats.innerHTML = 'Score: ' + state.score + ' 🔢 | Rounds: ' + (state.round - 1);
    dom.gameoverOverlay.classList.remove('hidden');

    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('number-run', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('number-run', 'lb-nr-content', 'Number Run');
    }
}

// ===== RESET =====
function resetGame() {
    state.running = false; state.gameOver = false;
    state.score = 0; state.round = 1; state.comboCount = 0;
    state.timeLeft = 45; state.timerTick = 0; state.lastTime = 0;
    state.numbers = []; state.nextTarget = 1;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    dom.score.textContent = '0';
    dom.timer.textContent = '45s';
    dom.nextNum.textContent = 'Next: 1';
    dom.gameoverOverlay.classList.add('hidden');
    dom.startOverlay.classList.remove('hidden');
    draw();
}

// ===== START =====
function startGame() {
    if (state.running) return;
    state.running = true; state.gameOver = false;
    state.score = 0; state.round = 1; state.comboCount = 0;
    state.timeLeft = 45; state.timerTick = 0; state.lastTime = 0;
    state.numbers = []; state.nextTarget = 1;
    dom.score.textContent = '0';
    dom.timer.textContent = '45s';
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    spawnNumbers();
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    state.animFrame = requestAnimationFrame(gameLoop);
    draw();
}

// ===== EVENTS =====
canvas.addEventListener('click', (e) => handleClick(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    handleClick(t.clientX, t.clientY);
}, { passive: false });

// ----- Mute -----
if (dom.muteBtn) {
    dom.muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('nr_muted', isMuted);
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
draw();
dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.resetBtn.addEventListener('click', resetGame);
dom.startBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });
dom.restartBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });

if (typeof renderLeaderboard === 'function') {
    renderLeaderboard('number-run', 'lb-nr-content', 'Number Run');
}
