// ==================== GLOBAL VARIABLES ====================
let db = null;
let barcodeConfig = {
    flexLength: 2,
    flexValue: '11',
    productLength: 6,
    weightLength: 5
};
let receiptConfig = {
    paperWidth: 32,
    header: "TOKO LOKABUMBU\nTAN KES \n PURB\nTelp: 082",
    footer: "Terima kasih\nSelamat berbelanja kembali\nDelivery Order Via WhatsApp 082",
    showDateTime: true,
    showTransactionNumber: true,
    showCashier: false
};
let kasirCategories = [];
let kasirItems = [];
let kasirSatuan = [];
let customers = [];
let suppliers = [];
let pendingTransactions = [];
let users = [];
let roles = [];
let bundles = [];
let currentUser = null;

// Instance Chart.js untuk grafik (hanya digunakan di index.html)
let salesChartInstance = null;

// Daftar semua menu yang tersedia (untuk permission)
const ALL_MENUS = [
    { id: 'menu-master', label: 'Master Data' },
    { id: 'menu-transaksi', label: 'Transaksi' },
    { id: 'menu-pembelian', label: 'Pembelian' },
    { id: 'menu-inventory', label: 'Inventory' },
    { id: 'menu-cust', label: 'Cust & Supl' },
    { id: 'menu-laporan', label: 'Laporan' },
    { id: 'menu-sistem', label: 'Sistem' },
    { id: 'menu-bundle', label: 'Bundle' }
];

const icons = {
    edit: `<svg class="icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    delete: `<svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    add: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    upload: `<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    download: `<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
};

// ==================== FUNGSI UNTUK SUBMENU SIDEBAR ====================
function toggleSubMenu(header) {
    const subMenu = header.nextElementSibling;
    if (subMenu && subMenu.classList.contains('sub-menu')) {
        document.querySelectorAll('.sub-menu').forEach(sm => sm.style.display = 'none');
        document.querySelectorAll('.menu-header').forEach(h => h.classList.remove('open'));
        if (subMenu.style.display !== 'block') {
            subMenu.style.display = 'block';
            header.classList.add('open');
        } else {
            subMenu.style.display = 'none';
        }
    }
}

function closeSubMenu(button) {
    const subMenu = button.closest('.sub-menu');
    if (subMenu) {
        subMenu.style.display = 'none';
        const header = subMenu.previousElementSibling;
        if (header && header.classList.contains('menu-header')) {
            header.classList.remove('open');
        }
    }
}

function closeDrawer() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('drawer-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.querySelectorAll('.sub-menu').forEach(sm => sm.style.display = 'none');
    document.querySelectorAll('.menu-header').forEach(h => h.classList.remove('open'));
}

function toggleDrawer() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('drawer-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }
}

// ==================== AUDIO NOTIFICATION SYSTEM ====================
let audioContext = null;
let audioInitialized = false;

function initAudioSystem() {
    if (audioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioInitialized = true;
        console.log("Audio system initialized");
        createFallbackSounds();
    } catch (error) {
        console.log("AudioContext not supported, using fallback:", error);
        createFallbackSounds();
    }
}

function createFallbackSounds() {
    const successAudio = document.getElementById('notification-success');
    if (successAudio) successAudio.src = createBeepSound(800, 0.3);
    const warningAudio = document.getElementById('notification-warning');
    if (warningAudio) warningAudio.src = createBeepSound(600, 0.2);
    const errorAudio = document.getElementById('notification-error');
    if (errorAudio) errorAudio.src = createBeepSound(400, 0.5);
    const buttonClickAudio = document.getElementById('button-click-sound');
    if (buttonClickAudio) buttonClickAudio.src = createBeepSound(600, 0.1);
}

function createBeepSound(frequency, duration) {
    const sampleRate = 44100;
    const channels = 1;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples * 2, true);
    const amplitude = 0.3;
    for (let i = 0; i < samples; i++) {
        const time = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * frequency * time) * amplitude;
        const intSample = Math.max(-1, Math.min(1, sample)) * 32767;
        view.setInt16(44 + i * 2, intSample, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
}

function playClickSound() {
    try {
        if (!audioInitialized) initAudioSystem();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        if (audioContext && audioContext.state === 'running') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } else {
            const buttonClickAudio = document.getElementById('button-click-sound');
            if (buttonClickAudio) {
                buttonClickAudio.currentTime = 0;
                buttonClickAudio.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    } catch (error) { console.log("Click sound play failed:", error); }
}

function playSuccessSound() {
    try {
        if (!audioInitialized) initAudioSystem();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        if (audioContext && audioContext.state === 'running') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } else {
            const successAudio = document.getElementById('notification-success');
            if (successAudio) {
                successAudio.currentTime = 0;
                successAudio.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    } catch (error) { console.log("Sound play failed:", error); }
}

function playWarningSound() {
    try {
        if (!audioInitialized) initAudioSystem();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        if (audioContext && audioContext.state === 'running') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.35);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } else {
            const warningAudio = document.getElementById('notification-warning');
            if (warningAudio) {
                warningAudio.currentTime = 0;
                warningAudio.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    } catch (error) { console.log("Warning sound failed:", error); }
}

function playErrorSound() {
    try {
        if (!audioInitialized) initAudioSystem();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        if (audioContext && audioContext.state === 'running') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 400;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.6);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } else {
            const errorAudio = document.getElementById('notification-error');
            if (errorAudio) {
                errorAudio.currentTime = 0;
                errorAudio.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    } catch (error) { console.log("Error sound failed:", error); }
}

document.addEventListener('click', function initAudioOnInteraction() {
    if (!audioInitialized) {
        initAudioSystem();
        document.removeEventListener('click', initAudioOnInteraction);
    }
}, { once: true });

// ==================== LOADING STATE FUNCTIONS (DIHAPUS) ====================
function showLoading() {
    // Tidak melakukan apa-apa karena loading overlay sudah dihapus
    console.log('showLoading dipanggil (no operation)');
}

function hideLoading() {
    // Tidak melakukan apa-apa
    console.log('hideLoading dipanggil (no operation)');
}

function showError(message) {
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const mainContent = document.querySelector('.main-content');
    if (errorState && errorMessage) {
        errorMessage.textContent = message;
        errorState.style.display = 'block';
    }
    if (mainContent) mainContent.style.display = 'none';
}

function hideError() {
    const errorState = document.getElementById('error-state');
    const mainContent = document.querySelector('.main-content');
    if (errorState) errorState.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
}

// ==================== DATABASE CONFIGURATION ====================
const DB_NAME = 'POSKasirDB';
const DB_VERSION = 20;
const STORES = {
    SETTINGS: 'settings',
    APP_STATE: 'appState',
    KASIR_CATEGORIES: 'kasirCategories',
    KASIR_ITEMS: 'kasirItems',
    KASIR_SATUAN: 'kasirSatuan',
    CUSTOMERS: 'customers',
    SUPPLIERS: 'suppliers',
    PENDING_TRANSACTIONS: 'pendingTransactions',
    SALES: 'sales',
    PURCHASES: 'purchases',
    USERS: 'users',
    ROLES: 'roles',
    BUNDLES: 'bundles'
};

// ==================== DATABASE FUNCTIONS ====================
async function initDatabase() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            const error = "Browser tidak mendukung IndexedDB. Gunakan Chrome, Edge, atau Firefox versi terbaru.";
            console.error(error);
            showError(error);
            reject(new Error(error));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            showError('Gagal membuka database: ' + event.target.error);
            reject(event.target.error);
        };
        request.onblocked = () => {
            console.warn('Database blocked. Tutup tab lain yang menggunakan aplikasi ini.');
            showError('Database diblokir. Tutup tab lain dan refresh halaman.');
            reject(new Error('Database blocked'));
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            db.onerror = (event) => {
                console.error('Database error:', event.target.error);
                showNotification('Error database: ' + event.target.error, 'error');
            };
            db.onversionchange = (event) => {
                console.log('Database version changed, closing...');
                db.close();
                showNotification('Database diperbarui, silakan refresh halaman.', 'info');
            };
            console.log('Database initialized successfully');
            resolve();
        };
        request.onupgradeneeded = (event) => {
            console.log('Upgrading database from version', event.oldVersion, 'to', event.newVersion);
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
                db.createObjectStore(STORES.APP_STATE, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(STORES.KASIR_CATEGORIES)) {
                const kasirCatStore = db.createObjectStore(STORES.KASIR_CATEGORIES, { keyPath: 'id', autoIncrement: true });
                kasirCatStore.createIndex('name', 'name', { unique: true });
            }
            if (!db.objectStoreNames.contains(STORES.KASIR_ITEMS)) {
                const kasirItemStore = db.createObjectStore(STORES.KASIR_ITEMS, { keyPath: 'id', autoIncrement: true });
                kasirItemStore.createIndex('code', 'code', { unique: true });
                kasirItemStore.createIndex('categoryId', 'categoryId', { unique: false });
            } else {
                const transaction = event.target.transaction;
                const store = transaction.objectStore(STORES.KASIR_ITEMS);
                store.openCursor().onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        const item = cursor.value;
                        if (item.minStock === undefined) {
                            item.minStock = 5;
                            cursor.update(item);
                        }
                        cursor.continue();
                    }
                };
            }
            if (!db.objectStoreNames.contains(STORES.KASIR_SATUAN)) {
                const satuanStore = db.createObjectStore(STORES.KASIR_SATUAN, { keyPath: 'id', autoIncrement: true });
                satuanStore.createIndex('name', 'name', { unique: true });
            }
            if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
                const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id', autoIncrement: true });
                customerStore.createIndex('name', 'name', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
                const supplierStore = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id', autoIncrement: true });
                supplierStore.createIndex('name', 'name', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.PENDING_TRANSACTIONS)) {
                const pendingStore = db.createObjectStore(STORES.PENDING_TRANSACTIONS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.SALES)) {
                const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id', autoIncrement: true });
                salesStore.createIndex('date', 'date', { unique: false });
                salesStore.createIndex('transactionNumber', 'transactionNumber', { unique: true });
            }
            if (!db.objectStoreNames.contains(STORES.PURCHASES)) {
                const purchaseStore = db.createObjectStore(STORES.PURCHASES, { keyPath: 'id', autoIncrement: true });
                purchaseStore.createIndex('date', 'date', { unique: false });
                purchaseStore.createIndex('supplierId', 'supplierId', { unique: false });
                purchaseStore.createIndex('purchaseNumber', 'purchaseNumber', { unique: true });
            }
            if (!db.objectStoreNames.contains(STORES.USERS)) {
                const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id', autoIncrement: true });
                userStore.createIndex('username', 'username', { unique: true });
            }
            if (!db.objectStoreNames.contains(STORES.ROLES)) {
                const roleStore = db.createObjectStore(STORES.ROLES, { keyPath: 'id', autoIncrement: true });
                roleStore.createIndex('name', 'name', { unique: true });
            }
            if (!db.objectStoreNames.contains(STORES.BUNDLES)) {
                db.createObjectStore(STORES.BUNDLES, { keyPath: 'id', autoIncrement: true });
            }
            event.target.transaction.oncomplete = () => console.log('Database upgrade completed');
        };
    });
}

async function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) { reject(new Error('Database not initialized')); return; }
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        } catch (error) { reject(error); }
    });
}

async function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) { reject(new Error('Database not initialized')); return; }
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        } catch (error) { reject(error); }
    });
}

async function dbAdd(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) { reject(new Error('Database not initialized')); return; }
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => {
                console.error(`Error adding to ${storeName}:`, data, e.target.error);
                if (e.target.error.name === 'ConstraintError') {
                    reject(new Error(`Data dengan key yang sama sudah ada di ${storeName}`));
                } else { reject(e.target.error); }
            };
        } catch (error) { reject(error); }
    });
}

async function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) { reject(new Error('Database not initialized')); return; }
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        } catch (error) { reject(error); }
    });
}

async function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) { reject(new Error('Database not initialized')); return; }
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.delete(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        } catch (error) { reject(error); }
    });
}

async function dbClear(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) { reject(new Error('Database not initialized')); return; }
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.clear();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        } catch (error) { reject(error); }
    });
}

// ==================== FUNGSI UNTUK USERS DAN ROLES ====================
async function loadUsers() {
    try { users = await dbGetAll(STORES.USERS); } 
    catch (error) { console.error('Error loading users:', error); users = []; }
}

async function loadRoles() {
    try { roles = await dbGetAll(STORES.ROLES); } 
    catch (error) { console.error('Error loading roles:', error); roles = []; }
}

async function hashPassword(password) {
    if (window.crypto && window.crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) { console.warn('Crypto digest failed, using fallback', e); }
    }
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash.toString(16);
}

async function getUserPermissions(user) {
    if (!user || !user.roleId) return [];
    const role = await dbGet(STORES.ROLES, user.roleId);
    return role ? role.permissions : [];
}

// ==================== LOGIN & LOGOUT ====================
function showLoginScreen() {
    const overlay = document.getElementById('login-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    document.getElementById('login-btn').onclick = loginHandler;
    document.getElementById('import-login-btn').onclick = async () => {
        const success = await importData(true);
        if (success) {
            await loadUsers();
            showNotification('Data berhasil diimpor. Silakan login.', 'success');
        }
    };

    if (users.length === 0) {
        let tapCount = 0;
        overlay.addEventListener('click', function tapHandler(e) {
            if (e.target.closest('.login-container')) return;
            tapCount++;
            if (tapCount >= 10) {
                overlay.removeEventListener('click', tapHandler);
                openCreateAdminModal();
            }
        });
    }
}

async function loginHandler() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!username || !password) {
        showNotification('Isi username dan password', 'error');
        return;
    }
    const hashed = await hashPassword(password);
    const user = users.find(u => u.username === username && u.password === hashed);
    if (user) {
        currentUser = user;
        const permissions = await getUserPermissions(user);
        currentUser.permissions = permissions;
        sessionStorage.setItem('currentUser', JSON.stringify({ 
            id: user.id, 
            roleId: user.roleId, 
            name: user.name,
            permissions: permissions 
        }));
        document.getElementById('login-overlay').style.display = 'none';
        updateSidebarByPermissions(permissions);
        document.getElementById('user-name-display').textContent = user.name;
        showNotification(`Selamat datang, ${user.name}`, 'success');
    } else {
        document.getElementById('login-error').style.display = 'block';
        setTimeout(() => document.getElementById('login-error').style.display = 'none', 2000);
    }
}

function logout() {
    if (!confirm('Apakah Anda yakin ingin keluar?')) {
        return;
    }
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    document.getElementById('user-name-display').textContent = '';
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';

    // Jika bukan di index.html, redirect ke index.html
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.location.href = 'index.html';
    } else {
        // Sembunyikan halaman yang mungkin terbuka (di index.html)
        const transaksiPage = document.getElementById('transaksi-page');
        if (transaksiPage) transaksiPage.style.display = 'none';
        const cartPage = document.getElementById('cart-page');
        if (cartPage) cartPage.style.display = 'none';
        const paymentPage = document.getElementById('payment-page');
        if (paymentPage) paymentPage.style.display = 'none';
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.style.display = 'block';
    }
    closeDrawer();
}

function updateSidebarByPermissions(permissions) {
    ALL_MENUS.forEach(menu => {
        const el = document.getElementById(menu.id);
        if (el) el.style.display = 'none';
    });
    permissions.forEach(permId => {
        const el = document.getElementById(permId);
        if (el) el.style.display = 'block';
    });
}

function bypassLogin() {
    currentUser = { id: 'bypass', username: 'owner', roleId: null, name: 'Owner', permissions: ALL_MENUS.map(m => m.id) };
    sessionStorage.setItem('currentUser', JSON.stringify({ id: 'bypass', roleId: null, name: 'Owner', permissions: ALL_MENUS.map(m => m.id) }));
    document.getElementById('login-overlay').style.display = 'none';
    updateSidebarByPermissions(ALL_MENUS.map(m => m.id));
    document.getElementById('user-name-display').textContent = 'Owner';
    showNotification('Mode owner (bypass)', 'info');
}

// ==================== FUNGSI UNTUK ADMIN PERTAMA ====================
function openCreateAdminModal() {
    document.getElementById('create-admin-modal').style.display = 'flex';
}

function closeCreateAdminModal() {
    document.getElementById('create-admin-modal').style.display = 'none';
}

async function saveFirstAdmin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const name = document.getElementById('admin-name').value.trim();
    if (!username || !password || !name) {
        showNotification('Semua field harus diisi', 'error');
        return;
    }
    if (users.some(u => u.username === username)) {
        showNotification('Username sudah digunakan', 'error');
        return;
    }
    const hashed = await hashPassword(password);
    const now = new Date().toISOString();

    let adminRole = roles.find(r => r.name === 'Admin');
    if (!adminRole) {
        adminRole = { name: 'Admin', permissions: ALL_MENUS.map(m => m.id) };
        const roleId = await dbAdd(STORES.ROLES, adminRole);
        adminRole.id = roleId;
        roles.push(adminRole);
    }

    const newUser = {
        username,
        password: hashed,
        roleId: adminRole.id,
        name,
        createdAt: now,
        updatedAt: now
    };
    try {
        showLoading();
        const id = await dbAdd(STORES.USERS, newUser);
        newUser.id = id;
        users.push(newUser);
        showNotification('Admin berhasil dibuat, silakan login', 'success');
        closeCreateAdminModal();
    } catch (error) {
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== FUNGSI SETTINGS MODAL ====================
async function exportData(skipAuth = false) {
    if (!skipAuth && (!currentUser || !currentUser.permissions || !currentUser.permissions.includes('menu-sistem'))) {
        showNotification('Anda tidak memiliki akses ke menu ini', 'error');
        return false;
    }
    try {
        showLoading();
        const exportData = {
            kasirCategories: await dbGetAll(STORES.KASIR_CATEGORIES),
            kasirItems: await dbGetAll(STORES.KASIR_ITEMS),
            kasirSatuan: await dbGetAll(STORES.KASIR_SATUAN),
            customers: await dbGetAll(STORES.CUSTOMERS),
            suppliers: await dbGetAll(STORES.SUPPLIERS),
            pendingTransactions: await dbGetAll(STORES.PENDING_TRANSACTIONS),
            settings: await dbGetAll(STORES.SETTINGS),
            users: await dbGetAll(STORES.USERS),
            roles: await dbGetAll(STORES.ROLES),
            bundles: await dbGetAll(STORES.BUNDLES),
            exportDate: new Date().toISOString(),
            version: DB_VERSION
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileName = `pos-backup-${new Date().toISOString().split('T')[0]}.json`;
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = exportFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Data berhasil dieksport!', 'success');
        return true;
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Gagal mengeksport data: ' + error.message, 'error');
        return false;
    } finally {
        hideLoading();
    }
}

async function importData(skipAuth = false) {
    if (!skipAuth && (!currentUser || !currentUser.permissions || !currentUser.permissions.includes('menu-sistem'))) {
        showNotification('Anda tidak memiliki akses ke menu ini', 'error');
        return false;
    }
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) { resolve(false); return; }
            showLoading();
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    const putAll = async (storeName, items) => {
                        if (!items || !Array.isArray(items)) return;
                        for (const item of items) {
                            try {
                                await dbPut(storeName, item);
                            } catch (error) {
                                console.warn(`Gagal mengupdate item di ${storeName}:`, item, error);
                            }
                        }
                    };

                    await putAll(STORES.KASIR_CATEGORIES, importedData.kasirCategories);
                    await putAll(STORES.KASIR_ITEMS, importedData.kasirItems);
                    await putAll(STORES.KASIR_SATUAN, importedData.kasirSatuan);
                    await putAll(STORES.CUSTOMERS, importedData.customers);
                    await putAll(STORES.SUPPLIERS, importedData.suppliers);
                    await putAll(STORES.PENDING_TRANSACTIONS, importedData.pendingTransactions);
                    await putAll(STORES.SETTINGS, importedData.settings);
                    await putAll(STORES.USERS, importedData.users);
                    await putAll(STORES.ROLES, importedData.roles);
                    await putAll(STORES.BUNDLES, importedData.bundles);

                    await loadKasirCategories();
                    await loadKasirItems();
                    await loadKasirSatuan();
                    await loadCustomers();
                    await loadSuppliers();
                    await loadPendingTransactions();
                    await loadUsers();
                    await loadRoles();
                    await loadBundles();

                    await updateDashboard();

                    showNotification('Data berhasil diimport (merge)!', 'success');
                    resolve(true);
                } catch (error) {
                    console.error('Error importing data:', error);
                    showNotification('Gagal mengimport data: ' + error.message, 'error');
                    resolve(false);
                } finally { hideLoading(); }
            };
            reader.onerror = () => { showNotification('Gagal membaca file', 'error'); hideLoading(); resolve(false); };
            reader.readAsText(file);
        };
        input.click();
    });
}

async function clearAllData() {
    if (confirm('Apakah Anda yakin ingin menghapus SEMUA data?\nTindakan ini tidak dapat dibatalkan!')) {
        try {
            showLoading();
            await dbClear(STORES.KASIR_CATEGORIES);
            await dbClear(STORES.KASIR_ITEMS);
            await dbClear(STORES.KASIR_SATUAN);
            await dbClear(STORES.CUSTOMERS);
            await dbClear(STORES.SUPPLIERS);
            await dbClear(STORES.PENDING_TRANSACTIONS);
            await dbClear(STORES.SETTINGS);
            await dbClear(STORES.APP_STATE);
            await dbClear(STORES.USERS);
            await dbClear(STORES.ROLES);
            await dbClear(STORES.BUNDLES);
            kasirCategories = [];
            kasirItems = [];
            kasirSatuan = [];
            customers = [];
            suppliers = [];
            pendingTransactions = [];
            users = [];
            roles = [];
            bundles = [];
            updatePendingBadge();
            await updateDashboard();
            showNotification('Semua data berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            showNotification('Gagal menghapus data: ' + error.message, 'error');
        } finally { hideLoading(); }
    }
}

async function forceResetDatabase() {
    if (confirm('Yakin ingin reset database? Semua data akan hilang dan aplikasi akan direfresh!')) {
        try {
            showLoading();
            if (db) db.close();
            const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
            deleteRequest.onsuccess = () => {
                console.log('Database deleted successfully');
                showNotification('Database direset. Halaman akan direfresh...', 'success');
                setTimeout(() => location.reload(), 2000);
            };
            deleteRequest.onerror = (event) => {
                console.error('Error deleting database:', event.target.error);
                showNotification('Gagal mereset database: ' + event.target.error, 'error');
                hideLoading();
            };
            deleteRequest.onblocked = () => {
                showNotification('Database diblokir. Tutup tab lain dan coba lagi.', 'error');
                hideLoading();
            };
        } catch (error) {
            console.error('Error in force reset:', error);
            showNotification('Error: ' + error.message, 'error');
            hideLoading();
        }
    }
}

async function loadReceiptConfig() {
    try {
        const transaction = db.transaction([STORES.SETTINGS], 'readonly');
        const store = transaction.objectStore(STORES.SETTINGS);
        const request = store.get('receiptConfig');
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    receiptConfig = request.result.value;
                } else {
                    receiptConfig = {
                        paperWidth: 32,
                        header: "TOKO LOKABUMBU\nTAN KES \n PURB \nTelp: 082",
                        footer: "Terima kasih\nSelamat berbelanja kembali \n Delivery Order Via WhatsApp \n 082",
                        showDateTime: true,
                        showTransactionNumber: true,
                        showCashier: false
                    };
                }
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error('Error loading receipt config:', error);
        receiptConfig = {
            paperWidth: 32,
            header: "TOKO LOKABUMBU\nTAN KES \n PURB \nTelp: 082",
            footer: "Terima kasih\nSelamat berbelanja kembali \n Delivery Order Via WhatsApp \n 082",
            showDateTime: true,
            showTransactionNumber: true,
            showCashier: false
        };
    }
}

async function saveReceiptConfig() {
    const paperWidth = parseInt(document.getElementById('receipt-paper-width').value);
    if (isNaN(paperWidth) || paperWidth < 10) {
        showNotification('Lebar kertas minimal 10 karakter', 'error');
        return;
    }

    const headerRaw = document.getElementById('receipt-header').value;
    const footerRaw = document.getElementById('receipt-footer').value;
    const header = headerRaw.replace(/\\n/g, '\n');
    const footer = footerRaw.replace(/\\n/g, '\n');

    const showDateTime = document.getElementById('receipt-show-datetime').checked;
    const showTransactionNumber = document.getElementById('receipt-show-transnum').checked;
    const showCashier = document.getElementById('receipt-show-cashier').checked;

    const newConfig = {
        paperWidth,
        header,
        footer,
        showDateTime,
        showTransactionNumber,
        showCashier
    };

    try {
        showLoading();
        const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
        const store = transaction.objectStore(STORES.SETTINGS);
        const data = { key: 'receiptConfig', value: newConfig };
        await new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => {
                receiptConfig = newConfig;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
        showNotification('Pengaturan struk tersimpan', 'success');
        closeSettingsModal();
    } catch (error) {
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function showSettingsModal() {
    if (!currentUser || !currentUser.permissions || !currentUser.permissions.includes('menu-master')) {
        showNotification('Anda tidak memiliki akses ke pengaturan', 'error');
        return;
    }
    const settingsContent = document.getElementById('settings-content');
    settingsContent.innerHTML = `
        <div style="margin-bottom:20px;">
            <div style="color:#333333;margin-bottom:10px;font-weight:600;font-size:1rem;display:flex;align-items:center;gap:8px;">
                <svg class="icon icon-sm" viewBox="0 0 24 24" style="color:#006B54;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Manajemen Data
            </div>
            <button style="width:100%;padding:12px;border:none;border-radius:15px;background:#006B54;color:white;font-weight:600;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #006B54;" onclick="exportData()">${icons.upload} Export Data</button>
            <button style="width:100%;padding:12px;border:none;border-radius:15px;background:#006B54;color:white;font-weight:600;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #006B54;" onclick="importData()">${icons.download} Import Data</button>
            <button style="width:100%;padding:12px;border:none;border-radius:15px;background:#ff6b6b;color:white;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #ff6b6b;" onclick="clearAllData()">${icons.delete} Hapus Semua Data</button>
            <button style="width:100%;padding:12px;border:none;border-radius:15px;background:#dc3545;color:white;font-weight:600;margin-top:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #dc3545;" onclick="forceResetDatabase()"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Force Reset Database</button>
        </div>
        <div style="margin-bottom:20px; border-top:1px solid #ddd; padding-top:20px;">
            <div style="color:#333333;margin-bottom:15px;font-weight:600;font-size:1rem;display:flex;align-items:center;gap:8px;">
                <svg class="icon icon-sm" viewBox="0 0 24 24" style="color:#006B54;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> Konfigurasi Barcode Timbangan
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:block; margin-bottom:5px;">Panjang Digit Flex</label>
                <input type="number" id="barcode-flex-length" class="form-input" value="${barcodeConfig.flexLength}" min="1" max="5">
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:block; margin-bottom:5px;">Nilai Flex (misal 11)</label>
                <input type="text" id="barcode-flex-value" class="form-input" value="${barcodeConfig.flexValue}" maxlength="5">
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:block; margin-bottom:5px;">Panjang Digit Kode Item</label>
                <input type="number" id="barcode-product-length" class="form-input" value="${barcodeConfig.productLength}" min="1" max="10">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px;">Panjang Digit Berat</label>
                <input type="number" id="barcode-weight-length" class="form-input" value="${barcodeConfig.weightLength}" min="1" max="10">
            </div>
            <div style="color:#666; font-size:0.85rem; margin-bottom:10px;">Total panjang harus 13 digit. Saat ini: <span id="total-digits-display">${barcodeConfig.flexLength + barcodeConfig.productLength + barcodeConfig.weightLength}</span></div>
            <button class="form-button-primary" style="width:100%;" onclick="saveBarcodeConfigFromUI()">Simpan Konfigurasi Barcode</button>
        </div>

        <div style="margin-bottom:20px; border-top:1px solid #ddd; padding-top:20px;">
            <div style="color:#333333;margin-bottom:15px;font-weight:600;font-size:1rem;display:flex;align-items:center;gap:8px;">
                <svg class="icon icon-sm" viewBox="0 0 24 24" style="color:#006B54;"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3h12v6"/><rect x="6" y="15" width="12" height="6" rx="2"/></svg> Pengaturan Struk
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:block; margin-bottom:5px;">Lebar Kertas (jumlah karakter)</label>
                <input type="number" id="receipt-paper-width" class="form-input" value="${receiptConfig.paperWidth}" min="20" max="80">
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:block; margin-bottom:5px;">Header (pisahkan baris dengan \\n)</label>
                <textarea id="receipt-header" class="form-input" rows="3">${receiptConfig.header.replace(/\n/g, '\\n')}</textarea>
                <small style="color:#666;">Gunakan \\n untuk baris baru</small>
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:block; margin-bottom:5px;">Footer (pisahkan baris dengan \\n)</label>
                <textarea id="receipt-footer" class="form-input" rows="3">${receiptConfig.footer.replace(/\n/g, '\\n')}</textarea>
                <small style="color:#666;">Gunakan \\n untuk baris baru</small>
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="receipt-show-datetime" ${receiptConfig.showDateTime ? 'checked' : ''}> Tampilkan Tanggal & Waktu
                </label>
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="receipt-show-transnum" ${receiptConfig.showTransactionNumber ? 'checked' : ''}> Tampilkan Nomor Transaksi
                </label>
            </div>
            <div style="margin-bottom:10px;">
                <label style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="receipt-show-cashier" ${receiptConfig.showCashier ? 'checked' : ''}> Tampilkan Nama Kasir
                </label>
            </div>
            <button class="form-button-primary" style="width:100%;" onclick="saveReceiptConfig()">Simpan Pengaturan Struk</button>
        </div>

        <div style="margin-bottom:20px; border-top:1px solid #ddd; padding-top:20px;">
            <div style="color:#333;margin-bottom:15px;font-weight:600;display:flex;align-items:center;gap:8px;">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg> Manajemen Pengguna
            </div>
            <div id="user-list-container" style="max-height:200px; overflow-y:auto; margin-bottom:10px;"></div>
            <button class="form-button-primary" style="width:100%;" onclick="openAddUserModal()">Tambah Pengguna</button>
        </div>

        <div style="margin-top:20px;">
            <button class="form-button-primary" style="width:100%;" onclick="window.open('admin-panel.html', '_blank')">
                <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg>
                Admin Panel
            </button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px; margin-top:20px;">
            <button class="form-button-secondary" onclick="closeSettingsModal()"><svg class="icon icon-sm" viewBox="0 0 24 24" style="color:#333333;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> TUTUP</button>
        </div>
    `;

    const flexLen = document.getElementById('barcode-flex-length');
    const prodLen = document.getElementById('barcode-product-length');
    const weightLen = document.getElementById('barcode-weight-length');
    const totalSpan = document.getElementById('total-digits-display');
    function updateTotal() {
        const total = (parseInt(flexLen.value) || 0) + (parseInt(prodLen.value) || 0) + (parseInt(weightLen.value) || 0);
        totalSpan.textContent = total;
        totalSpan.style.color = total === 13 ? 'green' : 'red';
    }
    flexLen.addEventListener('input', updateTotal);
    prodLen.addEventListener('input', updateTotal);
    weightLen.addEventListener('input', updateTotal);
    
    renderUserListSettings();
    document.getElementById('settings-modal').style.display = 'flex';
    closeDrawer();
}

function renderUserListSettings() {
    const container = document.getElementById('user-list-container');
    if (!container) return;
    if (!users || users.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:10px; color:#666;">Belum ada pengguna.</div>';
        return;
    }
    let html = '';
    users.forEach(user => {
        const roleName = roles.find(r => r.id === user.roleId)?.name || 'Tanpa Role';
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
                <div>
                    <strong>${user.name}</strong> (${user.username})<br>
                    <span style="font-size:0.8rem;">Role: ${roleName}</span>
                </div>
                <div>
                    <button class="action-btn edit-btn" style="padding:4px 8px; min-height:30px;" onclick="openEditUserModal(${user.id})">${icons.edit}</button>
                    ${user.roleId ? `<button class="action-btn delete-btn" style="padding:4px 8px; min-height:30px;" onclick="deleteUser(${user.id})">${icons.delete}</button>` : ''}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderUserList() {
    renderUserListSettings();
}

let editingUserId = null;

function openAddUserModal() {
    editingUserId = null;
    document.getElementById('user-modal-username').value = '';
    document.getElementById('user-modal-password').value = '';
    document.getElementById('user-modal-confirm-password').value = '';
    document.getElementById('user-modal-name').value = '';
    const roleSelect = document.getElementById('user-modal-role');
    roleSelect.innerHTML = '<option value="">-- Pilih Role --</option>';
    roles.forEach(role => {
        roleSelect.innerHTML += `<option value="${role.id}">${role.name}</option>`;
    });
    document.getElementById('user-modal-title').innerHTML = `
        <svg class="icon icon-primary" viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="8" r="4"/>
            <path d="M5 20v-2a7 7 0 0 1 14 0v2"/>
        </svg> Tambah Pengguna
    `;
    document.getElementById('user-modal').style.display = 'flex';
}

function openEditUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    editingUserId = userId;
    document.getElementById('user-modal-username').value = user.username;
    document.getElementById('user-modal-password').value = '';
    document.getElementById('user-modal-confirm-password').value = '';
    document.getElementById('user-modal-name').value = user.name;
    const roleSelect = document.getElementById('user-modal-role');
    roleSelect.innerHTML = '<option value="">-- Pilih Role --</option>';
    roles.forEach(role => {
        roleSelect.innerHTML += `<option value="${role.id}" ${user.roleId === role.id ? 'selected' : ''}>${role.name}</option>`;
    });
    document.getElementById('user-modal-title').innerHTML = `
        <svg class="icon icon-primary" viewBox="0 0 24 24" width="24" height="24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg> Edit Pengguna
    `;
    document.getElementById('user-modal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
    editingUserId = null;
}

// ==================== FUNGSI TOGGLE PASSWORD ====================
function togglePasswordVisibility(inputId, toggleElement) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);

    const svg = toggleElement.querySelector('svg');
    if (type === 'text') {
        svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
}

async function saveUser() {
    const username = document.getElementById('user-modal-username').value.trim();
    const password = document.getElementById('user-modal-password').value.trim();
    const confirmPassword = document.getElementById('user-modal-confirm-password').value.trim();
    const name = document.getElementById('user-modal-name').value.trim();
    const roleId = parseInt(document.getElementById('user-modal-role').value);

    if (!username || !name || !roleId) {
        showNotification('Username, Nama, dan Role harus diisi', 'error');
        return;
    }

    if (!editingUserId && !password) {
        showNotification('Password harus diisi untuk pengguna baru', 'error');
        return;
    }

    if (password !== '') {
        if (password !== confirmPassword) {
            showNotification('Password dan konfirmasi password tidak cocok', 'error');
            return;
        }
    }

    if (editingUserId) {
        const existing = users.find(u => u.username === username && u.id !== editingUserId);
        if (existing) {
            showNotification('Username sudah digunakan', 'error');
            return;
        }
    } else {
        if (users.some(u => u.username === username)) {
            showNotification('Username sudah digunakan', 'error');
            return;
        }
    }

    try {
        showLoading();
        const now = new Date().toISOString();
        if (editingUserId) {
            const user = users.find(u => u.id === editingUserId);
            if (user) {
                user.username = username;
                if (password) {
                    user.password = await hashPassword(password);
                }
                user.name = name;
                user.roleId = roleId;
                user.updatedAt = now;
                await dbPut(STORES.USERS, user);
            }
        } else {
            const hashed = await hashPassword(password);
            const newUser = {
                username,
                password: hashed,
                name,
                roleId,
                createdAt: now,
                updatedAt: now
            };
            const id = await dbAdd(STORES.USERS, newUser);
            newUser.id = id;
            users.push(newUser);
        }
        await loadUsers();
        renderUserList();
        showNotification('Pengguna berhasil disimpan', 'success');
        closeUserModal();
    } catch (error) {
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteUser(userId) {
    if (!confirm('Hapus pengguna ini?')) return;
    try {
        showLoading();
        await dbDelete(STORES.USERS, userId);
        users = users.filter(u => u.id !== userId);
        renderUserList();
        showNotification('Pengguna dihapus', 'success');
    } catch (error) {
        showNotification('Gagal hapus: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function loadBarcodeConfig() {
    try {
        const transaction = db.transaction([STORES.SETTINGS], 'readonly');
        const store = transaction.objectStore(STORES.SETTINGS);
        const request = store.get('barcodeConfig');
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    barcodeConfig = request.result.value;
                } else {
                    barcodeConfig = { flexLength: 2, flexValue: '11', productLength: 6, weightLength: 5 };
                }
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error('Error loading barcode config:', error);
        barcodeConfig = { flexLength: 2, flexValue: '11', productLength: 6, weightLength: 5};
    }
}

async function saveBarcodeConfig(config) {
    try {
        const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
        const store = transaction.objectStore(STORES.SETTINGS);
        const data = { key: 'barcodeConfig', value: config };
        const request = store.put(data);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                barcodeConfig = config;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error('Error saving barcode config:', error);
        throw error;
    }
}

async function saveBarcodeConfigFromUI() {
    const flexLength = parseInt(document.getElementById('barcode-flex-length').value);
    const flexValue = document.getElementById('barcode-flex-value').value.trim();
    const productLength = parseInt(document.getElementById('barcode-product-length').value);
    const weightLength = parseInt(document.getElementById('barcode-weight-length').value);

    if (isNaN(flexLength) || flexLength < 1) { showNotification('Panjang Flex harus angka positif', 'error'); return; }
    if (!flexValue) { showNotification('Nilai Flex harus diisi', 'error'); return; }
    if (isNaN(productLength) || productLength < 1) { showNotification('Panjang Kode Item harus angka positif', 'error'); return; }
    if (isNaN(weightLength) || weightLength < 1) { showNotification('Panjang Berat harus angka positif', 'error'); return; }

    const total = flexLength + productLength + weightLength;
    if (total !== 13) {
        showNotification(`Total panjang harus 13 digit, saat ini ${total}`, 'error');
        return;
    }

    const newConfig = { flexLength, flexValue, productLength, weightLength };
    try {
        showLoading();
        await saveBarcodeConfig(newConfig);
        showNotification('Konfigurasi barcode tersimpan', 'success');
        closeSettingsModal();
    } catch (error) {
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

// ==================== FUNGSI LOAD DATA ====================
async function loadKasirCategories() {
    try { kasirCategories = await dbGetAll(STORES.KASIR_CATEGORIES); kasirCategories.sort((a,b) => a.name.localeCompare(b.name)); } catch (error) { console.error('Error loading kasir categories:', error); kasirCategories = []; }
}

async function loadKasirItems() {
    try { 
        kasirItems = await dbGetAll(STORES.KASIR_ITEMS); 
        kasirItems.forEach(item => { 
            if (item.stock === undefined) item.stock = 0;
            if (item.minStock === undefined) item.minStock = 5;
        });
        kasirItems.sort((a,b) => a.name.localeCompare(b.name)); 
    } catch (error) { console.error('Error loading kasir items:', error); kasirItems = []; }
}

async function loadKasirSatuan() {
    try { kasirSatuan = await dbGetAll(STORES.KASIR_SATUAN); kasirSatuan.sort((a,b) => a.name.localeCompare(b.name)); } catch (error) { console.error('Error loading satuan:', error); kasirSatuan = []; }
}

async function loadCustomers() {
    try { 
        customers = await dbGetAll(STORES.CUSTOMERS); 
        customers.forEach(c => { if (c.outstanding === undefined) c.outstanding = 0; });
        customers.sort((a,b) => a.name.localeCompare(b.name)); 
    } catch (error) { console.error('Error loading customers:', error); customers = []; }
}

async function loadSuppliers() {
    try { suppliers = await dbGetAll(STORES.SUPPLIERS); suppliers.sort((a,b) => a.name.localeCompare(b.name)); } catch (error) { console.error('Error loading suppliers:', error); suppliers = []; }
}

async function loadPendingTransactions() {
    try { 
        pendingTransactions = await dbGetAll(STORES.PENDING_TRANSACTIONS); 
        updatePendingBadge();
    } catch (error) { 
        console.error('Error loading pending transactions:', error); 
        pendingTransactions = []; 
        updatePendingBadge();
    }
}

// ==================== FUNGSI BUNDLE ====================
async function loadBundles() {
    try {
        bundles = await dbGetAll(STORES.BUNDLES);
        bundles.sort((a,b) => a.name.localeCompare(b.name));
        return bundles;
    } catch (error) {
        console.error('Error loading bundles:', error);
        bundles = [];
        return bundles;
    }
}

async function saveBundle(bundleData, id = null) {
    const now = new Date().toISOString();
    if (id) {
        const bundle = await dbGet(STORES.BUNDLES, id);
        if (bundle) {
            Object.assign(bundle, bundleData);
            bundle.updatedAt = now;
            await dbPut(STORES.BUNDLES, bundle);
        }
    } else {
        const newBundle = { ...bundleData, createdAt: now, updatedAt: now };
        await dbAdd(STORES.BUNDLES, newBundle);
    }
    await loadBundles();
}

async function deleteBundle(id) {
    await dbDelete(STORES.BUNDLES, id);
    await loadBundles();
}

// ==================== FUNGSI DASHBOARD ====================
async function updateDashboard() {
    // Hanya jika elemen dashboard ada (di index.html)
    if (!document.getElementById('today-sales')) return;

    try {
        const allSales = await dbGetAll(STORES.SALES);
        const today = new Date().toISOString().split('T')[0];
        const todaySales = allSales.filter(s => s.date.startsWith(today));

        const totalToday = todaySales.reduce((sum, s) => sum + s.total, 0);
        const todaySalesEl = document.getElementById('today-sales');
        if (todaySalesEl) todaySalesEl.textContent = formatRupiah(totalToday);

        const todayTransEl = document.getElementById('today-transactions');
        if (todayTransEl) todayTransEl.textContent = todaySales.length;

        const lowStockItems = kasirItems.filter(i => i.stock < (i.minStock || 5));
        const lowStockEl = document.getElementById('low-stock-count');
        if (lowStockEl) lowStockEl.textContent = lowStockItems.length;

        renderNotifications(lowStockItems);
        renderSalesChart(todaySales);
        renderPendingList();
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

function renderNotifications(lowStockItems) {
    const area = document.getElementById('notifications-area');
    if (!area) return;
    area.innerHTML = '';

    if (lowStockItems.length > 0) {
        const notif = document.createElement('div');
        notif.className = 'notification warning';
        notif.innerHTML = `⚠️ Terdapat ${lowStockItems.length} produk dengan stok menipis. <button onclick="openInventoryStokModal()">Lihat</button>`;
        area.appendChild(notif);
    }

    const customersWithOutstanding = customers.filter(c => c.outstanding > 0);
    const totalOutstanding = customersWithOutstanding.reduce((sum, c) => sum + c.outstanding, 0);
    if (customersWithOutstanding.length > 0) {
        const notif = document.createElement('div');
        notif.className = 'notification danger';
        notif.innerHTML = `💰 Total piutang dari ${customersWithOutstanding.length} pelanggan: ${formatRupiah(totalOutstanding)}. <button onclick="window.location.href='relasi.html#customers'">Lihat</button>`;
        area.appendChild(notif);
    }

    if (pendingTransactions.length > 0) {
        const notif = document.createElement('div');
        notif.className = 'notification info';
        notif.innerHTML = `📋 Terdapat ${pendingTransactions.length} transaksi pending. <button onclick="openPendingTransactionsModal()">Lihat</button>`;
        area.appendChild(notif);
    }
}

function renderSalesChart(salesToday) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    if (salesChartInstance) salesChartInstance.destroy();

    const salesPerHour = new Array(24).fill(0);
    salesToday.forEach(sale => {
        const hour = new Date(sale.date).getHours();
        salesPerHour[hour] += sale.total;
    });

    const hours = Array.from({ length: 24 }, (_, i) => i + ':00');

    salesChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Total Penjualan (Rp)',
                data: salesPerHour,
                backgroundColor: '#006B54',
                borderColor: '#004d3e',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            }
        }
    });
}

function renderPendingList() {
    const container = document.getElementById('pending-list-container');
    if (!container) return;
    if (pendingTransactions.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">Tidak ada transaksi pending.</p>';
        return;
    }
    let html = '<table style="width:100%; border-collapse:collapse;">';
    html += '<thead><tr><th>Kode</th><th>Tanggal</th><th>Total</th><th>Customer</th><th></th></tr></thead><tbody>';
    pendingTransactions.forEach(t => {
        html += `<tr>
            <td>${t.pendingCode || '-'}</td>
            <td>${new Date(t.createdAt).toLocaleString()}</td>
            <td>${formatRupiah(t.total)}</td>
            <td>${t.customerName || '-'}</td>
            <td><button class="action-btn edit-btn" onclick="loadPendingTransaction(${t.id})">Muat</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updatePendingBadge() {
    const badge = document.getElementById('pending-badge');
    if (!badge) return;
    const count = pendingTransactions.length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ==================== FUNGSI LAPORAN PENJUALAN ====================
function openLaporanPage() {
    window.location.href = 'laporan.html';
}

// ==================== FUNGSI PEMBELIAN ====================
function openPembelianPage() {
    window.location.href = 'pembelian.html';
}

// ==================== FUNGSI GENERATE NOMOR PEMBELIAN ====================
async function generatePurchaseNumber() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    let lastCounter = 0;
    try {
        const transaction = db.transaction([STORES.SETTINGS], 'readonly');
        const store = transaction.objectStore(STORES.SETTINGS);
        const request = store.get('lastPurchaseNumber');
        await new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    const data = request.result.value;
                    if (data.date === dateStr) {
                        lastCounter = data.counter;
                    } else {
                        lastCounter = 0;
                    }
                }
                resolve();
            };
            request.onerror = reject;
        });
    } catch (error) {
        console.warn('Gagal membaca counter purchase:', error);
    }

    const newCounter = lastCounter + 1;
    const purchaseNumber = `PO-${dateStr}-${String(newCounter).padStart(5, '0')}`;

    try {
        await dbPut(STORES.SETTINGS, {
            key: 'lastPurchaseNumber',
            value: { date: dateStr, counter: newCounter }
        });
    } catch (error) {
        console.error('Gagal menyimpan counter purchase:', error);
    }

    return purchaseNumber;
}

async function generateTransactionNumber() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    let lastCounter = 0;
    try {
        const transaction = db.transaction([STORES.SETTINGS], 'readonly');
        const store = transaction.objectStore(STORES.SETTINGS);
        const request = store.get('lastTransactionNumber');
        await new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    const data = request.result.value;
                    if (data.date === dateStr) {
                        lastCounter = data.counter;
                    } else {
                        lastCounter = 0;
                    }
                }
                resolve();
            };
            request.onerror = reject;
        });
    } catch (error) {
        console.warn('Gagal membaca counter transaksi:', error);
    }

    const newCounter = lastCounter + 1;
    const transactionNumber = `INV-${dateStr}-${String(newCounter).padStart(5, '0')}`;

    try {
        await dbPut(STORES.SETTINGS, {
            key: 'lastTransactionNumber',
            value: { date: dateStr, counter: newCounter }
        });
    } catch (error) {
        console.error('Gagal menyimpan counter transaksi:', error);
    }

    return transactionNumber;
}

async function refreshData() {
    try {
        showLoading();
        await loadKasirCategories();
        await loadKasirItems();
        await loadKasirSatuan();
        await loadCustomers();
        await loadSuppliers();
        await loadPendingTransactions();
        await loadUsers();
        await loadRoles();
        await loadBundles();
        await updateDashboard();
        console.log('Data refreshed successfully');
    } catch (error) { console.error('Error refreshing data:', error); } finally { hideLoading(); }
}

// ==================== NOTIFICATION HELPER ====================
function showNotification(message, type = 'info') {
    const notif = document.getElementById('notification');
    if (!notif) return;
    notif.textContent = message;
    notif.style.backgroundColor = type === 'error' ? '#dc3545' : (type === 'success' ? '#006B54' : '#17a2b8');
    notif.style.display = 'block';
    setTimeout(() => { notif.style.display = 'none'; }, 2000);
}

function formatRupiah(angka) {
    return 'Rp ' + angka.toLocaleString('id-ID');
}

// ==================== FUNGSI UNTUK INVENTORY (di index.html) ====================
function openInventoryStokModal() {
    // Implementasi di index.html, jika tidak ada maka abaikan
    if (!document.getElementById('inventory-modal')) return;
    // ... kode asli (bisa dipertahankan jika diperlukan)
    // Untuk sementara, kita kosongkan karena sudah dipindah ke index.html
    console.log('openInventoryStokModal dipanggil (fungsi asli di index.html)');
}

function openInventoryOpnameModal() {
    openInventoryStokModal();
}

function openInventoryLaporanModal() {
    // serupa
}

// ==================== INISIALISASI APLIKASI ====================
async function initApp() {
    try {
        console.log('Starting app initialization...');
        showLoading();
        hideError();
        await initDatabase();
        await loadBarcodeConfig();
        await loadReceiptConfig();
        await loadKasirCategories();
        await loadKasirItems();
        await loadKasirSatuan();
        await loadCustomers();
        await loadSuppliers();
        await loadPendingTransactions();
        await loadBundles();
        await autoReconnectPrinter();
        await loadUsers();
        await loadRoles();

        if (users.length > 0 && users.some(u => u.roleId === undefined)) {
            let roles = await dbGetAll(STORES.ROLES);
            if (roles.length === 0) {
                const adminRole = { name: 'Admin', permissions: ALL_MENUS.map(m => m.id) };
                const kasirRole = { name: 'Kasir', permissions: ['menu-transaksi', 'menu-cust'] };
                const adminId = await dbAdd(STORES.ROLES, adminRole);
                const kasirId = await dbAdd(STORES.ROLES, kasirRole);
                roles = [adminRole, kasirRole];
                adminRole.id = adminId;
                kasirRole.id = kasirId;
            }
            const adminRole = roles.find(r => r.name === 'Admin');
            const kasirRole = roles.find(r => r.name === 'Kasir');
            for (let user of users) {
                if (user.roleId === undefined) {
                    if (user.role === 'admin') user.roleId = adminRole.id;
                    else if (user.role === 'kasir') user.roleId = kasirRole.id;
                    else user.roleId = kasirRole.id;
                    await dbPut(STORES.USERS, user);
                }
            }
            await loadUsers();
            await loadRoles();
        }

        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            if (parsed.id === 'bypass') {
                currentUser = { ...parsed, username: 'owner', permissions: ALL_MENUS.map(m => m.id) };
                document.getElementById('login-overlay').style.display = 'none';
                updateSidebarByPermissions(ALL_MENUS.map(m => m.id));
                document.getElementById('user-name-display').textContent = parsed.name;
            } else {
                const user = users.find(u => u.id === parsed.id);
                if (user) {
                    currentUser = user;
                    currentUser.permissions = parsed.permissions || await getUserPermissions(user);
                    document.getElementById('login-overlay').style.display = 'none';
                    updateSidebarByPermissions(currentUser.permissions);
                    document.getElementById('user-name-display').textContent = user.name;
                } else {
                    sessionStorage.removeItem('currentUser');
                    showLoginScreen();
                }
            }
        } else {
            showLoginScreen();
        }

        await updateDashboard();

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        let errorMessage = 'Gagal memuat aplikasi: ' + error.message;
        if (error.name === 'VersionError') errorMessage = 'Database versi tidak kompatibel. Coba reset aplikasi.';
        else if (error.name === 'InvalidStateError') errorMessage = 'Database dalam state tidak valid. Refresh halaman.';
        else if (error.message.includes('IndexedDB')) errorMessage = 'Browser tidak mendukung IndexedDB. Gunakan Chrome/Edge/Firefox.';
        showError(errorMessage);
    } finally {
        hideLoading();
    }
}

async function retryAppLoad() { await initApp(); }

// ==================== FUNGSI AUTO RECONNECT PRINTER ====================
async function autoReconnectPrinter() {
    if (!navigator.serial) return;
    try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
            const port = ports[0];
            await port.open({ baudRate: 9600 });
            // printerPort tidak didefinisikan di sini, hanya untuk kepentingan transaksi
            // Di sini kita hanya log
            console.log('Printer auto-connected (port tersedia)');
        }
    } catch (error) {
        console.warn('Auto reconnect printer failed:', error);
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', async () => { 
    console.log('DOM fully loaded, initializing app...'); 
    await initApp(); 
});

window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        if (event.target.id === 'kasir-category-modal') closeKasirCategoryModal?.();
        else if (event.target.id === 'kasir-item-modal') closeKasirItemModal?.();
        else if (event.target.id === 'list-kasir-category-modal') closeListKasirCategoryModal?.();
        else if (event.target.id === 'list-kasir-item-modal') closeListKasirItemModal?.();
        else if (event.target.id === 'list-satuan-modal') closeListSatuanModal?.();
        else if (event.target.id === 'satuan-modal') closeSatuanModal?.();
        else if (event.target.id === 'settings-modal') closeSettingsModal();
        else if (event.target.id === 'inventory-modal') closeInventoryModal?.();
        else if (event.target.id === 'customer-modal') closeCustomerModal?.();
        else if (event.target.id === 'list-customer-modal') closeListCustomerModal?.();
        else if (event.target.id === 'supplier-modal') closeSupplierModal?.();
        else if (event.target.id === 'list-supplier-modal') closeListSupplierModal?.();
        else if (event.target.id === 'select-customer-modal') closeSelectCustomerModal?.();
        else if (event.target.id === 'pending-transactions-modal') closePendingTransactionsModal?.();
        else if (event.target.id === 'confirm-piutang-modal') closeConfirmPiutangModal?.();
        else if (event.target.id === 'pending-code-modal') closePendingCodeModal?.();
        else if (event.target.id === 'create-admin-modal') closeCreateAdminModal();
        else if (event.target.id === 'user-modal') closeUserModal();
        else if (event.target.id === 'bundle-modal') closeBundleModal?.();
    }
};

document.addEventListener('visibilitychange', () => { 
    if (!document.hidden) { 
        console.log('Page became visible, refreshing data...'); 
        refreshData(); 
    } 
});
