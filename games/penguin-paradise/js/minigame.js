/* ============================================
   PENGUIN PARADISE — Fish Catch Minigame
   ============================================ */

// ----- Minigame State -----
let canvas, ctx;
let gameRunning = false;
let animationId = null;
let lives = 3;
let combo = 0;
let fishCaughtThisSession = 0;

const CANVAS_W = 500;
const CANVAS_H = 400;

// Player (catcher)
const player = {
    x: CANVAS_W / 2 - 30,
    y: CANVAS_H - 40,
    width: 60,
    height: 40
};

// Falling items array
let fallingItems = [];

// Spawn control
let frameCount = 0;
const SPAWN_INTERVAL = 30; // frames between spawns
const MAX_ITEMS = 15;

// Mouse tracking
let mouseX = null;

// ----- Power-up State -----
const powerUp = {
    active: null,   // 'slow-motion' | 'magnet' | 'shield' | 'double-coins' | null
    timer: 0,
    duration: 0
};

const POWERUP_DURATIONS = {
    'slow-motion': 300,
    'magnet': 300,
    'shield': 480,
    'double-coins': 480
};

const POWERUP_ICONS = {
    'slow-motion': '⏱',
    'magnet': '🧲',
    'shield': '🛡',
    'double-coins': '2️⃣'
};

const POWERUP_COLORS = {
    'slow-motion': '#9b59b6',
    'magnet': '#2ecc71',
    'shield': '#3498db',
    'double-coins': '#ffd700'
};

// ----- Seasonal Theme -----
function getSeasonalTheme() {
    const m = new Date().getMonth();
    if (m === 11 || m === 0) return 'winter';
    if (m >= 5 && m <= 7) return 'summer';
    return 'normal';
}
const SEASONAL_THEME = getSeasonalTheme();

// ----- Sparkle Trail -----
let playerTrail = [];

function updatePlayerTrail() {
    const cx = player.x + player.width / 2;
    const cy = player.y + 28;
    if (playerTrail.length === 0 || Math.abs(playerTrail[playerTrail.length - 1].x - cx) > 3) {
        playerTrail.push({ x: cx, y: cy, life: 1 });
        if (playerTrail.length > 18) playerTrail.shift();
    }
}

function drawPlayerTrail() {
    for (let i = 0; i < playerTrail.length; i++) {
        const p = playerTrail[i];
        p.life -= 0.025;
        if (p.life <= 0) continue;
        ctx.globalAlpha = p.life * 0.35;
        const trailColor = powerUp.active ? POWERUP_COLORS[powerUp.active] : '#a8e6ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.life * 4 + 2, 0, Math.PI * 2);
        ctx.fillStyle = trailColor;
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ----- Screen Shake -----
function triggerShake() {
    const wrapper = document.querySelector('.canvas-wrapper');
    if (!wrapper) return;
    wrapper.classList.remove('shake');
    void wrapper.offsetWidth;
    wrapper.classList.add('shake');
}

// ----- Difficulty scaling (based on total coins) -----
function getDifficultyMultiplier() {
    const coins = gameState.coins;
    if (coins >= 300) return 1.4;
    if (coins >= 150) return 1.2;
    if (coins >= 50)  return 1.1;
    return 1.0;
}

// ============================================
// INITIALIZE
// ============================================

function startMinigame() {
    canvas = dom.canvas;
    if (!canvas) return;

    // High-DPI canvas support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';

    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    lives = 3;
    combo = 0;
    fishCaughtThisSession = 0;
    fallingItems = [];
    frameCount = 0;
    gameRunning = true;
    updateMinigameUI();

    // Keyboard controls
    document.removeEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyDown);

    // Mouse controls
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Touch controls
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

// Reset and show the play overlay (called when returning from Sanctuary)
function resetMinigameForPlay() {
    // Stop any running game
    if (gameRunning) {
        gameRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    // Reset state
    canvas = dom.canvas;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    lives = 3;
    combo = 0;
    fishCaughtThisSession = 0;
    fallingItems = [];
    playerTrail = [];
    frameCount = 0;
    gameRunning = false;
    updateMinigameUI();

    // Show play overlay
    const overlay = document.getElementById('play-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        // Remove old listeners to avoid duplicates
        const newOverlay = overlay.cloneNode(true);
        overlay.parentNode.replaceChild(newOverlay, overlay);
        newOverlay.addEventListener('click', function onClick() {
            newOverlay.classList.add('hidden');
            startMinigame();
        });
    }

    // Draw a static start screen on the canvas
    drawStartScreen();
}

// Draw a static start screen on the canvas
function drawStartScreen() {
    if (!ctx) return;
    // Background
    const s = typeof getCurrentSanctuary === 'function' ? getCurrentSanctuary() : SANCTUARIES[0];
    const cg = s.canvasGradient;
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, cg[0]);
    grad.addColorStop(0.4, cg[1]);
    grad.addColorStop(0.7, cg[2]);
    grad.addColorStop(1, cg[3]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw some decorative fish in background
    for (let i = 0; i < 5; i++) {
        const fx = 40 + i * 90 + Math.sin(i * 2) * 15;
        const fy = 60 + i * 55;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 14, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#e74c3c' : '#f39c12';
        ctx.fill();
        // Tail
        ctx.beginPath();
        ctx.moveTo(fx - 14, fy);
        ctx.lineTo(fx - 22, fy - 6);
        ctx.lineTo(fx - 22, fy + 6);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Draw the player penguin centered
    ctx.save();
    const px = CANVAS_W / 2 - 30;
    const py = CANVAS_H - 80;
    ctx.beginPath();
    ctx.ellipse(px + 30, py + 14, 24, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2c3e50';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + 30, py + 18, 14, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(px + 25, py + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 35, py + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(px + 26, py + 7, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 36, py + 7, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 26, py + 14);
    ctx.lineTo(px + 34, py + 14);
    ctx.lineTo(px + 30, py + 20);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();
    ctx.restore();

    // Sandy bottom
    ctx.fillStyle = 'rgba(194, 178, 128, 0.4)';
    ctx.fillRect(0, CANVAS_H - 15, CANVAS_W, 15);
}

function handleKeyDown(e) {
    if (!gameRunning) return;
    const speed = 12;
    if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.x = Math.max(0, player.x - speed);
        e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
        player.x = Math.min(CANVAS_W - player.width, player.x + speed);
        e.preventDefault();
    }
}

function handleMouseMove(e) {
    if (!gameRunning) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    mouseX = (e.clientX - rect.left) * scaleX;
    player.x = clamp(mouseX - player.width / 2, 0, CANVAS_W - player.width);
}

function handleMouseLeave() {
    mouseX = null;
}

function handleTouchMove(e) {
    if (!gameRunning) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const touch = e.touches[0];
    if (touch) {
        const tx = (touch.clientX - rect.left) * scaleX;
        player.x = clamp(tx - player.width / 2, 0, CANVAS_W - player.width);
    }
}

// ============================================
// SPAWNING
// ============================================

function spawnItem() {
    if (fallingItems.length >= MAX_ITEMS) return;

    const diff = getDifficultyMultiplier();
    const roll = Math.random();

    let type, color, points, speed, radius, label;

    // Power-up (8% chance, only if combo >= 2 and none active)
    if (roll < 0.08 && combo >= 2 && !powerUp.active) {
        const types = ['slow-motion', 'magnet', 'shield', 'double-coins'];
        type = types[Math.floor(Math.random() * types.length)];
        color = POWERUP_COLORS[type];
        points = 0;
        speed = 2 + Math.random() * 2;
        radius = 16;
        label = POWERUP_ICONS[type];
    }
    // Golden fish (2%, needs combo >= 3)
    else if (roll < 0.10 && combo >= 3) {
        type = 'golden-fish';
        color = '#ffd700';
        points = 50;
        speed = 6 + Math.random() * 2;
        radius = 14;
        label = '⭐';
    }
    // Treasure chest (2%, needs combo >= 5)
    else if (roll < 0.12 && combo >= 5) {
        type = 'treasure-chest';
        color = '#8e44ad';
        points = 100;
        speed = 2 + Math.random() * 1.5;
        radius = 16;
        label = '🎁';
    }
    // Pearl (6%)
    else if (roll < 0.18) {
        type = 'pearl';
        color = '#a8e6ff';
        points = 30;
        speed = 1.5 + Math.random() * 2;
        radius = 8;
        label = '🦪';
    }
    // Boot obstacle (10%)
    else if (roll < 0.28) {
        type = 'boot';
        color = '#8B4513';
        points = 0;
        speed = 5 + Math.random() * 3;
        radius = 12;
        label = '👢';
    }
    // Iceberg (14%)
    else if (roll < 0.42) {
        type = 'iceberg';
        color = '#aed6f1';
        points = 0;
        speed = 4 + Math.random() * 3;
        radius = 14;
        label = '🧊';
    }
    // Shrimp (14%)
    else if (roll < 0.56) {
        type = 'shrimp';
        color = '#f39c12';
        points = 20;
        speed = 3 + Math.random() * 3;
        radius = 10;
        label = '🦐';
    }
    // Fish (44%)
    else {
        type = 'fish';
        color = '#e74c3c';
        points = 10;
        speed = 2 + Math.random() * 3;
        radius = 12;
        label = '🐟';
    }

    // Apply difficulty multiplier
    speed *= diff;

    fallingItems.push({
        type,
        x: 20 + Math.random() * (CANVAS_W - 40),
        y: -20,
        radius,
        speed,
        color,
        points,
        label,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.05
    });
}

// ============================================
// UPDATE
// ============================================

function updateMinigame() {
    frameCount++;

    // Decrease power-up timer
    if (powerUp.active) {
        powerUp.timer--;
        if (powerUp.timer <= 0) {
            powerUp.active = null;
            powerUp.timer = 0;
        }
    }

    // Spawn
    const adjustedInterval = Math.max(15, SPAWN_INTERVAL - Math.floor(gameState.stats.totalFishCaught / 20));
    if (frameCount % adjustedInterval === 0) {
        spawnItem();
    }

    // Speed modifier from slow-motion power-up
    const speedMod = (powerUp.active === 'slow-motion') ? 0.3 : 1;

    // Move items
    for (let i = fallingItems.length - 1; i >= 0; i--) {
        const item = fallingItems[i];
        
        // Apply speed modifier (power-ups and valuable items fall at normal speed during slow-motion for balance)
        const isSpecial = ['treasure-chest', 'golden-fish', 'pearl'].includes(item.type);
        item.y += item.speed * (isSpecial ? 1 : speedMod);
        item.rotation += item.rotationSpeed;

        // Magnet effect — pull good items toward the player
        if (powerUp.active === 'magnet') {
            const goodTypes = ['fish', 'shrimp', 'golden-fish', 'pearl', 'treasure-chest'];
            if (goodTypes.includes(item.type)) {
                const magnetRange = 90;
                const dx = (player.x + player.width / 2) - item.x;
                const dy = (player.y + 10) - item.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < magnetRange && dist > 0) {
                    const pull = 5;
                    item.x += (dx / dist) * pull;
                    item.y += (dy / dist) * pull * 0.5;
                }
            }
        }

        // Check collision with player
        if (checkCollision(item)) {
            // --- Obstacles ---
            if (item.type === 'iceberg' || item.type === 'boot') {
                // Shield power-up absorbs one obstacle hit
                if (powerUp.active === 'shield') {
                    powerUp.active = null;
                    powerUp.timer = 0;
                    spawnParticles(item.x, item.y, '#3498db', 14);
                    showToast('🛡 Shield blocked!');
                    playChime(660, 0.15);
                    fallingItems.splice(i, 1);
                    updateMinigameUI();
                    continue;
                }

                triggerShake();
                lives--;
                combo = 0;
                playThud();
                updateMinigameUI();
                spawnParticles(item.x, item.y, item.type === 'boot' ? '#8B4513' : '#aed6f1', 6);

                if (lives <= 0) {
                    gameOver();
                    return;
                }
            }
            // --- Power-ups ---
            else if (POWERUP_DURATIONS[item.type]) {
                powerUp.active = item.type;
                powerUp.timer = POWERUP_DURATIONS[item.type];
                spawnParticles(item.x, item.y, POWERUP_COLORS[item.type], 18);
                const names = { 'slow-motion': '⏱ Slow Motion!', 'magnet': '🧲 Magnet!', 'shield': '🛡 Shield!', 'double-coins': '2️⃣ Double Coins!' };
                showToast(names[item.type]);
                playCoinJingle();
            }
            // --- Good catches ---
            else {
                const coinMod = (powerUp.active === 'double-coins') ? 2 : 1;
                const bonus = Math.floor(combo / 3);
                const earned = (item.points + bonus) * coinMod;
                gameState.coins += earned;
                combo++;
                fishCaughtThisSession++;
                gameState.stats.totalFishCaught++;

                if (combo > gameState.stats.bestCombo) {
                    gameState.stats.bestCombo = combo;
                }

                // Sound & toast per item type
                if (item.type === 'golden-fish') {
                    playCoinJingle();
                    spawnParticles(item.x, item.y, '#ffd700', 16);
                    showToast('⭐ Golden Fish! +' + (earned) + ' 🪙');
                } else if (item.type === 'treasure-chest') {
                    triggerShake();
                    playFanfare();
                    spawnParticles(item.x, item.y, '#8e44ad', 24);
                    showToast('🎁 Treasure Chest! +' + (earned) + ' 🪙');
                } else if (item.type === 'pearl') {
                    playChime(660, 0.15);
                    spawnParticles(item.x, item.y, '#a8e6ff', 10);
                    showToast('🦪 Pearl! +' + (earned) + ' 🪙');
                } else {
                    playChime(440, 0.1);
                }

                if (coinMod > 1) spawnParticles(item.x, item.y, '#ffd700', 6);

                gameState.stats.totalCoinsEarned = (gameState.stats.totalCoinsEarned || 0) + earned;
                spawnParticles(item.x, item.y, item.color, 4);
                updateMinigameUI();
                updateUI();
                saveGame();
                checkAchievements();

                // Check sanctuary unlock
                checkSanctuaryUnlock();
                if (!gameRunning) return;
            }

            fallingItems.splice(i, 1);
            continue;
        }

        // Remove if off screen
        if (item.y > CANVAS_H + 30) {
            const comboBreakers = ['fish', 'shrimp', 'golden-fish', 'pearl', 'treasure-chest'];
            if (comboBreakers.includes(item.type) && combo > 0) {
                combo = 0;
                updateMinigameUI();
            }
            fallingItems.splice(i, 1);
        }
    }
}

function checkCollision(item) {
    const hOverlap = (item.x >= player.x && item.x <= player.x + player.width);
    const vReach = (item.y + item.radius >= player.y);
    return hOverlap && vReach;
}

// ============================================
// GAME OVER
// ============================================

function gameOver() {
    gameRunning = false;
    
    // Reset progress (coins, bond, stats)
    gameState.coins = 0;
    gameState.penguin.bond = 0;
    gameState.penguin.hunger = 100;
    gameState.penguin.happiness = 50;
    gameState.stats.totalFishCaught = 0;
    gameState.stats.bestCombo = 0;
    gameState.stats.totalCoinsEarned = 0;
    gameState.stats.timesFed = 0;
    gameState.stats.timesPlayed = 0;
    lastMilestone = 0;
    saveGame();
    updateUI();
    
    showToast('💔 Game Over! Lost all progress...');
    
    // Auto-restart after 2 seconds
    setTimeout(() => {
        if (!gameRunning) {
            restartMinigame();
        }
    }, 2000);
}

function restartMinigame() {
    lives = 3;
    combo = 0;
    fishCaughtThisSession = 0;
    powerUp.active = null;
    powerUp.timer = 0;
    playerTrail = [];
    gameRunning = true;
    frameCount = 0;
    fallingItems = [];
    updateMinigameUI();
    gameLoop();
}

// ============================================
// RENDER
// ============================================

function renderMinigame() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw underwater background details
    drawBackground();

    // Draw falling items
    fallingItems.forEach(item => {
        drawItem(item);
    });

    // Draw player sparkle trail
    drawPlayerTrail();

    // Draw player (catcher penguin)
    drawPlayer();

    // Draw lives, combo indicator
    drawHUD();
}

function drawBackground() {
    // Subtle underwater light rays
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 3; i++) {
        const x = 50 + i * 180 + Math.sin(Date.now() / 3000 + i) * 20;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 20, CANVAS_H);
        ctx.lineTo(x + 20, CANVAS_H);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    ctx.restore();

    // Sandy bottom
    ctx.fillStyle = 'rgba(194, 178, 128, 0.3)';
    ctx.fillRect(0, CANVAS_H - 10, CANVAS_W, 10);

    // Bubbles
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 6; i++) {
        const bx = 30 + i * 80 + Math.sin(Date.now() / 2000 + i * 2) * 10;
        const by = CANVAS_H - 60 - i * 40 + Math.sin(Date.now() / 1500 + i) * 8;
        ctx.beginPath();
        ctx.arc(bx, by, 3 + i, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    ctx.restore();

    // Seasonal effects
    if (SEASONAL_THEME === 'winter') {
        // Snowflakes drifting down
        ctx.save();
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 8; i++) {
            const sx = (i * 67 + Date.now() / 40) % (CANVAS_W + 20) - 10;
            const sy = (i * 43 + Date.now() / 60) % (CANVAS_H + 20) - 10;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
        ctx.restore();
    } else if (SEASONAL_THEME === 'summer') {
        // Extra warm light rays (stronger & golden)
        ctx.save();
        ctx.globalAlpha = 0.06;
        for (let i = 0; i < 4; i++) {
            const x = 30 + i * 130 + Math.sin(Date.now() / 2500 + i * 1.5) * 30;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 30, CANVAS_H);
            ctx.lineTo(x + 30, CANVAS_H);
            ctx.closePath();
            ctx.fillStyle = '#f1c40f';
            ctx.fill();
        }
        ctx.restore();
    }
}

function drawItem(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation || 0);

    // --- FISH ---
    if (item.type === 'fish') {
        ctx.beginPath();
        ctx.ellipse(0, 0, item.radius, item.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-item.radius, 0);
        ctx.lineTo(-item.radius - 8, -6);
        ctx.lineTo(-item.radius - 8, 6);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -3, 1, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }
    // --- SHRIMP ---
    else if (item.type === 'shrimp') {
        ctx.beginPath();
        ctx.ellipse(0, 0, item.radius, item.radius * 0.5, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#f39c12';
        ctx.fill();
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(item.radius * 0.7, 2);
        ctx.lineTo(item.radius + 6, -4);
        ctx.lineTo(item.radius + 4, 6);
        ctx.closePath();
        ctx.fillStyle = '#f39c12';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-3, -2, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
    }
    // --- GOLDEN FISH ---
    else if (item.type === 'golden-fish') {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(0, 0, item.radius, item.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(-item.radius, 0);
        ctx.lineTo(-item.radius - 10, -8);
        ctx.lineTo(-item.radius - 10, 8);
        ctx.closePath();
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('⭐', 0, 0);
    }
    // --- ICEBERG ---
    else if (item.type === 'iceberg') {
        ctx.beginPath();
        ctx.moveTo(0, -item.radius);
        ctx.lineTo(-item.radius, item.radius * 0.6);
        ctx.lineTo(item.radius, item.radius * 0.6);
        ctx.closePath();
        ctx.fillStyle = '#aed6f1';
        ctx.fill();
        ctx.strokeStyle = '#85c1e9';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-3, -4, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
    }
    // --- BOOT ---
    else if (item.type === 'boot') {
        ctx.beginPath();
        ctx.ellipse(0, 2, item.radius, item.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#6d4c2a';
        ctx.fill();
        ctx.strokeStyle = '#4a3520';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Boot shaft
        ctx.beginPath();
        ctx.rect(-6, -item.radius * 0.7, 12, item.radius * 0.6);
        ctx.fillStyle = '#5d3f1f';
        ctx.fill();
        ctx.stroke();
        // Sole line
        ctx.beginPath();
        ctx.moveTo(-item.radius + 2, 6);
        ctx.lineTo(item.radius - 2, 6);
        ctx.strokeStyle = '#3d2b14';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    // --- PEARL ---
    else if (item.type === 'pearl') {
        ctx.shadowColor = '#a8e6ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, item.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#d4f1ff');
        grad.addColorStop(1, '#a8e6ff');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#7ec8e3';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    // --- TREASURE CHEST ---
    else if (item.type === 'treasure-chest') {
        ctx.shadowColor = '#8e44ad';
        ctx.shadowBlur = 18;
        // Box
        ctx.beginPath();
        ctx.rect(-item.radius, -item.radius * 0.7, item.radius * 2, item.radius * 1.2);
        ctx.fillStyle = '#8e44ad';
        ctx.fill();
        ctx.strokeStyle = '#6c3483';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Lid
        ctx.beginPath();
        ctx.rect(-item.radius, -item.radius * 0.7, item.radius * 2, item.radius * 0.35);
        ctx.fillStyle = '#7d3c98';
        ctx.fill();
        ctx.stroke();
        // Lock
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        // Sparkles
        ctx.shadowBlur = 0;
        for (let s = 0; s < 3; s++) {
            ctx.beginPath();
            ctx.arc(-8 + s * 8, -item.radius * 0.3, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.fill();
        }
    }
    // --- POWER-UP ---
    else if (POWERUP_DURATIONS[item.type]) {
        // Glowing orb
        ctx.shadowColor = POWERUP_COLORS[item.type];
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        ctx.fillStyle = POWERUP_COLORS[item.type] + '33';
        ctx.fill();
        ctx.shadowBlur = 0;
        // Inner circle
        ctx.beginPath();
        ctx.arc(0, 0, item.radius * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = POWERUP_COLORS[item.type];
        ctx.fill();
        // Icon
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(POWERUP_ICONS[item.type], 0, 0);
    }

    ctx.restore();
}

function drawPlayer() {
    const px = player.x;
    const py = player.y;
    const cx = px + player.width / 2; // center x

    ctx.save();

    // Power-up aura glow
    if (powerUp.active) {
        ctx.shadowColor = POWERUP_COLORS[powerUp.active];
        ctx.shadowBlur = 25;
    }

    // Body (round penguin)
    ctx.beginPath();
    ctx.ellipse(cx, py + 14, 24, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2c3e50';
    ctx.fill();

    ctx.shadowBlur = 0;

    // Belly
    ctx.beginPath();
    ctx.ellipse(cx, py + 18, 14, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx - 5, py + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5, py + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx - 4, py + 7, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 6, py + 7, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.beginPath();
    ctx.moveTo(cx - 4, py + 14);
    ctx.lineTo(cx + 4, py + 14);
    ctx.lineTo(cx, py + 20);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();

    // --- Accessories on the canvas penguin ---
    const equipped = gameState.penguin.equippedAccessory;
    if (equipped === 'red-bowtie') {
        ctx.beginPath();
        ctx.moveTo(cx - 8, py + 20);
        ctx.lineTo(cx, py + 16);
        ctx.lineTo(cx + 8, py + 20);
        ctx.lineTo(cx, py + 24);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
    } else if (equipped === 'top-hat') {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(cx - 12, py - 4, 24, 18);
        ctx.fillRect(cx - 16, py + 14, 32, 4);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(cx - 3, py + 6, 6, 3);
    } else if (equipped === 'santa-hat') {
        ctx.beginPath();
        ctx.moveTo(cx, py - 6);
        ctx.lineTo(cx - 20, py + 16);
        ctx.lineTo(cx, py + 10);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(cx, py - 6, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (equipped === 'ice-crown') {
        ctx.fillStyle = '#a8e6ff';
        ctx.beginPath();
        ctx.moveTo(cx - 14, py + 10);
        ctx.lineTo(cx - 10, py - 2);
        ctx.lineTo(cx - 5, py + 4);
        ctx.lineTo(cx, py - 4);
        ctx.lineTo(cx + 5, py + 4);
        ctx.lineTo(cx + 10, py - 2);
        ctx.lineTo(cx + 14, py + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#7ec8e3';
        ctx.lineWidth = 1;
        ctx.stroke();
    } else if (equipped === 'sunny-scarf') {
        // Scarf around neck
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(cx - 14, py + 16, 28, 6);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(cx - 10, py + 18, 6, 16);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(cx + 4, py + 18, 6, 16);
    } else if (equipped === 'party-hat') {
        // Cone hat
        ctx.beginPath();
        ctx.moveTo(cx, py - 10);
        ctx.lineTo(cx - 16, py + 14);
        ctx.lineTo(cx + 16, py + 14);
        ctx.closePath();
        ctx.fillStyle = '#9b59b6';
        ctx.fill();
        // Pom pom
        ctx.beginPath();
        ctx.arc(cx, py - 10, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
        // Brim
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(cx - 18, py + 14, 36, 4);
    }

    // Catch net / bucket indication
    ctx.strokeStyle = '#8e44ad';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, py + 32, 16, 6, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function drawHUD() {
    ctx.save();
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;

    // Lives
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';
    for (let i = lives; i < 3; i++) hearts += '🖤';
    ctx.fillText(hearts, 8, 6);

    // Combo
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = combo >= 5 ? '#ffd700' : combo >= 3 ? '#2ecc71' : 'white';
    ctx.fillText(combo > 0 ? `🔥 ${combo}x Combo` : '', CANVAS_W / 2, 6);

    // Score this session
    ctx.textAlign = 'right';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText(`🐟 ${fishCaughtThisSession}`, CANVAS_W - 8, 8);

    // Power-up timer bar (top center)
    if (powerUp.active) {
        const barW = 80;
        const barH = 6;
        const barX = (CANVAS_W - barW) / 2;
        const barY = 26;
        const pct = powerUp.timer / POWERUP_DURATIONS[powerUp.active];
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 3);
        ctx.fill();
        
        ctx.fillStyle = POWERUP_COLORS[powerUp.active];
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * pct, barH, 3);
        ctx.fill();
        
        ctx.textAlign = 'center';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = POWERUP_COLORS[powerUp.active];
        ctx.fillText(POWERUP_ICONS[powerUp.active] + ' ' + powerUp.active.replace('-', ' ').toUpperCase(), CANVAS_W / 2, barY - 4);
    }

    ctx.restore();
}

// ============================================
// UI UPDATE (DOM elements)
// ============================================

function updateMinigameUI() {
    dom.livesCount.textContent = lives;
    dom.comboCount.textContent = combo;
    dom.caughtCount.textContent = gameState.stats.totalFishCaught;

    // Update DOM power-up indicator
    const indicator = document.getElementById('powerup-indicator');
    if (indicator) {
        if (powerUp.active) {
            const pct = Math.ceil((powerUp.timer / POWERUP_DURATIONS[powerUp.active]) * 100);
            indicator.textContent = `${POWERUP_ICONS[powerUp.active]} ${pct}%`;
            indicator.className = 'powerup-indicator active powerup-' + powerUp.active;
        } else {
            indicator.textContent = '';
            indicator.className = 'powerup-indicator';
        }
    }
}

// ============================================
// GAME LOOP
// ============================================

function gameLoop() {
    if (!gameRunning) {
        animationId = null;
        return;
    }

    updateMinigame();
    renderMinigame();

    animationId = requestAnimationFrame(gameLoop);
}

// Export function so main.js can stop the game
function stopMinigame() {
    gameRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}
