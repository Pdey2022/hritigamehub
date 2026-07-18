# Architecture — Hriti's Game Hub

## Folder Structure

```
HritiGame/                        # GitHub Pages root
├── index.html                    # Landing page (hub) — game cards, carousel, search, categories
├── 404.html                      # Custom 404 page
├── README.md                     # Project overview
├── CNAME                         # Custom domain: hritihub.uk
├── robots.txt                    # Search engine crawl instructions
├── sitemap.xml                   # All game URLs for Google
├── googledd54713c00a87540.html   # Google Search Console verification
├── bump-version.ps1              # Cache-busting version bumper (PowerShell)
├── .cache-version.json           # Current cache-busting version number
├── firebase-config.js            # Firebase project config (API keys, project ID)
├── firebase-integration.js       # Auth + Firestore cloud sync logic
│
├── assets/
│   └── css/
│       └── style.css             # Shared styles (hub layout, game card, nav, auth, animations)
│
├── about/                        # About Me page (create when ready)
│   └── index.html
│
└── games/
    ├── penguin-paradise/         # 3 JS files: main.js, minigame.js, sanctuary.js
    │   ├── index.html
    │   ├── css/penguin-paradise.css
    │   └── js/
    │       ├── main.js
    │       ├── minigame.js
    │       └── sanctuary.js
    ├── bubble-pop/
    │   ├── index.html
    │   └── js/game.js
    ├── memory-match/
    │   ├── index.html
    │   └── js/game.js
    ├── dart-dash/
    │   ├── index.html
    │   └── js/game.js
    ├── word-wizard/
    │   ├── index.html
    │   ├── css/word-wizard.css
    │   └── js/game.js
    ├── ninja-jump/
    │   ├── index.html
    │   ├── css/ninja-jump.css
    │   └── js/game.js
    ├── puzzle-path/
    │   ├── index.html
    │   ├── css/puzzle-path.css
    │   └── js/game.js
    ├── pet-rescue/
    │   ├── index.html
    │   ├── css/pet-rescue.css
    │   └── js/game.js
    ├── space-blaster/
    │   ├── index.html
    │   └── js/game.js
    ├── race-rush/
    │   ├── index.html
    │   └── js/game.js
    └── farm-friends/
        ├── index.html
        └── js/game.js
```

## State Management

### Client-Side (localStorage)

All game data persists in `localStorage` under scoped keys. Pattern:

| Scope           | Key Pattern                    | Example                              |
| --------------- | ------------------------------ | ------------------------------------ |
| High scores     | `{game}_high` or `{game}_best` | `sb_high`, `pp_best`                 |
| Mute preference | `{game}_muted`                 | `bp_muted`, `ff_muted`               |
| Favorites       | `hub_favs`                     | JSON array of game IDs               |
| Recently played | `hub_recent`                   | JSON array (max 5, newest first)     |
| Farm save       | `ff_save`                      | JSON with crops, coins, animals, day |
| Penguin save    | `penguin_paradise_save`        | JSON with full game state            |

### Cloud-Side (Firebase Firestore)

- **Collection**: `gameSaves`
- **Document ID**: `{uid}` (Firebase Auth UID)
- **Fields**: flat key-value pairs mirroring localStorage keys
- **Sync strategy**:
  - On sign-in: `loadFromCloud()` → writes all cloud data to localStorage
  - Every 30 seconds: `saveToCloud()` → uploads all localStorage keys to Firestore
  - On high score/farm save: debounced (2s) cloud save via `localStorage.setItem` override
- **Security**: Firestore rules must enforce `request.auth.uid == userId` per document

## Data Flow

```
User plays game
    → Game writes to localStorage (setItem)
    → Overridden setItem detects high score/farm save
    → Debounced (2s) → saveToCloud() → Firestore

User signs in (Google OAuth)
    → onAuthStateChanged fires
    → loadFromCloud() → reads Firestore → writes localStorage
    → Auto-sync starts (30s interval)

Page refresh
    → localStorage still has data (no cloud needed)
    → If signed in, cloud sync runs in background
```

## Cache-Busting Strategy

- All `<link>` and `<script>` tags include `?v=N` where N is a global version number
- `bump-version.ps1` increments `.cache-version.json` and replaces ALL `?v=OLD` with `?v=NEW` in every `.html` file
- Run after every CSS/JS change before deploying

## SEO Structure

- **Per-game**: unique `<title>`, `<meta name="description">`, OG tags, Twitter cards
- **Hub page**: Schema.org `CollectionPage` + `ItemList` (VideoGame entries) + `FAQPage`
- **Sitemap**: `sitemap.xml` lists all game URLs with priorities
- **Robots**: `robots.txt` allows all crawlers
