/* ============================================
   PENGUIN PARADISE — Sanctuary Module
   ============================================
   Handles pet care dashboard, shop UI refresh,
   wardrobe management, and sanctuary-specific
   interactions.
*/

// Sanctuary initialization — called after main.js sets up the game
function initSanctuary() {
    // Set up any sanctuary-specific event listeners or animations
    setupSanctuaryAnimations();
}

// Add subtle ambient animations to the sanctuary
function setupSanctuaryAnimations() {
    // Floating sparkles around the penguin area
    setInterval(() => {
        if (!gameState.hasUnlockedSanctuary) return;
        const panel = document.querySelector('.avatar-panel');
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        // Occasionally spawn a tiny sparkle
        if (Math.random() < 0.3) {
            spawnParticles(
                rect.left + 30 + Math.random() * (rect.width - 60),
                rect.top + 20 + Math.random() * (rect.height - 40),
                Math.random() < 0.5 ? '#a8e6ff' : '#ffd700',
                2
            );
        }
    }, 4000);
}

// Refresh the sanctuary UI (called after any state change)
function refreshSanctuary() {
    if (!gameState.hasUnlockedSanctuary) return;
    renderShop();
    renderCloset();
    updateUI();
    updateAccessory();
}

// Update mood speech whenever happiness/hunger changes
function triggerMoodSpeech() {
    if (typeof updateSpeechByMood === 'function') {
        updateSpeechByMood();
    }
}

// Listen for shop tab visibility to lazy-render
document.addEventListener('DOMContentLoaded', () => {
    // Extra initial render safety
    setTimeout(() => {
        if (gameState.hasUnlockedSanctuary) {
            renderShop();
            renderCloset();
        }
    }, 100);
});
