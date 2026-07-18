/* ============================================
   PUZZLE PATH — Full Game Engine
   ============================================ */

const canvas = document.getElementById('pp-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 550;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ===== DOM REFS =====
const dom = {
    score: document.getElementById('pp-score'),
    scoreB: document.getElementById('pp-score-bottom'),
    level: document.getElementById('pp-level'),
    best: document.getElementById('pp-best'),
    lives: document.getElementById('pp-lives'),
    moves: document.getElementById('pp-moves'),
    wrapper: document.getElementById('pp-canvas-wrapper'),
    startOverlay: document.getElementById('pp-start-overlay'),
    gameoverOverlay: document.getElementById('pp-gameover-overlay'),
    gameoverStats: document.getElementById('pp-gameover-stats'),
    levelCompleteOverlay: document.getElementById('pp-levelcomplete-overlay'),
    levelCompleteStats: document.getElementById('pp-levelcomplete-stats'),
    wonOverlay: document.getElementById('pp-won-overlay'),
    wonStats: document.getElementById('pp-won-stats'),
    startBtn: document.getElementById('pp-start-btn'),
    restartBtn: document.getElementById('pp-restart-btn'),
    nextLevelBtn: document.getElementById('pp-nextlevel-btn'),
    playAgainBtn: document.getElementById('pp-playagain-btn'),
    resetBtn: document.getElementById('pp-reset-btn')
};

// ===== LEVEL CONFIG =====
const LEVELS = [
    { cols: 5, rows: 5, stars: 1, obstacles: 0, speed: 0 },
    { cols: 6, rows: 6, stars: 2, obstacles: 0, speed: 0 },
    { cols: 7, rows: 7, stars: 2, obstacles: 0, speed: 0 },
    { cols: 7, rows: 7, stars: 3, obstacles: 1, speed: 0.5 },
    { cols: 8, rows: 8, stars: 3, obstacles: 1, speed: 0.6 },
    { cols: 8, rows: 8, stars: 4, obstacles: 2, speed: 0.7 },
    { cols: 9, rows: 9, stars: 4, obstacles: 2, speed: 0.8 },
    { cols: 9, rows: 9, stars: 5, obstacles: 3, speed: 0.9 },
    { cols: 10, rows: 10, stars: 5, obstacles: 3, speed: 1.0 },
    { cols: 10, rows: 10, stars: 6, obstacles: 4, speed: 1.1 }
];
const TOTAL_LEVELS = LEVELS.length;

// ===== STATE =====
const state = {
    running: false,
    level: 0,
    score: 0,
    lives: 3,
    moves: 0,
    best: parseInt(localStorage.getItem('pp_best')) || 0,
    maze: null,       // 2D array: 0=path, 1=wall
    cols: 0, rows: 0,
    cellSize: 0,
    offsetX: 0, offsetY: 0,
    player: { x: 0, y: 0 },
    goal: { x: 0, y: 0 },
    stars: [],        // [{x, y, collected}]
    obstacles: [],    // [{x, y, dir, vx, vy, speed, moveTimer}]
    animFrame: null,
    particles: [],
    floatingTexts: [],
    moveCooldown: 0
};

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('pp_muted') === 'true';
function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function toggleMute() {
    isMuted = !isMuted; localStorage.setItem('pp_muted', isMuted);
    document.getElementById('pp-mute-btn').textContent = isMuted ? '🔇' : '🔊';
}
function playMove() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(200, c.currentTime);
        g.gain.setValueAtTime(0.05, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.06);
    } catch (e) {}
}
function playCollect() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(880, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(1320, c.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.15);
    } catch (e) {}
}
function playHit() {
    if (isMuted) return;
    try {
        const c = getAudio(), o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(150, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.3);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.3);
    } catch (e) {}
}
function playWin() {
    if (isMuted) return;
    try {
        const c = getAudio();
        [523, 659, 784, 1047].forEach((freq, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(freq, c.currentTime + i * 0.12);
            g.gain.setValueAtTime(0.1, c.currentTime + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.2);
            o.connect(g); g.connect(c.destination);
            o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 0.2);
        });
    } catch(e) {}
}
function playLose() {
    if (isMuted) return;
    try {
        const c = getAudio();
        [400, 350, 300, 200].forEach((freq, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, c.currentTime + i * 0.2);
            g.gain.setValueAtTime(0.08, c.currentTime + i * 0.2);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 0.3);
            o.connect(g); g.connect(c.destination);
            o.start(c.currentTime + i * 0.2); o.stop(c.currentTime + i * 0.2 + 0.3);
        });
    } catch(e) {}
}

// ===== MAZE GENERATION =====
function generateMaze(cols, rows) {
    // Initialize grid: 1 = wall
    const grid = [];
    for (let y = 0; y < rows * 2 + 1; y++) {
        grid[y] = [];
        for (let x = 0; x < cols * 2 + 1; x++) {
            grid[y][x] = 1;
        }
    }

    // Recursive backtracking
    const visited = [];
    for (let y = 0; y < rows; y++) {
        visited[y] = [];
        for (let x = 0; x < cols; x++) visited[y][x] = false;
    }

    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    function carve(x, y) {
        visited[y][x] = true;
        grid[y * 2 + 1][x * 2 + 1] = 0;

        const dirs = [...directions];
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }

        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
                grid[y * 2 + 1 + dy][x * 2 + 1 + dx] = 0;
                carve(nx, ny);
            }
        }
    }

    carve(0, 0);
    return grid;
}

function findFarthestCell(grid, startX, startY) {
    // BFS to find farthest reachable cell
    const h = grid.length, w = grid[0].length;
    const dist = Array.from({ length: h }, () => Array(w).fill(-1));
    const queue = [{ x: startX, y: startY }];
    dist[startY][startX] = 0;
    let farthest = { x: startX, y: startY, dist: 0 };

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny][nx] === 0 && dist[ny][nx] === -1) {
                dist[ny][nx] = dist[y][x] + 1;
                queue.push({ x: nx, y: ny });
                if (dist[ny][nx] > farthest.dist) {
                    farthest = { x: nx, y: ny, dist: dist[ny][nx] };
                }
            }
        }
    }
    return farthest;
}

// ===== MAZE SETUP =====
function setupMaze() {
    const config = LEVELS[state.level];
    state.cols = config.cols;
    state.rows = config.rows;

    // Generate maze grid (logical coords)
    const grid = generateMaze(config.cols, config.rows);
    state.maze = grid;

    // Calculate cell size
    const gridW = grid[0].length, gridH = grid.length;
    const cellW = Math.floor((W - 20) / gridW);
    const cellH = Math.floor((H - 20) / gridH);
    state.cellSize = Math.min(cellW, cellH);
    state.offsetX = Math.floor((W - state.cellSize * gridW) / 2);
    state.offsetY = Math.floor((H - state.cellSize * gridH) / 2);

    // Player start at top-left passage
    state.player = { x: 1, y: 1 };

    // Goal at farthest passage
    const farthest = findFarthestCell(grid, 1, 1);
    state.goal = { x: farthest.x, y: farthest.y };

    // Place stars on random passages
    state.stars = [];
    const passages = [];
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            if (grid[y][x] === 0 && !(x === 1 && y === 1) && !(x === farthest.x && y === farthest.y)) {
                passages.push({ x, y });
            }
        }
    }
    // Shuffle and pick
    for (let i = passages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passages[i], passages[j]] = [passages[j], passages[i]];
    }
    const starCount = Math.min(config.stars, passages.length);
    for (let i = 0; i < starCount; i++) {
        state.stars.push({ x: passages[i].x, y: passages[i].y, collected: false });
    }

    // Place obstacles
    state.obstacles = [];
    const obstacleCount = config.obstacles;
    const obPassages = passages.slice(starCount);
    for (let i = 0; i < Math.min(obstacleCount, obPassages.length); i++) {
        const p = obPassages[i];
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const validDirs = dirs.filter(([dx, dy]) => {
            const nx = p.x + dx * 2, ny = p.y + dy * 2;
            return nx > 0 && nx < grid[0].length - 1 && ny > 0 && ny < grid.length - 1 && grid[ny][nx] === 0;
        });
        if (validDirs.length > 0) {
            const [dx, dy] = validDirs[Math.floor(Math.random() * validDirs.length)];
            state.obstacles.push({
                x: p.x, y: p.y,
                startX: p.x, startY: p.y,
                dx, dy,
                vx: dx * config.speed,
                vy: dy * config.speed,
                speed: config.speed,
                moveTimer: 0
            });
        }
    }

    state.moves = 0;
    state.moveCooldown = 0;
}

// ===== PLAYER MOVEMENT =====
function movePlayer(dx, dy) {
    if (!state.running || state.moveCooldown > 0) return;

    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    const grid = state.maze;

    // Check bounds and walls
    if (nx < 0 || nx >= grid[0].length || ny < 0 || ny >= grid.length) return;
    if (grid[ny][nx] !== 0) return;

    state.player.x = nx;
    state.player.y = ny;
    state.moves++;
    state.moveCooldown = 6; // frames before next move
    playMove();

    // Check star collection
    for (const s of state.stars) {
        if (!s.collected && s.x === nx && s.y === ny) {
            s.collected = true;
            state.score += 100;
            playCollect();
            spawnParticles(cellToX(nx), cellToY(ny), '#ffd700', 8);
            addFloatingText(cellToX(nx), cellToY(ny), '+100', '#ffd700');
        }
    }

    // Check obstacle collision
    for (const ob of state.obstacles) {
        if (Math.floor(ob.x + 0.5) === nx && Math.floor(ob.y + 0.5) === ny) {
            hitObstacle();
            return;
        }
    }

    // Check goal
    if (nx === state.goal.x && ny === state.goal.y) {
        reachGoal();
        return;
    }

    updateHUD();
}

function cellToX(cx) { return state.offsetX + cx * state.cellSize + state.cellSize / 2; }
function cellToY(cy) { return state.offsetY + cy * state.cellSize + state.cellSize / 2; }

function hitObstacle() {
    playHit();
    state.lives--;

    // Push player back toward start
    state.player.x = 1;
    state.player.y = 1;

    spawnParticles(cellToX(state.player.x), cellToY(state.player.y), '#e74c3c', 12);
    updateHUD();

    if (state.lives <= 0) {
        gameOver();
    }
}

function reachGoal() {
    playWin();
    const timeBonus = Math.max(0, 500 - state.moves * 2);
    const points = 500 + timeBonus;
    state.score += points;
    addFloatingText(W / 2, H / 2 - 40, `+${points} 🏆`, '#f1c40f');

    // Win particles
    for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 4;
        state.particles.push({
            x: cellToX(state.goal.x), y: cellToY(state.goal.y),
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 1, color: ['#f1c40f', '#e67e22', '#2ecc71'][i % 3]
        });
    }

    updateHUD();

    // Check next level
    setTimeout(() => {
        if (state.level >= TOTAL_LEVELS - 1) {
            won();
        } else {
            levelComplete();
        }
    }, 800);
}

function levelComplete() {
    state.running = false;
    dom.levelCompleteStats.textContent = `Score: ${state.score} | Moves: ${state.moves}`;
    dom.levelCompleteOverlay.classList.remove('hidden');
}

function nextLevel() {
    state.level++;
    state.running = true;
    dom.levelCompleteOverlay.classList.add('hidden');
    setupMaze();
    drawMaze();
    updateHUD();
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop();
}

function won() {
    state.running = false;
    if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('pp_best', state.best);
    }
    dom.wonStats.textContent = `Final Score: ${state.score} 🏆`;
    dom.wonOverlay.classList.remove('hidden');
}

function gameOver() {
    state.running = false;
    playLose();
    if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('pp_best', state.best);
    }
    dom.gameoverStats.textContent = `Score: ${state.score} | Best: ${state.best}`;
    dom.gameoverOverlay.classList.remove('hidden');

    // Particles
    for (let i = 0; i < 15; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 3;
        state.particles.push({
            x: W / 2, y: H / 2,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 1, color: '#e74c3c'
        });
    }
}

// ===== DRAWING =====
function drawMaze() {
    ctx.clearRect(0, 0, W, H);
    const grid = state.maze;
    const cs = state.cellSize;
    const ox = state.offsetX, oy = state.offsetY;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0c2e4a');
    bg.addColorStop(0.5, '#1a5276');
    bg.addColorStop(1, '#2980b9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Draw maze cells
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const px = ox + x * cs, py = oy + y * cs;
            if (grid[y][x] === 1) {
                // Wall
                ctx.fillStyle = '#1a3a5c';
                ctx.fillRect(px, py, cs, cs);
                // Subtle border
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, cs, cs);
            } else {
                // Path
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(px, py, cs, cs);
            }
        }
    }

    // Grid border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, grid[0].length * cs, grid.length * cs);

    // Draw goal (treasure)
    const gx = ox + state.goal.x * cs, gy = oy + state.goal.y * cs;
    ctx.save();
    ctx.shadowColor = 'rgba(241,196,15,0.6)';
    ctx.shadowBlur = 15;
    ctx.font = `${cs * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', gx + cs / 2, gy + cs / 2);
    ctx.restore();

    // Draw stars (uncollected)
    for (const s of state.stars) {
        if (s.collected) continue;
        const sx = ox + s.x * cs + cs / 2, sy = oy + s.y * cs + cs / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(255,215,0,0.4)';
        ctx.shadowBlur = 8;
        ctx.font = `${cs * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✨', sx, sy + Math.sin(Date.now() / 400 + s.x) * 2);
        ctx.restore();
    }

    // Draw obstacles
    for (const ob of state.obstacles) {
        const ox2 = ox + ob.x * cs, oy2 = oy + ob.y * cs;
        ctx.save();
        ctx.shadowColor = 'rgba(231,76,60,0.5)';
        ctx.shadowBlur = 10;
        ctx.font = `${cs * 0.55}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💀', ox2 + cs / 2, oy2 + cs / 2);
        ctx.restore();
    }

    // Draw player
    const px = ox + state.player.x * cs, py = oy + state.player.y * cs;
    ctx.save();
    ctx.shadowColor = 'rgba(52,152,219,0.6)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#3498db';
    const cx = px + cs / 2, cy = py + cs / 2;
    const r = cs * 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Inner circle
    ctx.fillStyle = '#85c1e9';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Directional hints around player
    const grid = state.maze;
    const dirs = [[0,-1,'↑'],[1,0,'→'],[0,1,'↓'],[-1,0,'←']];
    for (const [ddx, ddy, arrow] of dirs) {
        const nx = state.player.x + ddx, ny = state.player.y + ddy;
        if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length && grid[ny][nx] === 0) {
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 500 + ddx * 2 + ddy * 3) * 0.15;
            ctx.font = `${Math.max(10, cs * 0.35)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#2ecc71';
            ctx.fillText(arrow, cx + ddx * cs * 0.55, cy + ddy * cs * 0.55);
            ctx.restore();
        }
    }

    // Level info
    ctx.font = '12px Fredoka, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`Maze ${state.level + 1}`, 10, 18);

    // Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Floating texts
    state.floatingTexts.forEach(t => {
        ctx.globalAlpha = t.life;
        ctx.font = 'bold 20px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = t.color;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 5;
        ctx.fillText(t.text, t.x, t.y);
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
}

// ===== START SCREEN =====
function drawStartScreen() {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0c2e4a');
    bg.addColorStop(0.5, '#1a5276');
    bg.addColorStop(1, '#2980b9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative maze pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
        const x = (i * 47 + 13) % W;
        const y = (i * 31 + 7) % H;
        ctx.strokeRect(x - 10, y - 10, 20, 20);
    }

    // Path lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const sx = 20 + Math.random() * (W - 40);
        const sy = 20 + Math.random() * (H - 40);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        for (let j = 0; j < 5; j++) {
            ctx.lineTo(sx + (Math.random() - 0.5) * 80, sy + (Math.random() - 0.5) * 80);
        }
        ctx.stroke();
    }

    // Player & Treasure icons
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧑', 80, H / 2 - 40);
    ctx.fillText('⭐', W - 80, H / 2 - 40);

    // Path between
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(110, H / 2 - 40);
    ctx.lineTo(W - 110, H / 2 - 40);
    ctx.stroke();
    ctx.setLineDash([]);

    // Best score
    if (state.best > 0) {
        ctx.font = '16px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`🏆 Best: ${state.best}`, W / 2, H - 30);
    }
}

// ===== PARTICLES =====
function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
    }
}
function addFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -2 });
}
function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.025;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const t = state.floatingTexts[i];
        t.y += t.vy; t.life -= 0.02;
        if (t.life <= 0) state.floatingTexts.splice(i, 1);
    }
}

// ===== HUD =====
function updateHUD() {
    dom.score.textContent = state.score;
    dom.scoreB.textContent = state.score;
    dom.level.textContent = state.level + 1;
    dom.best.textContent = state.best;
    dom.lives.textContent = '❤️'.repeat(Math.max(0, state.lives));
    dom.moves.textContent = state.moves;
}

// ===== GAME LOOP =====
function gameLoop() {
    if (!state.running) { state.animFrame = null; return; }

    // Update obstacles
    for (const ob of state.obstacles) {
        if (ob.speed > 0) {
            ob.moveTimer++;
            const interval = Math.max(20, Math.floor(40 / ob.speed));
            if (ob.moveTimer >= interval) {
                ob.moveTimer = 0;
                const nx = Math.round(ob.x + ob.dx);
                const ny = Math.round(ob.y + ob.dy);
                const grid = state.maze;
                // Bounce off walls
                if (nx <= 0 || nx >= grid[0].length - 1 || ny <= 0 || ny >= grid.length - 1 || grid[ny][nx] !== 0) {
                    ob.dx *= -1;
                    ob.dy *= -1;
                } else {
                    ob.x += ob.dx;
                    ob.y += ob.dy;
                }
                // Check collision with player
                if (Math.floor(ob.x + 0.5) === state.player.x && Math.floor(ob.y + 0.5) === state.player.y) {
                    hitObstacle();
                }
            }
        }
    }

    // Update move cooldown
    if (state.moveCooldown > 0) state.moveCooldown--;

    updateParticles();
    drawMaze();
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== START GAME =====
function startGame() {
    state.level = 0;
    state.score = 0;
    state.lives = 3;
    state.moves = 0;
    state.particles = [];
    state.floatingTexts = [];

    dom.startOverlay.classList.add('hidden');
    dom.gameoverOverlay.classList.add('hidden');
    dom.levelCompleteOverlay.classList.add('hidden');
    dom.wonOverlay.classList.add('hidden');

    setupMaze();
    updateHUD();

    state.running = true;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    drawMaze();
    gameLoop();
}

// ===== INPUT =====
document.addEventListener('keydown', (e) => {
    if (!state.running) return;
    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); movePlayer(0, -1); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); movePlayer(0, 1); break;
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); movePlayer(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); movePlayer(1, 0); break;
    }
});

// Canvas touch/click to move toward click
canvas.addEventListener('click', (e) => {
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const px = state.offsetX + state.player.x * state.cellSize + state.cellSize / 2;
    const py = state.offsetY + state.player.y * state.cellSize + state.cellSize / 2;
    const dx = mx - px, dy = my - py;
    if (Math.abs(dx) > Math.abs(dy)) {
        movePlayer(dx > 0 ? 1 : -1, 0);
    } else {
        movePlayer(0, dy > 0 ? 1 : -1);
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = touch.clientX - rect.left, my = touch.clientY - rect.top;
    const px = state.offsetX + state.player.x * state.cellSize + state.cellSize / 2;
    const py = state.offsetY + state.player.y * state.cellSize + state.cellSize / 2;
    const dx = mx - px, dy = my - py;
    if (Math.abs(dx) > Math.abs(dy)) {
        movePlayer(dx > 0 ? 1 : -1, 0);
    } else {
        movePlayer(0, dy > 0 ? 1 : -1);
    }
});

// ===== BUTTONS =====
dom.startBtn.addEventListener('click', startGame);
dom.restartBtn.addEventListener('click', startGame);
dom.nextLevelBtn.addEventListener('click', nextLevel);
dom.playAgainBtn.addEventListener('click', startGame);

document.getElementById('pp-mute-btn').addEventListener('click', toggleMute);
if (isMuted) document.getElementById('pp-mute-btn').textContent = '🔇';

dom.resetBtn.addEventListener('click', () => {
    if (confirm('🔄 Reset all progress? This cannot be undone!')) {
        state.running = false;
        if (state.animFrame) cancelAnimationFrame(state.animFrame);
        localStorage.removeItem('pp_best');
        state.best = 0;
        dom.best.textContent = 0;
        startGame();
    }
});

// ===== INIT =====
function init() {
    drawStartScreen();
    dom.best.textContent = state.best;
}

document.addEventListener('DOMContentLoaded', init);
