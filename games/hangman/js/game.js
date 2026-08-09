// Hangman — Game Logic
(function() {
  const words = [
    { word: 'dragon', clue: 'A fire-breathing creature that loves treasure and can fly' },
    { word: 'castle', clue: 'A big stone building where kings and queens live' },
    { word: 'wizard', clue: 'A magic person with a pointy hat and a wand' },
    { word: 'pirate', clue: 'A sea sailor who hunts for buried treasure' },
    { word: 'planet', clue: 'A big round world that orbits the sun' },
    { word: 'rocket', clue: 'A spaceship that blasts off into space' },
    { word: 'jungle', clue: 'A wild forest full of monkeys and vines' },
    { word: 'treasure', clue: 'A chest overflowing with gold coins and gems' },
    { word: 'monster', clue: 'A big friendly creature that might live under the bed' },
    { word: 'dinosaur', clue: 'A giant reptile that lived millions of years ago' },
    { word: 'adventure', clue: 'An exciting trip full of fun and surprises' },
    { word: 'galaxy', clue: 'A huge group of stars and planets in space' },
    { word: 'museum', clue: 'A building where you can see dinosaur bones' },
    { word: 'unicorn', clue: 'A magical horse with a horn on its head' }
  ];

  const dom = {
    score: document.getElementById('hm-score'),
    wordDisplay: document.getElementById('hm-word-display'),
    status: document.getElementById('hm-status'),
    hangman: document.getElementById('hm-hangman'),
    remaining: document.getElementById('hm-remaining'),
    wins: document.getElementById('hm-wins'),
    losses: document.getElementById('hm-losses'),
    best: document.getElementById('hm-best'),
    muteBtn: document.getElementById('hm-mute-btn'),
    resetBtn: document.getElementById('hm-reset-btn'),
    hintBtn: document.getElementById('hm-hint-btn'),
    clue: document.getElementById('hm-clue'),
    letters: document.getElementById('hm-letters')
  };

  // Canvas for drawing the hangman figure
  const canvas = document.createElement('canvas');
  canvas.width = 260;
  canvas.height = 220;
  canvas.classList.add('hm-canvas');
  dom.hangman.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const state = {
    secret: '',
    clue: '',
    guessed: [],
    wrong: [],
    maxWrong: 6,
    hints: 2,
    score: 0,
    wins: 0,
    losses: 0,
    best: parseInt(localStorage.getItem('hm_best')) || 0,
    muted: localStorage.getItem('hm_muted') === 'true',
    running: true
  };

  function chooseWord() {
    return words[Math.floor(Math.random() * words.length)];
  }

  function getDisplayWord() {
    return state.secret.split('').map(letter => (state.guessed.includes(letter) ? letter : '_')).join(' ');
  }

  function updateHud() {
    dom.score.textContent = state.score;
    dom.wins.textContent = state.wins;
    dom.losses.textContent = state.losses;
    dom.best.textContent = state.best;
    dom.remaining.textContent = state.maxWrong - state.wrong.length;
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    dom.hintBtn.disabled = state.hints <= 0 || !state.running;
    dom.hintBtn.textContent = state.hints > 0 ? '💡 Hint (' + state.hints + ')' : '💡 Hint';
  }

  function drawHangman(steps) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f8fafc';
    const H = canvas.height;
    // Gallows
    ctx.beginPath();
    ctx.moveTo(20, H - 20); ctx.lineTo(140, H - 20);   // base
    ctx.moveTo(60, H - 20); ctx.lineTo(60, 20);          // pole
    ctx.moveTo(60, 20); ctx.lineTo(150, 20);             // top bar
    ctx.moveTo(150, 20); ctx.lineTo(150, 45);            // rope drop
    ctx.stroke();
    const x = 150, y = 45;
    ctx.beginPath();
    if (steps >= 1) { ctx.arc(x, y + 18, 18, 0, Math.PI * 2); }      // head
    if (steps >= 2) { ctx.moveTo(x, y + 36); ctx.lineTo(x, y + 90); } // body
    if (steps >= 3) { ctx.moveTo(x, y + 50); ctx.lineTo(x - 22, y + 70); } // left arm
    if (steps >= 4) { ctx.moveTo(x, y + 50); ctx.lineTo(x + 22, y + 70); } // right arm
    if (steps >= 5) { ctx.moveTo(x, y + 90); ctx.lineTo(x - 22, y + 120); } // left leg
    if (steps >= 6) { ctx.moveTo(x, y + 90); ctx.lineTo(x + 22, y + 120); } // right leg
    ctx.stroke();
  }

  function playSound(type) {
    if (state.muted) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    osc.type = 'sine';
    if (type === 'win') osc.frequency.value = 880;
    if (type === 'lose') osc.frequency.value = 220;
    if (type === 'hit') osc.frequency.value = 520;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  function renderClue() {
    dom.clue.textContent = '💡 Clue: ' + state.clue;
  }

  function revealHint() {
    if (!state.running || state.hints <= 0) return;
    const hidden = state.secret.split('').filter(letter => !state.guessed.includes(letter));
    if (hidden.length === 0) return;
    const letter = hidden[Math.floor(Math.random() * hidden.length)];
    state.guessed.push(letter);
    state.hints -= 1;
    playSound('hit');
    dom.status.textContent = 'Hint used — revealed "' + letter.toUpperCase() + '"!';
    renderWord();
    renderLetters();
    updateHud();
    checkGameEnd();
  }

  function resetGame() {
    const chosen = chooseWord();
    state.secret = chosen.word;
    state.clue = chosen.clue;
    state.guessed = [];
    state.wrong = [];
    state.hints = 2;
    state.running = true;
    dom.status.textContent = 'Guess letters to save the hangman.';
    drawHangman(0);
    renderClue();
    renderWord();
    renderLetters();
    updateHud();
  }

  function updateBest() {
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('hm_best', state.best);
    }
  }

  function renderWord() {
    dom.wordDisplay.textContent = getDisplayWord();
  }

  function renderLetters() {
    dom.letters.innerHTML = '';
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    alphabet.forEach(letter => {
      const button = document.createElement('button');
      button.className = 'hm-letter-btn';
      button.textContent = letter.toUpperCase();
      button.disabled = state.guessed.includes(letter) || state.wrong.includes(letter) || !state.running;
      if (state.guessed.includes(letter)) button.classList.add('correct', 'guessed');
      if (state.wrong.includes(letter)) button.classList.add('wrong', 'guessed');
      button.addEventListener('click', () => guessLetter(letter, button));
      dom.letters.appendChild(button);
    });
  }

  function guessLetter(letter, button) {
    if (!state.running) return;
    if (state.secret.includes(letter)) {
      state.guessed.push(letter);
      dom.status.textContent = 'Nice! You found a letter.';
      button.classList.add('correct', 'guessed');
      playSound('hit');
    } else {
      state.wrong.push(letter);
      dom.status.textContent = 'Oops! That letter is not in the word.';
      button.classList.add('wrong', 'guessed');
      drawHangman(state.wrong.length);
      playSound('lose');
    }
    button.disabled = true;
    renderWord();
    checkGameEnd();
    updateHud();
  }

  function checkGameEnd() {
    if (state.secret.split('').every(letter => state.guessed.includes(letter))) {
      state.running = false;
      state.wins += 1;
      state.score += 100;
      dom.status.textContent = 'You saved the hangman! Great job.';
      playSound('win');
      updateBest();
      setTimeout(resetGame, 1200);
      return;
    }

    if (state.wrong.length >= state.maxWrong) {
      state.running = false;
      state.losses += 1;
      dom.status.textContent = 'Game over! The word was "' + state.secret + '".';
      dom.wordDisplay.textContent = state.secret.split('').join(' ');
      playSound('lose');
      updateBest();
      setTimeout(resetGame, 1400);
    }
  }

  function toggleMute() {
    state.muted = !state.muted;
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    localStorage.setItem('hm_muted', state.muted);
  }

  function bindEvents() {
    dom.resetBtn.addEventListener('click', resetGame);
    dom.muteBtn.addEventListener('click', toggleMute);
    dom.hintBtn.addEventListener('click', revealHint);
  }

  bindEvents();
  resetGame();
})();
