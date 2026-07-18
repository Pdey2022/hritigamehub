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

// ===== Init =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
} else {
    initFirebase();
}
