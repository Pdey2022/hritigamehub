/* ============================================
   MATH GAMES — Full Game Engine
   ============================================ */

// ----- DOM Refs -----
const dom = {
    score:      document.getElementById('mh-score'),
    timer:      document.getElementById('mh-timer'),
    combo:      document.getElementById('mh-combo'),
    problem:    document.getElementById('mh-problem'),
    questionNum:document.getElementById('mh-question-num'),
    options:    document.getElementById('mh-options'),
    timerFill:  document.getElementById('mh-timer-fill'),
    startOverlay:   document.getElementById('mh-start-overlay'),
    gameoverOverlay: document.getElementById('mh-gameover-overlay'),
    gameoverStats:   document.getElementById('mh-gameover-stats'),
    startBtn:  document.getElementById('mh-start-btn'),
    restartBtn:document.getElementById('mh-restart-btn'),
    muteBtn:   document.getElementById('mh-mute-btn'),
    resetBtn:  document.getElementById('mh-reset-btn'),
    feed:      document.getElementById('mh-feed')
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('mh_muted') === 'true';
if (dom.muteBtn) dom.muteBtn.textContent = isMuted ? '🔇' : '🔊';

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTone(freq, dur, type, vol) {
    if (isMuted) return;
    try {
        const a = getAudioCtx();
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, a.currentTime);
        g.gain.setValueAtTime(vol || 0.06, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
        o.connect(g); g.connect(a.destination);
        o.start(); o.stop(a.currentTime + dur);
    } catch(e) { /* silent */ }
}

function playCorrect() { playTone(660, 0.1, 'sine', 0.08); setTimeout(() => playTone(880, 0.1, 'sine', 0.06), 80); }
function playWrong()   { playTone(300, 0.2, 'sawtooth', 0.06); }
function playGameOver(){ playTone(400, 0.2, 'sawtooth', 0.08); playTone(300, 0.3, 'sawtooth', 0.06); }

// ===== GAME STATE =====
const state = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('mh_high')) || 0,
    correct: 0,
    total: 0,
    gameOver: false,
    timeLeft: 45,
    combo: 0,
    maxCombo: 0,
    questionNum: 0,
    answer: 0,
    waitingForNext: false,
    timerInterval: null,
    qTimer: null,
    answered: false
};

// ===== GENERATE PROBLEM =====
function generateProblem() {
    const types = ['+', '-'];
    const type = types[Math.floor(Math.random() * types.length)];
    let a, b, answer;

    // Difficulty scales with score
    const level = Math.min(Math.floor(state.score / 30) + 1, 5);
    const maxNum = 5 + level * 5; // 10, 15, 20, 25, 30

    if (type === '+') {
        a = 1 + Math.floor(Math.random() * maxNum);
        b = 1 + Math.floor(Math.random() * maxNum);
        answer = a + b;
    } else {
        a = 2 + Math.floor(Math.random() * (maxNum + 3));
        b = 1 + Math.floor(Math.random() * (a - 1));
        answer = a - b;
    }

    state.answer = answer;
    state.questionNum++;
    dom.questionNum.textContent = 'Question ' + state.questionNum;

    // Build problem HTML
    dom.problem.innerHTML = a + ' <span class="operator">' + type + '</span> ' + b + ' <span class="equals">=</span> <span class="answer-spot">?</span>';

    // Generate options (1 correct + 3 wrong)
    const options = new Set([answer]);
    while (options.size < 4) {
        const offset = Math.floor(Math.random() * 9) - 4;
        const fake = answer + (offset === 0 ? 1 : offset);
        if (fake >= 0) options.add(fake);
    }

    const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
    dom.options.innerHTML = shuffled.map((v, i) =>
        '<button class="mh-option" data-value="' + v + '">' + v + '</button>'
    ).join('');

    state.answered = false;

    // Attach click handlers
    dom.options.querySelectorAll('.mh-option').forEach(btn => {
        btn.addEventListener('click', () => handleAnswer(btn));
        btn.addEventListener('touchend', (e) => { e.preventDefault(); handleAnswer(btn); });
    });

    // Reset timer bar
    dom.timerFill.style.transition = 'none';
    dom.timerFill.style.width = '100%';
    void dom.timerFill.offsetHeight; // force reflow
    dom.timerFill.style.transition = 'width 8s linear';
    dom.timerFill.style.width = '0%';

    // Question timeout (8 seconds)
    if (state.qTimer) clearTimeout(state.qTimer);
    state.qTimer = setTimeout(() => {
        if (!state.answered && state.running) {
            handleTimeout();
        }
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
        showFeed('+' + points + (bonus > 0 ? ' 🔥x' + state.combo : ''));

        // Update combo display
        if (state.combo > 1) {
            dom.combo.style.display = '';
            dom.combo.textContent = '🔥 x' + state.combo;
        } else {
            dom.combo.style.display = 'none';
        }

        dom.score.textContent = state.score;
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('mh_high', state.highScore);
        }

        // Next question after brief delay
        state.waitingForNext = true;
        setTimeout(() => {
            state.waitingForNext = false;
            if (state.running) generateProblem();
        }, 400);

    } else {
        state.combo = 0;
        dom.combo.style.display = 'none';
        btn.classList.add('wrong');
        playWrong();
        showFeed('✗ Answer was ' + state.answer);

        // Show correct answer
        dom.options.querySelectorAll('.mh-option').forEach(b => {
            if (parseInt(b.dataset.value) === state.answer) b.classList.add('correct');
            b.style.pointerEvents = 'none';
        });

        state.waitingForNext = true;
        setTimeout(() => {
            state.waitingForNext = false;
            if (state.running) generateProblem();
        }, 800);
    }
}

// ===== TIMEOUT =====
function handleTimeout() {
    if (state.answered || !state.running) return;
    state.answered = true;
    state.total++;
    state.combo = 0;
    dom.combo.style.display = 'none';

    // Highlight correct answer
    dom.options.querySelectorAll('.mh-option').forEach(b => {
        if (parseInt(b.dataset.value) === state.answer) b.classList.add('correct');
        b.style.pointerEvents = 'none';
    });
    playWrong();
    showFeed('⏱ Time\'s up! Answer was ' + state.answer);

    state.waitingForNext = true;
    setTimeout(() => {
        state.waitingForNext = false;
        if (state.running) generateProblem();
    }, 800);
}

// ===== SHOW FEED =====
function showFeed(text) {
    if (!dom.feed) return;
    dom.feed.textContent = text;
    dom.feed.style.animation = 'none';
    void dom.feed.offsetHeight;
    dom.feed.style.animation = 'mhFeedUp 0.6s ease forwards';
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
        localStorage.setItem('mh_high', state.highScore);
    }

    const pct = state.total > 0 ? Math.round(state.correct / state.total * 100) : 0;
    dom.gameoverStats.innerHTML = 'Score: ' + state.score + ' 🧮 | ' + state.correct + '/' + state.total + ' (' + pct + '%) | Best streak: ' + state.maxCombo;
    dom.gameoverOverlay.classList.remove('hidden');

    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('math-games', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('math-games', 'lb-mh-content', 'Math Games');
    }
}

// ===== RESET =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.correct = 0;
    state.total = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.questionNum = 0;
    state.answered = false;
    state.waitingForNext = false;
    state.timeLeft = 45;
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (state.qTimer) clearTimeout(state.qTimer);
    dom.score.textContent = '0';
    dom.timer.textContent = '45s';
    dom.combo.style.display = 'none';
    dom.feed.textContent = '';
    dom.problem.innerHTML = '🧮 Ready?';
    dom.options.innerHTML = '';
    dom.gameoverOverlay.classList.add('hidden');
    dom.startOverlay.classList.remove('hidden');
}

// ===== START =====
function startGame() {
    if (state.running) return;
    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.correct = 0;
    state.total = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.questionNum = 0;
    state.answered = false;
    state.waitingForNext = false;
    state.timeLeft = 45;
    dom.score.textContent = '0';
    dom.timer.textContent = '45s';
    dom.combo.style.display = 'none';
    dom.feed.textContent = '';
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');

    // Timer
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        dom.timer.textContent = state.timeLeft + 's';
        if (state.timeLeft <= 0) {
            gameOver();
        }
    }, 1000);

    generateProblem();
}

// ===== MUTE =====
if (dom.muteBtn) {
    dom.muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('mh_muted', isMuted);
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
    renderLeaderboard('math-games', 'lb-mh-content', 'Math Games');
}
