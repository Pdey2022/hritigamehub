// Dino Dig — Game Logic
(function () {
  const canvas = document.getElementById("dn-canvas");
  const ctx = canvas.getContext("2d");
  const W = 500, H = 500;

  // DOM
  const timerEl = document.getElementById("dn-timer");
  const scoreEl = document.getElementById("dn-score");
  const roundEl = document.getElementById("dn-round");
  const startOverlay = document.getElementById("dn-start-overlay");
  const startBtn = document.getElementById("dn-start-btn");
  const gameoverOverlay = document.getElementById("dn-gameover-overlay");
  const gameoverStats = document.getElementById("dn-gameover-stats");
  const restartBtn = document.getElementById("dn-restart-btn");
  const resetBtn = document.getElementById("dn-reset-btn");
  const muteBtn = document.getElementById("dn-mute-btn");
  const shareBtn = document.getElementById("dn-share-btn");

  // Game state
  const GRID = 10; // 10x10 grid
  const CELL = W / GRID; // 50px per cell
  const TOTAL_CELLS = GRID * GRID;
  const ROUND_TIME = 30; // seconds per round
  const TOTAL_ROUNDS = 5;

  // Dinosaurs — each has name, emoji, and skeleton drawing function
  const DINOSAURS = [
    {
      name: "T-Rex",
      emoji: "🦖",
      draw: function (ctx, cx, cy, s) {
        // Big head, small arms, thick legs, long tail
        const sz = s * 0.9;
        ctx.strokeStyle = "#e8d5b7"; ctx.lineWidth = 4; ctx.lineCap = "round";
        // Skull
        ctx.beginPath(); ctx.arc(cx + sz * 0.15, cy - sz * 0.1, sz * 0.14, 0, Math.PI * 2); ctx.stroke();
        // Jaw
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.05, cy - sz * 0.02); ctx.lineTo(cx + sz * 0.25, cy + sz * 0.02); ctx.stroke();
        // Spine
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.12, cy - sz * 0.02); ctx.quadraticCurveTo(cx - sz * 0.3, cy + sz * 0.05, cx - sz * 0.4, cy + sz * 0.02); ctx.stroke();
        // Ribs
        for (let i = 0; i < 4; i++) {
          const t = 0.15 + i * 0.06;
          const rx = cx + sz * 0.12 - t * sz * 0.55;
          const ry = cy - sz * 0.02 + t * sz * 0.07;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(rx - sz * 0.08, ry - sz * 0.1); ctx.lineTo(rx + sz * 0.02, ry); ctx.lineTo(rx - sz * 0.08, ry + sz * 0.08); ctx.stroke();
        }
        // Legs
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.05, cy + sz * 0.04); ctx.lineTo(cx + sz * 0.05, cy + sz * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.05, cy + sz * 0.2); ctx.lineTo(cx - sz * 0.02, cy + sz * 0.28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.05, cy + sz * 0.2); ctx.lineTo(cx + sz * 0.08, cy + sz * 0.27); ctx.stroke();
        // Small arms
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.16, cy + sz * 0.02); ctx.lineTo(cx + sz * 0.22, cy + sz * 0.12); ctx.stroke();
        // Tail
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.4, cy + sz * 0.02); ctx.quadraticCurveTo(cx - sz * 0.5, cy + sz * 0.05, cx - sz * 0.55, cy + sz * 0.01); ctx.stroke();
      }
    },
    {
      name: "Triceratops",
      emoji: "🦕",
      draw: function (ctx, cx, cy, s) {
        const sz = s * 0.85;
        ctx.strokeStyle = "#e8d5b7"; ctx.lineWidth = 4; ctx.lineCap = "round";
        // Frill + skull
        ctx.beginPath(); ctx.ellipse(cx + sz * 0.2, cy - sz * 0.08, sz * 0.2, sz * 0.12, 0.1, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + sz * 0.22, cy - sz * 0.06, sz * 0.08, 0, Math.PI * 2); ctx.stroke();
        // Horns
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.28, cy - sz * 0.1); ctx.lineTo(cx + sz * 0.32, cy - sz * 0.22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.16, cy - sz * 0.1); ctx.lineTo(cx + sz * 0.12, cy - sz * 0.2); ctx.stroke();
        // Spine
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.18, cy - sz * 0.02); ctx.quadraticCurveTo(cx - sz * 0.2, cy + sz * 0.05, cx - sz * 0.35, cy + sz * 0.02); ctx.stroke();
        // Ribs
        for (let i = 0; i < 3; i++) {
          const t = 0.2 + i * 0.08;
          const rx = cx + sz * 0.18 - t * sz * 0.55;
          const ry = cy - sz * 0.02 + t * sz * 0.05;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(rx - sz * 0.07, ry - sz * 0.08); ctx.lineTo(rx + sz * 0.02, ry); ctx.lineTo(rx - sz * 0.07, ry + sz * 0.07); ctx.stroke();
        }
        // Legs
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.08, cy + sz * 0.04); ctx.lineTo(cx + sz * 0.08, cy + sz * 0.18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.04, cy + sz * 0.04); ctx.lineTo(cx - sz * 0.04, cy + sz * 0.18); ctx.stroke();
        // Tail
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.35, cy + sz * 0.02); ctx.quadraticCurveTo(cx - sz * 0.45, cy + sz * 0.06, cx - sz * 0.48, cy + sz * 0.03); ctx.stroke();
      }
    },
    {
      name: "Stegosaurus",
      emoji: "🦎",
      draw: function (ctx, cx, cy, s) {
        const sz = s * 0.85;
        ctx.strokeStyle = "#e8d5b7"; ctx.lineWidth = 4; ctx.lineCap = "round";
        // Small head
        ctx.beginPath(); ctx.arc(cx + sz * 0.25, cy - sz * 0.05, sz * 0.06, 0, Math.PI * 2); ctx.stroke();
        // Spine
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.22, cy - sz * 0.05); ctx.quadraticCurveTo(cx - sz * 0.3, cy + sz * 0.03, cx - sz * 0.42, cy + sz * 0.01); ctx.stroke();
        // Plates along spine
        ctx.lineWidth = 3; ctx.fillStyle = "rgba(232,213,183,0.3)";
        for (let i = 0; i < 6; i++) {
          const t = 0.08 + i * 0.08;
          const px = cx + sz * 0.22 - t * sz * 0.64;
          const py = cy - sz * 0.05 + t * sz * 0.06;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sz * 0.02, py - sz * 0.16); ctx.lineTo(px - sz * 0.02, py - sz * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // Ribs
        ctx.lineWidth = 2.5; ctx.fillStyle = "transparent";
        for (let i = 0; i < 3; i++) {
          const t = 0.2 + i * 0.08;
          const rx = cx + sz * 0.22 - t * sz * 0.64;
          const ry = cy - sz * 0.05 + t * sz * 0.05;
          ctx.beginPath(); ctx.moveTo(rx - sz * 0.06, ry - sz * 0.07); ctx.lineTo(rx + sz * 0.02, ry); ctx.lineTo(rx - sz * 0.06, ry + sz * 0.06); ctx.stroke();
        }
        // Legs
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.1, cy + sz * 0.03); ctx.lineTo(cx + sz * 0.1, cy + sz * 0.17); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.02, cy + sz * 0.03); ctx.lineTo(cx - sz * 0.02, cy + sz * 0.17); ctx.stroke();
        // Tail with spikes
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.42, cy + sz * 0.01); ctx.quadraticCurveTo(cx - sz * 0.52, cy + sz * 0.05, cx - sz * 0.55, cy + sz * 0.02); ctx.stroke();
        // Tail spikes (thagomizer)
        ctx.lineWidth = 2;
        for (let a = -0.3; a <= 0.3; a += 0.2) {
          ctx.beginPath(); ctx.moveTo(cx - sz * 0.52, cy + sz * 0.04); ctx.lineTo(cx - sz * 0.57, cy + sz * 0.04 + a * 0.15); ctx.stroke();
        }
      }
    },
    {
      name: "Brachiosaurus",
      emoji: "🏔️",
      draw: function (ctx, cx, cy, s) {
        const sz = s * 0.8;
        ctx.strokeStyle = "#e8d5b7"; ctx.lineWidth = 4; ctx.lineCap = "round";
        // Long neck
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.2, cy + sz * 0.05); ctx.quadraticCurveTo(cx + sz * 0.35, cy - sz * 0.3, cx + sz * 0.28, cy - sz * 0.4); ctx.stroke();
        // Small head atop long neck
        ctx.beginPath(); ctx.arc(cx + sz * 0.28, cy - sz * 0.42, sz * 0.06, 0, Math.PI * 2); ctx.stroke();
        // Spine/body
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.18, cy + sz * 0.04); ctx.quadraticCurveTo(cx - sz * 0.25, cy + sz * 0.08, cx - sz * 0.38, cy + sz * 0.03); ctx.stroke();
        // Ribs
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
          const t = 0.18 + i * 0.06;
          const rx = cx + sz * 0.18 - t * sz * 0.56;
          const ry = cy + sz * 0.04 + t * sz * 0.04;
          ctx.beginPath(); ctx.moveTo(rx - sz * 0.07, ry - sz * 0.09); ctx.lineTo(rx + sz * 0.02, ry); ctx.lineTo(rx - sz * 0.07, ry + sz * 0.07); ctx.stroke();
        }
        // Thick front legs
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.12, cy + sz * 0.06); ctx.lineTo(cx + sz * 0.12, cy + sz * 0.22); ctx.stroke();
        // Back legs
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.04, cy + sz * 0.06); ctx.lineTo(cx - sz * 0.04, cy + sz * 0.2); ctx.stroke();
        // Tail
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.38, cy + sz * 0.03); ctx.quadraticCurveTo(cx - sz * 0.48, cy + sz * 0.07, cx - sz * 0.5, cy + sz * 0.04); ctx.stroke();
      }
    },
    {
      name: "Pterodactyl",
      emoji: "🦅",
      draw: function (ctx, cx, cy, s) {
        const sz = s * 0.9;
        ctx.strokeStyle = "#e8d5b7"; ctx.lineWidth = 3; ctx.lineCap = "round";
        // Head with crest
        ctx.beginPath(); ctx.arc(cx + sz * 0.15, cy - sz * 0.08, sz * 0.07, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.18, cy - sz * 0.14); ctx.lineTo(cx + sz * 0.12, cy - sz * 0.22); ctx.stroke();
        // Beak
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.21, cy - sz * 0.08); ctx.lineTo(cx + sz * 0.28, cy - sz * 0.07); ctx.stroke();
        // Spine
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.12, cy - sz * 0.05); ctx.quadraticCurveTo(cx - sz * 0.15, cy + sz * 0.02, cx - sz * 0.3, cy + sz * 0.0); ctx.stroke();
        // Wings (folded)
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.05, cy - sz * 0.02); ctx.quadraticCurveTo(cx - sz * 0.2, cy - sz * 0.3, cx - sz * 0.1, cy - sz * 0.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.02, cy - sz * 0.01); ctx.quadraticCurveTo(cx - sz * 0.2, cy + sz * 0.3, cx - sz * 0.08, cy + sz * 0.05); ctx.stroke();
        // Legs
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.02, cy + sz * 0.02); ctx.lineTo(cx + sz * 0.02, cy + sz * 0.12); ctx.stroke();
        // Tail
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.3, cy); ctx.lineTo(cx - sz * 0.4, cy + sz * 0.05); ctx.stroke();
      }
    },
    {
      name: "Ankylosaurus",
      emoji: "🦔",
      draw: function (ctx, cx, cy, s) {
        const sz = s * 0.85;
        ctx.strokeStyle = "#e8d5b7"; ctx.lineWidth = 4; ctx.lineCap = "round";
        // Armored body (wide oval)
        ctx.beginPath(); ctx.ellipse(cx, cy - sz * 0.03, sz * 0.32, sz * 0.11, 0, 0, Math.PI * 2); ctx.stroke();
        // Head
        ctx.beginPath(); ctx.arc(cx + sz * 0.28, cy - sz * 0.04, sz * 0.07, 0, Math.PI * 2); ctx.stroke();
        // Armor plates
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 5; i++) {
          const t = -0.2 + i * 0.1;
          const px = cx + t * sz * 0.8;
          const py = cy - sz * 0.12;
          ctx.beginPath(); ctx.moveTo(px - sz * 0.02, py); ctx.lineTo(px + sz * 0.02, py - sz * 0.04); ctx.lineTo(px + sz * 0.06, py); ctx.closePath(); ctx.stroke();
        }
        // Tail club
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.3, cy - sz * 0.02); ctx.quadraticCurveTo(cx - sz * 0.42, cy + sz * 0.04, cx - sz * 0.5, cy); ctx.stroke();
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(cx - sz * 0.52, cy, sz * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Legs
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx + sz * 0.1, cy + sz * 0.06); ctx.lineTo(cx + sz * 0.1, cy + sz * 0.16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - sz * 0.08, cy + sz * 0.06); ctx.lineTo(cx - sz * 0.08, cy + sz * 0.16); ctx.stroke();
      }
    }
  ];

  // State
  let state = {
    running: false,
    gameOver: false,
    round: 0,
    score: 0,
    dirt: [],          // boolean[GRID*GRID] — true = still covered
    currentDino: null, // index into DINOSAURS
    timeLeft: 0,
    timerInterval: null,
    guessed: false,    // whether player has made a guess this round
    particles: [],
    muted: false,
    highScore: parseInt(localStorage.getItem("dn-high") || "0"),
    combo: 0,
    maxCombo: 0,
    totalRevealed: 0
  };

  function resetState() {
    clearInterval(state.timerInterval);
    state.running = false;
    state.gameOver = false;
    state.round = 0;
    state.score = 0;
    state.dirt = [];
    state.currentDino = null;
    state.timeLeft = ROUND_TIME;
    state.guessed = false;
    state.particles = [];
    state.combo = 0;
    state.maxCombo = 0;
    state.totalRevealed = 0;
  }

  // Shuffle
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Generate choices for this round (3 wrong + 1 correct)
  function getChoices(correctIdx) {
    const wrong = [];
    for (let i = 0; i < DINOSAURS.length; i++) {
      if (i !== correctIdx) wrong.push(i);
    }
    const picks = shuffle(wrong).slice(0, 3);
    picks.push(correctIdx);
    return shuffle(picks);
  }

  // Init dirt grid — all cells covered
  function initDirt() {
    state.dirt = new Array(TOTAL_CELLS).fill(true);
    state.guessed = false;
    state.totalRevealed = 0;
  }

  // Add particles at a grid cell
  function addParticles(gx, gy) {
    const cx = gx * CELL + CELL / 2;
    const cy = gy * CELL + CELL / 2;
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.8) * 100 - 20,
        life: 0.5 + Math.random() * 0.5,
        color: ["#c49a6c", "#a0724e", "#e8c87a", "#8b5e3c"][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 3
      });
    }
  }

  // Reveal adjacent cells (bonus — dig radius)
  function revealCell(index, gx, gy) {
    if (!state.dirt[index]) return;
    state.dirt[index] = false;
    state.totalRevealed++;
    addParticles(gx, gy);

    // Also reveal a small radius around (makes it easier for kids)
    const radius = 1;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) {
          const ni = ny * GRID + nx;
          if (state.dirt[ni]) {
            state.dirt[ni] = false;
            state.totalRevealed++;
            // smaller particles for secondary reveals
            if (Math.random() < 0.5) addParticles(nx, ny);
          }
        }
      }
    }
  }

  // Canvas click handler
  canvas.addEventListener("click", function (e) {
    if (!state.running || state.gameOver || state.guessed) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const gx = Math.floor(mx / CELL);
    const gy = Math.floor(my / CELL);
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return;
    const idx = gy * GRID + gx;
    if (!state.dirt[idx]) return; // already revealed
    revealCell(idx, gx, gy);
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    state.score += 5 + state.combo;

    // Check if all dirt cleared
    if (state.totalRevealed >= TOTAL_CELLS) {
      autoReveal();
    }
    draw();
  });

  // Touch handler for mobile
  canvas.addEventListener("touchstart", function (e) {
    e.preventDefault();
    if (!state.running || state.gameOver || state.guessed) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.touches[0].clientX - rect.left) * scaleX;
    const my = (e.touches[0].clientY - rect.top) * scaleY;
    const gx = Math.floor(mx / CELL);
    const gy = Math.floor(my / CELL);
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return;
    const idx = gy * GRID + gx;
    if (!state.dirt[idx]) return;
    revealCell(idx, gx, gy);
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    state.score += 5 + state.combo;
    if (state.totalRevealed >= TOTAL_CELLS) autoReveal();
    draw();
  }, { passive: false });

  function autoReveal() {
    // All cleared, show choice
    state.guessed = false;
    state.combo = 0;
    renderChoices();
    draw();
  }

  // Make a guess
  window.dnGuess = function (idx) {
    if (state.guessed || !state.running || state.gameOver) return;
    state.guessed = true;
    const isCorrect = idx === state.currentDino;
    const btns = document.querySelectorAll(".dn-choice-btn");
    btns.forEach(function (b, i) {
      if (parseInt(b.dataset.idx) === state.currentDino) b.classList.add("correct");
      if (parseInt(b.dataset.idx) === idx && !isCorrect) b.classList.add("wrong");
    });

    if (isCorrect) {
      state.score += 100;
      state.combo = 0;
    }

    // Auto-advance after short delay
    setTimeout(function () {
      if (!state.running || state.gameOver) return;
      nextRound();
    }, 1200);
  };

  // Next round
  function nextRound() {
    state.round++;
    if (state.round > TOTAL_ROUNDS) {
      endGame();
      return;
    }
    // Hide guess bar
    document.getElementById("dn-guess-bar").classList.remove("show");
    document.getElementById("dn-choices-container").innerHTML = "";
    // Pick a new dinosaur
    state.currentDino = Math.floor(Math.random() * DINOSAURS.length);
    initDirt();
    state.timeLeft = ROUND_TIME;
    state.combo = 0;
    state.guessed = false;
    updateHUD();
    draw();
    startTimer();
  }

  // Start timer
  function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(function () {
      state.timeLeft--;
      updateHUD();
      if (state.timeLeft <= 0) {
        clearInterval(state.timerInterval);
        timeUp();
      }
    }, 1000);
  }

  function timeUp() {
    state.guessed = false; // allow guess
    renderChoices();
    draw();
  }

  function endGame() {
    state.gameOver = true;
    state.running = false;
    clearInterval(state.timerInterval);
    document.getElementById("dn-guess-bar").classList.remove("show");
    document.getElementById("dn-choices-container").innerHTML = "";

    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem("dn-high", state.highScore);
    }

    gameoverStats.innerHTML = "⭐ Score: " + state.score + "<br><small>Best: " + state.highScore + " | Max Combo: " + state.maxCombo + "</small>";
    gameoverOverlay.classList.remove("hidden");
    draw();
  }

  function updateHUD() {
    timerEl.textContent = state.timeLeft + "s";
    scoreEl.textContent = state.score;
    roundEl.textContent = "Round " + state.round + "/" + TOTAL_ROUNDS;
  }

  // Draw canvas
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background — dig site dirt
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
    }

    // Draw skeleton (always visible under dirt)
    if (state.currentDino !== null) {
      ctx.save();
      DINOSAURS[state.currentDino].draw(ctx, W / 2, H / 2, Math.min(W, H) * 0.9);
      ctx.restore();
    }

    // Draw dirt overlays
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (!state.dirt[i]) continue; // already dug
      const gx = i % GRID;
      const gy = Math.floor(i / GRID);
      const x = gx * CELL, y = gy * CELL;

      // Dirt block
      const grad = ctx.createLinearGradient(x, y, x, y + CELL);
      grad.addColorStop(0, "#b8860b");
      grad.addColorStop(0.5, "#a0724e");
      grad.addColorStop(1, "#6b3a1f");
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

      // Texture dots
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let d = 0; d < 3; d++) {
        const dx = x + 4 + Math.random() * (CELL - 12);
        const dy = y + 4 + Math.random() * (CELL - 12);
        ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Draw particles
    state.particles = state.particles.filter(function (p) { return p.life > 0; });
    state.particles.forEach(function (p) {
      ctx.fillStyle = "rgba(" + hexToRgb(p.color) + "," + p.life + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vy += 120 * 0.016; // gravity
      p.life -= 0.025;
    });

    // Dino name hint
    if (state.currentDino !== null && state.running) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, 28);
      ctx.fillStyle = "#ffd700";
      ctx.font = "600 14px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🦴 Dig to uncover the dinosaur! Tap to chip away dirt.", W / 2, 19);
    }
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r + "," + g + "," + b;
  }

  // Animation loop
  function loop() {
    if (state.running || state.gameOver) {
      draw();
    }
    requestAnimationFrame(loop);
  }

  // Render choice buttons
  function renderChoices() {
    const choices = getChoices(state.currentDino);
    const container = document.getElementById("dn-choices-container");
    const guessBar = document.getElementById("dn-guess-bar");
    container.innerHTML = "";
    choices.forEach(function (di) {
      const btn = document.createElement("button");
      btn.className = "dn-choice-btn";
      btn.dataset.idx = di;
      btn.textContent = DINOSAURS[di].emoji + " " + DINOSAURS[di].name;
      btn.addEventListener("click", function () { window.dnGuess(di); });
      container.appendChild(btn);
    });
    guessBar.classList.add("show");
  }

  // Start game
  function startGame() {
    resetState();
    state.running = true;
    state.round = 1;
    state.currentDino = Math.floor(Math.random() * DINOSAURS.length);
    initDirt();
    state.timeLeft = ROUND_TIME;
    state.score = 0;
    updateHUD();
    draw();
    startTimer();
    startOverlay.classList.add("hidden");
    gameoverOverlay.classList.add("hidden");
    document.getElementById("dn-guess-bar").classList.remove("show");
    document.getElementById("dn-choices-container").innerHTML = "";
  }

  // Event listeners
  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);
  resetBtn.addEventListener("click", function () {
    if (confirm("Reset all progress?")) {
      localStorage.removeItem("dn-high");
      state.highScore = 0;
      resetState();
      startOverlay.classList.remove("hidden");
      gameoverOverlay.classList.add("hidden");
      updateHUD();
      draw();
    }
  });

  muteBtn.addEventListener("click", function () {
    state.muted = !state.muted;
    muteBtn.textContent = state.muted ? "🔇" : "🔊";
  });

  shareBtn.addEventListener("click", function () {
    const text = "🦕 I just scored " + state.score + " points digging up dinosaurs in Dino Dig! Can you beat my score? Play free at hritihub.uk/games/dino-dig/";
    if (navigator.share) {
      navigator.share({ title: "Dino Dig — Hriti's Game Hub", text: text, url: "https://hritihub.uk/games/dino-dig/" }).catch(function () {});
    } else {
      navigator.clipboard.writeText(text).then(function () { alert("Copied! Share with friends!"); }).catch(function () {});
    }
  });

  // Initial draw
  state.currentDino = 0;
  initDirt();
  draw();
  updateHUD();
  loop();
})();
