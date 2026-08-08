/* ============================================
   SUPER BUILDER — Main Game Logic
   ============================================ */

const canvas = document.getElementById('sb-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 550;
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

const dom = {
    level: document.getElementById('sb-level'),
    score: document.getElementById('sb-score'),
    moves: document.getElementById('sb-moves'),
    remaining: document.getElementById('sb-remaining'),
    best: document.getElementById('sb-best'),
    status: document.getElementById('sb-status'),
    startOverlay: document.getElementById('sb-start-overlay'),
    gameoverOverlay: document.getElementById('sb-gameover-overlay'),
    levelcompleteOverlay: document.getElementById('sb-levelcomplete-overlay'),
    wonOverlay: document.getElementById('sb-won-overlay'),
    startBtn: document.getElementById('sb-start-btn'),
    restartBtn: document.getElementById('sb-restart-btn'),
    nextBtn: document.getElementById('sb-next-btn'),
    playAgainBtn: document.getElementById('sb-playagain-btn'),
    muteBtn: document.getElementById('sb-mute-btn'),
    resetBtn: document.getElementById('sb-reset-btn'),
    palette: Array.from(document.querySelectorAll('.sb-palette-btn'))
};

const BLOCK_TYPES = {
    brick: { color: '#b45309', label: '🧱' },
    glass: { color: '#60a5fa', label: '🟦' },
    roof: { color: '#dc2626', label: '🔶' },
    erase: { color: '#2d3748', label: '✖' }
};

const LEVELS = [
    { rows: 6, cols: 6, blueprint: [
        '......',
        '.BBBB.',
        '.B..B.',
        '.BBBB.',
        '.B..B.',
        '......'
    ], limit: 25, score: 120 },
    { rows: 7, cols: 6, blueprint: [
        '......',
        '.GGGG.',
        '.G..G.',
        '.GBBG.',
        '.G..G.',
        '.GGGG.',
        '......'
    ], limit: 30, score: 180 },
    { rows: 7, cols: 7, blueprint: [
        '.......',
        '.BBBBB.',
        '.B...B.',
        '.BRRB.B',
        '.B...B.',
        '.BBBBB.',
        '.......'
    ], limit: 34, score: 240 },
    { rows: 8, cols: 7, blueprint: [
        '.......',
        '.GGGGG.',
        '.G...G.',
        '.GBRRG.',
        '.G.RRG.',
        '.G...G.',
        '.GGGGG.',
        '.......'
    ], limit: 36, score: 300 }
];

const state = {
    level: 0,
    score: 0,
    moves: 0,
    remaining: 0,
    selected: 'brick',
    grid: [],
    blueprint: [],
    best: parseInt(localStorage.getItem('sb_best')) || 0,
    animFrame: null,
    running: false,
    mouseDown: false
};

let audioCtx = null;
let isMuted = localStorage.getItem('sb_muted') === 'true';

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('sb_muted', isMuted);
    dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';
}

function playTone(freq = 440, duration = 0.1) {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {}
}

function playPlace() { playTone(660, 0.08); }
function playError() { playTone(220, 0.2); }
function playWin() { [660, 760, 880].forEach((f, i) => setTimeout(() => playTone(f, 0.1), i * 80)); }
function playFail() { [240, 200, 160].forEach((f, i) => setTimeout(() => playTone(f, 0.1), i * 100)); }

function createGrid(rows, cols) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
}

function loadLevel(index) {
    const level = LEVELS[index];
    state.level = index;
    state.score = 0;
    state.moves = 0;
    state.remaining = level.limit;
    state.grid = createGrid(level.rows, level.cols);
    state.blueprint = level.blueprint.map(row => row.split(''));
    state.selected = 'brick';
    dom.palette.forEach(btn => btn.classList.toggle('selected', btn.dataset.type === state.selected));
    state.running = false;
    updateHud();
    render();
    showOverlay(dom.startOverlay);
    hideOverlay(dom.gameoverOverlay);
    hideOverlay(dom.levelcompleteOverlay);
    hideOverlay(dom.wonOverlay);
    dom.status.textContent = 'Build the structure by placing the right blocks in each space.';
}

function updateHud() {
    dom.level.textContent = state.level + 1;
    dom.score.textContent = state.score;
    dom.moves.textContent = state.moves;
    dom.remaining.textContent = state.remaining;
    dom.best.textContent = state.best;
    dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';
}

function showOverlay(el) { if (el) el.classList.remove('hidden'); }
function hideOverlay(el) { if (el) el.classList.add('hidden'); }

function getCellSize() {
    const level = LEVELS[state.level];
    return Math.min(420 / level.cols, 420 / level.rows);
}

function drawGrid() {
    const level = LEVELS[state.level];
    const size = getCellSize();
    const offsetX = (W - size * level.cols) / 2;
    const offsetY = (H - size * level.rows) / 2 - 20;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, W, H);

    // Blueprint overlay grid
    for (let y = 0; y < level.rows; y++) {
        for (let x = 0; x < level.cols; x++) {
            const px = offsetX + x * size;
            const py = offsetY + y * size;
            const tile = state.blueprint[y][x];
            ctx.fillStyle = tile === '.' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
            ctx.fillRect(px, py, size - 2, size - 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.strokeRect(px, py, size - 2, size - 2);
            if (tile !== '.') {
                const color = tile === 'B' ? BLOCK_TYPES.brick.color : tile === 'G' ? BLOCK_TYPES.glass.color : tile === 'R' ? BLOCK_TYPES.roof.color : '#718096';
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.25;
                ctx.fillRect(px + 6, py + 6, size - 14, size - 14);
                ctx.globalAlpha = 1;
            }
            const placed = state.grid[y][x];
            if (placed) {
                ctx.fillStyle = placed === 'erase' ? '#2d3748' : BLOCK_TYPES[placed].color;
                ctx.fillRect(px + 4, py + 4, size - 10, size - 10);
            }
        }
    }

    // Blueprint legend
    ctx.fillStyle = '#f7fafc';
    ctx.font = '14px Fredoka, sans-serif';
    ctx.fillText('Blueprint preview: brick 🧱, glass 🟦, roof 🔶', 20, H - 20);
}

function isBlueprintMatch() {
    const level = LEVELS[state.level];
    for (let y = 0; y < level.rows; y++) {
        for (let x = 0; x < level.cols; x++) {
            const target = state.blueprint[y][x];
            const placed = state.grid[y][x];
            if (target === '.') continue;
            if (!placed || placed === 'erase') return false;
            if ((target === 'B' && placed !== 'brick') || (target === 'G' && placed !== 'glass') || (target === 'R' && placed !== 'roof')) return false;
        }
    }
    return true;
}

function handleCanvasClick(event) {
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const level = LEVELS[state.level];
    const size = getCellSize();
    const offsetX = (W - size * level.cols) / 2;
    const offsetY = (H - size * level.rows) / 2 - 20;

    const col = Math.floor((x - offsetX) / size);
    const row = Math.floor((y - offsetY) / size);

    if (row < 0 || col < 0 || row >= level.rows || col >= level.cols) return;
    if (state.remaining <= 0) return;

    const target = state.blueprint[row][col];
    const selected = state.selected;
    const current = state.grid[row][col];

    if (selected === 'erase') {
        if (!current) return;
        state.grid[row][col] = '';
        state.remaining -= 1;
        state.moves += 1;
        playTone(220, 0.08);
        dom.status.textContent = 'Erased one block. Keep building the correct shape.';
    } else {
        if (current === selected) return;
        if (target === '.' || 
            (target === 'B' && selected !== 'brick') ||
            (target === 'G' && selected !== 'glass') ||
            (target === 'R' && selected !== 'roof')) {
            state.grid[row][col] = selected;
            state.remaining -= 1;
            state.moves += 1;
            playError();
            dom.status.textContent = 'That block does not match the blueprint. Try a different block.';
        } else {
            state.grid[row][col] = selected;
            state.remaining -= 1;
            state.moves += 1;
            playPlace();
            dom.status.textContent = 'Nice! Keep matching the blueprint.';
        }
    }

    updateHud();
    render();
    checkGameProgress();
}

function checkGameProgress() {
    if (isBlueprintMatch()) {
        state.score += LEVELS[state.level].score;
        if (state.score > state.best) {
            state.best = state.score;
            localStorage.setItem('sb_best', state.best);
        }
        updateHud();
        playWin();
        if (state.level === LEVELS.length - 1) {
            hideOverlay(dom.startOverlay);
            hideOverlay(dom.gameoverOverlay);
            hideOverlay(dom.levelcompleteOverlay);
            showOverlay(dom.wonOverlay);
        } else {
            dom.levelcompleteOverlay.querySelector('#sb-levelcomplete-stats').textContent = 'You completed the design!';
            hideOverlay(dom.startOverlay);
            hideOverlay(dom.gameoverOverlay);
            showOverlay(dom.levelcompleteOverlay);
        }
        state.running = false;
        cancelAnimationFrame(state.animFrame);
        return;
    }

    if (state.remaining <= 0) {
        playFail();
        dom.gameoverOverlay.querySelector('#sb-gameover-stats').textContent = 'Out of moves. Try the design again.';
        hideOverlay(dom.startOverlay);
        hideOverlay(dom.levelcompleteOverlay);
        showOverlay(dom.gameoverOverlay);
        state.running = false;
        cancelAnimationFrame(state.animFrame);
    }
}

function render() {
    drawGrid();
}

function startGame() {
    state.running = true;
    hideOverlay(dom.startOverlay);
    state.moves = 0;
    state.remaining = LEVELS[state.level].limit;
    updateHud();
    render();
}

function nextLevel() {
    if (state.level < LEVELS.length - 1) {
        loadLevel(state.level + 1);
    } else {
        loadLevel(0);
    }
}

function resetLevel() {
    loadLevel(state.level);
    dom.status.textContent = 'Level reset. Start building again!';
}

function selectBlock(type) {
    state.selected = type;
    dom.palette.forEach(btn => btn.classList.toggle('selected', btn.dataset.type === type));
    dom.status.textContent = 'Selected ' + (type === 'erase' ? 'Erase' : BLOCK_TYPES[type].label + ' ' + type) + '.';
}

function bindEvents() {
    dom.startBtn.addEventListener('click', () => { startGame(); });
    dom.restartBtn.addEventListener('click', () => { resetLevel(); });
    dom.nextBtn.addEventListener('click', () => { nextLevel(); });
    dom.playAgainBtn.addEventListener('click', () => { resetLevel(); });
    dom.muteBtn.addEventListener('click', toggleMute);
    dom.resetBtn.addEventListener('click', resetLevel);
    dom.resetBtn.onclick = resetLevel;
    dom.palette.forEach(btn => btn.addEventListener('click', () => selectBlock(btn.dataset.type)));
    canvas.addEventListener('click', handleCanvasClick);
}

function init() {
    bindEvents();
    loadLevel(0);
    updateHud();
    render();
}

init();
