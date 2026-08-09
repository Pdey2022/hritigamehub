// Hangman — Game Logic
(function() {
  const wordBanks = {
    easy: [
      { word: 'cat', clue: 'A furry pet that says meow' },
      { word: 'dog', clue: 'A loyal pet that says woof' },
      { word: 'sun', clue: 'The bright star that keeps us warm' },
      { word: 'moon', clue: 'It glows in the night sky' },
      { word: 'star', clue: 'A twinkling light in the night sky' },
      { word: 'fish', clue: 'A swimmer with fins that lives in water' },
      { word: 'bird', clue: 'An animal with feathers that can fly' },
      { word: 'frog', clue: 'A green jumper that says ribbit' },
      { word: 'cake', clue: 'A sweet treat with candles on birthdays' },
      { word: 'tree', clue: 'A tall plant with leaves and branches' },
      { word: 'hat', clue: 'Something you wear on your head' },
      { word: 'bee', clue: 'A buzzy insect that makes honey' },
      { word: 'fox', clue: 'A clever orange animal with a bushy tail' },
      { word: 'owl', clue: 'A night bird that says hoot' },
      { word: 'ant', clue: 'A tiny insect that works in a team' },
      { word: 'pig', clue: 'A pink farm animal that says oink' },
      { word: 'cow', clue: 'A farm animal that gives us milk' },
      { word: 'duck', clue: 'A water bird that says quack' },
      { word: 'worm', clue: 'A wiggly creature that lives in soil' },
      { word: 'kite', clue: 'A toy that flies high in the wind' }
    ],
    medium: [
      { word: 'dragon', clue: 'A fire-breathing creature that loves treasure and can fly' },
      { word: 'castle', clue: 'A big stone building where kings and queens live' },
      { word: 'wizard', clue: 'A magic person with a pointy hat and a wand' },
      { word: 'pirate', clue: 'A sea sailor who hunts for buried treasure' },
      { word: 'planet', clue: 'A big round world that orbits the sun' },
      { word: 'rocket', clue: 'A spaceship that blasts off into space' },
      { word: 'jungle', clue: 'A wild forest full of monkeys and vines' },
      { word: 'galaxy', clue: 'A huge group of stars and planets in space' },
      { word: 'museum', clue: 'A building where you can see dinosaur bones' },
      { word: 'monkey', clue: 'A playful animal that swings from trees' },
      { word: 'tiger', clue: 'A big striped cat from the jungle' },
      { word: 'panda', clue: 'A black-and-white bear that eats bamboo' },
      { word: 'rabbit', clue: 'A fluffy animal with long ears that hops' },
      { word: 'turtle', clue: 'A slow animal with a shell on its back' },
      { word: 'flower', clue: 'A colorful plant that blooms in spring' },
      { word: 'school', clue: 'A place where you learn and play' },
      { word: 'soccer', clue: 'A sport played by kicking a ball' },
      { word: 'pizza', clue: 'A yummy round food with cheese on top' },
      { word: 'robot', clue: 'A machine that can move and talk' },
      { word: 'cloud', clue: 'Fluffy white shapes floating in the sky' },
      { word: 'ocean', clue: 'The big blue body of water' },
      { word: 'candy', clue: 'A sweet treat that comes in many colors' },
      { word: 'apple', clue: 'A crunchy fruit that can be red or green' },
      { word: 'magic', clue: 'Amazing tricks that seem impossible' },
      { word: 'space', clue: 'The huge area beyond Earth full of stars' }
    ],
    hard: [
      { word: 'treasure', clue: 'A chest overflowing with gold coins and gems' },
      { word: 'unicorn', clue: 'A magical horse with a horn on its head' },
      { word: 'monster', clue: 'A big friendly creature that might live under the bed' },
      { word: 'dinosaur', clue: 'A giant reptile that lived millions of years ago' },
      { word: 'adventure', clue: 'An exciting trip full of fun and surprises' },
      { word: 'elephant', clue: 'A huge gray animal with a long trunk' },
      { word: 'butterfly', clue: 'A colorful insect with big wings that flies' },
      { word: 'chocolate', clue: 'A yummy brown sweet treat' },
      { word: 'rainbow', clue: 'Colorful arcs in the sky after rain' },
      { word: 'octopus', clue: 'A sea creature with eight arms' },
      { word: 'mermaid', clue: 'A magical creature that lives in the sea' },
      { word: 'astronaut', clue: 'A person who travels into space' },
      { word: 'volcano', clue: 'A mountain that can erupt with hot lava' },
      { word: 'mountain', clue: 'A very tall hill you can climb' },
      { word: 'sunshine', clue: 'Warm bright light from the sun' },
      { word: 'snowflake', clue: 'A tiny ice crystal that falls from the sky' },
      { word: 'lighthouse', clue: 'A tall tower with a bright light for ships' },
      { word: 'crocodile', clue: 'A big reptile with a long snout that lives in rivers' },
      { word: 'hedgehog', clue: 'A spiky little animal that rolls into a ball' },
      { word: 'kangaroo', clue: 'An animal that hops and carries babies in a pouch' },
      { word: 'starfish', clue: 'A sea animal shaped like a star' },
      { word: 'seahorse', clue: 'A tiny sea creature with a curly tail' }
    ]
  };

  const TIER_POINTS = { easy: 50, medium: 100, hard: 150 };

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
    diffBtns: Array.from(document.querySelectorAll('.hm-diff-btn')),
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
    tier: 'medium',
    lastWords: [],
    score: 0,
    wins: 0,
    losses: 0,
    best: parseInt(localStorage.getItem('hm_best')) || 0,
    muted: localStorage.getItem('hm_muted') === 'true',
    running: true
  };

  function chooseWord() {
    const bank = wordBanks[state.tier] || wordBanks.medium;
    const pool = bank.filter(entry => !state.lastWords.includes(entry.word));
    const source = pool.length ? pool : bank;
    const chosen = source[Math.floor(Math.random() * source.length)];
    state.lastWords.push(chosen.word);
    if (state.lastWords.length > 3) state.lastWords.shift();
    return chosen;
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

  function celebrate() {
    const overlay = document.createElement('canvas');
    overlay.className = 'hm-confetti';
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
    document.body.appendChild(overlay);
    const ctx2 = overlay.getContext('2d');
    const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#fbbf24', '#2dd4bf', '#fb7185'];
    const pieces = [];
    const count = 150;
    for (let i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * overlay.width,
        y: Math.random() * -overlay.height,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 2 + Math.random() * 3.5,
        vx: -1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        vr: -0.1 + Math.random() * 0.2
      });
    }
    let frames = 0;
    const totalFrames = 230;
    (function tick() {
      ctx2.clearRect(0, 0, overlay.width, overlay.height);
      pieces.forEach(p => {
        p.x += p.vx + Math.sin(frames * 0.05 + p.rot) * 0.6;
        p.y += p.vy;
        p.rot += p.vr;
        ctx2.save();
        ctx2.translate(p.x, p.y);
        ctx2.rotate(p.rot);
        ctx2.fillStyle = p.color;
        ctx2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx2.restore();
      });
      frames++;
      if (frames < totalFrames) {
        requestAnimationFrame(tick);
      } else {
        overlay.remove();
      }
    })();
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

  function setTier(tier) {
    if (!wordBanks[tier]) return;
    state.tier = tier;
    resetGame();
  }

  function resetGame() {
    const chosen = chooseWord();
    state.secret = chosen.word;
    state.clue = chosen.clue;
    state.guessed = [];
    state.wrong = [];
    state.hints = 2;
    state.running = true;
    dom.diffBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tier === state.tier));
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
      state.score += TIER_POINTS[state.tier] || 100;
      dom.status.textContent = 'You saved the hangman! Great job.';
      playSound('win');
      celebrate();
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
    dom.diffBtns.forEach(btn => btn.addEventListener('click', () => setTier(btn.dataset.tier)));
  }

  bindEvents();
  resetGame();
})();
