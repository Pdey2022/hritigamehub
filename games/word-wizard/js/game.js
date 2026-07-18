/* ============================================
   WORD WIZARD — Full Game Engine
   ============================================ */

const canvas = document.getElementById('ww-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 550;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ===== DOM REFS =====
const dom = {
    score: document.getElementById('ww-score'),
    scoreB: document.getElementById('ww-score-bottom'),
    level: document.getElementById('ww-level'),
    best: document.getElementById('ww-best'),
    lives: document.getElementById('ww-lives'),
    streak: document.getElementById('ww-streak'),
    wrapper: document.getElementById('ww-canvas-wrapper'),
    startOverlay: document.getElementById('ww-start-overlay'),
    gameoverOverlay: document.getElementById('ww-gameover-overlay'),
    gameoverStats: document.getElementById('ww-gameover-stats'),
    levelCompleteOverlay: document.getElementById('ww-levelcomplete-overlay'),
    levelCompleteStats: document.getElementById('ww-levelcomplete-stats'),
    wonOverlay: document.getElementById('ww-won-overlay'),
    wonStats: document.getElementById('ww-won-stats'),
    startBtn: document.getElementById('ww-start-btn'),
    restartBtn: document.getElementById('ww-restart-btn'),
    nextLevelBtn: document.getElementById('ww-nextlevel-btn'),
    playAgainBtn: document.getElementById('ww-playagain-btn'),
    resetBtn: document.getElementById('ww-reset-btn'),
    scrambledWord: document.getElementById('ww-scrambled-word'),
    input: document.getElementById('ww-input'),
    submitBtn: document.getElementById('ww-submit-btn'),
    hintBtn: document.getElementById('ww-hint-btn'),
    feedback: document.getElementById('ww-feedback'),
    category: document.getElementById('ww-category'),
    wordCurrent: document.getElementById('ww-word-current'),
    wordTotal: document.getElementById('ww-word-total')
};

// ===== WORD DATABASE =====
const WORD_BANK = {
    easy: [
        { word: 'cat', hint: 'A furry pet that purrs', category: 'Animals' },
        { word: 'dog', hint: 'Man\'s best friend', category: 'Animals' },
        { word: 'sun', hint: 'The star at the center of our solar system', category: 'Nature' },
        { word: 'hat', hint: 'You wear it on your head', category: 'Clothing' },
        { word: 'run', hint: 'To move fast on foot', category: 'Actions' },
        { word: 'big', hint: 'Opposite of small', category: 'Adjectives' },
        { word: 'red', hint: 'Color of fire trucks', category: 'Colors' },
        { word: 'cup', hint: 'You drink from it', category: 'Objects' },
        { word: 'bed', hint: 'Where you sleep', category: 'Objects' },
        { word: 'pen', hint: 'A tool for writing', category: 'Objects' },
        { word: 'map', hint: 'Shows you where to go', category: 'Objects' },
        { word: 'bug', hint: 'A small insect', category: 'Animals' },
        { word: 'bus', hint: 'A large vehicle that carries people', category: 'Vehicles' },
        { word: 'sky', hint: 'What\'s above you outdoors', category: 'Nature' },
        { word: 'sea', hint: 'A large body of salt water', category: 'Nature' },
        { word: 'owl', hint: 'A night bird that hoots', category: 'Animals' },
        { word: 'eye', hint: 'You see with it', category: 'Body' },
        { word: 'ear', hint: 'You hear with it', category: 'Body' },
        { word: 'fan', hint: 'Makes you cool when it\'s hot', category: 'Objects' },
        { word: 'nut', hint: 'A hard-shelled snack', category: 'Food' }
    ],
    medium: [
        { word: 'house', hint: 'A place where people live', category: 'Places' },
        { word: 'plant', hint: 'A living thing that grows in soil', category: 'Nature' },
        { word: 'music', hint: 'Sounds that make melodies', category: 'Arts' },
        { word: 'beach', hint: 'Sandy shore by the ocean', category: 'Places' },
        { word: 'cloud', hint: 'White fluffy thing in the sky', category: 'Nature' },
        { word: 'dance', hint: 'Moving rhythmically to music', category: 'Actions' },
        { word: 'apple', hint: 'A fruit that\'s red or green', category: 'Food' },
        { word: 'bread', hint: 'A baked food made from flour', category: 'Food' },
        { word: 'chair', hint: 'You sit on it', category: 'Objects' },
        { word: 'dream', hint: 'What you see when sleeping', category: 'Mind' },
        { word: 'eagle', hint: 'A large bird of prey', category: 'Animals' },
        { word: 'flame', hint: 'The visible part of fire', category: 'Nature' },
        { word: 'grape', hint: 'A small purple or green fruit', category: 'Food' },
        { word: 'heart', hint: 'An organ that pumps blood', category: 'Body' },
        { word: 'juice', hint: 'A liquid drink from fruits', category: 'Food' },
        { word: 'knife', hint: 'A tool for cutting', category: 'Objects' },
        { word: 'laugh', hint: 'What you do when something is funny', category: 'Actions' },
        { word: 'mango', hint: 'A sweet tropical fruit', category: 'Food' },
        { word: 'ocean', hint: 'A vast body of water', category: 'Nature' },
        { word: 'piano', hint: 'A musical instrument with keys', category: 'Arts' }
    ],
    hard: [
        { word: 'garden', hint: 'Where flowers and plants grow', category: 'Places' },
        { word: 'planet', hint: 'A celestial body orbiting a star', category: 'Science' },
        { word: 'bridge', hint: 'A structure built over water', category: 'Places' },
        { word: 'travel', hint: 'Going from one place to another', category: 'Actions' },
        { word: 'winter', hint: 'The coldest season of the year', category: 'Seasons' },
        { word: 'silver', hint: 'A shiny precious metal', category: 'Objects' },
        { word: 'butter', hint: 'A dairy spread made from milk', category: 'Food' },
        { word: 'candle', hint: 'Wax with a wick that burns', category: 'Objects' },
        { word: 'dragon', hint: 'A mythical fire-breathing creature', category: 'Fantasy' },
        { word: 'forest', hint: 'A large area covered with trees', category: 'Nature' },
        { word: 'guitar', hint: 'A stringed musical instrument', category: 'Arts' },
        { word: 'hunter', hint: 'Someone who pursues wild animals', category: 'People' },
        { word: 'island', hint: 'Land surrounded by water', category: 'Places' },
        { word: 'jungle', hint: 'A dense tropical forest', category: 'Nature' },
        { word: 'kitten', hint: 'A baby cat', category: 'Animals' },
        { word: 'lemon', hint: 'A sour yellow citrus fruit', category: 'Food' },
        { word: 'mirror', hint: 'Reflects your image', category: 'Objects' },
        { word: 'noodle', hint: 'A long thin strip of pasta', category: 'Food' },
        { word: 'puzzle', hint: 'A game that tests your mind', category: 'Games' },
        { word: 'rocket', hint: 'A vehicle that flies to space', category: 'Science' }
    ]
};

// ===== LEVEL CONFIG =====
const LEVELS = [
    { words: 3, difficulty: 'easy',   timePerWord: 30 },
    { words: 4, difficulty: 'easy',   timePerWord: 25 },
    { words: 4, difficulty: 'medium', timePerWord: 30 },
    { words: 4, difficulty: 'medium', timePerWord: 25 },
    { words: 5, difficulty: 'medium', timePerWord: 30 },
    { words: 5, difficulty: 'hard',   timePerWord: 35 },
    { words: 5, difficulty: 'hard',   timePerWord: 30 },
    { words: 5, difficulty: 'hard',   timePerWord: 25 },
    { words: 6, difficulty: 'hard',   timePerWord: 30 },
    { words: 6, difficulty: 'hard',   timePerWord: 25 }
];
const TOTAL_LEVELS = LEVELS.length;

// ===== STATE =====
const state = {
    running: false,
    level: 0,
    score: 0,
    lives: 3,
    streak: 0,
    best: parseInt(localStorage.getItem('ww_best')) || 0,
    wordIndex: 0,
    words: [],       // current level's word pool
    currentWord: null,
    scrambledWord: '', // scrambled version of current word
    hintsUsed: 0,
    timeLeft: 0,
    timerInterval: null,
    animFrame: null,
    particles: [],
    floatingTexts: []
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('ww_muted') === 'true';
function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function toggleMute() {
    isMuted = !isMuted; localStorage.setItem('ww_muted', isMuted);
    document.getElementById('ww-mute-btn').textContent = isMuted ? '🔇' : '🔊';
}
function playCorrect() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(523, c.currentTime);
        o.frequency.setValueAtTime(659, c.currentTime + 0.08);
        o.frequency.setValueAtTime(784, c.currentTime + 0.16);
        g.gain.setValueAtTime(0.12, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.3);
    } catch (e) {}
}
function playWrong() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(200, c.currentTime);
        o.frequency.setValueAtTime(150, c.currentTime + 0.15);
        g.gain.setValueAtTime(0.08, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.3);
    } catch (e) {}
}
function playLevelUp() {
    if (isMuted) return;
    try {
        const c = getAudio();
        [523, 659, 784, 1047].forEach((freq, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, c.currentTime + i * 0.12);
            g.gain.setValueAtTime(0.1, c.currentTime + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.2);
            o.connect(g); g.connect(c.destination);
            o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 0.2);
        });
    } catch (e) {}
}
function playGameOver() {
    if (isMuted) return;
    try {
        const c = getAudio();
        [400, 350, 300, 200].forEach((freq, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(freq, c.currentTime + i * 0.2);
            g.gain.setValueAtTime(0.08, c.currentTime + i * 0.2);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 0.3);
            o.connect(g); g.connect(c.destination);
            o.start(c.currentTime + i * 0.2); o.stop(c.currentTime + i * 0.2 + 0.3);
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

function scrambleWord(word) {
    let letters = word.split('');
    // Keep shuffling until it's different from the original
    let scrambled = word;
    while (scrambled === word) {
        shuffle(letters);
        scrambled = letters.join('');
        // If single letter, just return it
        if (word.length <= 1) return word;
    }
    return scrambled;
}

// ===== WORD SELECTION =====
function pickWordsForLevel(level) {
    const config = LEVELS[level];
    const difficulty = config.difficulty;
    const count = config.words;
    const pool = [...WORD_BANK[difficulty]];
    shuffle(pool);
    return pool.slice(0, count);
}

// ===== LOAD WORD =====
function loadWord() {
    if (state.wordIndex >= state.words.length) {
        // Level complete
        completeLevel();
        return;
    }

    const wordData = state.words[state.wordIndex];
    state.currentWord = wordData;
    state.hintsUsed = 0;
    state.timeLeft = LEVELS[state.level].timePerWord;

    // Update display
    dom.category.textContent = wordData.category;
    dom.wordCurrent.textContent = state.wordIndex + 1;
    dom.wordTotal.textContent = state.words.length;

    // Show scrambled word on canvas
    dom.scrambledWord.textContent = '';
    dom.input.value = '';
    dom.input.disabled = false;
    dom.input.focus();
    dom.feedback.textContent = '';
    dom.feedback.className = 'ww-feedback';
    dom.submitBtn.disabled = false;
    dom.hintBtn.disabled = false;

    // Scramble and store
    state.scrambledWord = scrambleWord(wordData.word);
    drawScrambledWord(state.scrambledWord);

    // Start timer
    startTimer();
}

function drawScrambledWord(scrambled) {
    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0a3e');
    bg.addColorStop(0.5, '#2d1b5e');
    bg.addColorStop(1, '#4a2c7e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative stars
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 25; i++) {
        const sx = (i * 47 + 13) % W;
        const sy = (i * 31 + 7) % H;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + i % 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
    ctx.restore();

    // Magic circle decoration
    ctx.save();
    ctx.strokeStyle = 'rgba(155,89,182,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 - 30, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 - 30, 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Level and score info
    ctx.font = '14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`Level ${state.level + 1} · ${LEVELS[state.level].difficulty.toUpperCase()}`, W / 2, 30);

    // Scrambled word - large display
    ctx.save();
    ctx.shadowColor = 'rgba(155,89,182,0.5)';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 42px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw each letter with spacing
    const letterSpacing = 48;
    const totalWidth = scrambled.length * letterSpacing;
    const startX = (W - totalWidth) / 2 + letterSpacing / 2;

    for (let i = 0; i < scrambled.length; i++) {
        const x = startX + i * letterSpacing;
        const y = H / 2 - 30;
        const bounce = Math.sin(Date.now() / 400 + i * 1.2) * 4;

        // Letter background
        ctx.fillStyle = 'rgba(155,89,182,0.3)';
        ctx.roundRect ? ctx.roundRect(x - 20, y - 25 + bounce, 40, 50, 8) : null;
        ctx.fillRect(x - 20, y - 25 + bounce, 40, 50);

        // Letter text
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(155,89,182,0.8)';
        ctx.shadowBlur = 15;
        ctx.fillText(scrambled[i].toUpperCase(), x, y + bounce);
    }
    ctx.restore();

    // Category and hint info
    ctx.font = '16px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`📂 ${state.currentWord.category}`, W / 2, H / 2 + 80);

    // Timer bar
    const timerW = 300;
    const timerX = (W - timerW) / 2;
    const timerY = H - 60;
    const progress = state.timeLeft / LEVELS[state.level].timePerWord;

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(timerX, timerY, timerW, 10);

    const timerColor = progress > 0.5 ? '#2ecc71' : progress > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = timerColor;
    ctx.fillRect(timerX, timerY, timerW * progress, 10);

    ctx.font = '12px Fredoka, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`${Math.ceil(state.timeLeft)}s`, W / 2, timerY + 28);

    // Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Floating texts
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
}

// ===== TIMER =====
function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        drawScrambledWord(state.scrambledWord);
        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            handleWrong();
        }
    }, 1000);
}

// ===== CHECK ANSWER =====
function checkAnswer() {
    if (!state.running || !state.currentWord) return;

    const answer = dom.input.value.trim().toLowerCase();
    if (!answer) return;

    if (answer === state.currentWord.word) {
        handleCorrect();
    } else {
        handleWrong();
    }
}

function handleCorrect() {
    clearInterval(state.timerInterval);
    playCorrect();

    // Calculate score
    const basePoints = 100;
    const timeBonus = Math.floor(state.timeLeft * 5);
    const streakBonus = Math.min(state.streak, 10) * 20;
    const points = basePoints + timeBonus + streakBonus;

    state.score += points;
    state.streak++;
    state.wordIndex++;

    // Show feedback
    dom.feedback.textContent = `✅ Correct! +${points} pts`;
    dom.feedback.className = 'ww-feedback ww-feedback-correct';

    // Particles
    for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        state.particles.push({
            x: W / 2, y: H / 2,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 1, color: ['#ffd700', '#9b59b6', '#2ecc71', '#3498db'][i % 4]
        });
    }

    addFloatingText(W / 2, H / 2 - 60, `+${points}`, '#ffd700');

    updateHUD();
    dom.input.value = '';
    dom.input.disabled = true;
    dom.submitBtn.disabled = true;
    dom.hintBtn.disabled = true;

    // Load next word after delay
    setTimeout(() => {
        if (!state.running) return;
        updateParticles();
        loadWord();
    }, 1200);
}

function handleWrong() {
    clearInterval(state.timerInterval);
    playWrong();

    state.lives--;
    state.streak = 0;

    dom.feedback.textContent = state.lives > 0 ? '❌ Wrong! Try again!' : '❌ Out of lives!';
    dom.feedback.className = 'ww-feedback ww-feedback-wrong';

    updateHUD();

    if (state.lives <= 0) {
        gameOver();
    } else {
        dom.input.value = '';
        dom.input.disabled = true;
        dom.submitBtn.disabled = true;
        dom.hintBtn.disabled = true;

        setTimeout(() => {
            if (!state.running) return;
            loadWord();
        }, 1200);
    }
}

// ===== HINT =====
function useHint() {
    if (!state.running || !state.currentWord || dom.hintBtn.disabled) return;

    state.hintsUsed++;
    const word = state.currentWord.word;
    const revealCount = Math.min(state.hintsUsed, word.length);

    // Reveal first `revealCount` letters
    dom.feedback.textContent = `💡 Hint: ${word.substring(0, revealCount)}${'_ '.repeat(word.length - revealCount).trim()}`;
    dom.feedback.className = 'ww-feedback ww-feedback-hint';

    // Penalty: reduce time
    state.timeLeft = Math.max(state.timeLeft - 5, 5);

    if (revealCount >= word.length) {
        // Auto-submit if all letters revealed
        dom.input.value = word;
        setTimeout(() => checkAnswer(), 500);
    }
}

// ===== LEVEL MANAGEMENT =====
function completeLevel() {
    clearInterval(state.timerInterval);

    if (state.level >= TOTAL_LEVELS - 1) {
        // Won the game!
        won();
        return;
    }

    playLevelUp();
    const levelScore = state.score;

    dom.levelCompleteStats.textContent = `Score: ${levelScore} | Level ${state.level + 1} Complete!`;
    dom.levelCompleteOverlay.classList.remove('hidden');
    state.running = false;
}

function nextLevel() {
    state.level++;
    state.wordIndex = 0;
    state.words = pickWordsForLevel(state.level);
    dom.levelCompleteOverlay.classList.add('hidden');
    state.running = true;

    // Draw start screen for new level
    drawLevelStart();
    setTimeout(() => {
        if (state.running) {
            loadWord();
        }
    }, 800);
}

function drawLevelStart() {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0a3e');
    bg.addColorStop(0.5, '#2d1b5e');
    bg.addColorStop(1, '#4a2c7e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.shadowColor = 'rgba(155,89,182,0.5)';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Level ${state.level + 1}`, W / 2, H / 2 - 20);
    ctx.font = '20px Fredoka, sans-serif';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(LEVELS[state.level].difficulty.toUpperCase(), W / 2, H / 2 + 30);
    ctx.restore();
}

function won() {
    clearInterval(state.timerInterval);
    playLevelUp();

    if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('ww_best', state.best);
    }

    dom.wonStats.textContent = `Final Score: ${state.score} 🏆`;
    dom.wonOverlay.classList.remove('hidden');
    state.running = false;
}

function gameOver() {
    clearInterval(state.timerInterval);
    state.running = false;
    playGameOver();

    if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('ww_best', state.best);
    }

    dom.gameoverStats.textContent = `Score: ${state.score} | Best: ${state.best}`;
    dom.gameoverOverlay.classList.remove('hidden');
    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('word-wizard', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('word-wizard', 'lb-ww-content', 'Word Wizard');
    }

    // Screen shake particles
    for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 4;
        state.particles.push({
            x: W / 2, y: H / 2,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 1, color: '#e74c3c'
        });
    }
}

// ===== PARTICLES =====
function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.03;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const t = state.floatingTexts[i];
        t.y += t.vy; t.life -= 0.025;
        if (t.life <= 0) state.floatingTexts.splice(i, 1);
    }
}

function addFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -2 });
}

// ===== HUD UPDATE =====
function updateHUD() {
    dom.score.textContent = state.score;
    dom.scoreB.textContent = state.score;
    dom.level.textContent = state.level + 1;
    dom.best.textContent = state.best;
    dom.streak.textContent = state.streak;
    dom.lives.textContent = '❤️'.repeat(Math.max(0, state.lives));
}

// ===== START GAME =====
function startGame() {
    state.level = 0;
    state.score = 0;
    state.lives = 3;
    state.streak = 0;
    state.wordIndex = 0;
    state.particles = [];
    state.floatingTexts = [];

    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    dom.levelCompleteOverlay.classList.add('hidden');
    dom.wonOverlay.classList.add('hidden');

    state.words = pickWordsForLevel(0);
    updateHUD();

    state.running = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    drawLevelStart();
    gameLoop();
    setTimeout(() => {
        if (state.running) {
            loadWord();
        }
    }, 800);
}

// ===== ANIMATION LOOP =====
function gameLoop() {
    if (!state.running) { state.animFrame = null; return; }
    if (state.currentWord) {
        updateParticles();
        drawScrambledWord(state.scrambledWord);
    }
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== INPUT HANDLING =====
dom.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAnswer();
});

dom.submitBtn.addEventListener('click', checkAnswer);
// Touch support for canvas
canvas.addEventListener('touchstart', (e) => {
    if (e.target.closest('button, a, input')) return;
    e.preventDefault();
    const touch = e.touches[0];
    const clickEvent = new MouseEvent('click', {
        clientX: touch.clientX, clientY: touch.clientY
    });
    canvas.dispatchEvent(clickEvent);
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

dom.hintBtn.addEventListener('click', useHint);

dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.nextLevelBtn.addEventListener('click', nextLevel);
dom.playAgainBtn.addEventListener('click', startGame);

document.getElementById('ww-mute-btn').addEventListener('click', toggleMute);
if (isMuted) document.getElementById('ww-mute-btn').textContent = '🔇';

dom.resetBtn.addEventListener('click', () => {
    if (confirm('🔄 Reset all progress? This cannot be undone!')) {
        state.running = false;
        clearInterval(state.timerInterval);
        localStorage.removeItem('ww_best');
        state.best = 0;
        dom.best.textContent = 0;
        startGame();
    }
});

// ===== DRAW START SCREEN =====
function drawStartScreen() {
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0a3e');
    bg.addColorStop(0.5, '#2d1b5e');
    bg.addColorStop(1, '#4a2c7e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative stars
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 30; i++) {
        const sx = (i * 37 + 5) % W;
        const sy = (i * 53 + 11) % H;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + i % 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
    ctx.restore();

    // Magic circle
    ctx.save();
    ctx.strokeStyle = 'rgba(155,89,182,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 - 20, 200, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 - 20, 170, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 - 20, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Floating letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    ctx.save();
    for (let i = 0; i < 15; i++) {
        const lx = (i * 70 + 25) % (W - 20) + 10;
        const ly = (i * 43 + Date.now() / 3000) % H;
        ctx.globalAlpha = 0.08 + Math.sin(Date.now() / 2000 + i) * 0.04;
        ctx.font = '24px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9b59b6';
        ctx.fillText(letters[i % 26], lx, ly);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Best score
    if (state.best > 0) {
        ctx.font = '18px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`🏆 Best: ${state.best}`, W / 2, H - 30);
    }
}

// ===== INIT =====
function init() {
    document.body.classList.add('loaded');
    drawStartScreen();
    dom.best.textContent = state.best;

    // Load leaderboard
    if (typeof renderLeaderboard === 'function') renderLeaderboard('word-wizard', 'lb-ww-content', 'Word Wizard');

    // Share button
    document.getElementById('ww-share-btn')?.addEventListener('click', () => {
        const score = state.best || 0;
        if (typeof shareScore === 'function') shareScore('Word Wizard', score, 'https://hritihub.uk/games/word-wizard/');
    });
}

document.addEventListener('DOMContentLoaded', init);
