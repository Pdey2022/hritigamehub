/* ============================================
   PENGUIN PARADISE — Main Game Engine
   ============================================ */

const SAVE_KEY = 'penguin_paradise_save';

// ----- Game State (Single Source of Truth) -----
let gameState = {
    coins: 0,
    hasUnlockedSanctuary: false,
    currentSanctuaryId: 'iceberg-isle',
    unlockedSanctuaries: [],
    lastVisitDate: '',
    muted: false,
    penguin: {
        name: 'Pippin',
        hunger: 100,
        happiness: 50,
        bond: 0,
        equippedAccessory: null,
        inventory: [],
        lastPetTime: 0
    },
    achievements: [],
    stats: {
        totalFishCaught: 0,
        bestCombo: 0,
        timesFed: 0,
        timesPlayed: 0,
        totalCoinsEarned: 0
    }
};

// ----- Shop Item Registry -----
const SHOP_ITEMS = [
    { id: 'fish-taco',      name: 'Fish Taco',       icon: '🌮', cost: 25,  type: 'food',      hungerEffect: 30,  happinessEffect: 5  },
    { id: 'hot-cocoa',      name: 'Hot Cocoa',       icon: '☕', cost: 40,  type: 'food',      hungerEffect: 20,  happinessEffect: 15 },
    { id: 'premium-taco',   name: 'Premium Taco',    icon: '🌟', cost: 80,  type: 'food',      hungerEffect: 50,  happinessEffect: 10 },
    { id: 'red-bowtie',     name: 'Red Bowtie',      icon: '🎀', cost: 150, type: 'accessory', happinessEffect: 25, accessoryClass: 'accessory-bowtie' },
    { id: 'top-hat',        name: 'Top Hat',          icon: '🎩', cost: 300, type: 'accessory', happinessEffect: 50, accessoryClass: 'accessory-tophat' },
    { id: 'santa-hat',      name: 'Santa Hat',        icon: '🎅', cost: 400, type: 'accessory', happinessEffect: 40, accessoryClass: 'accessory-santahat' },
    { id: 'ice-crown',      name: 'Ice Crown',        icon: '👑', cost: 600, type: 'accessory', happinessEffect: 75, accessoryClass: 'accessory-icecrown' },
    // --- New Food Items ---
    { id: 'haribo',         name: 'Haribo Sweet',     icon: '🍬', cost: 15,  type: 'food',      hungerEffect: 8,   happinessEffect: 20 },
    { id: 'goldfish',       name: 'Goldfish Crackers',icon: '🐟', cost: 20,  type: 'food',      hungerEffect: 15,  happinessEffect: 5  },
    { id: 'berry-smoothie', name: 'Berry Smoothie',   icon: '🫐', cost: 35,  type: 'food',      hungerEffect: 15,  happinessEffect: 20 },
    { id: 'fish-pie',       name: 'Fish Pie',         icon: '🥧', cost: 60,  type: 'food',      hungerEffect: 40,  happinessEffect: 8  },
    // --- New Accessories ---
    { id: 'sunny-scarf',    name: 'Sunny Scarf',      icon: '🧣', cost: 250, type: 'accessory', happinessEffect: 35, accessoryClass: 'accessory-scarf' },
    { id: 'party-hat',      name: 'Party Hat',        icon: '🥳', cost: 500, type: 'accessory', happinessEffect: 60, accessoryClass: 'accessory-partyhat' }
];

// ----- Achievement Definitions -----
const ACHIEVEMENTS = [
    { id: 'first_fish',    name: 'First Catch',       icon: '🐟', desc: 'Catch your first fish',                    check: s => s.stats.totalFishCaught >= 1 },
    { id: 'combo_3',       name: 'On Fire',            icon: '🔥', desc: 'Reach a 3x combo',                       check: s => s.stats.bestCombo >= 3 },
    { id: 'combo_10',      name: 'Combo King',         icon: '👑', desc: 'Reach a 10x combo',                      check: s => s.stats.bestCombo >= 10 },
    { id: 'fisher_50',     name: 'Fish Master',        icon: '🎣', desc: 'Catch 50 fish total',                    check: s => s.stats.totalFishCaught >= 50 },
    { id: 'fisher_100',    name: 'Legendary Fisher',   icon: '🏆', desc: 'Catch 100 fish total',                   check: s => s.stats.totalFishCaught >= 100 },
    { id: 'sanctuary',     name: 'Sanctuary Keeper',   icon: '🏠', desc: 'Unlock the Penguin Sanctuary',           check: s => s.hasUnlockedSanctuary },
    { id: 'fed_10',        name: 'Generous Heart',     icon: '❤️', desc: 'Feed Pippin 10 times',                   check: s => s.stats.timesFed >= 10 },
    { id: 'bond_5',        name: 'Best Friends',       icon: '💕', desc: 'Reach maximum bond level 5',             check: s => getBondLevel(s.penguin.bond) >= 5 },
    { id: 'fashionista',   name: 'Fashionista',        icon: '💅', desc: 'Collect 3 accessories',                  check: s => s.penguin.inventory.filter(id => SHOP_ITEMS.find(i => i.id === id)?.type === 'accessory').length >= 3 },
    { id: 'hoarder',       name: 'Coin Hoarder',       icon: '💰', desc: 'Earn 1,000 total coins',                check: s => s.stats.totalCoinsEarned >= 1000 }
];

// ----- Sanctuary Registry -----
const SANCTUARIES = [
    {
        id: 'iceberg-isle', name: 'Iceberg Isle', icon: '🐧', coinsRequired: 500,
        minigameLabel: 'Fish Catch', minigameDesc: 'Catch fish & shrimp, dodge icebergs!',
        themeBg: 'linear-gradient(135deg, #e0f4f7 0%, #b2ebf2 50%, #80deea 100%)',
        themePrimary: '#1a5276', canvasTop: '#1a3a5c', canvasMid: '#2980b9', canvasBot: '#aed6f1',
        canvasGradient: ['#1a3a5c','#2980b9','#5dade2','#aed6f1']
    },
    {
        id: 'coral-cove', name: 'Coral Cove', icon: '🐠', coinsRequired: 2000,
        minigameLabel: 'Pearl Dive', minigameDesc: 'Catch pearls & treasures, avoid jellyfish!',
        themeBg: 'linear-gradient(135deg, #fef9e7 0%, #f9e79f 50%, #f7dc6f 100%)',
        themePrimary: '#e67e22', canvasTop: '#1a3c2a', canvasMid: '#27ae60', canvasBot: '#82e0aa',
        canvasGradient: ['#1a3c2a','#27ae60','#58d68d','#82e0aa']
    },
    {
        id: 'aurora-peak', name: 'Aurora Peak', icon: '❄️', coinsRequired: 5000,
        minigameLabel: 'Star Catch', minigameDesc: 'Catch stars & crystals, dodge icicles!',
        themeBg: 'linear-gradient(135deg, #d2b4de 0%, #a569bd 50%, #7d3c98 100%)',
        themePrimary: '#6c3483', canvasTop: '#1a0a2e', canvasMid: '#6c3483', canvasBot: '#bb8fce',
        canvasGradient: ['#1a0a2e','#6c3483','#a569bd','#bb8fce']
    }
];

function getCurrentSanctuary() {
    return SANCTUARIES.find(s => s.id === gameState.currentSanctuaryId) || SANCTUARIES[0];
}

function getNextSanctuary() {
    return SANCTUARIES.find(s => !gameState.unlockedSanctuaries.includes(s.id));
}

function applySanctuaryTheme() {
    const s = getCurrentSanctuary();
    document.body.style.background = s.themeBg;
    // Keep game title as Penguin Paradise, sanctuary name is in the selector
    document.querySelector('.game-title').textContent = '🐧 Penguin Paradise';
    // Update minigame instructions
    document.querySelector('.minigame-instructions').innerHTML = 'Use <strong>← →</strong> arrows or <strong>mouse</strong> to move — ' + s.minigameDesc;
    document.querySelector('.minigame-header h2').textContent = s.icon + ' ' + s.minigameLabel;
    document.querySelector('.play-overlay-sub').textContent = s.minigameDesc;
}

// ----- DOM References -----
const dom = {
    coinCount:      document.getElementById('coin-count'),
    bondLevel:      document.getElementById('bond-level'),
    bondDisplay:    document.getElementById('bond-display'),
    phase1:         document.getElementById('phase-1'),
    phase2:         document.getElementById('phase-2'),
    unlockModal:    document.getElementById('unlock-modal'),
    modalEnterBtn:  document.getElementById('modal-enter-btn'),
    hungerBar:      document.getElementById('hunger-bar'),
    happinessBar:   document.getElementById('happiness-bar'),
    hungerValue:    document.getElementById('hunger-value'),
    happinessValue: document.getElementById('happiness-value'),
    penguinName:    document.getElementById('penguin-name'),
    penguinMood:    document.getElementById('penguin-mood'),
    penguinContainer: document.getElementById('penguin-container'),
    accessoryLayer: document.getElementById('accessory-layer'),
    feedBtn:        document.getElementById('feed-btn'),
    playBtn:        document.getElementById('play-btn'),
    shopGrid:       document.getElementById('shop-grid'),
    closetGrid:     document.getElementById('closet-grid'),
    closetEmpty:    document.getElementById('closet-empty'),
    progressFill:   document.getElementById('progress-fill'),
    progressText:   document.getElementById('progress-text'),
    livesCount:     document.getElementById('lives-count'),
    comboCount:     document.getElementById('combo-count'),
    caughtCount:    document.getElementById('caught-count'),
    canvas:         document.getElementById('gameCanvas')
};

// ----- Save / Load -----
function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    } catch (e) {
        console.warn('Save failed:', e);
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            // Merge to handle missing keys from older saves
            gameState = {
                ...JSON.parse(JSON.stringify(gameState)),
                ...saved,
                penguin: { ...gameState.penguin, ...saved.penguin }
            };
        }
    } catch (e) {
        console.warn('Load failed, starting fresh:', e);
    }
}

// ----- Utility Helpers -----
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function getBondLevel(bond) {
    if (bond >= 50) return 5;
    if (bond >= 30) return 4;
    if (bond >= 15) return 3;
    if (bond >= 5)  return 2;
    if (bond >= 1)  return 1;
    return 0;
}

// ----- Sound Effects (Web Audio API — no files needed) -----
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playChime(baseFreq, duration = 0.15, type = 'sine') {
    if (gameState.muted) return;
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, ctx.currentTime + duration);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) { /* audio not supported */ }
}

function playThud() {
    if (gameState.muted) return;
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) { /* audio not supported */ }
}

function playCoinJingle() {
    if (gameState.muted) return;
    try {
        const ctx = getAudioCtx();
        [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.08);
            osc.stop(ctx.currentTime + i * 0.08 + 0.12);
        });
    } catch (e) { /* audio not supported */ }
}

function playFanfare() {
    if (gameState.muted) return;
    try {
        const ctx = getAudioCtx();
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
    } catch (e) { /* audio not supported */ }
}

// ----- Sound Toggle & Ambient -----
function toggleMute() {
    gameState.muted = !gameState.muted;
    const btn = document.getElementById('mute-btn');
    if (btn) btn.textContent = gameState.muted ? '🔇' : '🔊';
    saveGame();
    if (!gameState.muted) {
        showToast('🔊 Sound on');
    } else {
        stopAmbientAudio();
        showToast('🔇 Sound off');
    }
}

let ambientNode = null;

function startAmbientAudio() {
    if (gameState.muted || ambientNode || !gameState.hasUnlockedSanctuary) return;
    try {
        const ctx = getAudioCtx();
        // Low gentle ocean hum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 4);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        ambientNode = { osc, gain };
        // Slowly modulate
        const interval = setInterval(() => {
            if (gameState.muted || !ambientNode) {
                clearInterval(interval);
                return;
            }
            try {
                osc.frequency.linearRampToValueAtTime(75 + Math.random() * 30, ctx.currentTime + 3);
                gain.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.03, ctx.currentTime + 3);
            } catch (e) {}
        }, 3000);
        ambientNode.interval = interval;
    } catch (e) { /* ambient audio not supported */ }
}

function stopAmbientAudio() {
    if (ambientNode) {
        try {
            ambientNode.osc.stop();
            clearInterval(ambientNode.interval);
        } catch (e) {}
        ambientNode = null;
    }
}

// ----- Daily Login Bonus -----
function checkDailyBonus() {
    const today = new Date().toDateString();
    if (gameState.lastVisitDate !== today) {
        const bonus = 50;
        gameState.coins += bonus;
        gameState.lastVisitDate = today;
        gameState.stats.totalCoinsEarned = (gameState.stats.totalCoinsEarned || 0) + bonus;
        saveGame();
        showToast(`☀️ Daily login bonus! +${bonus} 🪙`);
        playCoinJingle();
        launchConfetti(window.innerWidth / 2, window.innerHeight / 3, 20);
    }
}

// ----- Progress Milestone Celebrations -----
let lastMilestone = 0;

function checkProgressMilestones() {
    const next = getNextSanctuary();
    if (!next) return;
    const pct = (gameState.coins / next.coinsRequired) * 100;
    const milestones = [25, 50, 75, 100];
    milestones.forEach(m => {
        if (pct >= m && lastMilestone < m) {
            lastMilestone = m;
            const rect = dom.progressFill.getBoundingClientRect();
            const barX = rect.left + (m / 100) * rect.width;
            launchConfetti(barX, rect.top + 10, 12);
            if (m === 100) {
                showToast(`🎉 ${next.coinsRequired} 🪙 — ${next.name} in reach!`);
                playFanfare();
            } else {
                showToast(`🌟 ${m}% toward ${next.icon} ${next.name}!`);
                playChime(440 + m * 3, 0.12);
            }
        }
    });
}

// Reset milestone tracker on sanctuary unlock
function resetProgressMilestones() {
    lastMilestone = 0;
}

// ----- Speech Bubbles -----
function showSpeech(text, duration = 3000) {
    const bubble = document.getElementById('speech-bubble');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubble._hideTimer);
    bubble._hideTimer = setTimeout(() => bubble.classList.remove('show'), duration);
}

function updateSpeechByMood() {
    const p = gameState.penguin;
    if (p.hunger === 0) {
        showSpeech('😵 I\'m starving...', 4000);
    } else if (p.hunger <= 25) {
        showSpeech('😫 So hungry... feed me?', 4000);
    } else if (p.happiness <= 20) {
        showSpeech('😢 I feel lonely...', 4000);
    } else if (p.happiness >= 70 && p.hunger >= 60) {
        const msgs = ['😊 I\'m so happy!', '🎶 La la la~', '🐧 You\'re the best!', '💕 Love you!'];
        showSpeech(msgs[Math.floor(Math.random() * msgs.length)], 4000);
    } else {
        const msgs = ['🙂 Hello!', '🐧 What should we do?', '❄️ It\'s cozy here!', '✨ Let\'s have fun!'];
        showSpeech(msgs[Math.floor(Math.random() * msgs.length)], 4000);
    }
}

// ----- Pet the Penguin -----
function petPenguin() {
    const p = gameState.penguin;
    const now = Date.now();
    const cooldown = 30000; // 30 seconds
    if (now - p.lastPetTime < cooldown) {
        const remaining = Math.ceil((cooldown - (now - p.lastPetTime)) / 1000);
        showSpeech(`⏳ Wait ${remaining}s...`);
        return;
    }
    p.lastPetTime = now;
    p.happiness = clamp(p.happiness + 3, 0, 100);
    p.bond += 1;
    saveGame();
    updateUI();
    playChime(880, 0.08);
    const rect = dom.penguinContainer.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + 20, '#ff6b81', 10);
    const msgs = ['🥰 Aww thanks!', '😊 Pet me more!', '💕 That feels nice!', '🐧 Happy noises~'];
    showSpeech(msgs[Math.floor(Math.random() * msgs.length)], 2500);
    checkBondMilestones();
    checkAchievements();
}

// ----- Floating Hearts (high happiness) -----
let heartsInterval = null;

function startHeartsLoop() {
    stopHeartsLoop();
    heartsInterval = setInterval(() => {
        if (!gameState.hasUnlockedSanctuary || gameState.penguin.happiness < 70) return;
        const container = dom.penguinContainer;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        spawnParticles(
            rect.left + 20 + Math.random() * (rect.width - 40),
            rect.top + rect.height - 10,
            '#ff6b81',
            1
        );
    }, 2000);
}

function stopHeartsLoop() {
    if (heartsInterval) {
        clearInterval(heartsInterval);
        heartsInterval = null;
    }
}

// ----- Particle Effects -----
function spawnParticles(x, y, color, count = 8) {
    const container = document.querySelector('.particle-container') || (() => {
        const el = document.createElement('div');
        el.className = 'particle-container';
        document.body.appendChild(el);
        return el;
    })();

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = 4 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 60;
        p.style.cssText = `
            width:${size}px; height:${size}px;
            background:${color};
            left:${x}px; top:${y}px;
            --dx:${Math.cos(angle) * dist}px;
            --dy:${Math.sin(angle) * dist}px;
        `;
        container.appendChild(p);
        setTimeout(() => p.remove(), 800);
    }
}

// ----- Toast Notifications -----
function showToast(message) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ----- Confetti Effect (big celebration burst) -----
function launchConfetti(x, y, count = 50) {
    const container = document.querySelector('.particle-container') || (() => {
        const el = document.createElement('div');
        el.className = 'particle-container';
        document.body.appendChild(el);
        return el;
    })();

    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ff6b81'];
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';
        const size = 6 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 150;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const driftX = (Math.random() - 0.5) * 40;
        p.style.cssText = `
            width:${size}px; height:${size * (0.4 + Math.random() * 0.6)}px;
            background:${color};
            left:${x}px; top:${y}px;
            --dx:${Math.cos(angle) * dist + driftX}px;
            --dy:${Math.sin(angle) * dist - 50}px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        `;
        container.appendChild(p);
        setTimeout(() => p.remove(), 1500);
    }
}

// ----- Achievement System -----
function checkAchievements() {
    const earned = gameState.achievements;
    ACHIEVEMENTS.forEach(a => {
        if (!earned.includes(a.id) && a.check(gameState)) {
            earned.push(a.id);
            saveGame();
            setTimeout(() => {
                showToast(`🏅 Achievement: ${a.icon} ${a.name}!`);
                launchConfetti(window.innerWidth / 2, window.innerHeight / 3, 40);
                playFanfare();
            }, 200);
        }
    });
}

// ============================================
// STATE → UI BINDING
// ============================================

function updateUI() {
    const p = gameState.penguin;

    // Coins — animated counter
    const coinEl = dom.coinCount;
    const prevCoins = parseInt(coinEl.dataset.value) || 0;
    coinEl.textContent = gameState.coins;
    if (prevCoins !== gameState.coins) {
        coinEl.dataset.value = gameState.coins;
        coinEl.classList.remove('coin-pop');
        void coinEl.offsetWidth;
        coinEl.classList.add('coin-pop');
    }

    // Bond
    const level = getBondLevel(p.bond);
    dom.bondLevel.textContent = level;
    dom.bondDisplay.title = `Friendship Level ${level} (${p.bond} bond)`;

    // Stats bars
    dom.hungerBar.style.width = p.hunger + '%';
    dom.hungerValue.textContent = p.hunger;
    dom.happinessBar.style.width = p.happiness + '%';
    dom.happinessValue.textContent = p.happiness;

    // Bar colors
    dom.hungerBar.className = 'stat-bar-fill';
    if (p.hunger <= 20) dom.hungerBar.classList.add('level-danger');
    else if (p.hunger <= 50) dom.hungerBar.classList.add('level-warning');

    dom.happinessBar.className = 'stat-bar-fill';
    if (p.happiness <= 20) dom.happinessBar.classList.add('level-danger');
    else if (p.happiness <= 50) dom.happinessBar.classList.add('level-warning');

    // Penguin mood
    updatePenguinMood();

    // Progress to next sanctuary (Phase 1)
    const next = getNextSanctuary();
    if (next) {
        const progress = Math.min(100, (gameState.coins / next.coinsRequired) * 100);
        dom.progressFill.style.width = progress + '%';
        const label = document.querySelector('.progress-label');
        label.textContent = `Progress to ${next.icon} ${next.name}:`;
        dom.progressText.textContent = `${Math.min(gameState.coins, next.coinsRequired)} / ${next.coinsRequired} 🪙`;
        checkProgressMilestones();
    } else {
        dom.progressFill.style.width = '100%';
        document.querySelector('.progress-label').textContent = '🎉 All sanctuaries discovered!';
        dom.progressText.textContent = '🎉 Complete!';
    }

    // Feed button cost
    dom.feedBtn.textContent = `🍕 Feed (25🪙)`;
    dom.feedBtn.disabled = gameState.coins < 25;

    // Minigame stats
    dom.caughtCount.textContent = gameState.stats.totalFishCaught;
}

function updatePenguinMood() {
    const p = gameState.penguin;
    const container = dom.penguinContainer;
    // Remove all mood classes
    container.className = 'penguin-container';

    if (p.hunger === 0) {
        dom.penguinMood.textContent = '😵';
        container.classList.add('mood-starving');
    } else if (p.hunger <= 25) {
        dom.penguinMood.textContent = '😫';
        container.classList.add('mood-hungry');
    } else if (p.happiness <= 20) {
        dom.penguinMood.textContent = '😢';
        container.classList.add('mood-sad');
    } else if (p.happiness >= 70 && p.hunger >= 60) {
        dom.penguinMood.textContent = '😊';
        container.classList.add('mood-happy');
    } else if (p.happiness <= 40 && p.hunger <= 40) {
        dom.penguinMood.textContent = '😰';
        container.classList.add('mood-sad');
    } else {
        dom.penguinMood.textContent = '🙂';
    }
}

// Update accessories on the penguin
function updateAccessory() {
    dom.accessoryLayer.innerHTML = '';
    const equipped = gameState.penguin.equippedAccessory;
    if (!equipped) return;

    const item = SHOP_ITEMS.find(i => i.id === equipped);
    if (item && item.accessoryClass) {
        const div = document.createElement('div');
        div.className = item.accessoryClass;
        dom.accessoryLayer.appendChild(div);
    }
}

// ============================================
// DECAY LOOP (every 30 seconds)
// ============================================
let decayInterval = null;
let lastDecayTime = Date.now();
let idleTimer = null;

function startDecayLoop() {
    if (decayInterval) clearInterval(decayInterval);
    decayInterval = setInterval(() => {
        const p = gameState.penguin;
        let hungerLoss = 5;
        let happinessLoss = 3;

        if (p.hunger <= 0) {
            happinessLoss = 9; // 3x decay when starving
        }

        p.hunger = clamp(p.hunger - hungerLoss, 0, 100);
        p.happiness = clamp(p.happiness - happinessLoss, 0, 100);
        updateUI();
        saveGame();

        // Sleep check: if starving, penguin falls asleep
        if (p.hunger <= 0 || p.happiness <= 0) {
            dom.penguinContainer.classList.add('sleeping');
            dom.penguinMood.textContent = '💤';
        } else {
            dom.penguinContainer.classList.remove('sleeping');
        }

        // Random speech update
        if (Math.random() < 0.4) updateSpeechByMood();
    }, 30000);
}

// ============================================
// IDLE ANIMATION TRACKER
// ============================================
let idleTimeout = null;

function resetIdleTimer() {
    dom.penguinContainer.classList.remove('idle-waddle', 'idle-sit');
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (!gameState.hasUnlockedSanctuary) return;
        // Random idle animation
        const r = Math.random();
        if (r < 0.5) {
            dom.penguinContainer.classList.add('idle-waddle');
        } else {
            dom.penguinContainer.classList.add('idle-sit');
        }
    }, 60000);
}

// ============================================
// SCREEN TRANSITIONS
// ============================================

function switchToPhase2() {
    gameState.hasUnlockedSanctuary = true;
    dom.phase1.classList.remove('active');
    dom.phase2.classList.add('active');
    dom.unlockModal.classList.remove('show');
    applySanctuaryTheme();
    renderSanctuarySelector();
    startDecayLoop();
    resetIdleTimer();
    renderShop();
    renderCloset();
    renderStats();
    updateUI();
    resetProgressMilestones();
    saveGame();
    playFanfare();
    checkAchievements();
    startAmbientAudio();
    startHeartsLoop();
    setTimeout(() => updateSpeechByMood(), 500);
}

function switchToPhase1() {
    dom.phase2.classList.remove('active');
    dom.phase1.classList.add('active');
    if (decayInterval) {
        clearInterval(decayInterval);
        decayInterval = null;
    }
    stopAmbientAudio();
    stopHeartsLoop();
    // Reset and show start screen for minigame
    resetMinigameForPlay();
    updateUI();
}

// ============================================
// CHECK SANCTUARY UNLOCK
// ============================================

function checkSanctuaryUnlock() {
    const next = getNextSanctuary();
    if (!next) return;
    if (gameState.coins >= next.coinsRequired && !gameState.unlockedSanctuaries.includes(next.id)) {
        // Pause minigame
        if (gameRunning) gameRunning = false;
        
        gameState.unlockedSanctuaries.push(next.id);
        if (next.id === 'iceberg-isle') {
            gameState.hasUnlockedSanctuary = true;
        }
        saveGame();
        
        // Update modal content for this sanctuary
        document.querySelector('.modal-icon').textContent = next.icon;
        document.querySelector('.modal-content h2').textContent = `${next.name} Unlocked!`;
        document.querySelector('.modal-content p').innerHTML = `You've earned <strong>${next.coinsRequired} coins</strong> and discovered <strong>${next.name}</strong>!`;
        document.querySelector('.modal-sub').textContent = `🏝️ Welcome to ${next.name}!`;
        
        dom.unlockModal.classList.add('show');
        playFanfare();
        showToast(`🎉 ${next.name} Unlocked!`);
    }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    loadGame();

    dom.penguinName.textContent = gameState.penguin.name;

    // Check if sanctuary already unlocked
    if (gameState.hasUnlockedSanctuary) {
        dom.phase2.classList.add('active');
        dom.phase1.classList.remove('active');
        startDecayLoop();
        renderShop();
        renderCloset();
        renderStats();
        resetIdleTimer();
    } else {
        dom.phase1.classList.add('active');
        dom.phase2.classList.remove('active');
        resetMinigameForPlay();
    }

    updateUI();
    updateAccessory();
    applySanctuaryTheme();

    // Daily login bonus
    checkDailyBonus();

    // Initial speech
    if (gameState.hasUnlockedSanctuary) {
        setTimeout(updateSpeechByMood, 800);
        startAmbientAudio();
        startHeartsLoop();
    }

    // ---- Event Listeners ----

    // Modal enter button
    dom.modalEnterBtn.addEventListener('click', switchToPhase2);

    // Reset button (clear all progress)
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm('🔄 Reset all progress? This cannot be undone!')) {
            // Stop any running game
            stopMinigame();
            if (decayInterval) {
                clearInterval(decayInterval);
                decayInterval = null;
            }
            // Clear saved data
            localStorage.removeItem(SAVE_KEY);
            // Reset game state to defaults
            gameState = {
                coins: 0,
                hasUnlockedSanctuary: false,
                currentSanctuaryId: 'iceberg-isle',
                unlockedSanctuaries: [],
                lastVisitDate: '',
                muted: false,
                penguin: {
                    name: 'Pippin',
                    hunger: 100,
                    happiness: 50,
                    bond: 0,
                    equippedAccessory: null,
                    inventory: [],
                    lastPetTime: 0
                },
                achievements: [],
                stats: {
                    totalFishCaught: 0,
                    bestCombo: 0,
                    timesFed: 0,
                    timesPlayed: 0,
                    totalCoinsEarned: 0
                }
            };
            // Reset UI
            dom.phase2.classList.remove('active');
            dom.phase1.classList.add('active');
            dom.unlockModal.classList.remove('show');
            document.body.style.background = SANCTUARIES[0].themeBg;
            updateUI();
            updateAccessory();
            applySanctuaryTheme();
            resetMinigameForPlay();
            showToast('🔄 Progress reset! Starting fresh!');
        }
    });

    // Feed button
    dom.feedBtn.addEventListener('click', () => {
        const p = gameState.penguin;
        if (gameState.coins < 25) {
            showToast('Not enough coins! 🪙');
            return;
        }
        gameState.coins -= 25;
        p.hunger = clamp(p.hunger + 30, 0, 100);
        p.happiness = clamp(p.happiness + 5, 0, 100);
        p.bond += 1;
        gameState.stats.timesFed++;
        saveGame();
        updateUI();
        resetIdleTimer();
        playChime(440, 0.12);
        // Particle effect
        const rect = dom.feedBtn.getBoundingClientRect();
        spawnParticles(rect.left + rect.width / 2, rect.top, '#e74c3c', 6);
        showToast('🍕 Yummy! +30 Hunger, +5 Happiness');
        // Happy dance animation
        dom.penguinContainer.classList.add('mood-happy', 'feeding');
        setTimeout(() => dom.penguinContainer.classList.remove('feeding'), 800);
        updateSpeechByMood();
        checkBondMilestones();
        checkAchievements();
    });

    // Play button (reopens minigame)
    dom.playBtn.addEventListener('click', () => {
        gameState.stats.timesPlayed++;
        switchToPhase1();
        updateUI();
    });

    // Tab switching (Shop / Closet / Stats)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById('panel-' + btn.dataset.tab);
            if (target) target.classList.add('active');
            if (btn.dataset.tab === 'stats') {
                renderStats();
                checkAchievements();
            }
        });
    });

    // Export / Import save
    document.getElementById('export-btn').addEventListener('click', exportSave);
    document.getElementById('import-btn').addEventListener('click', importSave);

    // Mute button
    document.getElementById('mute-btn').addEventListener('click', toggleMute);
    if (gameState.muted) {
        document.getElementById('mute-btn').textContent = '🔇';
    }

    // Pet penguin (click on penguin body area)
    dom.penguinContainer.addEventListener('click', (e) => {
        // Don't trigger if clicking on the accessory layer overlay
        if (e.target.closest('.accessory-layer')) return;
        petPenguin();
    });

    // Tummy rub — special happy sound + pet when clicking the belly
    const penguinBelly = document.querySelector('.penguin-belly');
    if (penguinBelly) {
        penguinBelly.addEventListener('click', (e) => {
            e.stopPropagation();
            // Play a warm, happy "smile" chime — two rising notes
            if (!gameState.muted) {
                try {
                    const ctx = getAudioCtx();
                    const now = ctx.currentTime;
                    [523, 784].forEach((freq, i) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + i * 0.12);
                        osc.frequency.linearRampToValueAtTime(freq * 1.5, now + i * 0.12 + 0.2);
                        gain.gain.setValueAtTime(0.18, now + i * 0.12);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now + i * 0.12);
                        osc.stop(now + i * 0.12 + 0.3);
                    });
                } catch (e) {}
            }
            // Tiny pink heart burst from belly
            const rect = penguinBelly.getBoundingClientRect();
            spawnParticles(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                '#ff9ff3',
                8
            );
            // Also trigger pet interaction
            petPenguin();
        });
    }

    // Edit penguin name
    dom.penguinName.addEventListener('click', () => {
        const current = gameState.penguin.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = current;
        input.maxLength = 16;
        input.className = 'name-editor-input';
        input.style.cssText = 'font-size:1rem;width:120px;text-align:center;border:2px solid #3498db;border-radius:8px;padding:4px 8px;font-family:inherit;font-weight:700;outline:none;';
        dom.penguinName.replaceWith(input);
        input.focus();
        input.select();
        
        function saveName() {
            const val = input.value.trim() || current;
            gameState.penguin.name = val;
            dom.penguinName.textContent = val;
            input.replaceWith(dom.penguinName);
            saveGame();
            showToast(`🐧 Name changed to ${val}!`);
        }
        
        input.addEventListener('blur', saveName);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { input.blur(); }
        });
    });

    // Mouse/click on canvas — start audio context on user gesture
    dom.canvas.addEventListener('click', () => getAudioCtx(), { once: true });
    dom.canvas.addEventListener('keydown', () => getAudioCtx(), { once: true });

    // Apply day/night cycle
    applyTimeOfDay();

    // Start idle timer for Phase 1
    if (!gameState.hasUnlockedSanctuary) {
        // Phase 1 idle: subtle canvas hints could be added
    }

    // Check for any achievements earned while away
    checkAchievements();
}

// ============================================
// BOND MILESTONES
// ============================================

function checkBondMilestones() {
    const p = gameState.penguin;
    const milestones = [10, 25, 50];
    milestones.forEach(m => {
        if (p.bond === m) {
            setTimeout(() => {
                showToast(`💕 Pippin's friendship level increased! (${m})`);
                spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#e74c8b', 12);
            }, 300);
        }
    });
}

// ============================================
// SHOP RENDERING (sanctuary.js will call this)
// ============================================

function renderShop() {
    dom.shopGrid.innerHTML = '';
    SHOP_ITEMS.forEach(item => {
        const owned = gameState.penguin.inventory.includes(item.id);
        const canAfford = gameState.coins >= item.cost;
        const isFood = item.type === 'food';

        const card = document.createElement('div');
        card.className = 'shop-item';

        card.innerHTML = `
            <div class="shop-item-icon">${item.icon}</div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-desc">${getItemEffectDesc(item)}</div>
            <div class="shop-item-cost">🪙 ${item.cost}</div>
            <button class="shop-buy-btn" data-id="${item.id}" ${owned || (!canAfford && !isFood) ? 'disabled' : ''}>
                ${owned ? '✅ Owned' : isFood ? (canAfford ? 'Buy & Use' : 'Not enough 🪙') : (canAfford ? 'Buy' : 'Not enough 🪙')}
            </button>
        `;

        dom.shopGrid.appendChild(card);
    });

    // Buy buttons
    dom.shopGrid.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.id;
            purchaseItem(itemId);
        });
    });
}

function getItemEffectDesc(item) {
    const parts = [];
    if (item.hungerEffect) parts.push(`+${item.hungerEffect} 🍽️`);
    if (item.happinessEffect) parts.push(`+${item.happinessEffect} 😊`);
    return parts.join(' ');
}

function purchaseItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (gameState.coins < item.cost) {
        showToast('Not enough coins! 🪙');
        return;
    }

    gameState.coins -= item.cost;

    if (item.type === 'food') {
        // Food is consumed immediately
        const p = gameState.penguin;
        p.hunger = clamp(p.hunger + (item.hungerEffect || 0), 0, 100);
        p.happiness = clamp(p.happiness + (item.happinessEffect || 0), 0, 100);
        p.bond += 1;
        updateUI();
        saveGame();
        playChime(523, 0.12);
        showToast(`${item.icon} ${item.name} used!`);
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#2ecc71', 8);
        checkBondMilestones();
        checkAchievements();
    } else {
        // Accessory goes to inventory
        gameState.penguin.inventory.push(item.id);
        gameState.penguin.happiness = clamp(
            gameState.penguin.happiness + (item.happinessEffect || 0), 0, 100
        );
        gameState.penguin.bond += 1;
        updateUI();
        saveGame();
        playCoinJingle();
        showToast(`${item.icon} ${item.name} purchased!`);
        renderShop();
        renderCloset();
        checkBondMilestones();
        checkAchievements();
    }
    renderShop();
    renderCloset();
}

// ============================================
// CLOSET RENDERING
// ============================================

function renderCloset() {
    const ownedAccessories = SHOP_ITEMS.filter(
        i => i.type === 'accessory' && gameState.penguin.inventory.includes(i.id)
    );

    if (ownedAccessories.length === 0) {
        dom.closetGrid.innerHTML = '';
        dom.closetEmpty.style.display = 'block';
        return;
    }

    dom.closetEmpty.style.display = 'none';
    dom.closetGrid.innerHTML = '';

    ownedAccessories.forEach(item => {
        const isEquipped = gameState.penguin.equippedAccessory === item.id;

        const div = document.createElement('div');
        div.className = 'closet-item' + (isEquipped ? ' equipped' : '');
        div.innerHTML = `
            <div class="closet-item-icon">${item.icon}</div>
            <div class="closet-item-name">${item.name}</div>
            ${isEquipped ? '<div class="closet-equip-label">✅ Equipped</div>' : '<div class="closet-equip-label">Click to equip</div>'}
        `;

        div.addEventListener('click', () => {
            if (isEquipped) {
                // Unequip
                gameState.penguin.equippedAccessory = null;
                showToast(`${item.name} unequipped`);
            } else {
                gameState.penguin.equippedAccessory = item.id;
                showToast(`${item.icon} ${item.name} equipped!`);
            }
            saveGame();
            updateAccessory();
            renderCloset();
        });

        dom.closetGrid.appendChild(div);
    });
}

// ============================================
// SANCTUARY SELECTOR
// ============================================

function renderSanctuarySelector() {
    const container = document.getElementById('sanctuary-selector');
    if (!container) return;
    container.innerHTML = '';
    SANCTUARIES.forEach((s, i) => {
        const unlocked = gameState.unlockedSanctuaries.includes(s.id);
        const active = gameState.currentSanctuaryId === s.id;
        const btn = document.createElement('button');
        btn.className = 'sanctuary-btn' + (active ? ' active' : '') + (unlocked ? ' unlocked' : ' locked');
        btn.innerHTML = unlocked
            ? `${s.icon}<span class="s-btn-name">${s.name}</span>`
            : `🔒<span class="s-btn-name">???</span>`;
        btn.title = unlocked ? `Switch to ${s.name}` : `Unlock with ${s.coinsRequired}🪙`;
        if (unlocked) {
            btn.addEventListener('click', () => switchSanctuary(s.id));
        }
        container.appendChild(btn);
    });
}

function switchSanctuary(id) {
    if (gameState.currentSanctuaryId === id) return;
    if (!gameState.unlockedSanctuaries.includes(id)) return;
    gameState.currentSanctuaryId = id;
    saveGame();
    applySanctuaryTheme();
    renderSanctuarySelector();
    showToast(`🗺️ Welcome to ${getCurrentSanctuary().name}!`);
    playChime(523, 0.12);
}

// ============================================
// STATS & ACHIEVEMENTS RENDERING
// ============================================

function renderStats() {
    const p = gameState.penguin;
    const s = gameState.stats;
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="stat-card"><span class="stat-card-icon">🐟</span><span class="stat-card-label">Fish Caught</span><span class="stat-card-value">${s.totalFishCaught}</span></div>
        <div class="stat-card"><span class="stat-card-icon">🔥</span><span class="stat-card-label">Best Combo</span><span class="stat-card-value">${s.bestCombo}x</span></div>
        <div class="stat-card"><span class="stat-card-icon">🪙</span><span class="stat-card-label">Current Coins</span><span class="stat-card-value">${gameState.coins}</span></div>
        <div class="stat-card"><span class="stat-card-icon">🍕</span><span class="stat-card-label">Times Fed</span><span class="stat-card-value">${s.timesFed}</span></div>
        <div class="stat-card"><span class="stat-card-icon">💕</span><span class="stat-card-label">Bond Level</span><span class="stat-card-value">${getBondLevel(p.bond)}</span></div>
        <div class="stat-card"><span class="stat-card-icon">🎮</span><span class="stat-card-label">Games Played</span><span class="stat-card-value">${s.timesPlayed}</span></div>
    `;

    // Render achievements
    const achGrid = document.getElementById('achievements-grid');
    if (!achGrid) return;
    achGrid.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
        const unlocked = gameState.achievements.includes(a.id);
        const div = document.createElement('div');
        div.className = 'achievement-card' + (unlocked ? ' unlocked' : ' locked');
        div.innerHTML = `
            <div class="achievement-icon">${unlocked ? a.icon : '🔒'}</div>
            <div class="achievement-info">
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.desc}</div>
            </div>
            ${unlocked ? '<div class="achievement-check">✅</div>' : ''}
        `;
        achGrid.appendChild(div);
    });
}

// ============================================
// DAY / NIGHT CYCLE
// ============================================

function applyTimeOfDay() {
    const hour = new Date().getHours();
    document.body.classList.toggle('night-mode', hour < 6 || hour >= 18);
}

// ============================================
// SAVE EXPORT / IMPORT
// ============================================

function exportSave() {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) { showToast('No save data to export!'); return; }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `penguin-paradise-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('💾 Save exported!');
}

function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.coins && data.coins !== 0) {
                    showToast('❌ Invalid save file!');
                    return;
                }
                localStorage.setItem(SAVE_KEY, ev.target.result);
                showToast('📂 Save imported! Reloading...');
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                showToast('❌ Invalid save file!');
            }
        };
        reader.readAsText(file);
    });
    input.click();
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', init);
