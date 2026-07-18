/* ============================================
   FARM FRIENDS — Full Game Engine
   ============================================ */

// ----- Canvas Setup -----
const canvas = document.getElementById('ff-canvas');
const ctx = canvas.getContext('2d');
const W = 500, H = 550;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ----- DOM Refs -----
const dom = {
    coins:          document.getElementById('ff-coins'),
    day:            document.getElementById('ff-day'),
    wrapper:        document.getElementById('ff-canvas-wrapper'),
    startOverlay:   document.getElementById('ff-start-overlay'),
    startBtn:       document.getElementById('ff-start-btn'),
    resetBtn:       document.getElementById('ff-reset-btn'),
    tabPlant:       document.getElementById('ff-tab-plant'),
    tabShop:        document.getElementById('ff-tab-shop'),
    tabAnimals:     document.getElementById('ff-tab-animals'),
    panelPlant:     document.getElementById('ff-panel-plant'),
    panelShop:      document.getElementById('ff-panel-shop'),
    panelAnimals:   document.getElementById('ff-panel-animals'),
    animalsList:    document.getElementById('ff-animals-list'),
    cropCards:      document.querySelectorAll('.ff-crop-card'),
    shopCards:      document.querySelectorAll('.ff-shop-card')
};

// ===== CROP DEFINITIONS =====
const CROPS = {
    carrot:  { name: 'Carrot', icon: '🥕', cost: 5,  sell: 12, growTime: 8,  stages: 3, color: '#e67e22' },
    tomato:  { name: 'Tomato', icon: '🍅', cost: 10, sell: 25, growTime: 15, stages: 3, color: '#e74c3c' },
    corn:    { name: 'Corn',   icon: '🌽', cost: 15, sell: 38, growTime: 25, stages: 4, color: '#f1c40f' },
    pumpkin: { name: 'Pumpkin',icon: '🎃', cost: 30, sell: 70, growTime: 40, stages: 4, color: '#e67e22' }
};

// ===== ANIMAL DEFINITIONS =====
const ANIMALS = {
    chicken: { name: 'Chicken', icon: '🐔', cost: 50,  produce: '🥚 Egg', produceInterval: 15, sellPrice: 8 },
    cow:     { name: 'Cow',     icon: '🐄', cost: 120, produce: '🥛 Milk', produceInterval: 25, sellPrice: 20 },
    sheep:   { name: 'Sheep',   icon: '🐑', cost: 200, produce: '🧶 Wool', produceInterval: 35, sellPrice: 35 }
};

// ===== GAME STATE =====
const state = {
    running: false,
    coins: 100,
    day: 1,
    plots: [],
    animals: [],
    selectedCrop: 'carrot',
    selectedTab: 'plant',
    animFrame: null,
    gameOver: false,
    plotRows: 4,
    plotCols: 5,
    totalPlotsUnlocked: 12,
    time: 0,
    dayTimer: 0,
    floatingTexts: [],
    particles: [],
    notifications: [],
    totalEarned: 0,
    totalPlanted: 0,
    totalHarvested: 0
};

// ===== PLOT LAYOUT =====
const PLOT_SIZE = 80;
const GRID_TOP = 30;
const GRID_LEFT = (W - 5 * PLOT_SIZE) / 2;

function getPlotPos(row, col) {
    return {
        x: GRID_LEFT + col * PLOT_SIZE + PLOT_SIZE / 2,
        y: GRID_TOP + row * PLOT_SIZE + PLOT_SIZE / 2
    };
}

// ===== AUDIO =====
let audioCtx = null;
let isMuted = localStorage.getItem('ff_muted') === 'true';

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('ff_muted', isMuted);
    document.getElementById('ff-mute-btn').textContent = isMuted ? '🔇' : '🔊';
}

function playCoin() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [600, 900].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
            g.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.1);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.08);
            o.stop(ctx.currentTime + i * 0.08 + 0.1);
        });
    } catch (e) {}
}

function playPlant() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(400, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.05, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.12);
    } catch (e) {}
}

function playHarvest() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [500, 700, 900].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);
            g.gain.setValueAtTime(0.07, ctx.currentTime + i * 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.08);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.06);
            o.stop(ctx.currentTime + i * 0.06 + 0.08);
        });
    } catch (e) {}
}

function playDayChange() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        // Pleasant morning chime — ascending arpeggio
        [523, 659, 784, 1047].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
            g.gain.setValueAtTime(0.07, ctx.currentTime + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.12);
            o.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
    } catch (e) {}
}

function playBuy() {
    if (isMuted) return;
    try {
        const ctx = getAudio();
        [400, 600, 800].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);
            g.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.07);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.15);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + i * 0.07);
            o.stop(ctx.currentTime + i * 0.07 + 0.15);
        });
    } catch (e) {}
}

// ===== UTILITY =====
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ===== PARTICLES =====
function spawnFloatingText(x, y, text, color = '#fff') {
    state.floatingTexts.push({ x, y, text, color, life: 1, vy: -1.2 });
}

function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        state.particles.push({
            x, y,
            vx: rand(-2, 2),
            vy: rand(-3, -0.5),
            life: 1,
            decay: rand(0.02, 0.04),
            size: rand(2, 5),
            color
        });
    }
}

// ===== INIT =====
function initPlots() {
    state.plots = [];
    let id = 0;
    for (let r = 0; r < state.plotRows; r++) {
        for (let c = 0; c < state.plotCols; c++) {
            const idx = r * state.plotCols + c;
            const unlocked = idx < state.totalPlotsUnlocked;
            state.plots.push({
                id: id++,
                row: r, col: c,
                unlocked,
                crop: null,
                growth: 0,      // 0 to 1
                growthRate: 0,
                planted: false,
                ready: false,
                water: 1
            });
        }
    }
}

// ===== GAME LOGIC =====
function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.coins = 100;
    state.day = 1;
    state.animals = [];
    state.selectedCrop = 'carrot';
    state.selectedTab = 'plant';
    state.time = 0;
    state.dayTimer = 0;
    state.floatingTexts = [];
    state.particles = [];
    state.notifications = [];
    state.totalEarned = 0;
    state.totalPlanted = 0;
    state.totalHarvested = 0;
    state.totalPlotsUnlocked = 12;
    initPlots();
    updateHUD();
    updatePanels();
}

function startGame() {
    resetGame();
    // Try to load saved progress
    if (!loadGame()) {
        // First time — give welcome bonus
        spawnFloatingText(W / 2, 200, '🌱 Welcome to your farm!', '#8bc34a');
    }
    state.running = true;
}

function updateHUD() {
    dom.coins.textContent = state.coins;
    dom.day.textContent = state.day;
}

// ===== CROP MANAGEMENT =====
function plantCrop(plot, cropType) {
    if (!plot.unlocked || plot.planted) return false;
    const crop = CROPS[cropType];
    if (!crop || state.coins < crop.cost) return false;

    state.coins -= crop.cost;
    state.totalPlanted++;
    plot.crop = cropType;
    plot.planted = true;
    plot.growth = 0;
    plot.ready = false;
    plot.growthRate = 1 / (crop.growTime * 60); // 60fps

    spawnParticles(plot.x, plot.y, '#8bc34a');
    playPlant();
    updateHUD();
    saveGame();
    return true;
}

function harvestCrop(plot) {
    if (!plot.ready || !plot.crop) return false;
    const crop = CROPS[plot.crop];
    if (!crop) return false;

    state.coins += crop.sell;
    state.totalEarned += crop.sell;
    state.totalHarvested++;
    spawnParticles(plot.x, plot.y, '#ffd700', 12);
    spawnFloatingText(plot.x, plot.y - 20, `+${crop.sell} 🪙`, '#ffd700');
    playHarvest();

    plot.crop = null;
    plot.planted = false;
    plot.growth = 0;
    plot.ready = false;

    updateHUD();
    saveGame();
    return true;
}

// ===== ANIMAL MANAGEMENT =====
function buyAnimal(type) {
    const def = ANIMALS[type];
    if (!def) return false;
    if (state.coins < def.cost) return false;

    state.coins -= def.cost;
    state.animals.push({
        type,
        name: def.name,
        icon: def.icon,
        produce: def.produce,
        produceInterval: def.produceInterval,
        sellPrice: def.sellPrice,
        timer: 0,
        ready: false
    });

    playBuy();
    spawnParticles(W / 2, 400, '#ffd700', 15);
    spawnFloatingText(W / 2, 380, `🐾 ${def.name} arrived!`, '#ffd700');
    updateHUD();
    updateAnimalPanel();
    saveGame();
    return true;
}

function collectAnimalProduce(index) {
    const animal = state.animals[index];
    if (!animal || !animal.ready) return;

    state.coins += animal.sellPrice;
    state.totalEarned += animal.sellPrice;
    animal.timer = 0;
    animal.ready = false;

    spawnFloatingText(W / 2, H - 20, `+${animal.sellPrice} 🪙`, '#ffd700');
    spawnParticles(W / 2, H - 30, '#ffd700', 8);
    playCoin();
    updateHUD();
    updateAnimalPanel();
    saveGame();
}

function updateAnimalPanel() {
    if (state.animals.length === 0) {
        dom.animalsList.innerHTML = '<div class="ff-no-animals">No animals yet! Buy some from the shop. 🏪</div>';
        return;
    }

    dom.animalsList.innerHTML = state.animals.map((a, i) => {
        const progress = a.ready ? 1 : Math.min(a.timer / (a.produceInterval * 60), 1);
        return `
            <div class="ff-animal-entry">
                <div class="ff-animal-entry-icon">${a.icon}</div>
                <div class="ff-animal-entry-info">
                    <div class="ff-animal-entry-name">${a.name}</div>
                    <div class="ff-animal-entry-produce">${a.produce} ${a.ready ? '✨ Ready!' : `${Math.floor(progress * 100)}%`}</div>
                </div>
                <button class="ff-animal-entry-btn" data-animal-index="${i}" ${a.ready ? '' : 'disabled'}>
                    ${a.ready ? 'Collect' : '⏳'}
                </button>
            </div>
        `;
    }).join('');

    // Bind collect buttons
    dom.animalsList.querySelectorAll('.ff-animal-entry-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.animalIndex);
            collectAnimalProduce(idx);
        });
    });
}

// ===== INPUT HANDLING =====
function handleCanvasClick(e) {
    if (!state.running) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Check plot clicks
    for (const plot of state.plots) {
        if (!plot.unlocked) continue;
        const pos = getPlotPos(plot.row, plot.col);
        const half = PLOT_SIZE / 2 - 4;
        if (mx > pos.x - half && mx < pos.x + half && my > pos.y - half && my < pos.y + half) {
            plot.x = pos.x;
            plot.y = pos.y;

            if (plot.ready) {
                harvestCrop(plot);
            } else if (!plot.planted && state.selectedTab === 'plant') {
                plantCrop(plot, state.selectedCrop);
            }
            return;
        }
    }
}

// ===== UPDATE =====
function update() {
    if (!state.running) return;

    state.time++;

    // Day timer (~45 seconds per day)
    state.dayTimer++;
    if (state.dayTimer >= 60 * 45) {
        state.dayTimer = 0;
        state.day++;
        updateHUD();

        // Day change celebration
        playDayChange();
        spawnFloatingText(W / 2, 140, '🌅 New Day!', '#ffd700');
        spawnParticles(W / 2, 150, '#ffd700', 20);

        // Chance for daily bonus coins
        const bonus = 5 + Math.floor(state.day * 1.5);
        state.coins += bonus;
        spawnFloatingText(W / 2, 170, `+${bonus} 🪙 daily bonus`, '#8bc34a');
        updateHUD();

        saveGame();
    }

    // Grow crops
    for (const plot of state.plots) {
        if (!plot.planted || plot.ready) continue;
        plot.growth += plot.growthRate;
        if (plot.growth >= 1) {
            plot.growth = 1;
            plot.ready = true;
            const pos = getPlotPos(plot.row, plot.col);
            spawnFloatingText(pos.x, pos.y - 30, '✨ Ready!', '#ffd700');
        }
    }

    // Animal timers
    for (const animal of state.animals) {
        if (!animal.ready) {
            animal.timer++;
            if (animal.timer >= animal.produceInterval * 60) {
                animal.ready = true;
            }
        }
    }

    // Update floating texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y += ft.vy;
        ft.life -= 0.015;
        if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= p.decay;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
}

// ===== RENDER =====
function render() {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    const dayPhase = (state.dayTimer / (60 * 45));
    if (dayPhase < 0.3) {
        // Sunrise
        skyGrad.addColorStop(0, '#1a237e');
        skyGrad.addColorStop(0.3, '#4a2c6e');
        skyGrad.addColorStop(0.6, '#e8825a');
        skyGrad.addColorStop(1, '#f5d78e');
    } else if (dayPhase < 0.7) {
        // Day
        skyGrad.addColorStop(0, '#4a90d9');
        skyGrad.addColorStop(0.5, '#87CEEB');
        skyGrad.addColorStop(1, '#c8e6c9');
    } else {
        // Sunset
        skyGrad.addColorStop(0, '#1a237e');
        skyGrad.addColorStop(0.3, '#6a1b9a');
        skyGrad.addColorStop(0.6, '#e65100');
        skyGrad.addColorStop(1, '#ffcc80');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Sun / Moon
    const sunX = W * (dayPhase < 0.5 ? dayPhase * 2 : (1 - dayPhase) * 2);
    const sunY = H * 0.15 + Math.sin(dayPhase * Math.PI) * H * 0.3;
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 40;
    ctx.fillStyle = dayPhase < 0.15 || dayPhase > 0.85 ? '#fff' : '#ffd700';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 3; i++) {
        const cx = ((i * 180 + state.time * 0.1) % (W + 100)) - 50;
        const cy = 40 + i * 25;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 40, 15, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 25, cy - 5, 30, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 12, cy + 5, 35, 14, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Grass / ground
    ctx.fillStyle = '#4a7c2e';
    ctx.fillRect(0, GRID_TOP - 10, W, H - GRID_TOP + 10);

    // Grid background
    ctx.fillStyle = '#3d6b25';
    ctx.fillRect(GRID_LEFT - 10, GRID_TOP - 10, state.plotCols * PLOT_SIZE + 20, state.plotRows * PLOT_SIZE + 20);

    // Fence
    ctx.fillStyle = '#5d4037';
    for (let r = -1; r <= state.plotRows; r++) {
        for (let c = -1; c <= state.plotCols; c++) {
            if (r === -1 || r === state.plotRows || c === -1 || c === state.plotCols) {
                const fx = GRID_LEFT + c * PLOT_SIZE + (c === -1 ? 0 : c === state.plotCols ? PLOT_SIZE : PLOT_SIZE / 2);
                const fy = GRID_TOP + r * PLOT_SIZE + (r === -1 ? 0 : r === state.plotRows ? PLOT_SIZE : PLOT_SIZE / 2);
                const fw = (r === -1 || r === state.plotRows) ? PLOT_SIZE + 10 : 6;
                const fh = (c === -1 || c === state.plotCols) ? PLOT_SIZE + 10 : 6;
                ctx.fillRect(fx - (r === -1 || r === state.plotRows ? fw / 2 : 3), fy - (c === -1 || c === state.plotCols ? fh / 2 : 3), fw, fh);
            }
        }
    }

    // Draw plots
    for (const plot of state.plots) {
        const pos = getPlotPos(plot.row, plot.col);
        const px = pos.x - PLOT_SIZE / 2 + 4;
        const py = pos.y - PLOT_SIZE / 2 + 4;
        const ps = PLOT_SIZE - 8;

        ctx.save();

        if (!plot.unlocked) {
            // Locked plot
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.roundRect(px, py, ps, ps, 6);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔒', pos.x, pos.y);
            ctx.restore();
            continue;
        }

        // Plot background
        ctx.fillStyle = plot.planted ? '#3e2723' : '#5d4037';
        ctx.beginPath();
        ctx.roundRect(px, py, ps, ps, 6);
        ctx.fill();

        // Soil texture
        if (!plot.planted) {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            for (let i = 0; i < 3; i++) {
                const sx = px + 10 + i * 18;
                const sy = py + 15 + (i % 2) * 20;
                ctx.beginPath();
                ctx.ellipse(sx, sy, 6, 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Planted crop
        if (plot.planted && plot.crop) {
            const crop = CROPS[plot.crop];
            const growthStage = Math.floor(plot.growth * crop.stages);
            const finalStage = crop.stages - 1;

            if (plot.ready) {
                // Ready crop with glow
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 15;
                ctx.font = `${34 + Math.sin(state.time * 0.05) * 3}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(crop.icon, pos.x, pos.y - 4);
                ctx.shadowBlur = 0;

                // Sparkle
                ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(state.time * 0.08) * 0.2})`;
                ctx.beginPath();
                ctx.arc(pos.x + 18, pos.y - 18, 4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Growing plant
                const size = 16 + (growthStage / finalStage) * 18;
                const alpha = 0.4 + (growthStage / finalStage) * 0.6;

                ctx.globalAlpha = alpha;

                if (growthStage <= 0) {
                    // Sprout
                    ctx.fillStyle = '#8bc34a';
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y + 10);
                    ctx.quadraticCurveTo(pos.x + 6, pos.y - 4, pos.x + 2, pos.y - 8);
                    ctx.moveTo(pos.x, pos.y + 10);
                    ctx.quadraticCurveTo(pos.x - 6, pos.y - 4, pos.x - 2, pos.y - 8);
                    ctx.stroke();
                } else {
                    // Growing plant
                    ctx.font = `${size}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(crop.icon, pos.x, pos.y - 2);
                }
                ctx.globalAlpha = 1;

                // Growth bar
                const barW = 30;
                const barH = 4;
                const barX = pos.x - barW / 2;
                const barY = pos.y + PLOT_SIZE / 2 - 12;
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.roundRect(barX, barY, barW, barH, 2);
                ctx.fill();
                ctx.fillStyle = '#8bc34a';
                ctx.beginPath();
                ctx.roundRect(barX, barY, barW * plot.growth, barH, 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    // Day/time indicator
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(10, 8, 120, 22, 10);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '12px Fredoka, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const timeOfDay = dayPhase < 0.3 ? '🌅 Morning' : dayPhase < 0.7 ? '☀️ Daytime' : '🌆 Evening';
    ctx.fillText(`Day ${state.day} - ${timeOfDay}`, 18, 19);
    ctx.restore();

    // Floating texts
    for (const ft of state.floatingTexts) {
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 16px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    // Particles
    for (const p of state.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ===== GAME LOOP =====
function gameLoop() {
    update();
    render();
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ===== UI SETUP =====
function setupUI() {
    // Tab switching
    const tabs = [
        { btn: dom.tabPlant, panel: dom.panelPlant, name: 'plant' },
        { btn: dom.tabShop, panel: dom.panelShop, name: 'shop' },
        { btn: dom.tabAnimals, panel: dom.panelAnimals, name: 'animals' }
    ];

    tabs.forEach(({ btn, panel, name }) => {
        btn.addEventListener('click', () => {
            state.selectedTab = name;
            tabs.forEach(t => {
                t.btn.classList.toggle('active', t.name === name);
                t.panel.classList.toggle('hidden', t.name !== name);
            });
            if (name === 'animals') updateAnimalPanel();
        });
    });

    // Crop selection
    dom.cropCards.forEach(card => {
        card.addEventListener('click', () => {
            const crop = card.dataset.crop;
            state.selectedCrop = crop;
            dom.cropCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            // Switch to plant tab
            dom.tabPlant.click();
        });
    });

    // Shop items
    dom.shopCards.forEach(card => {
        card.addEventListener('click', () => {
            const item = card.dataset.item;
            if (state.coins >= ANIMALS[item].cost) {
                buyAnimal(item);
                updateShopPrices();
            }
        });
    });

    // Canvas click (mouse)
    canvas.addEventListener('click', handleCanvasClick);

    // Canvas touch (mobile)
    canvas.addEventListener('touchstart', (e) => {
        if (e.target.closest('button, a, input')) return;
        e.preventDefault();
        const touch = e.touches[0];
        handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });

    // Buttons
    dom.startBtn.addEventListener('click', () => {
        dom.startOverlay.classList.add('hidden');
        startGame();
    });

    dom.muteBtn = document.getElementById('ff-mute-btn');
    dom.muteBtn.addEventListener('click', toggleMute);

    dom.resetBtn.addEventListener('click', () => {
        if (confirm('Reset your farm? This will erase all progress!')) {
            localStorage.removeItem('ff_save');
            resetGame();
            dom.startOverlay.classList.remove('hidden');
            dom.panelPlant.classList.remove('hidden');
            dom.panelShop.classList.add('hidden');
            dom.panelAnimals.classList.add('hidden');
        }
    });

    // Handle resize
    function handleResize() {
        const maxWidth = Math.min(W, window.innerWidth - 20);
        const scale = maxWidth / W;
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (H * scale) + 'px';
    }
    window.addEventListener('resize', handleResize);
    handleResize();
}

function updateShopPrices() {
    dom.shopCards.forEach(card => {
        const item = card.dataset.item;
        const def = ANIMALS[item];
        if (state.coins >= def.cost) {
            card.classList.remove('too-expensive');
            card.classList.add('affordable');
        } else {
            card.classList.add('too-expensive');
            card.classList.remove('affordable');
        }
    });
}

function updatePanels() {
    updateShopPrices();
}

// ===== SAVE/LOAD =====
function saveGame() {
    try {
        const data = {
            coins: state.coins,
            day: state.day,
            dayTimer: state.dayTimer,
            animals: state.animals,
            totalPlotsUnlocked: state.totalPlotsUnlocked,
            totalEarned: state.totalEarned,
            totalPlanted: state.totalPlanted,
            totalHarvested: state.totalHarvested,
            plots: state.plots.map(p => ({
                id: p.id, row: p.row, col: p.col,
                unlocked: p.unlocked, crop: p.crop,
                growth: p.growth, planted: p.planted,
                ready: p.ready
            }))
        };
        localStorage.setItem('ff_save', JSON.stringify(data));
    } catch (e) {}
}

function loadGame() {
    try {
        const raw = localStorage.getItem('ff_save');
        if (!raw) return false;
        const data = JSON.parse(raw);

        state.coins = data.coins || 100;
        state.day = data.day || 1;
        state.dayTimer = data.dayTimer || 0;
        state.animals = data.animals || [];
        state.totalPlotsUnlocked = data.totalPlotsUnlocked || 12;
        state.totalEarned = data.totalEarned || 0;
        state.totalPlanted = data.totalPlanted || 0;
        state.totalHarvested = data.totalHarvested || 0;

        if (data.plots && data.plots.length === state.plots.length) {
            for (let i = 0; i < data.plots.length; i++) {
                Object.assign(state.plots[i], data.plots[i]);
            }
        }

        updateHUD();
        updateAnimalPanel();
        return true;
    } catch (e) {
        return false;
    }
}

// ===== INIT =====
function init() {
    resetGame();

    // Select first crop by default
    dom.cropCards[0]?.classList.add('selected');

    setupUI();
    gameLoop();

    if (isMuted) document.getElementById('ff-mute-btn').textContent = '🔇';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
