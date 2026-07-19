// Shared site footer — injected on every game page
(function() {
  const footer = document.createElement('footer');
  footer.className = 'landing-footer';
  footer.innerHTML =
    '<div class="footer-top">' +
      '<div class="footer-brand">' +
        '<span class="footer-logo">🌟 Hriti\'s HUB</span>' +
        '<p class="footer-tagline">Safe, fun, and free online games for kids!</p>' +
      '</div>' +
      '<div class="footer-links-col">' +
        '<a href="/" class="footer-link">🏠 Home</a>' +
        '<a href="/about/" class="footer-link">📖 About</a>' +
        '<a href="/sitemap.xml" class="footer-link">🗺️ Sitemap</a>' +
        '<a href="/#game-grid" class="footer-link">🎮 All Games</a>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '<p>Made with 💕 for Hriti &nbsp;|&nbsp; 🌟 v2.0</p>' +
      '<p>🎮 Free online games for kids — no download, just play!</p>' +
    '</div>';
  document.body.appendChild(footer);
})();
