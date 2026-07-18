# Product Context — Hriti's Game Hub

## Core Concept

A curated collection of **free, kid-friendly browser games** hosted at **[hritihub.uk](https://hritihub.uk)**. Every game is a self-contained HTML page with a Canvas-based game engine. No downloads, no sign-ups, no payments — click and play instantly.

## Target Audience

- **Primary**: Children aged 5–14 looking for fun, safe browser games
- **Secondary**: Parents seeking free, ad-light online games for their kids
- **Tertiary**: Educators using games as informal learning tools (Word Wizard, Memory Match)

## User Experience Goals

1. **Instant play** — click a game card → game loads and starts immediately
2. **Mobile friendly** — all games work on phones/tablets via touch input
3. **Safe & cozy** — no violent content, no in-app purchases, minimal ads (hidden placeholders)
4. **Progress persistence** — high scores, favorites, and farm saves survive browser closes (localStorage + optional Firebase cloud sync)

## Primary Game Mechanics

| Game             | Genre              | Core Loop                                                                                 |
| ---------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| Penguin Paradise | Pet Care / Fishing | Feed, play with penguin → catch fish → earn coins → buy accessories → unlock sanctuaries  |
| Bubble Pop       | Arcade             | Pop matching-color bubbles → build combos → survive with lives → climb 10 levels          |
| Memory Match     | Puzzle             | Flip cards → find matching pairs → beat par time → unlock 3 themes                        |
| Dart Dash        | Precision          | Click moving targets → hit bonus balloons → maintain streak → 10 levels                   |
| Word Wizard      | Word               | Unscramble letters → spell words → use hints → earn streak bonuses → 10 levels            |
| Puzzle Path      | Maze               | Navigate grid mazes → collect stars → avoid obstacles → reach exit → 10 levels            |
| Pet Rescue       | Clicker            | Click animals to rescue → build combos → heal them → complete timed rounds → 10 levels    |
| Space Blaster    | Shooter            | Shoot aliens/asteroids → dodge bullets → collect power-ups → fight bosses → endless waves |
| Race Rush        | Racing             | Steer car → dodge traffic → collect coins → activate power-ups → endless                  |
| Farm Friends     | Farming            | Plant crops → wait for growth → harvest → sell → buy animals → expand farm                |
| Ninja Jump       | Platformer         | Jump between platforms → climb vertically → collect stars → endless (parked)              |

## Design Tenets

- **No login wall** — auth is optional, games work fully without signing in
- **Cloud saves are additive** — Firebase syncs on top of localStorage, never replaces it
- **Progress over perfection** — games should be fun and playable first, polished second
- **One page per game** — each game is fully self-contained (HTML+CSS+JS), linked from the hub
