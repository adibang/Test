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
