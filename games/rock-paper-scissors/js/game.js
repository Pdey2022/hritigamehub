// Rock Paper Scissors — Game Logic
(function() {
  const dom = {
    score: document.getElementById('rps-score'),
    playerChoice: document.getElementById('rps-player-choice'),
    aiChoice: document.getElementById('rps-ai-choice'),
    status: document.getElementById('rps-status'),
    wins: document.getElementById('rps-wins'),
    draws: document.getElementById('rps-draws'),
    losses: document.getElementById('rps-losses'),
    best: document.getElementById('rps-best'),
    muteBtn: document.getElementById('rps-mute-btn'),
    resetBtn: document.getElementById('rps-reset-btn'),
    options: Array.from(document.querySelectorAll('.rps-option-btn'))
  };

  const state = {
    score: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    best: parseInt(localStorage.getItem('rps_best')) || 0,
    muted: localStorage.getItem('rps_muted') === 'true',
    lastMove: null,
    lastResult: null,
    running: true
  };

  const OPTIONS = ['rock', 'paper', 'scissors'];
  const LABELS = {
    rock: '✊ Rock',
    paper: '✋ Paper',
    scissors: '✌️ Scissors'
  };

  function getAiChoice() {
    return OPTIONS[Math.floor(Math.random() * OPTIONS.length)];
  }

  function getResult(player, ai) {
    if (player === ai) return 'draw';
    if (
      (player === 'rock' && ai === 'scissors') ||
      (player === 'paper' && ai === 'rock') ||
      (player === 'scissors' && ai === 'paper')
    ) {
      return 'win';
    }
    return 'lose';
  }

  function toggleMute() {
    state.muted = !state.muted;
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    localStorage.setItem('rps_muted', state.muted);
  }

  function playSound(type) {
    if (state.muted) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.type = 'sine';
    if (type === 'win') osc.frequency.value = 880;
    if (type === 'lose') osc.frequency.value = 220;
    if (type === 'draw') osc.frequency.value = 440;
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }

  function updateHud() {
    dom.score.textContent = state.score;
    dom.wins.textContent = state.wins;
    dom.draws.textContent = state.draws;
    dom.losses.textContent = state.losses;
    dom.best.textContent = state.best;
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
  }

  function resetGame() {
    state.score = 0;
    state.wins = 0;
    state.draws = 0;
    state.losses = 0;
    state.lastMove = null;
    state.lastResult = null;
    state.running = true;
    dom.playerChoice.textContent = '–';
    dom.aiChoice.textContent = '–';
    dom.status.textContent = 'Pick a move and challenge the computer!';
    updateHud();
  }

  function updateBest() {
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('rps_best', state.best);
    }
  }

  function playRound(choice) {
    if (!state.running) return;
    const ai = getAiChoice();
    const result = getResult(choice, ai);
    state.lastMove = choice;
    state.lastResult = result;
    dom.playerChoice.textContent = LABELS[choice];
    dom.aiChoice.textContent = LABELS[ai];

    if (result === 'win') {
      state.wins += 1;
      state.score += 20;
      dom.status.textContent = 'You win this round! Great choice.';
      dom.status.classList.add('rps-win');
      playSound('win');
      setTimeout(() => dom.status.classList.remove('rps-win'), 800);
    } else if (result === 'lose') {
      state.losses += 1;
      state.score = Math.max(0, state.score - 10);
      dom.status.textContent = 'You lost this round. Try again!';
      dom.status.classList.remove('rps-win');
      playSound('lose');
    } else {
      state.draws += 1;
      state.score += 5;
      dom.status.textContent = 'It is a draw. One more round?';
      dom.status.classList.remove('rps-win');
      playSound('draw');
    }

    updateBest();
    updateHud();
  }

  function bindEvents() {
    dom.muteBtn.addEventListener('click', toggleMute);
    dom.resetBtn.addEventListener('click', resetGame);
    dom.options.forEach(btn => {
      btn.addEventListener('click', () => playRound(btn.dataset.choice));
    });
  }

  resetGame();
  bindEvents();
})();
