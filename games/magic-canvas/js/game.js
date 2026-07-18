/* ============================================
   MAGIC CANVAS — Full Game Engine
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('mc-canvas');
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
    score:       document.getElementById('mc-score'),
    scoreBottom: document.getElementById('mc-score-bottom'),
    startOverlay: document.getElementById('mc-start-overlay'),
    startBtn:     document.getElementById('mc-start-btn'),
    toolbar:      document.getElementById('mc-toolbar'),
    undoBtn:      document.getElementById('mc-undo-btn'),
    clearBtn:     document.getElementById('mc-clear-btn'),
    saveBtn:      document.getElementById('mc-save-btn'),
    muteBtn:      document.getElementById('mc-mute-btn'),
    colors:       document.getElementById('mc-colors')
};

// ===== State =====
const state = {
    drawing: false,
    tool: 'pen',
    color: '#e74c3c',
    size: 3,
    masterpieceCount: 0,
    strokes: [],
    currentStroke: null,
    muted: false,
    running: false
};

// Load saved data
try {
    const saved = localStorage.getItem('mc_masterpieces');
    if (saved) state.masterpieceCount = parseInt(saved) || 0;
    const muted = localStorage.getItem('mc_muted');
    if (muted === '1') state.muted = true;
} catch(e) {}

// ===== Color Palette =====
const COLORS = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db',
    '#9b59b6', '#1a1a2e', '#e84393', '#00cec9', '#fd79a8',
    '#fff', '#ccc', '#555', '#000'
];

// ===== Sound (Web Audio) =====
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playNote(freq, duration, type) {
    if (state.muted || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}
function playBrush() {
    playNote(600 + Math.random() * 400, 0.05, 'sine');
}
function playSave() {
    playNote(523, 0.1, 'sine');
    setTimeout(() => playNote(659, 0.1, 'sine'), 100);
    setTimeout(() => playNote(784, 0.15, 'sine'), 200);
}

// ===== Particles =====
let particles = [];
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        particles.push({
            x, y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s - 1,
            life: 1,
            decay: 0.02 + Math.random() * 0.03,
            size: 2 + Math.random() * 4,
            color: color || '#fff'
        });
    }
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ===== Rainbow Color =====
let rainbowHue = 0;
function getRainbowColor() {
    rainbowHue = (rainbowHue + 3) % 360;
    return `hsl(${rainbowHue}, 100%, 60%)`;
}

// ===== Drawing =====
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (W / rect.width),
        y: (clientY - rect.top) * (H / rect.height)
    };
}

function startStroke(pos) {
    if (!state.running) return;
    state.drawing = true;
    state.currentStroke = {
        points: [pos],
        tool: state.tool,
        color: state.tool === 'rainbow' ? '#fff' : state.color,
        size: state.size
    };
    state.strokes.push(state.currentStroke);
    drawDot(pos.x, pos.y, state.tool, state.color, state.size);
    if (state.tool !== 'eraser') playBrush();
}

function continueStroke(pos) {
    if (!state.drawing || !state.currentStroke) return;
    const last = state.currentStroke.points[state.currentStroke.points.length - 1];
    state.currentStroke.points.push(pos);
    drawLine(last.x, last.y, pos.x, pos.y, state.tool, state.color, state.size);

    // Sparkle/star particles
    if (state.tool === 'sparkle') {
        spawnParticles(pos.x, pos.y, '#f1c40f', 2);
    } else if (state.tool === 'stars') {
        spawnParticles(pos.x, pos.y, '#fff', 1);
    }
}

function endStroke() {
    state.drawing = false;
    state.currentStroke = null;
}

function drawDot(x, y, tool, color, size) {
    if (tool === 'eraser') {
        ctx.clearRect(x - size, y - size, size * 2, size * 2);
        return;
    }
    const c = tool === 'rainbow' ? getRainbowColor() : color;
    ctx.save();
    if (tool === 'glow') {
        ctx.shadowColor = c;
        ctx.shadowBlur = 20;
    }
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawLine(x1, y1, x2, y2, tool, color, size) {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(Math.ceil(dist / 2), 1);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        drawDot(x, y, tool, color, size);
    }
}

// ===== Undo =====
function undo() {
    if (!state.strokes.length) return;
    state.strokes.pop();
    redrawAll();
    playNote(300, 0.08, 'sine');
}
function redrawAll() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    rainbowHue = 0;
    state.strokes.forEach(stroke => {
        if (!stroke.points.length) return;
        // Reset rainbow hue per stroke for consistent colors
        if (stroke.tool === 'rainbow') rainbowHue = 0;
        drawDot(stroke.points[0].x, stroke.points[0].y, stroke.tool, stroke.color, stroke.size);
        for (let i = 1; i < stroke.points.length; i++) {
            drawLine(
                stroke.points[i - 1].x, stroke.points[i - 1].y,
                stroke.points[i].x, stroke.points[i].y,
                stroke.tool, stroke.color, stroke.size
            );
        }
    });
}

// ===== Save Artwork =====
function saveArt() {
    state.masterpieceCount++;
    localStorage.setItem('mc_masterpieces', state.masterpieceCount);
    updateScore();
    playSave();

    // Create download
    const link = document.createElement('a');
    link.download = `magic-canvas-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Submit to leaderboard
    if (typeof saveScore === 'function') saveScore('magic-canvas', state.masterpieceCount);
    if (typeof renderLeaderboard === 'function') renderLeaderboard('magic-canvas', 'lb-mc-content', 'Magic Canvas');

    showToast('💾 Saved! +1 Masterpiece');
}

// ===== Clear =====
function clearCanvas() {
    if (!state.strokes.length) return;
    if (!confirm('🗑️ Clear your entire drawing?')) return;
    state.strokes = [];
    redrawAll();
    playNote(200, 0.15, 'sawtooth');
}

// ===== Score =====
function updateScore() {
    dom.score.textContent = state.masterpieceCount;
    dom.scoreBottom.textContent = state.masterpieceCount;
}

// ===== Toast =====
function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// ===== Init Colors =====
function initColors() {
    COLORS.forEach(c => {
        const swatch = document.createElement('button');
        swatch.className = 'mc-color-swatch' + (c === state.color ? ' active' : '');
        swatch.style.background = c;
        if (c === '#fff') swatch.style.border = '2px solid #ddd';
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.mc-color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            state.color = c;
            if (state.tool === 'eraser') {
                // Switch back to pen when picking color
                selectTool('pen');
            }
            playNote(500, 0.05, 'sine');
        });
        dom.colors.appendChild(swatch);
    });
}

// ===== Tool Selection =====
function selectTool(tool) {
    state.tool = tool;
    document.querySelectorAll('.mc-tool-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tool === tool);
    });
    canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
    playNote(400, 0.04, 'sine');
}

// ===== Mute =====
function toggleMute() {
    state.muted = !state.muted;
    localStorage.setItem('mc_muted', state.muted ? '1' : '0');
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
}

// ===== Bind Events =====
function bindEvents() {
    // Mouse
    canvas.addEventListener('mousedown', e => startStroke(getPos(e)));
    canvas.addEventListener('mousemove', e => { if (state.drawing) continueStroke(getPos(e)); });
    canvas.addEventListener('mouseup', endStroke);
    canvas.addEventListener('mouseleave', endStroke);

    // Touch
    canvas.addEventListener('touchstart', e => {
        if (e.target.closest('button, a, input')) return;
        e.preventDefault();
        startStroke(getPos(e));
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (state.drawing) continueStroke(getPos(e));
    }, { passive: false });
    canvas.addEventListener('touchend', e => { e.preventDefault(); endStroke(); }, { passive: false });

    // Tool buttons
    document.querySelectorAll('.mc-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => selectTool(btn.dataset.tool));
    });

    // Size buttons
    document.querySelectorAll('.mc-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mc-size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.size = parseInt(btn.dataset.size);
        });
    });

    // Action buttons
    dom.startBtn.addEventListener('click', startGame);
    dom.undoBtn.addEventListener('click', undo);
    dom.clearBtn.addEventListener('click', clearCanvas);
    dom.saveBtn.addEventListener('click', saveArt);

    // Mute
    dom.muteBtn.addEventListener('click', toggleMute);
    if (state.muted) dom.muteBtn.textContent = '🔇';

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

// ===== Game Loop (particles) =====
function gameLoop() {
    if (particles.length) {
        // Only redraw if particles are visible
        redrawAll();
        updateParticles();
    }
    requestAnimationFrame(gameLoop);
}

// ===== Start =====
function startGame() {
    state.running = true;
    dom.startOverlay.classList.add('hidden');
    initAudio();

    // Load leaderboard
    if (typeof renderLeaderboard === 'function') renderLeaderboard('magic-canvas', 'lb-mc-content', 'Magic Canvas');

    // Share button
    document.getElementById('mc-share-btn')?.addEventListener('click', () => {
        const score = state.masterpieceCount || 0;
        if (typeof shareScore === 'function') shareScore('Magic Canvas', score, 'https://hritihub.uk/games/magic-canvas/');
    });
}

// ===== Init =====
function init() {
    // Start white canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    initColors();
    bindEvents();
    gameLoop();
    updateScore();

    // Restore mute
    if (state.muted) dom.muteBtn.textContent = '🔇';
}

init();
