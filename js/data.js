// ==================== FUNGSI LOAD DATA DARI DATABASE ====================

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

// ==================== EXPORT / IMPORT DATA ====================

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

// ==================== GENERATE NOMOR TRANSAKSI ====================
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

// ==================== REFRESH DATA ====================
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
