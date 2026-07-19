/* ============================================
   LEADERBOARD MODULE — Global Scoreboard + Share
   ============================================
   Provides: saveScore(gameId, score)
             renderLeaderboard(gameId, containerId, gameName)
             shareScore(gameName, score)

   Requires: Firebase SDK (app, auth, firestore compat)
             firebase-config.js, firebase-integration.js
   ============================================ */

(function () {
  'use strict';

  // Wait for Firebase to initialize (firebase-integration sets up auth/firestore)
  function getFirestore() {
    if (typeof firestore !== 'undefined' && firestore) return firestore;
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      return firebase.firestore();
    }
    return null;
  }

  function getCurrentUser() {
    if (typeof currentUser !== 'undefined' && currentUser) return currentUser;
    if (typeof auth !== 'undefined' && auth && auth.currentUser) return auth.currentUser;
    return null;
  }

  // ===== SAVE SCORE TO FIRESTORE =====
  // Called by game JS on game-over
  window.saveScore = async function (gameId, score) {
    if (!score || score <= 0) return;
    const db = getFirestore();
    const user = getCurrentUser();
    if (!db) { console.warn('Leaderboard: Firestore not available'); return; }
    if (!user) { console.log('Leaderboard: Not signed in — score saved locally only'); return; }

    try {
      const userId = user.uid;
      const displayName = user.displayName || user.email || 'Player';
      const photoURL = user.photoURL || '';

      const docRef = db.collection('leaderboards').doc(gameId).collection('scores').doc(userId);
      const existing = await docRef.get();

      if (!existing.exists || (existing.data() && score > existing.data().score)) {
        await docRef.set({
          score: score,
          playerName: displayName,
          photoURL: photoURL,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('🏆 Score saved to leaderboard:', gameId, score);
      }
    } catch (e) {
      console.warn('Leaderboard save failed:', e.message);
    }
  };

  // ===== RENDER LEADERBOARD =====
  // Called on page load and after game-over
  window.renderLeaderboard = async function (gameId, containerId, gameName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const db = getFirestore();
    if (!db) {
      container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">🔌</div><div class="lb-empty-text">Leaderboard coming soon!</div></div>';
      return;
    }

    try {
      const snapshot = await db.collection('leaderboards').doc(gameId).collection('scores')
        .orderBy('score', 'desc')
        .limit(10)
        .get();

      if (snapshot.empty) {
        container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">🏆</div><div class="lb-empty-text">No scores yet — be the first!</div></div>';
        return;
      }

      const user = getCurrentUser();
      const currentUid = user ? user.uid : null;

      let html = '<div class="lb-list">';
      let rank = 0;
      let lastScore = -1;

      snapshot.forEach(function (doc) {
        const data = doc.data();
        if (data.score !== lastScore) rank++;
        lastScore = data.score;

        const isMe = currentUid && doc.id === currentUid;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

        html += '<div class="lb-row' + (isMe ? ' lb-me' : '') + '">' +
          '<span class="lb-rank">' + (medal || '#' + rank) + '</span>' +
          '<span class="lb-avatar">' + (data.photoURL ? '<img src="' + data.photoURL + '" class="lb-pic" alt="">' : '👤') + '</span>' +
          '<span class="lb-name">' + escapeHtml(data.playerName || 'Player') + '</span>' +
          '<span class="lb-score">' + (data.score || 0).toLocaleString() + '</span>' +
          '</div>';
      });

      html += '</div>';
      container.innerHTML = html;
    } catch (e) {
      console.warn('Leaderboard render failed:', e.message);
      container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">⚠️</div><div class="lb-empty-text">Couldn\'t load scores. Try again!</div></div>';
    }
  };

  // ===== SHARE SCORE =====
  window.shareScore = function (gameName, score) {
    const text = '🎮 I scored ' + (score || 0).toLocaleString() + ' points in ' + gameName + ' on Hriti\'s Game Hub! Can you beat my score? Play for free at hritihub.uk';
    const url = 'https://hritihub.uk';

    if (navigator.share) {
      navigator.share({ title: gameName + ' — Hriti\'s Game Hub', text: text, url: url }).catch(function () {});
    } else {
      navigator.clipboard.writeText(text).then(function () {
        alert('📋 Score copied! Share with your friends!');
      }).catch(function () {
        prompt('Copy this to share:', text);
      });
    }
  };

  // ===== HOOK SHARE BUTTONS =====
  // Auto-detect share buttons and wire them up
  function hookShareButtons() {
    document.querySelectorAll('.share-btn').forEach(function (btn) {
      if (btn.dataset.hooked) return;
      btn.dataset.hooked = '1';
      btn.addEventListener('click', function () {
        // Try to find the current score from localStorage
        const path = window.location.pathname;
        const gameSlug = path.split('/').filter(Boolean).pop() || 'game';
        const keys = [
          gameSlug.replace(/-/g, '') + '_high',
          gameSlug.replace(/-/g, '') + '_best',
          gameSlug.replace(/-/g, '') + '-high',
          gameSlug.replace(/-/g, '') + '-best'
        ];
        let bestScore = 0;
        for (let i = 0; i < keys.length; i++) {
          const val = localStorage.getItem(keys[i]);
          if (val) { bestScore = Math.max(bestScore, parseInt(val) || 0); }
        }
        // Also check common patterns with underscores replaced
        const altKey = gameSlug.replace(/-/g, '_') + '_high';
        const altVal = localStorage.getItem(altKey);
        if (altVal) bestScore = Math.max(bestScore, parseInt(altVal) || 0);

        const titleEl = document.querySelector('title');
        const gameName = titleEl ? titleEl.textContent.split(' — ')[0].replace(/^[^\s]+\s/, '') : gameSlug;
        window.shareScore(gameName, bestScore);
      });
    });
  }

  // ===== AUTO-INIT ON PAGE LOAD =====
  function init() {
    hookShareButtons();

    // Auto-render leaderboard from the page's existing lb container
    // Look for a div with id like "lb-xx-content"
    const lbContainers = document.querySelectorAll('[id^="lb-"][id$="-content"]');
    lbContainers.forEach(function (container) {
      // Extract game ID from container ID: "lb-dd-content" → "dd" (not enough info)
      // Instead, derive from URL path
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);
      const gameSlug = parts[parts.length - 1] || '';

      if (!gameSlug) return;

      // Map slug to game ID used in saveScore calls
      const gameId = gameSlug; // Most games use the slug directly

      const titleEl = document.querySelector('title');
      const gameName = titleEl ? titleEl.textContent.split(' — ')[0].replace(/^[^\s]+\s/, '') : gameSlug;

      window.renderLeaderboard(gameId, container.id, gameName);
    });
  }

  // Run after a short delay to ensure Firebase is initialized
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 500);
    });
  } else {
    setTimeout(init, 500);
  }

  // Helper
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
