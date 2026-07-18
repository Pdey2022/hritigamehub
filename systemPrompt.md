# System Prompt — Hriti's Game Hub

## Tech Stack (Strict)

- **Hosting**: GitHub Pages + Cloudflare DNS (custom domain: `hritihub.uk`)
- **Language**: Vanilla JavaScript (ES6+) — **NO frameworks** (no React, Vue, Angular, Svelte)
- **Rendering**: Canvas 2D API (`<canvas>`) for all games
- **Audio**: Web Audio API — procedural sound generation only, no audio files
- **CSS**: Pure CSS3 — **NO preprocessors** (no Sass, Less, PostCSS)
- **Fonts**: Google Fonts — Fredoka (all games & hub)
- **Persistence**: `localStorage` for client-side saves, Firebase v9 (compat CDN) for auth + cloud sync
- **No package.json, no bundler, no build step** — all files served as-is from GitHub Pages

## Code Formatting

- Indentation: **2 spaces** (not tabs)
- Quotes: **single quotes** for JS strings
- Semicolons: **required** at end of every statement
- Line length: keep under 100 chars where practical
- Variable naming: `camelCase` for JS variables/functions, `kebab-case` for CSS classes/IDs
- Constants: `SCREAMING_SNAKE_CASE` for global constants (e.g., `ENEMY_TYPES`, `CROPS`)
- Always wrap IIFE for landing page scripts to avoid polluting global scope

## Style Guidelines

- **Frosted glass** aesthetic: `background: rgba(255,255,255,0.6); backdrop-filter: blur(8px);`
- **Canvas games**: 500px wide, responsive scaling with `devicePixelRatio`
- **Game cards**: rounded corners (14–20px), soft shadows, gradient backgrounds
- **Animations**: subtle and purposeful (fadeIn, float, waddle, pulse, shake)
- **Mobile**: all games must support touch via `touchstart`/`touchend` event handlers on the canvas
- **Colors**: playful, pastel-leaning palette (`#2c3e50` text, soft blues/greens/purples for accents)
- **Responsive**: use `max-width`, `flex-wrap`, and `@media` queries — no horizontal scrollbars

## Constraints

- **Do NOT** add any framework, library, or external dependency without explicit approval
- **Do NOT** use import/export (ES modules) — all scripts are global via `<script>` tags
- **Do NOT** modify `firebase-config.js` values — they are the user's live project credentials
- **Do NOT** remove the `?v=N` cache-busting query param from any CSS/JS link
- **Cache-busting**: after changing any CSS/JS, run `.\bump-version.ps1` to increment version
- **Every game** must have its own folder: `games/<game-name>/index.html`, `js/game.js`, `css/game-name.css`
- **Every game** must include: OG tags, Schema.org JSON-LD, SEO meta description, cache-busted CSS/JS links
- **Landing page** (`index.html`) is the single entry point — no SPA routing
- **About Me page** at `/about/` — create a directory with `index.html` when implementing
