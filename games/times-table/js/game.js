/* ============================================
   TIMES TABLE — Full Game Engine
   ============================================ */

// ----- DOM Refs -----
const dom = {
    score:     document.getElementById('tt-score'),
    timer:     document.getElementById('tt-timer'),
    combo:     document.getElementById('tt-combo'),
    problem:   document.getElementById('tt-problem'),
    hint:      document.getElementById('tt-hint'),
    options:   document.getElementById('tt-options'),
    timerFill: document.getElementById('tt-timer-fill'),
    feed:      document.getElementById('tt-feed'),
    startOverlay:   document.getElementById('tt-start-overlay'),
    gameoverOverlay: document.getElementById('tt-gameover-overlay'),
    gameoverStats:   document.getElementById('tt-gameover-stats'),
    startBtn:  document.getElementById('tt-start-btn'),
    restartBtn:document.getElementById('tt-restart-btn'),
    muteBtn:   document.getElementById('tt-mute-btn'),
    resetBtn:  document.getElementById('tt-reset-btn')
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('tt_muted') === 'true';
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
function playCorrect() { playTone(660, 0.08, 'sine', 0.07); setTimeout(() => playTone(880, 0.08, 'sine', 0.05), 60); }
function playWrong()   { playTone(300, 0.15, 'sawtooth', 0.05); }
function playGameOver(){ playTone(400, 0.2, 'sawtooth', 0.07); playTone(300, 0.3, 'sawtooth', 0.05); }

// ===== GAME STATE =====
const state = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('tt_high')) || 0,
    correct: 0,
    total: 0,
    gameOver: false,
    timeLeft: 45,
    combo: 0,
    maxCombo: 0,
    questionNum: 0,
    answer: 0,
    table: 1,
    waitingForNext: false,
    timerInterval: null,
    qTimer: null,
    answered: false
};

// ===== GENERATE PROBLEM =====
function generateProblem() {
    // Determine which times table to practice
    const tables = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    state.table = tables[Math.floor(Math.random() * tables.length)];
    const multiplier = 1 + Math.floor(Math.random() * 12);
    const answer = state.table * multiplier;

    state.answer = answer;
    state.questionNum++;
    state.answered = false;

    // Build problem HTML
    dom.problem.innerHTML = state.table + ' <span class="times-op">×</span> ' + multiplier + ' <span class="times-eq">=</span> <span class="times-ans">?</span>';
    dom.hint.textContent = state.table + ' × ' + multiplier + ' = ?  (Table of ' + state.table + ')';

    // Generate options (1 correct + 3 wrong)
    const options = new Set([answer]);
    while (options.size < 4) {
        const offset = Math.floor(Math.random() * 9) - 4;
        const fake = answer + (offset === 0 ? state.table : offset);
        if (fake >= 0) options.add(fake);
    }
    const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
    dom.options.innerHTML = shuffled.map(v =>
        '<button class="tt-option" data-value="' + v + '">' + v + '</button>'
    ).join('');

    dom.options.querySelectorAll('.tt-option').forEach(btn => {
        btn.addEventListener('click', () => handleAnswer(btn));
        btn.addEventListener('touchend', (e) => { e.preventDefault(); handleAnswer(btn); });
    });

    // Reset timer bar
    dom.timerFill.style.transition = 'none';
    dom.timerFill.style.width = '100%';
    void dom.timerFill.offsetHeight;
    dom.timerFill.style.transition = 'width 8s linear';
    dom.timerFill.style.width = '0%';

    if (state.qTimer) clearTimeout(state.qTimer);
    state.qTimer = setTimeout(() => {
        if (!state.answered && state.running) handleTimeout();
    }, 8000);
}

// ===== HANDLE ANSWER =====
function handleAnswer(btn) {
    if (state.answered || !state.running || state.waitingForNext) return;
    state.answered = true;
    if (state.qTimer) clearTimeout(state.qTimer);

    const val = parseInt(btn.dataset.value);
    const isCorrect = val === state.answer;
    state.total++;

    if (isCorrect) {
        state.correct++;
        state.combo++;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;
        const bonus = Math.min(state.combo - 1, 4);
        const points = 10 + bonus * 5;
        state.score += points;
        btn.classList.add('correct');
        playCorrect();
        dom.feed.textContent = '+' + points + (bonus > 0 ? ' 🔥x' + state.combo : '');

        if (state.combo > 1) {
            dom.combo.style.display = '';
            dom.combo.textContent = '🔥 x' + state.combo;
        } else {
            dom.combo.style.display = 'none';
        }

        dom.score.textContent = state.score;
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('tt_high', state.highScore);
        }

        state.waitingForNext = true;
        setTimeout(() => {
            state.waitingForNext = false;
            if (state.running) generateProblem();
        }, 350);
    } else {
        state.combo = 0;
        dom.combo.style.display = 'none';
        btn.classList.add('wrong');
        playWrong();
        dom.feed.textContent = '✗ ' + state.table + ' × ' + (state.answer / state.table) + ' = ' + state.answer;
        dom.options.querySelectorAll('.tt-option').forEach(b => {
            if (parseInt(b.dataset.value) === state.answer) b.classList.add('correct');
            b.style.pointerEvents = 'none';
        });
        state.waitingForNext = true;
        setTimeout(() => {
            state.waitingForNext = false;
            if (state.running) generateProblem();
        }, 700);
    }
}

// ===== TIMEOUT =====
function handleTimeout() {
    if (state.answered || !state.running) return;
    state.answered = true;
    state.total++;
    state.combo = 0;
    dom.combo.style.display = 'none';
    dom.options.querySelectorAll('.tt-option').forEach(b => {
        if (parseInt(b.dataset.value) === state.answer) b.classList.add('correct');
        b.style.pointerEvents = 'none';
    });
    playWrong();
    dom.feed.textContent = '⏱ ' + state.table + ' × ' + (state.answer / state.table) + ' = ' + state.answer;
    state.waitingForNext = true;
    setTimeout(() => {
        state.waitingForNext = false;
        if (state.running) generateProblem();
    }, 700);
}

// ===== GAME OVER =====
function gameOver() {
    state.running = false;
    state.gameOver = true;
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (state.qTimer) clearTimeout(state.qTimer);
    playGameOver();

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('tt_high', state.highScore);
    }

    const pct = state.total > 0 ? Math.round(state.correct / state.total * 100) : 0;
    dom.gameoverStats.innerHTML = 'Score: ' + state.score + ' 📊 | ' + state.correct + '/' + state.total + ' (' + pct + '%) | Best streak: ' + state.maxCombo;
    dom.gameoverOverlay.classList.remove('hidden');

    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('times-table', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('times-table', 'lb-tt-content', 'Times Table');
    }
}

// ===== RESET =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0; state.correct = 0; state.total = 0;
    state.combo = 0; state.maxCombo = 0; state.questionNum = 0;
    state.timeLeft = 45; state.answered = false; state.waitingForNext = false;
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (state.qTimer) clearTimeout(state.qTimer);
    dom.score.textContent = '0';
    dom.timer.textContent = '45s';
    dom.combo.style.display = 'none';
    dom.feed.textContent = '';
    dom.problem.innerHTML = '📊 Ready?';
    dom.hint.textContent = '';
    dom.options.innerHTML = '';
    dom.gameoverOverlay.classList.add('hidden');
    dom.startOverlay.classList.remove('hidden');
}

// ===== START =====
function startGame() {
    if (state.running) return;
    state.running = true; state.gameOver = false;
    state.score = 0; state.correct = 0; state.total = 0;
    state.combo = 0; state.maxCombo = 0; state.questionNum = 0;
    state.timeLeft = 45; state.answered = false; state.waitingForNext = false;
    dom.score.textContent = '0';
    dom.timer.textContent = '45s';
    dom.combo.style.display = 'none';
    dom.feed.textContent = '';
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');

    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        dom.timer.textContent = state.timeLeft + 's';
        if (state.timeLeft <= 0) gameOver();
    }, 1000);

    generateProblem();
}

// ===== MUTE =====
if (dom.muteBtn) {
    dom.muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('tt_muted', isMuted);
        dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });
}

// ===== INIT =====
dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.resetBtn.addEventListener('click', resetGame);
dom.startBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });
dom.restartBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });

if (typeof renderLeaderboard === 'function') {
    renderLeaderboard('times-table', 'lb-tt-content', 'Times Table');
}
