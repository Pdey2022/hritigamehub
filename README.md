# 🌟 Hriti's Game Hub

A collection of fun, cozy games built for Hriti. Hosted at **[hritihub.uk](https://hritihub.uk)** via GitHub Pages + Cloudflare.

## 🎮 Current Games (9/13 playable)

| #     | Game                                             | Status           | Tags                                |
| ----- | ------------------------------------------------ | ---------------- | ----------------------------------- |
| 1     | 🐧 **Penguin Paradise**                          | ✅ Live          | 🐟 Fishing, 🐾 Pet Care, 🛒 Shop    |
| 2     | 🌊 **Bubble Pop**                                | ✅ Live          | 💥 Arcade, 🎯 Reflex, 🫧 Bubbles    |
| 3     | 🧩 **Memory Match**                              | ✅ Live          | 🧠 Puzzle, 🎴 Cards, 🃏 3D Flip     |
| 4     | 🎯 **Dart Dash**                                 | ✅ Live          | 🎯 Precision, ⚡ Speed, 🎈 Balloons |
| 5     | 📖 **Word Wizard**                               | ✅ Live          | 📚 Word, 🧠 Brain, 🔤 Unscramble    |
| 6     | 🥷 **Ninja Jump**                                | ✅ Live (parked) | 🎮 Platform, ⚡ Action              |
| 7     | 🗺️ **Puzzle Path**                               | ✅ Live          | 🧩 Puzzle, 🗺️ Maze                  |
| 8     | 🐾 **Pet Rescue**                                | ✅ Live          | 🐾 Rescue, 💕 Care                  |
| 9     | 🚀 **Space Blaster**                             | ✅ Live          | 👾 Arcade, 🚀 Space, 👁️ Boss Fights |
| 10-13 | 🏎️ Race Rush, 🌾 Farm Friends, 🐙 Ocean Explorer | ⬜ Coming Soon   | —                                   |

## 📁 Project Structure

```
HritiGame/
├── index.html              # Landing page (game hub with carousel + search)
├── 404.html                # Custom 404 page
├── README.md               # ← You are here
├── CNAME                   # Custom domain: hritihub.uk
├── assets/css/style.css    # Shared styles (base, landing, hud-btn, animations)
└── games/
    ├── penguin-paradise/   # Pet + fishing (3 JS files: main, minigame, sanctuary)
    ├── bubble-pop/         # Arcade bubble popper
    ├── memory-match/       # Card matching (3D flip)
    ├── dart-dash/          # Target practice
    ├── word-wizard/        # Word unscramble
    ├── ninja-jump/         # Vertical platformer (PARKED)
    ├── puzzle-path/        # Maze navigation
    ├── pet-rescue/         # Animal rescue clicker
    └── space-blaster/      # Space shooter (waves, power-ups, boss battles)
```

Each game has: `index.html` + `css/game-name.css` (separate) + `js/game.js`

## 🏗️ Architecture

- **Vanilla JS (ES6)** — No frameworks. All games use Canvas 2D API.
- **Web Audio API** — All sounds generated programmatically (no audio files).
- **CSS3** — Animations, Flexbox, Grid, backdrop-filter (frosted glass), 3D transforms.
- **Hosting** — GitHub Pages + Cloudflare (DNS, CDN, SSL).

## ⚠️ CRITICAL: New Game Checklist

### 1. Separate CSS file ❗

Each game gets its own CSS at `games/game-name/css/game-name.css`.
**DO NOT** add game styles to `assets/css/style.css` — cache conflicts!

### 2. `body.loaded` script ❗❗

The shared CSS has `body { opacity: 0 }` — every page starts invisible!
**Every game MUST include** right before `</body>`:

```html
<script src="/games/game-name/js/game.js"></script>
<script>
  document.body.classList.add("loaded");
</script>
<!-- ← CRITICAL -->
```

### 3. Standard game template

```html
<head>
  ...
</head>
<body class="game-name-page">
  <header id="xx-hud">...</header>
  <section id="xx-game-area">
    <div class="xx-canvas-wrapper">
      <canvas id="xx-canvas" width="500" height="550"></canvas>
      <!-- Start overlay -->
      <!-- Game over overlay -->
      <!-- Level complete overlay -->
      <!-- Won overlay -->
    </div>
    <div id="xx-bottom-hud">...</div>
  </section>
  <script src="/games/game-name/js/game.js"></script>
  <script>
    document.body.classList.add("loaded");
  </script>
</body>
```

### 4. Landing page update

Replace "Coming Soon" card in `index.html` with an `<a href="/games/game-name/" class="game-card">`.

### 5. localStorage keys

Use `{game}_best` for high score and `{game}_muted` for mute state.

## 🐛 Known Bugs (Avoid These)

| Bug                            | Symptom                                 | Fix                                           |
| ------------------------------ | --------------------------------------- | --------------------------------------------- |
| Missing `body.loaded`          | Page invisible (blank/gradient only)    | Add inline script before `</body>`            |
| Game styles in shared CSS      | Cache serves old CSS without new styles | Use separate CSS per game                     |
| `state.stars` as array+counter | `stars.find is not a function`          | `stars: []` (array) + `starCount: 0` (number) |
| `gameLoop()` not restarted     | Next level freezes                      | Call `gameLoop()` in `nextLevel()`            |

## 🚀 Quick Deploy

```bash
python -m http.server 8000      # Test locally → http://localhost:8000
git add -A
git commit -m "description"
git push                         # Auto-deploys to GitHub Pages
# Then: Purge Cloudflare cache → hard refresh browser
```

## 🌐 Domain

- **Domain**: hritihub.uk (via Cloudflare)
- **DNS**: CNAME @ and www → pdey2022.github.io
- **CNAME file**: Contains `hritihub.uk`

```
Hrit's Game Hub/
├── index.html                          ← 🏠 Landing page (game hub)
├── README.md                           ← 📖 You are here
├── assets/
│   ├── css/
│   │   └── style.css                   ← 🎨 All shared styles
│   └── js/                             ← 📦 Shared JavaScript (for future cross-game features)
└── games/
    ├── penguin-paradise/               ← 🐧 Penguin Paradise
    │   ├── index.html                  ← Game page
    │   └── js/
    │       ├── main.js                 ← Game engine & state management
    │       ├── minigame.js             ← Fish Catch minigame
    │       └── sanctuary.js            ← Sanctuary module
    └── bubble-pop/                     ← 🌊 Bubble Pop
        ├── index.html                  ← Game page
        └── js/
            └── game.js                 ← Full game engine
```

---

## 🎮 Available Games

### 🐧 Penguin Paradise _(Playable!)_

Raise a virtual penguin, catch fish, unlock magical sanctuaries, and collect accessories!

- **3 Sanctuaries**: Iceberg Isle 🐧, Coral Cove 🐠, Aurora Peak ❄️
- **9 Accessories**: Bowtie, Top Hat, Santa Hat, Ice Crown, Sunny Scarf, Party Hat + more
- **10 Achievements**: From "First Catch" to "Legendary Fisher"
- **4 Power-ups**: Slow Motion ⏱, Magnet 🧲, Shield 🛡, Double Coins 2️⃣
- **Pet interactions**: Tummy rubs, speech bubbles, feeding animations, sleeping

### 🌊 Bubble Pop _(Playable!)_

Pop colorful bubbles as they float up from the deep! Click to pop, dodge bombs, and climb through 10 levels.

- **7 Bubble Types**: Red 🔴, Blue 🔵, Green 🟢, Purple 🟣, Gold ⭐, Bomb 💣, Freeze ❄️
- **10 Levels**: Each level gets faster with more bubbles to pop
- **Combo System**: Quick successive pops earn bonus points
- **Power-ups**: ❄️ Freeze slows all bubbles
- **High Score**: Best score saved locally
- **Screen shake**: Impacts feel weighty

### 🧩 Memory Match _(Coming Soon)_

### 🎯 Dart Dash _(Coming Soon)_

---

## 🐧 Penguin Paradise — Game Guide

### How to Play

1. **Phase 1 — Fish Catch Minigame**
   - Use **← → arrow keys** or **mouse/touch** to move the penguin catcher
   - Catch 🐟 Fish (+10 🪙), 🦐 Shrimp (+20 🪙), 🦪 Pearls (+30 🪙)
   - Dodge 🧊 Icebergs and 👢 Boots (lose a life)
   - Catch ⭐ Golden Fish (+50 🪙) and 🎁 Treasure Chests (+100 🪙)
   - Collect ⚡ Power-ups for special abilities

2. **Progress Bar** — Shows progress toward unlocking the next sanctuary
   - 🐧 Iceberg Isle: 500 🪙
   - 🐠 Coral Cove: 2,000 🪙
   - ❄️ Aurora Peak: 5,000 🪙

3. **Phase 2 — Sanctuary**
   - 🍕 **Feed** Pippin to keep hunger/happiness up
   - 🎮 **Play for Coins** to earn more at the minigame
   - 🫳 **Pet the penguin** (click the belly for a happy sound!)
   - ✏️ **Click the name** to rename Pippin
   - 🛒 **Shop** — Buy food and accessories
   - 👔 **Closet** — Equip/unlock accessories

### Game Over

Losing all 3 lives resets your coins and bond level, but keeps your sanctuary progress, inventory items, and achievements.

### Power-ups

| Power-up        | Effect                   | Duration |
| --------------- | ------------------------ | -------- |
| ⏱ Slow Motion   | Items fall at 30% speed  | 5s       |
| 🧲 Magnet       | Fish fly toward you      | 5s       |
| 🛡 Shield       | Absorbs one obstacle hit | 8s       |
| 2️⃣ Double Coins | All catches worth 2x     | 8s       |

### Achievements

| Achievement         | How to Unlock          |
| ------------------- | ---------------------- |
| 🐟 First Catch      | Catch your first fish  |
| 🔥 On Fire          | Reach 3x combo         |
| 👑 Combo King       | Reach 10x combo        |
| 🎣 Fish Master      | Catch 50 fish          |
| 🏆 Legendary Fisher | Catch 100 fish         |
| 🏠 Sanctuary Keeper | Unlock any sanctuary   |
| ❤️ Generous Heart   | Feed Pippin 10 times   |
| 💕 Best Friends     | Reach bond level 5     |
| 💅 Fashionista      | Collect 3 accessories  |
| 💰 Coin Hoarder     | Earn 1,000 total coins |

---

## 🌟 Features

### Visual

- Google Fonts (Fredoka) for a playful look
- High-DPI canvas (crisp on Retina displays)
- Day/night cycle (dark mode 6PM–6AM)
- Seasonal decorations (snow in winter, sun rays in summer)
- CSS-drawn penguin with mood expressions
- Animated coin counter, screen shake, sparkle trails
- Confetti celebrations on milestones

### Audio

- Web Audio API sound effects (no files needed)
- Ambient ocean hum in sanctuary
- Mute button (persists across sessions)
- All sounds respect mute state

### Persistence

- All progress saved to localStorage
- Daily login bonus (+50 🪙)
- Survives page refreshes and navigation

---

## 🛠️ Development

### Adding a New Game

1. Create a folder: `games/your-game/`
2. Add `index.html` + `js/` files
3. Add a game card to `index.html` (landing page)
4. Add shared styles to `assets/css/style.css`

### Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Flexbox, Grid, Keyframes, Backdrop filters
- **Vanilla JavaScript** — Canvas 2D API, Web Audio API, localStorage
- **No frameworks, no build tools** — runs in any modern browser

---

_Made with 💕 for Hriti_
