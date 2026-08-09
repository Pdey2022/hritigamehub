/* ============================================
   ANNOUNCEMENT BAR — thin bar under the header
   Alerts ALL visitors to new games & features
   on the landing page. Data from games.json
   (auto new-game detection) + announcements.json.
   ============================================ */
(function() {
  'use strict';

  // Show the bar to ALL visitors. Set to false to show only to signed-in users.
  const SHOW_TO_ALL = true;
  // Days a newly released game is announced after its release date
  const NEW_GAME_DAYS = 15;
  // Polls while we wait for Firebase auth to settle (async)
  const MAX_AUTH_POLLS = 12;
  const AUTH_POLL_MS = 400;

  const DISMISS_KEY = 'hb_dismissed_announcements';
  const dismissed = new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'));

  let barVisible = false;
  let currentBar = null;

  function isSignedIn() {
    return typeof currentUser !== 'undefined' && !!currentUser;
  }

  function saveDismissed() {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(dismissed)));
  }

  function daysSince(isoDate) {
    return (Date.now() - new Date(isoDate + 'T00:00:00').getTime()) / 86400000;
  }

  async function gather() {
    const items = [];

    // 1) Auto: new games released within the window
    try {
      const games = await (await fetch('/games.json', { cache: 'no-cache' })).json();
      (games || []).forEach(g => {
        if (g.status !== 'live' || !g.released) return;
        const age = daysSince(g.released);
        if (age >= 0 && age <= NEW_GAME_DAYS) {
          items.push({ id: 'game:' + g.id, icon: '🆕', text: 'New game: ' + g.title, url: g.url, cta: 'Play now →' });
        }
      });
    } catch (e) { /* games.json unavailable */ }

    // 2) Manual: feature / function announcements
    try {
      const manual = await (await fetch('/announcements.json', { cache: 'no-cache' })).json();
      (manual || []).forEach(a => {
        if (!a.id || a.active === false) return;
        const startOk = !a.startDate || Date.now() >= new Date(a.startDate + 'T00:00:00').getTime();
        const endOk = !a.endDate || Date.now() <= new Date(a.endDate + 'T23:59:59').getTime();
        if (startOk && endOk) {
          items.push({ id: 'manual:' + a.id, icon: a.icon || '✨', text: a.message, url: a.url, cta: a.cta || 'Check it out →' });
        }
      });
    } catch (e) { /* announcements.json unavailable */ }

    return items.filter(i => !dismissed.has(i.id));
  }

  function buildBar(items) {
    const bar = document.createElement('div');
    bar.className = 'announce-bar';

    const inner = document.createElement('div');
    inner.className = 'announce-bar-inner';
    inner.innerHTML = '<span class="announce-label">📢</span>' + items.map(i => {
      const open = i.url ? '<a class="announce-item" href="' + i.url + '">' : '<span class="announce-item">';
      const close = i.url ? '</a>' : '</span>';
      return open +
        '<span class="announce-icon">' + i.icon + '</span>' +
        '<span class="announce-text">' + i.text + '</span>' +
        (i.url ? '<span class="announce-cta">' + i.cta + '</span>' : '') +
        close;
    }).join('');
    bar.appendChild(inner);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'announce-close';
    closeBtn.setAttribute('aria-label', 'Dismiss announcements');
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => {
      items.forEach(i => dismissed.add(i.id));
      saveDismissed();
      bar.classList.add('announce-bar-hiding');
      setTimeout(() => {
        bar.remove();
        if (currentBar === bar) currentBar = null;
        barVisible = false;
      }, 350);
    });
    bar.appendChild(closeBtn);
    return bar;
  }

  function inject(bar) {
    const nav = document.querySelector('.top-nav');
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(bar, nav.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  async function maybeShow() {
    if (barVisible) return;
    if (!SHOW_TO_ALL && !isSignedIn()) return;
    const items = await gather();
    if (!items.length) return;
    barVisible = true;
    currentBar = buildBar(items);
    inject(currentBar);
    // Smooth entrance via rAF when available, with a timeout fallback so the bar
    // always appears even if rAF is throttled (background/hidden tabs).
    requestAnimationFrame(function() {
      if (currentBar) currentBar.classList.add('announce-bar-show');
    });
    setTimeout(function() {
      if (currentBar) currentBar.classList.add('announce-bar-show');
    }, 60);
  }

  function hideBar() {
    if (currentBar) { currentBar.remove(); currentBar = null; }
    barVisible = false;
  }

  // Live updates on sign in/out
  window.addEventListener('auth-state-change', () => {
    if (!SHOW_TO_ALL && !isSignedIn()) { hideBar(); return; }
    maybeShow();
  });

  function init() {
    if (SHOW_TO_ALL) {
      // Public bar — show immediately, no need to wait for auth
      maybeShow();
      return;
    }
    // Logged-in only: wait for Firebase auth to settle, then show if eligible
    let poll = 0;
    (function waitForAuth() {
      if (typeof currentUser !== 'undefined') {
        maybeShow();
      } else if (poll++ < MAX_AUTH_POLLS) {
        setTimeout(waitForAuth, AUTH_POLL_MS);
      }
    })();
  }

  init();
})();
