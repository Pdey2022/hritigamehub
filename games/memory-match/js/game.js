/* ============================================
   MEMORY MATCH — Full Game Engine
   ============================================ */

// ===== THEMES & LEVELS =====
const THEMES = {
    animals: ['🐶','🐱','🐰','🐼','🐸','🦊','🐻','🐨','🐯','🦁','🐮','🐷','🐵','🐔','🐧'],
    food:    ['🍎','🍕','🍔','🌮','🍦','🍩','🍪','🍇','🍓','🍌','🌽','🥕','🍣','🍰','🍿'],
    mixed:   ['🚀','🌈','🌟','🎸','🎨','⚽','🏀','🎮','💎','🎭','🦄','🍀','🌺','🐲','🦋']
};

function getLevelConfig(level) {
    const d = Math.min(level, 8);
    const themeKeys = ['animals', 'food', 'mixed'];
    const theme = themeKeys[(d - 1) % 3];
    const pairs = 6 + Math.min(d - 1, 8);
    const cols = pairs <= 8 ? 4 : pairs <= 12 ? 4 : 6;
    const rows = Math.ceil(pairs * 2 / cols);
    return {
        pairs,
        cols,
        rows,
        moveLimit: pairs * 3 + 4,
        theme,
        timeBonusThreshold: pairs * 3  // seconds — faster = bonus points
    };
}

// ===== DOM REFS =====
const dom = {
    score:      document.getElementById('mm-score'),
    level:      document.getElementById('mm-level'),
    lives:      document.getElementById('mm-lives'),
    moves:      document.getElementById('mm-moves'),
    pairs:      document.getElementById('mm-pairs'),
    totalPairs: document.getElementById('mm-total-pairs'),
    timer:      document.getElementById('mm-timer'),
    combo:      document.getElementById('mm-combo-display'),
    board:      document.getElementById('mm-board'),
    wrapper:    document.getElementById('mm-board-wrapper'),
    startOverlay:  document.getElementById('mm-start-overlay'),
    levelupOverlay: document.getElementById('mm-levelup-overlay'),
    gameoverOverlay: document.getElementById('mm-gameover-overlay'),
    levelupTitle:   document.getElementById('mm-levelup-title'),
    levelupStats:   document.getElementById('mm-levelup-stats'),
    gameoverStats:  document.getElementById('mm-gameover-stats'),
    startBtn:    document.getElementById('mm-start-btn'),
    restartBtn:  document.getElementById('mm-restart-btn'),
    nextBtn:     document.getElementById('mm-next-btn'),
    resetBtn:    document.getElementById('mm-reset-btn')
};

// ===== STATE =====
const state = {
    running: false,
    level: 1,
    score: 0,
    lives: 3,
    moves: 0,
    pairsFound: 0,
    combo: 0,
    cards: [],
    flipped: [],       // indices of currently flipped cards
    matched: new Set(),
    locked: false,      // prevent clicks during flip-back animation
    timerCount: 0,
    timerInterval: null,
    highScore: parseInt(localStorage.getItem('mm_high')) || 0,
    totalPairsFound: 0
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('mm_muted') === 'true';

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('mm_muted', isMuted);
    const btn = document.getElementById('mm-mute-btn');
    if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
}

function playFlip() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(600, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.06);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.08);
    } catch (e) {}
}

function playMatch() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [523, 659, 784].forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
            g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.12);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.08);
            o.stop(ctx.currentTime + i * 0.08 + 0.12);
        });
    } catch (e) {}
}

function playMiss() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(300, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.2);
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
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.12);
            o.stop(ctx.currentTime + i * 0.12 + 0.25);
        });
    } catch (e) {}
}

// ===== SHUFFLE =====
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ===== BUILD LEVEL =====
function buildLevel() {
    const cfg = getLevelConfig(state.level);
    const themeIcons = THEMES[cfg.theme];

    // Pick icons randomly from the theme — not just the first N
    const shuffledTheme = shuffle([...themeIcons]);
    const pickOrder = [];
    for (let i = 0; i < cfg.pairs; i++) {
        // Cycle through shuffled theme, wrapping if needed
        pickOrder.push(shuffledTheme[i % shuffledTheme.length]);
    }
    // Shuffle the picked icons again for variety
    shuffle(pickOrder);

    // Double for pairs, then shuffle multiple times for true randomness
    let cardIcons = [...pickOrder, ...pickOrder];
    shuffle(cardIcons);
    shuffle(cardIcons); // second pass for good measure
    // Fisher-Yates extra pass: swap random elements
    for (let i = 0; i < cardIcons.length; i++) {
        const j = Math.floor(Math.random() * cardIcons.length);
        [cardIcons[i], cardIcons[j]] = [cardIcons[j], cardIcons[i]];
    }

    state.cards = cardIcons.map((icon, i) => ({ icon, index: i, matched: false }));
    state.flipped = [];
    state.matched = new Set();
    state.locked = false;
    state.pairsFound = 0;
    state.moves = 0;
    state.combo = 0;
    state.timerCount = 0;

    renderBoard(cfg);
    updateHUD();
}

// ===== RENDER BOARD =====
function renderBoard(cfg) {
    const board = dom.board;
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;

    const cardWidth = Math.min(80, (500 - (cfg.cols - 1) * 8) / cfg.cols);
    const cardSize = Math.max(50, cardWidth);

    state.cards.forEach((card, i) => {
        const el = document.createElement('div');
        el.className = 'mm-card';
        el.dataset.index = i;
        el.style.setProperty('--card-size', cardSize + 'px');

        el.innerHTML = `
            <div class="mm-card-inner">
                <div class="mm-card-front">❓</div>
                <div class="mm-card-back">${card.icon}</div>
            </div>
        `;

        el.addEventListener('click', () => flipCard(i));
        board.appendChild(el);
    });

    dom.totalPairs.textContent = cfg.pairs;
}

// ===== FLIP CARD =====
function flipCard(index) {
    if (!state.running) return;
    if (state.locked) return;
    if (state.matched.has(index)) return;
    if (state.flipped.includes(index)) return;
    if (state.flipped.length >= 2) return;

    const cfg = getLevelConfig(state.level);
    state.flipped.push(index);
    const el = dom.board.children[index];
    el.classList.add('flipped');
    playFlip();

    if (state.flipped.length === 2) {
        state.moves++;
        state.locked = true;
        updateHUD();
        checkMatch();
    }
}

// ===== CHECK MATCH =====
function checkMatch() {
    const [i1, i2] = state.flipped;
    const c1 = state.cards[i1];
    const c2 = state.cards[i2];

    if (c1.icon === c2.icon) {
        // Match!
        state.matched.add(i1);
        state.matched.add(i2);
        state.pairsFound++;
        state.totalPairsFound++;
        state.combo++;

        const cfg = getLevelConfig(state.level);
        const basePts = 100;
        const comboMul = 1 + (state.combo - 1) * 0.25;
        const timeBonus = state.timerCount < cfg.timeBonusThreshold ? 20 : 0;
        const earned = Math.floor(basePts * comboMul) + timeBonus;
        state.score += earned;

        const els = dom.board.children;
        els[i1].classList.add('matched');
        els[i2].classList.add('matched');
        playMatch();
        showToast(state.combo > 1 ? `🔥 ${state.combo}x Combo! +${earned}` : `+${earned}`);

        state.flipped = [];
        state.locked = false;
        updateHUD();

        // Check level complete
        if (state.pairsFound >= cfg.pairs) {
            setTimeout(levelComplete, 500);
        }
    } else {
        // No match
        state.combo = 0;
        const els = dom.board.children;
        setTimeout(() => {
            els[i1].classList.remove('flipped');
            els[i2].classList.remove('flipped');
            state.flipped = [];
            state.locked = false;
            // Life loss on miss (after level 1)
            if (state.level > 1) {
                state.lives--;
                updateLives();
                if (state.lives <= 0) { gameOver(); return; }
            }
            updateHUD();
        }, 800);
        playMiss();

        // Check move limit
        const cfg = getLevelConfig(state.level);
        if (state.moves >= cfg.moveLimit) {
            setTimeout(gameOver, 900);
        }
    }
}

// ===== LEVEL MANAGEMENT =====
function levelComplete() {
    state.running = false;
    stopTimer();
    playLevelUp();
    const cfg = getLevelConfig(state.level);
    dom.levelupTitle.textContent = `🎉 Level ${state.level} Complete!`;
    dom.levelupStats.textContent = `Moves: ${state.moves} | Pairs: ${state.pairsFound}/${cfg.pairs} | Time: ${state.timerCount}s`;
    dom.levelupOverlay.classList.remove('hidden');
}

function startNextLevel() {
    dom.levelupOverlay.classList.add('hidden');
    state.level++;
    buildLevel();
    startTimer();
    state.running = true;
}

// ===== GAME OVER =====
function gameOver() {
    state.running = false;
    stopTimer();

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('mm_high', state.score);
    }

    dom.gameoverStats.textContent = `Score: ${state.score} | Level: ${state.level} | Pairs: ${state.totalPairsFound} | Best: ${state.highScore}`;
    dom.gameoverOverlay.classList.remove('hidden');
}

// ===== TIMER =====
function startTimer() {
    stopTimer();
    state.timerInterval = setInterval(() => {
        state.timerCount++;
        dom.timer.textContent = state.timerCount + 's';
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

// ===== HUD =====
function updateHUD() {
    dom.score.textContent = state.score;
    dom.level.textContent = state.level;
    dom.moves.textContent = state.moves;
    dom.pairs.textContent = state.pairsFound;
    dom.timer.textContent = state.timerCount + 's';

    if (state.combo > 1) {
        dom.combo.textContent = `🔥 ${state.combo}x`;
        dom.combo.className = 'mm-combo active';
    } else {
        dom.combo.textContent = '';
        dom.combo.className = 'mm-combo';
    }
}

function updateLives() {
    let h = '';
    for (let i = 0; i < state.lives; i++) h += '❤️';
    for (let i = state.lives; i < 3; i++) h += '🖤';
    dom.lives.textContent = h;
}

// ===== TOAST =====
function showToast(msg) {
    const el = document.createElement('div');
    el.className = 'mm-toast';
    el.textContent = msg;
    dom.wrapper.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// ===== START GAME =====
function startGame() {
    state.level = 1;
    state.score = 0;
    state.lives = 3;
    state.totalPairsFound = 0;
    state.combo = 0;

    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    dom.levelupOverlay.classList.add('hidden');

    updateLives();
    buildLevel();
    startTimer();
    state.running = true;
}

// ===== INIT =====
function init() {
    dom.startBtn.addEventListener('click', startGame);
    dom.restartBtn.addEventListener('click', startGame);
    dom.nextBtn.addEventListener('click', startNextLevel);

    // Mute button
    document.getElementById('mm-mute-btn').addEventListener('click', toggleMute);
    if (isMuted) document.getElementById('mm-mute-btn').textContent = '🔇';

    dom.resetBtn.addEventListener('click', () => {
        if (confirm('🔄 Reset all progress? This cannot be undone!')) {
            state.running = false;
            stopTimer();
            localStorage.removeItem('mm_high');
            state.highScore = 0;
            startGame();
        }
    });

    drawStartScreen();
}

function drawStartScreen() {
    const board = dom.board;
    board.innerHTML = '';
    board.style.gridTemplateColumns = 'repeat(4, 1fr)';
    // Show decorative facedown cards
    for (let i = 0; i < 12; i++) {
        const el = document.createElement('div');
        el.className = 'mm-card';
        el.innerHTML = `
            <div class="mm-card-inner">
                <div class="mm-card-front">❓</div>
                <div class="mm-card-back">🐶</div>
            </div>
        `;
        board.appendChild(el);
    }
}

document.addEventListener('DOMContentLoaded', init);
