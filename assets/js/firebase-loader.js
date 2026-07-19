/* ============================================
   FIREBASE LOADER — Dynamically loads Firebase SDK
   Include this on game pages to enable auth + leaderboards
   ============================================ */
(function () {
  'use strict';

  // Already loaded?
  if (window.__fbLoaderDone) return;
  window.__fbLoaderDone = true;

  var baseUrl = 'https://www.gstatic.com/firebasejs/10.12.0/';
  var scripts = [
    baseUrl + 'firebase-app-compat.js',
    baseUrl + 'firebase-auth-compat.js',
    baseUrl + 'firebase-firestore-compat.js'
  ];
  var localScripts = [
    '/firebase-config.js',
    '/firebase-integration.js',
    '/assets/js/leaderboard.js?v=1'
  ];

  function loadScript(src, isLocal) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        if (isLocal) {
          console.warn('FB-Loader: Failed to load', src, '(leaderboard disabled)');
        }
        resolve(); // Continue even if some scripts fail
      };
      document.head.appendChild(s);
    });
  }

  // Load Firebase CDN first, then local configs
  var chain = Promise.resolve();
  scripts.forEach(function (src) {
    chain = chain.then(function () { return loadScript(src, false); });
  });
  chain = chain.then(function () {
    return loadScript(localScripts[0], true);
  }).then(function () {
    return loadScript(localScripts[1], true);
  }).then(function () {
    return loadScript(localScripts[2], true);
  });
})();
