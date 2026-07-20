// Tic Tac Toe — Game Logic
(function () {
  const canvas = document.getElementById('ttt-canvas');
  const ctx = canvas.getContext('2d');
  const W = 500, H = 500;

  // DOM
  const dom = {
    score:       document.getElementById('ttt-score'),
    turnText:    document.getElementById('ttt-turn-text'),
    scoreText:   document.getElementById('ttt-score-text'),
    startOverlay: document.getElementById('ttt-start-overlay'),
    startBtn:     document.getElementById('ttt-start-btn'),
    gameoverOverlay: document.getElementById('ttt-gameover-overlay'),
    gameoverStats:   document.getElementById('ttt-gameover-stats'),
    restartBtn:  document.getElementById('ttt-restart-btn'),
    resetBtn:    document.getElementById('ttt-reset-btn'),
    muteBtn:     document.getElementById('ttt-mute-btn'),
    shareBtn:    document.getElementById('ttt-share-btn')
  };

  // State
  let state = {
    running: false,
    gameOver: false,
    board: ['', '', '', '', '', '', '', '', ''],
    turn: 'X', // X always goes first
    score: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    highScore: parseInt(localStorage.getItem('ttt_high')) || 0,
    muted: false,
    playerSymbol: 'X',
    aiSymbol: 'O'
  };

  const CELL = W / 3;
  const WIN_COMBOS = [
    [0,1,2], [3,4,5], [6,7,8],  // rows
    [0,3,6], [1,4,7], [2,5,8],  // cols
    [0,4,8], [2,4,6]             // diags
  ];

  function resetState() {
    state.running = false;
    state.gameOver = false;
    state.board = ['', '', '', '', '', '', '', '', ''];
    state.turn = 'X';
    state.score = 0;
    state.wins = 0;
    state.losses = 0;
    state.draws = 0;
  }

  function startGame() {
    state.running = true;
    state.gameOver = false;
    state.board = ['', '', '', '', '', '', '', '', ''];
    state.turn = 'X';
    state.score = 0;
    state.wins = 0;
    state.losses = 0;
    state.draws = 0;
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    updateHUD();
    draw();
  }

  function updateHUD() {
    dom.score.textContent = state.score;
    dom.turnText.innerHTML = state.gameOver ? 'Game Over' : (state.turn === 'X' ? '❌ Your turn' : '⭕ AI thinking...');
    dom.scoreText.textContent = 'W: ' + state.wins + '  L: ' + state.losses + '  D: ' + state.draws;
  }

  // Check winner
  function checkWinner(board) {
    for (let i = 0; i < WIN_COMBOS.length; i++) {
      const [a, b, c] = WIN_COMBOS[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], combo: [a, b, c] };
      }
    }
    if (board.every(function (c) { return c !== ''; })) return { winner: 'draw', combo: [] };
    return null;
  }

  // Handle cell click
  canvas.addEventListener('click', function (e) {
    if (!state.running || state.gameOver || state.turn !== state.playerSymbol) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(mx / CELL);
    const row = Math.floor(my / CELL);
    const idx = row * 3 + col;
    if (state.board[idx] !== '') return;

    makeMove(idx);
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (!state.running || state.gameOver || state.turn !== state.playerSymbol) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.touches[0].clientX - rect.left) * scaleX;
    const my = (e.touches[0].clientY - rect.top) * scaleY;
    const col = Math.floor(mx / CELL);
    const row = Math.floor(my / CELL);
    const idx = row * 3 + col;
    if (state.board[idx] !== '') return;
    makeMove(idx);
  }, { passive: false });

  function makeMove(idx) {
    state.board[idx] = state.turn;
    draw();

    var result = checkWinner(state.board);
    if (result) {
      endRound(result);
      return;
    }

    state.turn = state.aiSymbol;
    updateHUD();
    draw();

    // AI move after short delay
    setTimeout(function () {
      if (!state.running || state.gameOver) return;
      var aiIdx = getBestMove(state.board, state.aiSymbol);
      if (aiIdx === -1) return;
      state.board[aiIdx] = state.aiSymbol;
      draw();

      var result2 = checkWinner(state.board);
      if (result2) {
        endRound(result2);
        return;
      }

      state.turn = state.playerSymbol;
      updateHUD();
      draw();
    }, 300);
  }

  function endRound(result) {
    state.gameOver = true;
    if (result.winner === state.playerSymbol) {
      state.wins++;
      state.score += 100;
      drawWin(result.combo);
    } else if (result.winner === state.aiSymbol) {
      state.losses++;
      drawWin(result.combo);
    } else {
      state.draws++;
      state.score += 10;
    }

    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('ttt_high', state.highScore);
    }

    updateHUD();

    // Show play-again overlay after short delay
    setTimeout(function () {
      var msg = result.winner === state.playerSymbol ? '🎉 You Win!' :
                result.winner === state.aiSymbol ? '😢 AI Wins!' : '🤝 Draw!';
      dom.gameoverStats.innerHTML = msg + '<br>⭐ ' + state.score + ' pts | W: ' + state.wins + ' L: ' + state.losses + ' D: ' + state.draws + '<br><small>Best: ' + state.highScore + '</small>';
      dom.gameoverOverlay.classList.remove('hidden');

      // Leaderboard
      if (state.score > 0) {
        if (typeof saveScore === 'function') saveScore('tic-tac-toe', state.score);
        if (typeof renderLeaderboard === 'function') renderLeaderboard('tic-tac-toe', 'lb-ttt-content', 'Tic Tac Toe');
      }
    }, 600);
  }

  // ===== MINIMAX AI =====
  function getBestMove(board, aiSym) {
    var playerSym = aiSym === 'X' ? 'O' : 'X';
    var bestScore = -Infinity;
    var bestMove = -1;

    for (var i = 0; i < 9; i++) {
      if (board[i] !== '') continue;
      board[i] = aiSym;
      var score = minimax(board, 0, false, aiSym, playerSym);
      board[i] = '';
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
    return bestMove;
  }

  function minimax(board, depth, isMaximizing, aiSym, playerSym) {
    var result = checkWinner(board);
    if (result) {
      if (result.winner === aiSym) return 10 - depth;
      if (result.winner === playerSym) return depth - 10;
      return 0; // draw
    }

    if (isMaximizing) {
      var best = -Infinity;
      for (var i = 0; i < 9; i++) {
        if (board[i] !== '') continue;
        board[i] = aiSym;
        best = Math.max(best, minimax(board, depth + 1, false, aiSym, playerSym));
        board[i] = '';
      }
      return best;
    } else {
      var worst = Infinity;
      for (var j = 0; j < 9; j++) {
        if (board[j] !== '') continue;
        board[j] = playerSym;
        worst = Math.min(worst, minimax(board, depth + 1, true, aiSym, playerSym));
        board[j] = '';
      }
      return worst;
    }
  }

  // ===== DRAW =====
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, W, H);

    // Draw grid
    ctx.strokeStyle = 'rgba(233,69,96,0.4)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Vertical lines
    for (var i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 20);
      ctx.lineTo(i * CELL, H - 20);
      ctx.stroke();
    }
    // Horizontal lines
    for (var j = 1; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(20, j * CELL);
      ctx.lineTo(W - 20, j * CELL);
      ctx.stroke();
    }

    // Draw X's and O's
    for (var idx = 0; idx < 9; idx++) {
      var row = Math.floor(idx / 3);
      var col = idx % 3;
      var cx = col * CELL + CELL / 2;
      var cy = row * CELL + CELL / 2;
      var s = CELL * 0.3;

      if (state.board[idx] === 'X') {
        // X glow
        ctx.shadowColor = 'rgba(233,69,96,0.5)';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s);
        ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s);
        ctx.lineTo(cx - s, cy + s);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (state.board[idx] === 'O') {
        ctx.shadowColor = 'rgba(83,144,217,0.5)';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#5390d9';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Turn indicator on canvas
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = state.gameOver ? '#ffd700' : (state.turn === 'X' ? '#e94560' : '#5390d9');
    ctx.font = '600 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    if (state.running) {
      ctx.fillText(state.gameOver ? 'Game Over' : (state.turn === 'X' ? '❌ Your turn' : '⭕ AI thinking...'), W / 2, 19);
    }
  }

  function drawWin(combo) {
    if (!combo || combo.length === 0) return;
    // Draw a line through the winning combo
    var centers = combo.map(function (idx) {
      var r = Math.floor(idx / 3);
      var c = idx % 3;
      return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
    });
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(centers[0].x, centers[0].y);
    ctx.lineTo(centers[centers.length - 1].x, centers[centers.length - 1].y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Event listeners
  dom.startBtn.addEventListener('click', startGame);
  dom.restartBtn.addEventListener('click', startGame);
  dom.resetBtn.addEventListener('click', function () {
    if (confirm('Reset all progress?')) {
      localStorage.removeItem('ttt_high');
      state.highScore = 0;
      startGame();
    }
  });
  dom.muteBtn.addEventListener('click', function () {
    state.muted = !state.muted;
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
  });
  dom.shareBtn.addEventListener('click', function () {
    var text = '❌⭕ I scored ' + state.score + ' points in Tic Tac Toe on Hriti\'s Game Hub! W:' + state.wins + ' L:' + state.losses + ' D:' + state.draws + ' Can you beat me? hritihub.uk';
    if (navigator.share) {
      navigator.share({ title: 'Tic Tac Toe — Hriti\'s Game Hub', text: text, url: 'https://hritihub.uk/games/tic-tac-toe/' }).catch(function () {});
    } else {
      navigator.clipboard.writeText(text).then(function () { alert('📋 Copied! Share with friends!'); }).catch(function () {});
    }
  });

  // Initial draw
  updateHUD();
  draw();
})();
