# Progress — Hriti's Game Hub

## ✅ Completed

### Hub & Infrastructure

- [x] Landing page with floating frosted-glass nav bar (Hriti's HUB, About Me, auth)
- [x] Game cards with icons, tags, stats, Play Now buttons
- [x] Search-as-you-type filter across all game cards
- [x] Horizontal carousel with arrow buttons + touch swipe
- [x] 8 category cards (Space, Farming, Racing, Arcade, Puzzle, Pet Care, Word, Memory)
- [x] Favorites system (❤️ buttons on cards, persisted to localStorage + Firebase)
- [x] Recently played tracking (last 5, stored in localStorage + Firebase)
- [x] Scroll-to-top button
- [x] Custom 404 page
- [x] Google Fonts (Fredoka)
- [x] Google Search Console verification
- [x] sitemap.xml + robots.txt
- [x] Schema.org structured data (CollectionPage, VideoGame, FAQPage)
- [x] Open Graph + Twitter Card meta tags
- [x] Cache-busting system (`bump-version.ps1` + `.cache-version.json`)
- [x] Custom domain (hritihub.uk) via CNAME + Cloudflare DNS

### Firebase Integration

- [x] Firebase project configured (Auth + Firestore)
- [x] Google Sign-In with popup (redirect fallback)
- [x] Auth UI: Google pill button → avatar + Sign Out
- [x] Firestore cloud save/load on sign-in
- [x] Auto-sync every 30 seconds
- [x] Debounced cloud save on high score / farm save
- [x] localStorage.setItem override for automatic sync

### Playable Games (11)

- [x] **Penguin Paradise** — pet care + fishing minigame + 3 sanctuaries + shop + accessories + achievements + moods
- [x] **Bubble Pop** — arcade popper with 7 bubble types, freeze power-up, combo system, 10 levels
- [x] **Memory Match** — 3D card flip, combo system, 3 themes, 8+ levels
- [x] **Dart Dash** — moving targets, bonus balloons, streak system, 10 levels
- [x] **Word Wizard** — unscramble + hints + streak bonus, 10 levels
- [x] **Puzzle Path** — random maze generation, star collection, obstacles, 10 levels
- [x] **Pet Rescue** — clicker with 5 animal types, combo system, timed rounds, 10 levels
- [x] **Space Blaster** — 4 enemy types + asteroids, power-ups, boss fights, endless waves
- [x] **Race Rush** — top-down racer, dodge traffic, collect coins, power-ups, endless
- [x] **Farm Friends** — 4 crops, 3 animals, day/night cycle, shop, sell system
- [x] **Ninja Jump** — vertical platformer (parked — needs balancing)

### Accessibility & Mobile

- [x] Touch support on all games (touchstart/touchend on canvas)
- [x] Responsive CSS (max-width, flex-wrap, mobile-friendly cards)
- [x] Game over overlays with restart/next wave buttons
- [x] Mute buttons on all games (localStorage persisted)
- [x] Reset buttons on all games

## 🔄 In Progress

- [ ] **Nav bar**: just committed — floating top-nav with logo, About Me link, and auth (CSS done)
- [ ] **Firestore Security Rules** — currently in test mode, need to lock down:
  ```js
  match /gameSaves/{userId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
  ```

## 📋 Future Scope

### Pages

- [ ] **About Me page** (`/about/`) — create when user asks (link already in nav bar)
- [ ] **Individual game pages** — add `/game/` route with details, screenshots, reviews

### Planned Games (Coming Soon)

- [ ] **Ocean Explorer** — dive, discover marine life, build aquarium
- [ ] **Chef's Kitchen** — cooking timer management + restaurant
- [ ] **Dino Dig** — fossil excavation + skeleton assembly puzzle
- [ ] **Super Builder** — block-by-block building + creative mode
- [ ] **Magic Canvas** — drawing with magical tools and effects

### Enhancements

- [ ] **AdSense** — un-hide ad banners and replace `ca-pub-xxxxxxxxxxxxxxxx` with real publisher ID
- [ ] **High score leaderboard** — global scores via Firestore (read all, show top 10)
- [ ] **Daily challenges** — rotating objectives with rewards
- [ ] **Sound effects pass** — improve Web Audio procedural sounds
- [ ] **Ninja Jump rebalance** — fix platform generation, difficulty curve, scoring
- [ ] **PWA manifest** — add `manifest.json` + service worker for offline play
- [ ] **Cloud save merge** — handle conflicts when same account plays on two devices
