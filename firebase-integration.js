/* ============================================
   FIREBASE INTEGRATION — Auth + Cloud Saves
   ============================================
   Load this AFTER firebase-config.js
   ============================================ */

// ===== Firebase Init =====
let firebaseApp = null;
let auth = null;
let firestore = null;
let currentUser = null;
let cloudSyncTimer = null;

function initFirebase() {
    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        firestore = firebase.firestore();
        
        // Enable offline persistence (works even without internet)
        firestore.enablePersistence().catch(() => {});
        
        // Listen for auth state changes
        auth.onAuthStateChanged(user => {
            currentUser = user;
            updateAuthUI();
            if (user) {
                // User just signed in — load cloud data
                loadFromCloud();
                // Start auto-sync every 30 seconds
                startCloudSync();
            } else {
                stopCloudSync();
            }
        });
        
        console.log('🔥 Firebase initialized');
    } catch(e) {
        console.warn('Firebase not configured yet — cloud saves disabled');
    }
}

// ===== Auth UI =====
function updateAuthUI() {
    const container = document.getElementById('auth-container');
    if (!container) return;
    
    if (currentUser) {
        container.innerHTML = `
            <div class="auth-bar">
                <span class="auth-avatar">${currentUser.photoURL ? '<img src="' + currentUser.photoURL + '" class="auth-pic">' : '👤'}</span>
                <button class="auth-btn auth-logout" onclick="signOutUser()">Sign Out</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="auth-bar">
                <button class="auth-btn auth-google" onclick="signInGoogle()">
                    <span class="auth-google-icon">G</span>
                    Sign in
                </button>
            </div>
        `;
    }
}

// Sign in with Google
window.signInGoogle = function() {
    if (!auth) { alert('Firebase not configured yet! See firebase-config.js'); return; }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        if (err.code === 'auth/popup-blocked') {
            auth.signInWithRedirect(provider);
        }
    });
};

// Sign out
window.signOutUser = function() {
    if (auth) auth.signOut();
};

// ===== Cloud Sync =====
function getUserId() {
    return currentUser ? currentUser.uid : null;
}

// Save all localStorage data to Firestore
async function saveToCloud() {
    const uid = getUserId();
    if (!uid || !firestore) return;
    
    try {
        // Collect all game data from localStorage
        const keys = [
            'hub_favs', 'hub_recent',
            'bubblepop_high', 'bp_muted',
            'dd_high', 'dd_muted',
            'mm_high', 'mm_muted',
            'nj_high', 'nj_height', 'nj_muted',
            'pp_best', 'pp_muted',
            'pr_best', 'pr_muted',
            'rr_high', 'rr_muted',
            'sb_high', 'sb_muted',
            'ww_best', 'ww_muted',
            'ff_save', 'ff_muted'
        ];
        
        const data = {};
        keys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val !== null) data[key] = val;
        });
        data._lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
        
        // Save to Firestore
        await firestore.collection('gameSaves').doc(uid).set(data);
        
        // Update sync status
        const status = document.getElementById('sync-status');
        if (status) {
            status.textContent = '☁️ Saved';
            status.className = 'sync-ok';
            setTimeout(() => { if (status) status.textContent = ''; }, 2000);
        }
    } catch(e) {
        console.warn('Cloud save failed:', e);
    }
}

// Load all data from Firestore into localStorage
async function loadFromCloud() {
    const uid = getUserId();
    if (!uid || !firestore) return;
    
    try {
        const doc = await firestore.collection('gameSaves').doc(uid).get();
        if (!doc.exists) {
            // First time — upload current localStorage
            saveToCloud();
            return;
        }
        
        const data = doc.data();
        let count = 0;
        Object.keys(data).forEach(key => {
            if (key === '_lastUpdated') return;
            localStorage.setItem(key, data[key]);
            count++;
        });
        
        console.log(`☁️ Restored ${count} items from cloud`);
        
        // Refresh UI
        if (window.renderFavs) window.renderFavs();
        if (window.renderRecent) window.renderRecent();
        
        // Show restore notification
        const status = document.getElementById('sync-status');
        if (status) {
            status.textContent = `☁️ Restored ${count} saved items!`;
            status.className = 'sync-ok';
            setTimeout(() => { if (status) status.textContent = ''; }, 3000);
        }
    } catch(e) {
        console.warn('Cloud load failed:', e);
    }
}

// Auto-sync timer
function startCloudSync() {
    stopCloudSync();
    cloudSyncTimer = setInterval(saveToCloud, 30000); // every 30 seconds
}

function stopCloudSync() {
    if (cloudSyncTimer) {
        clearInterval(cloudSyncTimer);
        cloudSyncTimer = null;
    }
}

// ===== Override game save functions to also sync to cloud =====
// Intercept localStorage.setItem to trigger cloud sync
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.call(localStorage, key, value);
    // If user is logged in, trigger cloud sync (debounced)
    if (currentUser && 
        (key.endsWith('_high') || key.endsWith('_best') || key === 'ff_save' || key === 'hub_favs')) {
        debouncedCloudSave();
    }
};

// Debounce cloud saves to avoid too many writes
let debounceTimer = null;
function debouncedCloudSave() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveToCloud, 2000);
}

// ===== Share Score =====
window.shareScore = function(gameName, score, url) {
    const text = `🎮 I scored ${score.toLocaleString()} in ${gameName}! Can you beat me? Play at Hriti's Game Hub 🚀`;
    if (navigator.share) {
        navigator.share({ title: gameName, text, url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showToast('📋 Score copied! Share it with your friends.');
        }).catch(() => {
            prompt('Copy this link to share:', text);
        });
    }
};

// ===== Leaderboard =====
async function saveScore(gameId, score) {
    if (!currentUser || !firestore) return;
    try {
        await firestore.collection('leaderboard').add({
            gameId,
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Anonymous',
            photoURL: currentUser.photoURL || '',
            score: Math.floor(score),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) {
        console.warn('Leaderboard save failed:', e);
    }
}

async function getLeaderboard(gameId, limit = 10) {
    if (!firestore) return [];
    try {
        const snapshot = await firestore.collection('leaderboard')
            .where('gameId', '==', gameId)
            .orderBy('score', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) {
        console.warn('Leaderboard fetch failed (may need index):', e);
        // Fallback: fetch all and sort client-side
        try {
            const all = await firestore.collection('leaderboard')
                .where('gameId', '==', gameId)
                .get();
            const entries = all.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            entries.sort((a, b) => (b.score || 0) - (a.score || 0));
            return entries.slice(0, limit);
        } catch(e2) {
            console.warn('Leaderboard fallback also failed:', e2);
            return [];
        }
    }
}

// Render leaderboard into a container element
window.renderLeaderboard = async function(gameId, containerId, gameName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="lb-loading">🏆 Loading scores...</div>';
    
    const entries = await getLeaderboard(gameId);
    
    if (!entries.length) {
        container.innerHTML = `
            <div class="lb-empty">
                <div class="lb-empty-icon">🏆</div>
                <div class="lb-empty-text">No scores yet!<br>Sign in and play to top the leaderboard.</div>
            </div>
        `;
        return;
    }
    
    let html = '<div class="lb-list">';
    entries.forEach((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const avatar = entry.photoURL
            ? `<img src="${entry.photoURL}" class="lb-avatar">`
            : '<span class="lb-avatar-placeholder">👤</span>';
        html += `
            <div class="lb-row ${i === 0 ? 'lb-gold' : ''}">
                <span class="lb-rank">${medal}</span>
                ${avatar}
                <span class="lb-name">${escapeHtml(entry.displayName || 'Anonymous')}</span>
                <span class="lb-score">${(entry.score || 0).toLocaleString()}</span>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

// Simple escape for display names
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Toast Notification (for game pages) =====
function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// ===== Init =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
} else {
    initFirebase();
}
