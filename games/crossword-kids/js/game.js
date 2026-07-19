/* ============================================
   CROSSWORD KIDS — Full Game Engine
   ============================================ */

// ----- WORDS DATABASE -----
const WORDS = [
    // Animals
    { word: 'cat',     clue: 'A furry pet that says meow', category: '🐱 Animals', letters: ['c','a','t'] },
    { word: 'dog',     clue: 'A loyal pet that barks', category: '🐱 Animals', letters: ['d','o','g'] },
    { word: 'fish',    clue: 'A pet that swims in water', category: '🐱 Animals', letters: ['f','i','s','h'] },
    { word: 'bear',    clue: 'A big brown animal that loves honey', category: '🐱 Animals', letters: ['b','e','a','r'] },
    { word: 'frog',    clue: 'A green animal that jumps and croaks', category: '🐱 Animals', letters: ['f','r','o','g'] },
    { word: 'duck',    clue: 'A bird that quacks and swims', category: '🐱 Animals', letters: ['d','u','c','k'] },
    { word: 'lion',    clue: 'The king of the jungle', category: '🐱 Animals', letters: ['l','i','o','n'] },
    { word: 'wolf',    clue: 'A wild animal that howls at the moon', category: '🐱 Animals', letters: ['w','o','l','f'] },
    { word: 'deer',    clue: 'A graceful animal with antlers', category: '🐱 Animals', letters: ['d','e','e','r'] },
    { word: 'owl',     clue: 'A bird that stays awake at night', category: '🐱 Animals', letters: ['o','w','l'] },
    // Food
    { word: 'pizza',   clue: 'A round food with cheese and toppings', category: '🍕 Food', letters: ['p','i','z','z','a'] },
    { word: 'bread',   clue: 'A baked food made from flour', category: '🍕 Food', letters: ['b','r','e','a','d'] },
    { word: 'apple',   clue: 'A red or green fruit you can eat', category: '🍕 Food', letters: ['a','p','p','l','e'] },
    { word: 'candy',   clue: 'A sweet treat that makes you happy', category: '🍕 Food', letters: ['c','a','n','d','y'] },
    { word: 'grape',   clue: 'A small purple or green fruit in bunches', category: '🍕 Food', letters: ['g','r','a','p','e'] },
    { word: 'juice',   clue: 'A drink made from fruits', category: '🍕 Food', letters: ['j','u','i','c','e'] },
    { word: 'soup',    clue: 'A warm food you eat with a spoon', category: '🍕 Food', letters: ['s','o','u','p'] },
    { word: 'melon',   clue: 'A big juicy fruit that is green on the outside', category: '🍕 Food', letters: ['m','e','l','o','n'] },
    // Colors
    { word: 'blue',    clue: 'The color of the sky', category: '🎨 Colors', letters: ['b','l','u','e'] },
    { word: 'red',     clue: 'The color of strawberries', category: '🎨 Colors', letters: ['r','e','d'] },
    { word: 'green',   clue: 'The color of grass and leaves', category: '🎨 Colors', letters: ['g','r','e','e','n'] },
    { word: 'pink',    clue: 'A soft color that is light red', category: '🎨 Colors', letters: ['p','i','n','k'] },
    { word: 'black',   clue: 'The darkest color, like the night sky', category: '🎨 Colors', letters: ['b','l','a','c','k'] },
    { word: 'white',   clue: 'The color of snow and clouds', category: '🎨 Colors', letters: ['w','h','i','t','e'] },
    { word: 'gray',    clue: 'A color between black and white', category: '🎨 Colors', letters: ['g','r','a','y'] },
    { word: 'brown',   clue: 'The color of chocolate and trees', category: '🎨 Colors', letters: ['b','r','o','w','n'] },
    // Nature
    { word: 'tree',    clue: 'A tall plant with leaves and branches', category: '🌳 Nature', letters: ['t','r','e','e'] },
    { word: 'star',    clue: 'A bright dot in the night sky', category: '🌳 Nature', letters: ['s','t','a','r'] },
    { word: 'rain',    clue: 'Water that falls from clouds', category: '🌳 Nature', letters: ['r','a','i','n'] },
    { word: 'snow',    clue: 'White frozen water that falls in winter', category: '🌳 Nature', letters: ['s','n','o','w'] },
    { word: 'moon',    clue: 'The bright thing you see in the sky at night', category: '🌳 Nature', letters: ['m','o','o','n'] },
    { word: 'sun',     clue: 'The bright star that gives us light during the day', category: '🌳 Nature', letters: ['s','u','n'] },
    { word: 'cloud',   clue: 'A white or gray thing in the sky that can bring rain', category: '🌳 Nature', letters: ['c','l','o','u','d'] },
    { word: 'leaf',    clue: 'A green part of a tree that falls in autumn', category: '🌳 Nature', letters: ['l','e','a','f'] },
];

// ----- DOM Refs -----
const dom = {
    score:       document.getElementById('cw-score'),
    round:       document.getElementById('cw-round'),
    clueText:    document.getElementById('cw-clue-text'),
    category:    document.getElementById('cw-category'),
    slots:       document.getElementById('cw-slots'),
    letters:     document.getElementById('cw-letters'),
    feed:        document.getElementById('cw-feed'),
    progress:    document.getElementById('cw-progress'),
    startOverlay:   document.getElementById('cw-start-overlay'),
    gameoverOverlay: document.getElementById('cw-gameover-overlay'),
    gameoverStats:   document.getElementById('cw-gameover-stats'),
    startBtn:    document.getElementById('cw-start-btn'),
    restartBtn:  document.getElementById('cw-restart-btn'),
    muteBtn:     document.getElementById('cw-mute-btn'),
    resetBtn:    document.getElementById('cw-reset-btn')
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('cw_muted') === 'true';
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
function playWin()     { playTone(523, 0.1, 'sine', 0.06); setTimeout(() => playTone(659, 0.1, 'sine', 0.05), 100); setTimeout(() => playTone(784, 0.15, 'sine', 0.05), 200); }

// ===== GAME STATE =====
const state = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('cw_high')) || 0,
    round: 0,
    totalRounds: 10,
    currentWord: null,
    currentIndex: 0,
    shuffledLetters: [],
    correct: 0,
    gameOver: false
};

// ===== SHUFFLE =====
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ===== START ROUND =====
function startRound() {
    if (state.round >= state.totalRounds) {
        endGame();
        return;
    }

    // Pick a random word
    const wordData = WORDS[Math.floor(Math.random() * WORDS.length)];
    state.currentWord = wordData;
    state.currentIndex = 0;

    // Shuffle letters for display
    state.shuffledLetters = shuffle([...wordData.letters]);

    // Update display
    state.round++;
    dom.round.textContent = 'Word ' + state.round + '/' + state.totalRounds;
    dom.clueText.textContent = wordData.clue;
    dom.category.textContent = wordData.category;

    // Render slots
    dom.slots.innerHTML = wordData.letters.map(() =>
        '<div class="cw-slot"></div>'
    ).join('');
    dom.slots.children[0]?.classList.add('active');

    // Render letter options
    dom.letters.innerHTML = state.shuffledLetters.map((letter, i) =>
        '<button class="cw-letter-btn" data-index="' + i + '" data-letter="' + letter + '">' + letter + '</button>'
    ).join('');

    // Attach letter handlers
    dom.letters.querySelectorAll('.cw-letter-btn').forEach(btn => {
        btn.addEventListener('click', () => handleLetter(btn));
        btn.addEventListener('touchend', (e) => { e.preventDefault(); handleLetter(btn); });
    });

    // Progress dots
    const pct = Math.floor((state.round - 1) / state.totalRounds * 100);
    dom.progress.innerHTML = '';
    for (let i = 0; i < state.totalRounds; i++) {
        const dot = document.createElement('div');
        dot.className = 'cw-dot' + (i < state.round - 1 ? ' done' : '') + (i === state.round - 1 ? ' current' : '');
        dom.progress.appendChild(dot);
    }

    dom.feed.textContent = '';
}

// ===== HANDLE LETTER =====
function handleLetter(btn) {
    if (!state.running || state.gameOver) return;
    if (btn.classList.contains('used')) return;

    const letter = btn.dataset.letter;
    const word = state.currentWord;
    const slot = dom.slots.children[state.currentIndex];

    if (state.currentIndex < word.letters.length && letter === word.letters[state.currentIndex]) {
        // Correct!
        slot.textContent = letter;
        slot.classList.add('filled');
        slot.classList.remove('active');
        btn.classList.add('used');
        playCorrect();
        state.currentIndex++;

        if (state.currentIndex < word.letters.length) {
            dom.slots.children[state.currentIndex]?.classList.add('active');
        } else {
            // Word complete!
            state.score += 10 + Math.floor(word.letters.length * 2);
            state.correct++;
            dom.score.textContent = state.score;
            if (state.score > state.highScore) {
                state.highScore = state.score;
                localStorage.setItem('cw_high', state.highScore);
            }
            playWin();
            dom.feed.textContent = '🎉 +' + (10 + Math.floor(word.letters.length * 2)) + ' points!';
            setTimeout(() => startRound(), 1200);
        }
    } else {
        // Wrong
        slot.classList.add('wrong');
        playWrong();
        dom.feed.textContent = '✗ Try again!';
        setTimeout(() => {
            slot.classList.remove('wrong');
            dom.feed.textContent = '';
        }, 400);
    }
}

// ===== END GAME =====
function endGame() {
    state.running = false;
    state.gameOver = true;
    dom.gameoverStats.innerHTML = 'Score: ' + state.score + ' 🧩 | Words: ' + state.correct + '/' + state.totalRounds;
    dom.gameoverOverlay.classList.remove('hidden');

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('cw_high', state.highScore);
    }

    if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('crossword-kids', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('crossword-kids', 'lb-cw-content', 'Crossword Kids');
    }
}

// ===== RESET =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.round = 0;
    state.correct = 0;
    state.currentWord = null;
    state.currentIndex = 0;
    dom.score.textContent = '0';
    dom.gameoverOverlay.classList.add('hidden');
    dom.startOverlay.classList.remove('hidden');
    dom.slots.innerHTML = '';
    dom.letters.innerHTML = '';
    dom.feed.textContent = '';
    dom.progress.innerHTML = '';
    dom.clueText.textContent = 'Press Play to start!';
    dom.category.textContent = '';
    dom.round.textContent = 'Word 0/' + state.totalRounds;
}

// ===== START =====
function startGame() {
    if (state.running) return;
    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.round = 0;
    state.correct = 0;
    dom.score.textContent = '0';
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    startRound();
}

// ===== MUTE =====
if (dom.muteBtn) {
    dom.muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('cw_muted', isMuted);
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
    renderLeaderboard('crossword-kids', 'lb-cw-content', 'Crossword Kids');
}
