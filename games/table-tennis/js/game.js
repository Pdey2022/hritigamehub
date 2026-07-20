// Table Tennis — Game Logic
(function () {
  const canvas = document.getElementById('tt-canvas');
  const ctx = canvas.getContext('2d');
  const W = 500, H = 550;

  // DOM
  const dom = {
    score:       document.getElementById('tt-score'),
    startOverlay: document.getElementById('tt-start-overlay'),
    startBtn:     document.getElementById('tt-start-btn'),
    gameoverOverlay: document.getElementById('tt-gameover-overlay'),
    gameoverStats:   document.getElementById('tt-gameover-stats'),
    restartBtn:  document.getElementById('tt-restart-btn'),
    resetBtn:    document.getElementById('tt-reset-btn'),
    muteBtn:     document.getElementById('tt-mute-btn'),
    shareBtn:    document.getElementById('tt-share-btn')
  };

  // Game state
  const WIN_SCORE = 5;
  const ROUNDS = 3;

  let state = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('tt_high')) || 0,
    round: 1,
    playerWins: 0,
    aiWins: 0,
    muted: false
  };

  // Paddle & Ball objects
  const paddle = {
    w: 14, h: 70,
    x: W - 30,
    y: H / 2 - 35,
    speed: 10,
    targetY: H / 2,
    score: 0
  };

  const ai = {
    w: 14, h: 70,
    x: 16,
    y: H / 2 - 35,
    score: 0,
    targetY: H / 2
  };

  const ball = {
    x: W / 2, y: H / 2,
    r: 10,
    vx: 4, vy: 3,
    speed: 4.5,
    trail: []
  };

  let animId = null;
  let serveTimer = null;
  let isServing = true;
  let serveFlash = 0;

  // Reset ball to center
  function resetBall(dir) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.trail = [];
    isServing = true;
    serveFlash = 0;
    const angle = (Math.random() - 0.5) * 0.8;
    ball.vx = (dir || (Math.random() > 0.5 ? 1 : -1)) * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
    clearTimeout(serveTimer);
    serveTimer = setTimeout(function () {
      isServing = false;
    }, 800);
  }

  // Reset round
  function resetRound() {
    paddle.y = H / 2 - paddle.h / 2;
    paddle.score = 0;
    ai.y = H / 2 - ai.h / 2;
    ai.score = 0;
    resetBall(1);
  }

  // Start game
  function startGame(reset) {
    if (reset) {
      state.score = 0;
      state.round = 1;
      state.playerWins = 0;
      state.aiWins = 0;
    }
    state.running = true;
    state.gameOver = false;
    paddle.score = 0;
    ai.score = 0;
    resetBall(1);
    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    updateHUD();
    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  // Point scored
  function pointScored(winner) {
    if (winner === 'player') {
      paddle.score++;
      state.score += 10;
    } else {
      ai.score++;
    }
    updateHUD();

    // Check round win
    if (paddle.score >= WIN_SCORE) {
      state.playerWins++;
      if (state.playerWins >= Math.ceil(ROUNDS / 2)) {
        endGame(true);
        return;
      }
      state.round++;
      resetRound();
      updateHUD();
      return;
    }
    if (ai.score >= WIN_SCORE) {
      state.aiWins++;
      if (state.aiWins >= Math.ceil(ROUNDS / 2)) {
        endGame(false);
        return;
      }
      state.round++;
      resetBall(-1);
      updateHUD();
      return;
    }
    resetBall(winner === 'player' ? 1 : -1);
  }

  function endGame(playerWon) {
    state.running = false;
    state.gameOver = true;
    if (animId) { cancelAnimationFrame(animId); animId = null; }

    const msg = playerWon ? '🎉 You Win!' : '😢 AI Wins!';
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('tt_high', state.highScore);
    }
    dom.gameoverStats.innerHTML = msg + '<br>⭐ ' + state.score + ' pts | Rounds: ' + state.playerWins + '–' + state.aiWins + '<br><small>Best: ' + state.highScore + '</small>';
    dom.gameoverOverlay.classList.remove('hidden');

    // Leaderboard
    if (state.score > 0) {
      if (typeof saveScore === 'function') saveScore('table-tennis', state.score);
      if (typeof renderLeaderboard === 'function') renderLeaderboard('table-tennis', 'lb-tt-content', 'Table Tennis');
    }
  }

  function updateHUD() {
    dom.score.textContent = state.score + ' | Round ' + state.round + ' (' + state.playerWins + '–' + state.aiWins + ')';
  }

  // Mouse/touch control — center paddle on cursor/finger
  function setPaddleTarget(clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    paddle.targetY = (clientY - rect.top) * scaleY - paddle.h / 2;
  }

  canvas.addEventListener('mousemove', function (e) {
    if (!state.running) return;
    setPaddleTarget(e.clientY);
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (!state.running) return;
    setPaddleTarget(e.touches[0].clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (!state.running) return;
    setPaddleTarget(e.touches[0].clientY);
  }, { passive: false });

  // AI logic
  function updateAI() {
    const predY = ball.y - ai.h / 2;
    // AI tracks ball but with some delay/imperfection
    if (ball.vx < 0) {
      ai.targetY = predY + (Math.random() - 0.5) * 30;
    } else {
      // Ball moving away — drift back to center
      ai.targetY += (H / 2 - ai.h / 2 - ai.targetY) * 0.02;
    }
    // Clamp
    ai.targetY = Math.max(0, Math.min(H - ai.h, ai.targetY));

    const diff = ai.targetY - ai.y;
    const aiSpeed = 3.2 + Math.random() * 0.8;
    if (Math.abs(diff) > 2) {
      ai.y += Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed);
    }
    ai.y = Math.max(0, Math.min(H - ai.h, ai.y));
  }

  // Ball physics
  function updateBall() {
    if (isServing) return;

    ball.x += ball.vx;
    ball.y += ball.vy;

    // Trail
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 8) ball.trail.shift();

    // Top/bottom walls
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = -ball.vy; }
    if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy = -ball.vy; }

    // Player paddle collision
    if (ball.vx > 0 &&
        ball.x + ball.r >= paddle.x &&
        ball.x + ball.r <= paddle.x + paddle.w &&
        ball.y >= paddle.y && ball.y <= paddle.y + paddle.h) {
      ball.vx = -ball.vx;
      const offset = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
      ball.vy += offset * 2;
      // Speed up slightly
      const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (spd < 7) {
        ball.vx *= 1.05;
        ball.vy *= 1.05;
      }
      ball.x = paddle.x - ball.r;
    }

    // AI paddle collision
    if (ball.vx < 0 &&
        ball.x - ball.r <= ai.x + ai.w &&
        ball.x - ball.r >= ai.x &&
        ball.y >= ai.y && ball.y <= ai.y + ai.h) {
      ball.vx = -ball.vx;
      const offset = (ball.y - (ai.y + ai.h / 2)) / (ai.h / 2);
      ball.vy += offset * 1.5;
      ball.x = ai.x + ai.w + ball.r;
    }

    // Score - ball past player
    if (ball.x > W + 20) {
      pointScored('ai');
    }
    // Score - ball past AI
    if (ball.x < -20) {
      pointScored('player');
    }
  }

  // Update player paddle
  function updatePlayer() {
    const diff = paddle.targetY - paddle.y;
    if (Math.abs(diff) > 2) {
      paddle.y += Math.sign(diff) * Math.min(Math.abs(diff), paddle.speed);
    }
    paddle.y = Math.max(0, Math.min(H - paddle.h, paddle.y));
  }

  // Draw
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, W, H);

    // Table center line
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    // Ball trail
    ball.trail.forEach(function (p, i) {
      ctx.fillStyle = 'rgba(255,255,255,' + (i / ball.trail.length * 0.25) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, ball.r * (i / ball.trail.length), 0, Math.PI * 2); ctx.fill();
    });

    // Ball
    const grad = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, ball.r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#66bbff');
    grad.addColorStop(1, '#3388cc');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Serve indicator
    if (isServing) {
      serveFlash += 0.05;
      const alpha = 0.3 + Math.sin(serveFlash * Math.PI * 2) * 0.2;
      ctx.fillStyle = 'rgba(255,255,100,' + alpha + ')';
      ctx.font = '600 16px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Serving...', W / 2, 30);
    }

    // Player paddle
    ctx.shadowColor = 'rgba(102,187,255,0.3)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#66bbff';
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // AI paddle
    ctx.shadowColor = 'rgba(255,100,100,0.3)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff6666';
    ctx.beginPath();
    ctx.roundRect(ai.x, ai.y, ai.w, ai.h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Score display on canvas
    ctx.font = '700 28px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText(ai.score, W / 2 - 50, 50);
    ctx.fillText(paddle.score, W / 2 + 50, 50);

    // Paddle labels
    ctx.font = '500 12px Fredoka, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText('AI', ai.x + ai.w / 2, ai.y + ai.h + 18);
    ctx.fillText('YOU', paddle.x + paddle.w / 2, paddle.y + paddle.h + 18);
  }

  // Helper
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
  };

  // Game loop
  function loop() {
    if (!state.running && !state.gameOver) return;
    if (state.running) {
      updatePlayer();
      updateAI();
      updateBall();
    }
    draw();
    animId = requestAnimationFrame(loop);
  }

  // Event listeners
  dom.startBtn.addEventListener('click', function () { startGame(true); });
  dom.restartBtn.addEventListener('click', function () { startGame(true); });
  dom.resetBtn.addEventListener('click', function () {
    if (confirm('Reset all progress?')) {
      localStorage.removeItem('tt_high');
      state.highScore = 0;
      startGame(true);
    }
  });
  dom.muteBtn.addEventListener('click', function () {
    state.muted = !state.muted;
    dom.muteBtn.textContent = state.muted ? '🔇' : '🔊';
  });
  dom.shareBtn.addEventListener('click', function () {
    var text = '🏓 I scored ' + state.score + ' points in Table Tennis on Hriti\'s Game Hub! Can you beat me? hritihub.uk';
    if (navigator.share) {
      navigator.share({ title: 'Table Tennis — Hriti\'s Game Hub', text: text, url: 'https://hritihub.uk/games/table-tennis/' }).catch(function () {});
    } else {
      navigator.clipboard.writeText(text).then(function () { alert('📋 Copied! Share with friends!'); }).catch(function () {});
    }
  });

  // Initial draw
  updateHUD();
  draw();
})();
