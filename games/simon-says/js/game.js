// Simon Says — Game Logic
(function() {
  const PADS = [
    { id: 'green',  tone: 261.63 },
    { id: 'red',    tone: 329.63 },
    { id: 'yellow', tone: 392.00 },
    { id: 'blue',   tone: 523.25 }
  ];

  const dom = {
    score: document.getElementById('simon-score'),
    scoreStat: document.getElementById('simon-score-stat'),
    round: document.getElementById('simon-round'),
    status: document.getElementById('simon-status'),
    lives: document.getElementById('simon-lives'),
    best: document.getElementById('simon-best'),
    startBtn: document.getElementById('simon-start-btn'),
    muteBtn: document.getElementById('simon-mute-btn'),
    resetBtn: document.getElementById('simon-reset-btn'),
    pads: Array.from(document.querySelectorAll('.simon-pad'))
  };

  const state = {
    sequence: [],
    playerIndex: 0,
    lives: 3,
    maxLives: 3,
    score: 0,
    best: parseInt(localStorage.getItem('simon_best')) || 0,
    muted: localStorage.getItem('simon_muted') === 'true',
    playing: false,      // computer is showing the sequence
    acceptingInput: false,
    gameOver: false,
    timeouts: []
  };

  // ===== Helpers =====
  function padEl(id) {
    return document.querySelector('.simon-pad[data-pad="' + id + '"]');
  }

  function clearTimers() {
    state.timeouts.forEach(clearTimeout);
    state.timeouts = [];
  }

  function playTone(freq, duration) {
    if (state.muted) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  }

  function flashPad(id, duration) {
    const el = padEl(id);
    if (!el) return;
    el.classList.add('simon-active');
    const pad = PADS.find(p => p.id === id);
    playTone(pad ? pad.tone : 300, duration);
    state.timeouts.push(setTimeout(() => el.classList.remove('simon-active'), duration));
  }

  function updateHud() {
    dom.score.textContent = state.score;
    dom.scoreStat.textContent = state.score;
    dom.round.textContent = state.sequence.length;
    dom.best.textContent = state.best;
    dom.lives.textContent = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, state.maxLives - state.lives));
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
  }

  // ===== Game flow =====
  function playSequence() {
    state.playing = true;
    state.acceptingInput = false;
    dom.status.textContent = 'Watch...';
    const base = 380;
    state.sequence.forEach((id, i) => {
      state.timeouts.push(setTimeout(() => {
        flashPad(id, base - 100);
        if (i === state.sequence.length - 1) {
          state.timeouts.push(setTimeout(() => {
            state.playing = false;
            state.acceptingInput = true;
            state.playerIndex = 0;
            dom.status.textContent = 'Your turn — repeat the pattern!';
          }, 350));
        }
      }, i * base));
    });
  }

  function addStep() {
    state.sequence.push(PADS[Math.floor(Math.random() * PADS.length)].id);
  }

  function startRound() {
    if (state.gameOver) return;
    clearTimers();
    addStep();
    playSequence();
    updateHud();
  }

  function handlePad(id) {
    if (state.playing || !state.acceptingInput || state.gameOver) return;
    flashPad(id, 220);

    if (id === state.sequence[state.playerIndex]) {
      // correct
      state.playerIndex += 1;
      if (state.playerIndex >= state.sequence.length) {
        // round complete!
        state.acceptingInput = false;
        state.score += 1;
        updateBest();
        dom.status.textContent = 'Round ' + state.sequence.length + ' complete! 🎉';
        state.timeouts.push(setTimeout(startRound, 700));
      }
    } else {
      // wrong
      state.lives -= 1;
      updateHud();
      if (state.lives <= 0) {
        gameOver();
      } else {
        state.acceptingInput = false;
        dom.status.textContent = 'Oops! Watch again (' + state.lives + ' ♥ left).';
        state.timeouts.push(setTimeout(playSequence, 800));
      }
    }
  }

  function gameOver() {
    state.gameOver = true;
    state.acceptingInput = false;
    updateBest();
    dom.status.textContent = 'Game over! You reached round ' + state.sequence.length + ' 🏁';
    dom.startBtn.disabled = false;
    dom.startBtn.textContent = '▶ Play Again';
    // Save to leaderboard if signed in
    if (typeof window.saveScore === 'function' && state.score > 0) {
      window.saveScore('simon-says', state.score);
    }
  }

  function updateBest() {
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('simon_best', state.best);
    }
  }

  // ===== Controls =====
  function startGame() {
    clearTimers();
    state.sequence = [];
    state.playerIndex = 0;
    state.lives = state.maxLives;
    state.score = 0;
    state.gameOver = false;
    dom.startBtn.disabled = true;
    dom.startBtn.textContent = '▶';
    dom.status.textContent = 'Watch the pattern...';
    state.timeouts.push(setTimeout(startRound, 400));
    updateHud();
  }

  function resetGame() {
    clearTimers();
    state.sequence = [];
    state.playerIndex = 0;
    state.lives = state.maxLives;
    state.score = 0;
    state.playing = false;
    state.acceptingInput = false;
    state.gameOver = false;
    dom.startBtn.disabled = false;
    dom.startBtn.textContent = '▶ Start';
    dom.status.textContent = 'Press Start to watch the pattern!';
    updateHud();
  }

  function toggleMute() {
    state.muted = !state.muted;
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    localStorage.setItem('simon_muted', state.muted);
  }

  function bindEvents() {
    dom.startBtn.addEventListener('click', startGame);
    dom.resetBtn.addEventListener('click', resetGame);
    dom.muteBtn.addEventListener('click', toggleMute);
    dom.pads.forEach(pad => {
      pad.addEventListener('click', () => handlePad(pad.dataset.pad));
    });
  }

  bindEvents();
  resetGame();
})();
