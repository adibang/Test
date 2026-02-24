// ==================== FUNGSI CEK STOK BUNDLE ====================
function checkBundleStock(bundle, qty) {
    if (!bundle.components || !Array.isArray(bundle.components)) return false;
    for (let comp of bundle.components) {
        const item = kasirItems.find(i => i.id === comp.itemId);
        if (!item) return false;
        let needed = comp.qty * qty;
        if (comp.unitConversionId) {
            const conv = item.unitConversions?.find(u => u.id == comp.unitConversionId);
            if (!conv) return false;
            needed *= conv.value;
        }
        if (item.stock < needed) return false;
    }
    return true;
}

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
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('show');
    document.querySelectorAll('.sub-menu').forEach(sm => sm.style.display = 'none');
    document.querySelectorAll('.menu-header').forEach(h => h.classList.remove('open'));
}

function toggleDrawer() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('drawer-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
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

// ==================== LOCALSTORAGE CART ====================
function saveCartToLocalStorage() {
    try {
        const cartData = cart.map(c => ({
            itemId: c.item.id,
            qty: c.qty,
            unitConversion: c.unitConversion ? { 
                unit: c.unitConversion.unit, 
                value: c.unitConversion.value,
                barcode: c.unitConversion.barcode,
                sellPrice: c.unitConversion.sellPrice 
            } : null,
            weightGram: c.weightGram || 0,
            pricePerUnit: c.pricePerUnit,
            subtotal: c.subtotal,
            isOutstanding: c.isOutstanding || false,
            customerId: c.customerId,
            isBundle: c.isBundle || false,
            bundleId: c.bundleId,
            components: c.components
        }));
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
        
        if (selectedCustomer) {
            localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({
                id: selectedCustomer.id,
                name: selectedCustomer.name
            }));
        } else {
            localStorage.removeItem(CUSTOMER_STORAGE_KEY);
        }
    } catch (e) {
        console.error('Gagal menyimpan cart ke localStorage:', e);
    }
}

async function loadCartFromLocalStorage() {
    try {
        const customerData = localStorage.getItem(CUSTOMER_STORAGE_KEY);
        if (customerData) {
            const { id } = JSON.parse(customerData);
            const customer = customers.find(c => c.id === id);
            if (customer) {
                selectedCustomer = customer;
                const badge = document.getElementById('customer-badge');
                if (badge) {
                    badge.textContent = customer.name.charAt(0).toUpperCase();
                    badge.style.display = 'flex';
                }
            } else {
                localStorage.removeItem(CUSTOMER_STORAGE_KEY);
            }
        }

        const cartData = localStorage.getItem(CART_STORAGE_KEY);
        if (!cartData) return;

        const parsed = JSON.parse(cartData);
        if (!Array.isArray(parsed)) return;

        const newCart = [];
        for (let c of parsed) {
            if (c.isOutstanding) {
                const cust = customers.find(cust => cust.id === c.customerId);
                if (cust) {
                    const item = {
                        id: 'outstanding-' + cust.id,
                        name: 'Piutang ' + cust.name,
                        stock: Infinity
                    };
                    newCart.push({
                        item: item,
                        qty: c.qty,
                        unitConversion: null,
                        weightGram: 0,
                        pricePerUnit: c.pricePerUnit,
                        subtotal: c.subtotal,
                        isOutstanding: true,
                        customerId: cust.id
                    });
                } else {
                    console.warn('Customer tidak ditemukan untuk item piutang');
                }
                continue;
            }

            if (c.isBundle) {
                const bundle = bundles.find(b => b.id == c.bundleId);
                if (!bundle) {
                    console.warn('Bundle tidak ditemukan, lewati');
                    continue;
                }
                const item = {
                    id: 'bundle-' + bundle.id,
                    name: bundle.name,
                    stock: Infinity
                };
                newCart.push({
                    item,
                    qty: c.qty,
                    unitConversion: null,
                    weightGram: 0,
                    pricePerUnit: c.pricePerUnit,
                    subtotal: c.subtotal,
                    isBundle: true,
                    bundleId: bundle.id,
                    components: c.components || bundle.components
                });
                continue;
            }

            const item = kasirItems.find(i => i.id === c.itemId);
            if (!item) continue;

            let pricePerUnit;
            if (c.unitConversion) {
                const conv = item.unitConversions?.find(u => u.barcode === c.unitConversion.barcode);
                if (conv) {
                    pricePerUnit = conv.sellPrice;
                    c.unitConversion = conv;
                } else {
                    pricePerUnit = getPriceForQty(item, c.qty);
                    c.unitConversion = null;
                }
            } else {
                pricePerUnit = getPriceForQty(item, c.qty);
            }

            newCart.push({
                item,
                qty: c.qty,
                unitConversion: c.unitConversion || null,
                weightGram: c.weightGram || 0,
                pricePerUnit,
                subtotal: c.qty * pricePerUnit
            });
        }

        cart = newCart;
        renderCartPage();
        if (document.getElementById('transaksi-page').style.display === 'block') {
            renderProductList();
        }
    } catch (e) {
        console.error('Gagal memuat cart dari localStorage:', e);
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    }
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

// ==================== FUNGSI UI BUNDLE (DENGAN EVENT DELEGATION) ====================
async function openBundleModal() {
    console.log('openBundleModal dipanggil');
    const modal = document.getElementById('bundle-modal');
    if (!modal) {
        console.error('Modal bundle tidak ditemukan');
        return;
    }
    try {
        await loadAndRenderBundles();
        modal.style.display = 'flex';
        closeDrawer();
    } catch (error) {
        console.error('Gagal membuka modal bundle:', error);
        const container = document.getElementById('bundle-list-container');
        if (container) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:red;">Gagal memuat data bundle: ' + error.message + '</div>';
        }
        modal.style.display = 'flex';
    }
}

function closeBundleModal() {
    document.getElementById('bundle-modal').style.display = 'none';
}

async function loadAndRenderBundles() {
    const container = document.getElementById('bundle-list-container');
    if (!container) return;
    try {
        await loadBundles();
        const now = new Date().toISOString();
        const activeBundles = bundles.filter(b => 
            b.active && 
            (!b.startDate || b.startDate <= now) && 
            (!b.endDate || b.endDate >= now)
        );

        if (activeBundles.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">Tidak ada bundle aktif. <br><button class="form-button-primary" onclick="window.open(\'admin-panel.html\', \'_blank\')">Buat Bundle</button></div>';
            return;
        }

        let html = '';
        for (let bundle of activeBundles) {
            let available = false;
            try {
                available = checkBundleStock(bundle, 1);
            } catch (e) {
                console.error('Error checking stock for bundle', bundle.id, e);
                available = false;
            }
            const statusText = available ? 'Tersedia' : 'Stok Kurang';
            html += `
                <div class="bundle-item" style="border:1px solid #ddd; border-radius:15px; padding:15px; margin-bottom:10px; ${available ? '' : 'opacity:0.5;'}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; color:#006B54;">${bundle.name}</h3>
                            <p style="margin:5px 0;">${bundle.description || ''}</p>
                            <p style="margin:5px 0;">Harga: ${formatRupiah(bundle.price)}</p>
                            <p style="margin:5px 0;">Status: <span style="color:${available ? 'green' : 'red'}">${statusText}</span></p>
                        </div>
                        <button class="form-button-primary select-bundle-btn" data-bundle-id="${bundle.id}" ${!available ? 'disabled' : ''}>Pilih</button>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;

        if (container._bundleClickListener) {
            container.removeEventListener('click', container._bundleClickListener);
        }
        container._bundleClickListener = function(e) {
            const btn = e.target.closest('button.select-bundle-btn');
            if (btn && !btn.disabled) {
                e.stopPropagation();
                const bundleId = btn.getAttribute('data-bundle-id');
                addBundleToCart(bundleId);
            }
        };
        container.addEventListener('click', container._bundleClickListener);
    } catch (error) {
        console.error('Error di loadAndRenderBundles:', error);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:red;">Gagal memuat bundle: ' + error.message + '</div>';
    }
}

async function addBundleToCart(bundleId) {
    console.log('addBundleToCart dipanggil dengan bundleId:', bundleId, 'tipe:', typeof bundleId);
    
    if (!bundleId) {
        showNotification('ID Bundle tidak valid', 'error');
        return;
    }
    
    await loadBundles(); // muat ulang data terbaru
    const bundle = bundles.find(b => b.id == bundleId);
    console.log('Bundle ditemukan:', bundle);
    
    if (!bundle) {
        showNotification('Bundle tidak ditemukan', 'error');
        return;
    }
    
    const existingBundleInCart = cart.find(c => c.isBundle && c.bundleId == bundleId);
    if (existingBundleInCart) {
        showNotification('Bundle ini sudah ada di keranjang', 'warning');
        return;
    }
    
    const qtyBundle = 1;
    if (!checkBundleStock(bundle, qtyBundle)) {
        showNotification('Stok komponen bundle tidak cukup', 'error');
        return;
    }
    
    if (typeof bundle.price !== 'number' || bundle.price <= 0) {
        console.error('Harga bundle tidak valid:', bundle.price);
        showNotification('Harga bundle tidak valid', 'error');
        return;
    }
    
    const bundleCartItem = {
        item: {
            id: 'bundle-' + bundle.id,
            name: bundle.name,
            stock: Infinity
        },
        qty: qtyBundle,
        pricePerUnit: bundle.price,
        subtotal: bundle.price * qtyBundle,
        isBundle: true,
        bundleId: bundle.id,
        components: bundle.components
    };
    
    cart.push(bundleCartItem);
    renderCartPage();
    saveCartToLocalStorage();
    closeBundleModal();
    showNotification(`Bundle "${bundle.name}" ditambahkan`, 'success');
    playSuccessSound();
}

// ==================== FUNGSI TRANSAKSI KASIR ====================
function openTransaksiPage() {
    document.querySelector('.main-content').style.display = 'none';
    document.getElementById('transaksi-page').style.display = 'block';
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('payment-page').style.display = 'none';
    
    currentFilteredItems = [...kasirItems];
    renderProductList(currentFilteredItems);
    document.getElementById('barcode-input').value = '';
    
    renderCartPage();
    updatePiutangButtonCart();
    setTimeout(() => document.getElementById('barcode-input').focus(), 100);
    closeDrawer();
}

function closeTransaksiPage() {
    document.getElementById('transaksi-page').style.display = 'none';
    document.querySelector('.main-content').style.display = 'block';
}

function getPriceForQty(item, qty) {
    if (!item.priceLevels || item.priceLevels.length === 0) {
        return item.hargaJual;
    }
    const sorted = [...item.priceLevels].sort((a, b) => b.minQty - a.minQty);
    for (let level of sorted) {
        if (qty >= level.minQty) {
            return level.price;
        }
    }
    return item.hargaJual;
}

function addToCart(item, qty, unitConversion, weightGram) {
    let requiredStock;
    if (weightGram > 0) {
        requiredStock = qty;
    } else if (unitConversion) {
        requiredStock = qty * unitConversion.value;
    } else {
        requiredStock = qty;
    }
    
    if (item.stock < requiredStock) {
        showNotification(`Stok ${item.name} tidak cukup. Tersedia: ${item.stock}`, 'error');
        return;
    }
    
    let pricePerUnit;
    if (unitConversion) {
        pricePerUnit = unitConversion.sellPrice;
    } else if (weightGram > 0) {
        pricePerUnit = getPriceForQty(item, qty);
    } else {
        pricePerUnit = getPriceForQty(item, qty);
    }

    const existingIndex = cart.findIndex(c => 
        c.item.id === item.id && 
        c.unitConversion?.barcode === unitConversion?.barcode &&
        c.weightGram === weightGram
    );

    if (existingIndex >= 0) {
        const existing = cart[existingIndex];
        const newQty = existing.qty + qty;

        let newPricePerUnit;
        if (unitConversion) {
            newPricePerUnit = unitConversion.sellPrice;
        } else if (weightGram > 0) {
            newPricePerUnit = getPriceForQty(item, newQty);
        } else {
            newPricePerUnit = getPriceForQty(item, newQty);
        }

        existing.qty = newQty;
        existing.pricePerUnit = newPricePerUnit;
        existing.subtotal = newQty * newPricePerUnit;
    } else {
        cart.push({
            item,
            qty,
            unitConversion,
            weightGram,
            pricePerUnit,
            subtotal: qty * pricePerUnit
        });
    }
    renderCartPage();
    saveCartToLocalStorage();
}

function processBarcode() {
    const input = document.getElementById('barcode-input');
    const barcode = input.value.trim();
    if (!barcode) return;

    console.log('Processing barcode:', barcode);

    let item = kasirItems.find(i => i.code === barcode || i.barcode === barcode);
    if (item) {
        addToCart(item, 1, null, 0);
        input.value = '';
        filterProductList('');
        return;
    }

    for (let it of kasirItems) {
        if (it.unitConversions && Array.isArray(it.unitConversions)) {
            const conv = it.unitConversions.find(c => c.barcode === barcode);
            if (conv) {
                addToCart(it, 1, conv, 0);
                input.value = '';
                filterProductList('');
                return;
            }
        }
    }

    if (barcode.length === 13) {
        const flex = barcode.substr(0, barcodeConfig.flexLength);
        if (flex !== barcodeConfig.flexValue) {
            showNotification('Barcode tidak dikenal (flex tidak cocok)', 'error');
            input.value = '';
            filterProductList('');
            return;
        }

        const productCode = barcode.substr(barcodeConfig.flexLength, barcodeConfig.productLength);
        const weightStr = barcode.substr(barcodeConfig.flexLength + barcodeConfig.productLength, barcodeConfig.weightLength);
        const weightGram = parseInt(weightStr, 10);

        if (!isNaN(weightGram) && weightGram > 0) {
            item = kasirItems.find(i => i.code === productCode && i.isWeighable === true);
            if (item) {
                const qtyKg = weightGram / 1000;
                addToCart(item, qtyKg, null, weightGram);
                input.value = '';
                filterProductList('');
                return;
            } else {
                showNotification('Produk dengan kode ' + productCode + ' tidak ditemukan atau bukan produk timbangan', 'error');
                input.value = '';
                filterProductList('');
                return;
            }
        }
    }

    showNotification('Produk tidak ditemukan', 'error');
    input.value = '';
    filterProductList('');
}

// ==================== FUNGSI PILIH CUSTOMER ====================
function openSelectCustomerModal() {
    const modal = document.getElementById('select-customer-modal');
    renderCustomerListForSelect();
    modal.style.display = 'flex';
    closeDrawer();
}

function closeSelectCustomerModal() {
    document.getElementById('select-customer-modal').style.display = 'none';
}

function renderCustomerListForSelect() {
    const container = document.getElementById('select-customer-list');
    if (!container) return;

    if (!customers || customers.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Belum ada pelanggan. <br><button class="form-button-primary" onclick="openAddCustomerPage(); closeSelectCustomerModal();">Tambah Pelanggan</button></div>';
        return;
    }

    let html = '';
    customers.forEach(cust => {
        html += `
            <div class="customer-select-item" onclick="selectCustomer(${cust.id})" style="padding:15px; border-bottom:1px solid #eee; cursor:pointer; hover:background:#f5f5f5;">
                <strong>${cust.name}</strong><br>
                <span style="font-size:0.9rem;">Piutang: ${formatRupiah(cust.outstanding || 0)}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function selectCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        selectedCustomer = customer;
        const badge = document.getElementById('customer-badge');
        if (badge) {
            badge.textContent = customer.name.charAt(0).toUpperCase();
            badge.style.display = 'flex';
        }
        try {
            localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({
                id: customer.id,
                name: customer.name
            }));
        } catch (e) {}
        showNotification(`Pelanggan ${customer.name} dipilih`, 'success');
        updatePiutangButtonCart();
    }
    closeSelectCustomerModal();
}

function openCartPage() {
    document.querySelector('.main-content').style.display = 'none';
    document.getElementById('transaksi-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'block';
    document.getElementById('payment-page').style.display = 'none';
    renderCartPage();
    updatePiutangButtonCart();
}

function closeCartPage() {
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('transaksi-page').style.display = 'block';
}

function renderCartPage() {
    const tbody = document.getElementById('cart-items-page');
    const totalEl = document.getElementById('cart-total-page');
    const cartCount = document.getElementById('cart-count');
    if (!tbody) return;
    tbody.innerHTML = '';
    let total = 0;
    cart.forEach((c, idx) => {
        const row = document.createElement('tr');
        let nama = c.item.name;
        if (c.isBundle) nama += ' (Bundle)';
        let satuanTeks = '';
        if (c.unitConversion) {
            const unitName = kasirSatuan.find(s => s.id == c.unitConversion.unit)?.name || '?';
            satuanTeks = `${unitName} (${c.qty})`;
        } else if (c.weightGram > 0) {
            satuanTeks = `${c.weightGram} g (${c.qty.toFixed(3)} kg)`;
        } else {
            satuanTeks = `${c.qty}`;
        }
        const hargaSatuan = formatRupiah(c.pricePerUnit);
        const subtotalStr = formatRupiah(c.subtotal);
        row.innerHTML = `
            <td>${nama}</td>
            <td>${satuanTeks}</td>
            <td>${hargaSatuan}</td>
            <td>${subtotalStr}</td>
            <td><button class="action-btn delete-btn" onclick="removeFromCart(${idx})">${icons.delete}</button></td>
        `;
        tbody.appendChild(row);
        total += c.subtotal;
    });
    totalEl.textContent = formatRupiah(total);
    cartCount.textContent = cart.length;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCartPage();
    saveCartToLocalStorage();
    if (document.getElementById('payment-page').style.display === 'block') {
        const total = cart.reduce((sum, c) => sum + c.subtotal, 0);
        document.getElementById('payment-total').textContent = formatRupiah(total);
        updatePaymentSummary();
    }
}

// formatRupiah sudah ada di utils.js

// ==================== FUNGSI PIUTANG ====================
function updatePiutangButtonCart() {
    const btn = document.getElementById('piutang-btn-cart');
    if (!btn) return;
    if (selectedCustomer && selectedCustomer.outstanding > 0) {
        btn.classList.add('active');
        btn.style.background = '#dc3545';
    } else {
        btn.classList.remove('active');
        btn.style.background = '#ccc';
    }
}

function addOutstandingToCart() {
    if (!selectedCustomer || selectedCustomer.outstanding <= 0) {
        showNotification('Tidak ada piutang untuk ditambahkan', 'warning');
        return;
    }
    const existing = cart.find(c => c.isOutstanding === true);
    if (existing) {
        showNotification('Piutang sudah ada di keranjang', 'info');
        return;
    }
    const outstandingItem = {
        item: {
            id: 'outstanding-' + selectedCustomer.id,
            name: 'Piutang ' + selectedCustomer.name,
            stock: Infinity
        },
        qty: 1,
        pricePerUnit: selectedCustomer.outstanding,
        subtotal: selectedCustomer.outstanding,
        isOutstanding: true,
        customerId: selectedCustomer.id
    };
    cart.push(outstandingItem);
    renderCartPage();
    saveCartToLocalStorage();
    updatePiutangButtonCart();
    showNotification('Piutang ditambahkan ke keranjang', 'success');
}

// ==================== FUNGSI PEMBAYARAN ====================
function openPaymentPage() {
    if (cart.length === 0) {
        showNotification('Keranjang masih kosong', 'warning');
        return;
    }
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('payment-page').style.display = 'block';

    document.getElementById('payment-cash').value = '0';
    document.getElementById('payment-card').value = '0';
    document.getElementById('payment-transfer').value = '0';
    document.getElementById('payment-ewallet').value = '0';

    const total = cart.reduce((sum, c) => sum + c.subtotal, 0);
    document.getElementById('payment-total').textContent = formatRupiah(total);
    updatePaymentSummary();
}

function closePaymentPage() {
    document.getElementById('payment-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'block';
}

function updatePaymentSummary() {
    const total = cart.reduce((sum, c) => sum + c.subtotal, 0);
    const cash = parseFloat(document.getElementById('payment-cash').value) || 0;
    const card = parseFloat(document.getElementById('payment-card').value) || 0;
    const transfer = parseFloat(document.getElementById('payment-transfer').value) || 0;
    const ewallet = parseFloat(document.getElementById('payment-ewallet').value) || 0;
    const paidTotal = cash + card + transfer + ewallet;

    document.getElementById('payment-grand-total').textContent = formatRupiah(paidTotal);

    const change = paidTotal - total;
    const changeEl = document.getElementById('change-amount');
    const shortageEl = document.getElementById('shortage-display');
    const shortageAmount = document.getElementById('shortage-amount');

    if (change >= 0) {
        changeEl.textContent = `Kembalian: ${formatRupiah(change)}`;
        changeEl.style.color = '#006B54';
        shortageEl.style.display = 'none';
    } else {
        changeEl.textContent = `Kembalian: Rp 0`;
        changeEl.style.color = 'red';
        shortageEl.style.display = 'block';
        shortageAmount.textContent = formatRupiah(total - paidTotal);
    }
}

async function processPayment() {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, c) => sum + c.subtotal, 0);
    const cash = parseFloat(document.getElementById('payment-cash').value) || 0;
    const card = parseFloat(document.getElementById('payment-card').value) || 0;
    const transfer = parseFloat(document.getElementById('payment-transfer').value) || 0;
    const ewallet = parseFloat(document.getElementById('payment-ewallet').value) || 0;

    const paidTotal = cash + card + transfer + ewallet;
    const shortage = total - paidTotal;

    if (shortage > 0) {
        if (!selectedCustomer) {
            showNotification('Untuk mencatat piutang, harus pilih pelanggan terlebih dahulu', 'error');
            return;
        }
        pendingPayments = [
            { method: 'cash', amount: cash },
            { method: 'card', amount: card },
            { method: 'transfer', amount: transfer },
            { method: 'ewallet', amount: ewallet }
        ].filter(p => p.amount > 0);
        pendingTotalPaid = paidTotal;

        document.getElementById('shortage-confirm').textContent = formatRupiah(shortage);
        document.getElementById('confirm-piutang-modal').style.display = 'flex';
        return;
    }

    await executePayment(paidTotal, 0);
}

async function processPaymentWithPiutang() {
    closeConfirmPiutangModal();
    const total = cart.reduce((sum, c) => sum + c.subtotal, 0);
    const shortage = total - pendingTotalPaid;
    await executePayment(pendingTotalPaid, shortage);
}

async function executePayment(paidTotal, outstandingAdded) {
    try {
        showLoading();
        for (let c of cart) {
            if (c.isOutstanding) continue;
            if (c.isBundle) {
                for (let comp of c.components) {
                    const item = kasirItems.find(i => i.id === comp.itemId);
                    if (!item) continue;
                    let needed = comp.qty * c.qty;
                    if (comp.unitConversionId) {
                        const conv = item.unitConversions?.find(u => u.id == comp.unitConversionId);
                        if (conv) needed *= conv.value;
                    }
                    item.stock -= needed;
                    item.updatedAt = new Date().toISOString();
                    await dbPut(STORES.KASIR_ITEMS, item);
                }
            } else {
                let requiredStock;
                if (c.weightGram > 0) requiredStock = c.qty;
                else if (c.unitConversion) requiredStock = c.qty * c.unitConversion.value;
                else requiredStock = c.qty;
                const item = kasirItems.find(i => i.id === c.item.id);
                if (item) {
                    item.stock -= requiredStock;
                    item.updatedAt = new Date().toISOString();
                    await dbPut(STORES.KASIR_ITEMS, item);
                }
            }
        }

        for (let c of cart) {
            if (c.isOutstanding) {
                const custId = c.customerId;
                if (!custId) {
                    showNotification('Item piutang tidak memiliki customerId', 'warning');
                    continue;
                }
                const cust = customers.find(cust => cust.id === custId);
                if (!cust) {
                    showNotification(`Customer dengan ID ${custId} tidak ditemukan`, 'warning');
                    continue;
                }
                const paymentAmount = c.subtotal;
                if (cust.outstanding >= paymentAmount) {
                    cust.outstanding -= paymentAmount;
                } else {
                    cust.outstanding = 0;
                    showNotification(`Outstanding customer ${cust.name} lebih kecil dari pembayaran, diset 0`, 'warning');
                }
                cust.updatedAt = new Date().toISOString();
                await dbPut(STORES.CUSTOMERS, cust);

                if (selectedCustomer && selectedCustomer.id === custId) {
                    selectedCustomer.outstanding = cust.outstanding;
                    const badge = document.getElementById('customer-badge');
                    if (badge) {
                        badge.textContent = selectedCustomer.name.charAt(0).toUpperCase();
                        badge.style.display = 'flex';
                    }
                }
            }
        }

        if (outstandingAdded > 0 && selectedCustomer) {
            const cust = customers.find(c => c.id === selectedCustomer.id);
            if (cust) {
                cust.outstanding = (cust.outstanding || 0) + outstandingAdded;
                cust.updatedAt = new Date().toISOString();
                await dbPut(STORES.CUSTOMERS, cust);
                selectedCustomer.outstanding = cust.outstanding;
            }
        }

        const cash = parseFloat(document.getElementById('payment-cash').value) || 0;
        const card = parseFloat(document.getElementById('payment-card').value) || 0;
        const transfer = parseFloat(document.getElementById('payment-transfer').value) || 0;
        const ewallet = parseFloat(document.getElementById('payment-ewallet').value) || 0;
        const payments = [];
        if (cash > 0) payments.push({ method: 'cash', amount: cash });
        if (card > 0) payments.push({ method: 'card', amount: card });
        if (transfer > 0) payments.push({ method: 'transfer', amount: transfer });
        if (ewallet > 0) payments.push({ method: 'ewallet', amount: ewallet });

        const transactionNumber = await generateTransactionNumber();

        const subtotal = cart.reduce((sum, c) => sum + c.subtotal, 0);
        const discount = 0;
        const tax = 0;
        const total = subtotal - discount + tax;
        const change = paidTotal - total;

        const items = cart.map(c => {
            let costPerUnit = 0;
            if (!c.isOutstanding) {
                if (c.unitConversion && c.unitConversion.basePrice !== undefined) {
                    costPerUnit = c.unitConversion.basePrice;
                } else if (c.item.hargaDasar !== undefined) {
                    costPerUnit = c.item.hargaDasar;
                }
            }
            return {
                itemId: c.item.id,
                itemName: c.item.name,
                qty: c.qty,
                pricePerUnit: c.pricePerUnit,
                subtotal: c.subtotal,
                unitConversion: c.unitConversion ? { id: c.unitConversion.unit, name: kasirSatuan.find(s => s.id == c.unitConversion.unit)?.name } : null,
                weightGram: c.weightGram || 0,
                cost: costPerUnit,
                isBundle: c.isBundle || false,
                bundleId: c.bundleId || null,
                components: c.isBundle ? c.components : null
            };
        });

        const salesData = {
            transactionNumber,
            date: new Date().toISOString(),
            items,
            subtotal,
            discount,
            tax,
            total,
            payments,
            paidTotal,
            change,
            outstandingAdded,
            customerId: selectedCustomer ? selectedCustomer.id : null,
            customerName: selectedCustomer ? selectedCustomer.name : null
        };

        await dbAdd(STORES.SALES, salesData);

        lastTransactionData = {
            items: cart.map(c => ({
                name: c.item.name,
                qty: c.qty,
                unit: c.unitConversion ? (kasirSatuan.find(s => s.id == c.unitConversion.unit)?.name || '?') : (c.weightGram ? 'kg' : 'pcs'),
                price: c.pricePerUnit,
                subtotal: c.subtotal
            })),
            total: total,
            paidAmount: paidTotal,
            change: change,
            date: new Date().toLocaleString('id-ID'),
            transactionNumber: transactionNumber
        };

        await loadKasirItems();
        await loadCustomers();
        renderProductList();
        showNotification(`Pembayaran berhasil (${payments.map(p => p.method).join(', ')})${outstandingAdded>0 ? ' (dengan piutang)' : ''}`, 'success');
        
        document.getElementById('print-receipt-btn').disabled = false;
        
        cart = [];
        selectedCustomer = null;
        document.getElementById('customer-badge').style.display = 'none';
        renderCartPage();
        saveCartToLocalStorage();

        await updateDashboard();
    } catch (error) {
        console.error('Error processing payment:', error);
        showNotification('Gagal memproses pembayaran: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function closeConfirmPiutangModal() {
    document.getElementById('confirm-piutang-modal').style.display = 'none';
    pendingPayments = [];
    pendingTotalPaid = 0;
}

// ==================== FUNGSI PRINT VIA WEB SERIAL ====================
async function printReceipt() {
    if (!printerPort) {
        showNotification('Printer belum terhubung', 'error');
        return;
    }

    let dataToPrint = lastTransactionData;
    if (!dataToPrint) {
        if (cart.length === 0) {
            showNotification('Tidak ada data untuk dicetak', 'warning');
            return;
        }
        const total = cart.reduce((s, c) => s + c.subtotal, 0);
        dataToPrint = {
            items: cart.map(c => ({
                name: c.item.name,
                qty: c.qty,
                unit: c.unitConversion ? (kasirSatuan.find(s => s.id == c.unitConversion.unit)?.name || '?') : (c.weightGram ? 'kg' : 'pcs'),
                price: c.pricePerUnit,
                subtotal: c.subtotal
            })),
            total: total,
            paidAmount: total,
            change: 0,
            date: new Date().toLocaleString('id-ID'),
            transactionNumber: 'DRAFT'
        };
    }

    const { paperWidth, header, footer, showDateTime, showTransactionNumber, showCashier } = receiptConfig;

    try {
        const writer = printerPort.writable.getWriter();
        const encoder = new TextEncoder();
        let receipt = '\n';

        const headerLines = header.split('\n');
        headerLines.forEach(line => {
            const wrapped = wrapText(line, paperWidth);
            wrapped.forEach(l => {
                receipt += l.padEnd(paperWidth) + '\n';
            });
        });
        receipt += '='.repeat(paperWidth) + '\n';

        if (showDateTime) {
            receipt += `Tanggal: ${new Date().toLocaleString('id-ID')}\n`;
        }
        if (showTransactionNumber && dataToPrint.transactionNumber) {
            receipt += `No.    : ${dataToPrint.transactionNumber}\n`;
        }
        if (showCashier) {
            receipt += `Kasir  : ${currentUser ? currentUser.name : 'Admin'}\n`;
        }
        receipt += '-'.repeat(paperWidth) + '\n';

        dataToPrint.items.forEach(item => {
            const nameWrapped = wrapText(item.name, paperWidth - 5);
            nameWrapped.forEach((line, idx) => {
                if (idx === 0) {
                    receipt += line + '\n';
                } else {
                    receipt += '     ' + line + '\n';
                }
            });
            const qtyStr = `${item.qty} ${item.unit} x ${formatRupiah(item.price)}`;
            const subtotalStr = formatRupiah(item.subtotal);
            const line = qtyStr + ' '.repeat(Math.max(1, paperWidth - qtyStr.length - subtotalStr.length)) + subtotalStr;
            receipt += line + '\n';
        });

        receipt += '-'.repeat(paperWidth) + '\n';

        const totalLabel = 'Total';
        const totalVal = formatRupiah(dataToPrint.total);
        receipt += totalLabel + ' '.repeat(paperWidth - totalLabel.length - totalVal.length) + totalVal + '\n';

        const paidLabel = 'Bayar';
        const paidVal = formatRupiah(dataToPrint.paidAmount);
        receipt += paidLabel + ' '.repeat(paperWidth - paidLabel.length - paidVal.length) + paidVal + '\n';

        const changeLabel = 'Kembali';
        const changeVal = formatRupiah(dataToPrint.change);
        receipt += changeLabel + ' '.repeat(paperWidth - changeLabel.length - changeVal.length) + changeVal + '\n';

        receipt += '='.repeat(paperWidth) + '\n';

        const footerLines = footer.split('\n');
        footerLines.forEach(line => {
            const wrapped = wrapText(line, paperWidth);
            wrapped.forEach(l => {
                receipt += l.padEnd(paperWidth) + '\n';
            });
        });

        receipt += '\n\n\n';

        await writer.write(encoder.encode(receipt));
        writer.releaseLock();
        showNotification('Struk berhasil dicetak', 'success');
    } catch (error) {
        console.error('Error printing:', error);
        showNotification('Gagal mencetak: ' + error.message, 'error');
    }
}

async function togglePrinter() {
    if (printerPort) {
        try {
            await printerPort.close();
            printerPort = null;
            updatePrinterStatus(false);
            showNotification('Printer diputuskan', 'info');
        } catch (error) {
            console.error('Error disconnecting printer:', error);
            showNotification('Gagal memutuskan printer: ' + error.message, 'error');
        }
    } else {
        if (!navigator.serial) {
            showNotification('Web Serial API tidak didukung di browser ini. Gunakan Chrome/Edge.', 'error');
            return;
        }
        try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            printerPort = port;
            updatePrinterStatus(true);
            showNotification('Printer terhubung', 'success');
        } catch (error) {
            console.error('Error connecting printer:', error);
            showNotification('Gagal connect printer: ' + error.message, 'error');
        }
    }
}

function updatePrinterStatus(connected) {
    const statusLight = document.getElementById('printer-status-light');
    const statusText = document.getElementById('printer-status-text');
    const connectBtnText = document.getElementById('connect-btn-text');
    if (connected) {
        statusLight.classList.add('connected');
        statusText.textContent = '';
        connectBtnText.textContent = 'Disconnect';
    } else {
        statusLight.classList.remove('connected');
        statusText.textContent = '';
        connectBtnText.textContent = 'Connect';
    }
}

async function autoReconnectPrinter() {
    if (!navigator.serial) return;
    try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
            const port = ports[0];
            await port.open({ baudRate: 9600 });
            printerPort = port;
            updatePrinterStatus(true);
            console.log('Printer auto-connected');
        }
    } catch (error) {
        console.warn('Auto reconnect printer failed:', error);
    }
}

// ==================== FUNGSI INVENTORY ====================
function openInventoryStokModal() {
    document.getElementById('inventory-modal-title').innerHTML = `
        <svg class="icon icon-primary" viewBox="0 0 24 24">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
        </svg> Stok Barang`;

    let html = `
        <div>
            <input type="text" id="inventory-search-input" class="form-input" 
                   placeholder="Cari item..." style="margin-bottom:10px;" 
                   oninput="filterInventoryTable(this.value)">
            <div id="inventory-table-container"></div>
            <div style="margin-top:20px;">
                <button class="form-button-secondary" onclick="closeInventoryModal()">Tutup</button>
            </div>
        </div>
    `;

    document.getElementById('inventory-modal-body').innerHTML = html;
    filterInventoryTable('');
    document.getElementById('inventory-modal').style.display = 'flex';
    closeDrawer();
}

function filterInventoryTable(filterText) {
    const container = document.getElementById('inventory-table-container');
    if (!container) return;

    const filter = filterText.toLowerCase();

    const filteredItems = kasirItems.filter(item => {
        const matchesName = item.name.toLowerCase().includes(filter);
        const matchesCode = item.code.toLowerCase().includes(filter);
        const matchesBarcode = item.barcode && item.barcode.toLowerCase().includes(filter);

        let matchesUnitBarcode = false;
        if (item.unitConversions && Array.isArray(item.unitConversions)) {
            matchesUnitBarcode = item.unitConversions.some(conv =>
                conv.barcode && conv.barcode.toLowerCase().includes(filter)
            );
        }

        return matchesName || matchesCode || matchesBarcode || matchesUnitBarcode;
    });

    let tableHtml = '<table style="width:100%; border-collapse:collapse;">';
    tableHtml += '<thead><tr><th>Nama Item</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>';

    filteredItems.forEach(item => {
        tableHtml += `<tr>
            <td>${item.name}</td>
            <td>${item.stock !== undefined ? item.stock : 0}</td>
            <td>
                <button class="action-btn edit-btn" onclick="openStockOpnameForItem(${item.id})">
                    ${icons.edit}
                </button>
            </td>
        </tr>`;
    });

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}

function openInventoryOpnameModal() {
    openInventoryStokModal();
    closeDrawer();
}

function openStockOpnameForItem(itemId) {
    const item = kasirItems.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('inventory-modal-title').innerHTML = `
        <svg class="icon icon-primary" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
        </svg> Stok Opname: ${item.name}`;
    
    const html = `
        <div style="padding:20px;">
            <label>Stok Saat Ini: ${item.stock}</label>
            <input type="number" id="opname-stock-value" class="form-input" value="${item.stock}" step="any" min="0">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px; margin-top:20px;">
                <button class="form-button-secondary" onclick="openInventoryStokModal()">Batal</button>
                <button class="form-button-primary" onclick="updateStock(${item.id})">Simpan</button>
            </div>
        </div>
    `;
    document.getElementById('inventory-modal-body').innerHTML = html;
}

async function updateStock(itemId) {
    const newStock = parseFloat(document.getElementById('opname-stock-value').value);
    if (isNaN(newStock) || newStock < 0) {
        showNotification('Stok harus angka positif', 'error');
        return;
    }
    try {
        showLoading();
        const item = kasirItems.find(i => i.id === itemId);
        if (item) {
            item.stock = newStock;
            item.updatedAt = new Date().toISOString();
            await dbPut(STORES.KASIR_ITEMS, item);
            await loadKasirItems();
            await updateDashboard();
            showNotification('Stok diperbarui', 'success');
            openInventoryStokModal();
        }
    } catch (error) {
        showNotification('Gagal update stok: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function openInventoryLaporanModal() {
    document.getElementById('inventory-modal-title').innerHTML = `
        <svg class="icon icon-primary" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg> Laporan Stok`;
    
    let html = '<div style="max-height:400px; overflow-y:auto;">';
    html += '<table style="width:100%; border-collapse:collapse;">';
    html += '<thead><tr><th>Nama Item</th><th>Stok</th></tr></thead><tbody>';
    kasirItems.forEach(item => {
        html += `<tr><td>${item.name}</td><td>${item.stock !== undefined ? item.stock : 0}</td></tr>`;
    });
    html += '</tbody></table></div>';
    html += '<div style="margin-top:20px;"><button class="form-button-secondary" onclick="closeInventoryModal()">Tutup</button></div>';
    
    document.getElementById('inventory-modal-body').innerHTML = html;
    document.getElementById('inventory-modal').style.display = 'flex';
    closeDrawer();
}

function closeInventoryModal() {
    document.getElementById('inventory-modal').style.display = 'none';
}

// ==================== FUNGSI TAMPILAN PRODUK ====================
function setProductViewMode(mode) {
    productViewMode = mode;
    const listBtn = document.getElementById('view-list-btn');
    const gridBtn = document.getElementById('view-grid-btn');
    if (listBtn && gridBtn) {
        if (mode === 'list') {
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        } else {
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        }
    }
    renderProductList();
}

function renderProductList(itemsToRender = null) {
    const container = document.getElementById('product-container');
    if (!container) return;

    const items = itemsToRender || kasirItems;
    if (!items || items.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Tidak ada produk</div>';
        return;
    }

    let html = '';
    if (productViewMode === 'list') {
        html = '<div class="product-list">';
        items.forEach(item => {
            let step = item.isWeighable ? '0.01' : '1';
            let min = '0.01';
            html += `
                <div class="product-list-item" onclick="addToCartFromProductWithQty(${item.id}, this)">
                    <div class="name"><strong>${item.name}</strong></div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0;">
                        <span class="price" style="font-size: 0.9rem;">${formatRupiah(item.hargaJual)}</span>
                        <div class="qty-control">
                            <button class="qty-minus" onclick="event.stopPropagation(); adjustQty(this, -1, ${item.id})">-</button>
                            <input type="number" class="qty-input" value="1" min="${min}" max="${item.stock}" step="${step}" data-id="${item.id}" onclick="event.stopPropagation();" onchange="event.stopPropagation();">
                            <button class="qty-plus" onclick="event.stopPropagation(); adjustQty(this, 1, ${item.id})">+</button>
                        </div>
                    </div>
                    <div class="stock" style="font-size: 0.8rem; color: ${item.stock > 0 ? '#006B54' : '#ff6b6b'}">Stok: ${item.stock}</div>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html = '<div class="product-grid">';
        items.forEach(item => {
            let step = item.isWeighable ? '0.01' : '1';
            let min = '0.01';
            html += `
                <div class="product-card" onclick="addToCartFromProductWithQty(${item.id}, this)">
                    <div class="product-image">
                        <svg viewBox="0 0 24 24" width="48" height="48">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke="currentColor" fill="none"/>
                            <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor"/>
                            <line x1="7" y1="15" x2="12" y2="15" stroke="currentColor"/>
                        </svg>
                    </div>
                    <div class="name"><strong>${item.name}</strong></div>
                    <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                        <span class="price">${formatRupiah(item.hargaJual)}</span>
                        <span class="stock" style="color: ${item.stock > 0 ? '#006B54' : '#ff6b6b'}">Stok: ${item.stock}</span>
                    </div>
                    <div class="qty-control" style="display: flex; justify-content: center; gap: 5px; margin-top: 5px;">
                        <button class="qty-minus" onclick="event.stopPropagation(); adjustQty(this, -1, ${item.id})">-</button>
                        <input type="number" class="qty-input" value="1" min="${min}" max="${item.stock}" step="${step}" data-id="${item.id}" style="width: 50px; text-align: center;" onclick="event.stopPropagation();" onchange="event.stopPropagation();">
                        <button class="qty-plus" onclick="event.stopPropagation(); adjustQty(this, 1, ${item.id})">+</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    container.innerHTML = html;
}

function filterProductList(keyword) {
    keyword = keyword.toLowerCase().trim();
    if (!keyword) {
        currentFilteredItems = [...kasirItems];
    } else {
        currentFilteredItems = kasirItems.filter(item => {
            const matchItem = 
                (item.name && item.name.toLowerCase().includes(keyword)) ||
                (item.code && item.code.toLowerCase().includes(keyword)) ||
                (item.barcode && item.barcode.toLowerCase().includes(keyword));
            if (matchItem) return true;

            if (item.unitConversions && Array.isArray(item.unitConversions)) {
                return item.unitConversions.some(conv => 
                    conv.barcode && conv.barcode.toLowerCase().includes(keyword)
                );
            }
            return false;
        });
    }
    renderProductList(currentFilteredItems);
}

function adjustQty(btn, delta, itemId) {
    const container = btn.closest('.product-list-item, .product-card');
    const input = container.querySelector('.qty-input');
    if (input) {
        const item = kasirItems.find(i => i.id === itemId);
        let step = 1;
        if (item && item.isWeighable) step = 0.01;
        let newVal = parseFloat(input.value) + (delta * step);
        let min = parseFloat(input.min) || 0.01;
        let max = parseFloat(input.max);
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;
        if (item && item.isWeighable) {
            newVal = Math.round(newVal * 100) / 100;
        } else {
            newVal = Math.round(newVal);
        }
        input.value = newVal;
    }
}

function addToCartFromProductWithQty(itemId, element) {
    const input = element.querySelector('.qty-input');
    let qty = 1;
    if (input) {
        qty = parseFloat(input.value);
        if (isNaN(qty) || qty <= 0) qty = 0.01;
    }
    const item = kasirItems.find(i => i.id === itemId);
    if (item) {
        addToCart(item, qty, null, 0);
    }
}

// ==================== FUNGSI PENDING TRANSACTIONS ====================
function openPendingTransactionsModal() {
    const container = document.getElementById('pending-transactions-list');
    container.innerHTML = '';
    if (pendingTransactions.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Tidak ada transaksi pending.</div>';
    } else {
        pendingTransactions.forEach((trans, index) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #eee';
            div.innerHTML = `
                <div style="flex:1;">
                    <strong>${trans.pendingCode || 'Transaksi ' + trans.id}</strong><br>
                    <span style="font-size:0.8rem;">
                        Tanggal: ${new Date(trans.createdAt).toLocaleString()}<br>
                        Total: ${formatRupiah(trans.total)}<br>
                        Customer: ${trans.customerName || '-'}
                    </span>
                </div>
                <div>
                    <button class="action-btn edit-btn" onclick="loadPendingTransaction(${trans.id})">Muat</button>
                    <button class="action-btn delete-btn" onclick="deletePendingTransactionPrompt(${trans.id})">Hapus</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    document.getElementById('pending-transactions-modal').style.display = 'flex';
}

function closePendingTransactionsModal() {
    document.getElementById('pending-transactions-modal').style.display = 'none';
}

async function deletePendingTransactionPrompt(id) {
    if (confirm('Hapus transaksi pending ini?')) {
        await deletePendingTransaction(id);
        openPendingTransactionsModal();
    }
}

function loadPendingTransaction(id) {
    const trans = pendingTransactions.find(t => t.id === id);
    if (trans) {
        const newCart = [];
        trans.cart.forEach(c => {
            if (c.isBundle) {
                const bundle = bundles.find(b => b.id == c.bundleId);
                if (bundle) {
                    newCart.push({
                        item: { id: 'bundle-' + bundle.id, name: bundle.name, stock: Infinity },
                        qty: c.qty,
                        unitConversion: null,
                        weightGram: 0,
                        pricePerUnit: c.pricePerUnit,
                        subtotal: c.subtotal,
                        isBundle: true,
                        bundleId: bundle.id,
                        components: c.components || bundle.components
                    });
                }
            } else {
                const item = kasirItems.find(i => i.id === c.itemId);
                if (item) {
                    newCart.push({
                        item: item,
                        qty: c.qty,
                        unitConversion: c.unitConversion,
                        weightGram: c.weightGram,
                        pricePerUnit: c.pricePerUnit,
                        subtotal: c.subtotal
                    });
                } else {
                    showNotification(`Item dengan ID ${c.itemId} tidak ditemukan, dilewati.`, 'warning');
                }
            }
        });
        cart = newCart;
        if (trans.customerId) {
            const cust = customers.find(c => c.id === trans.customerId);
            if (cust) selectedCustomer = cust;
            else selectedCustomer = null;
        } else {
            selectedCustomer = null;
        }
        const badge = document.getElementById('customer-badge');
        if (selectedCustomer) {
            badge.textContent = selectedCustomer.name.charAt(0).toUpperCase();
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
        renderCartPage();
        updatePiutangButtonCart();
        saveCartToLocalStorage();

        deletePendingTransaction(id).then(() => {
            showNotification('Transaksi pending dimuat dan dihapus dari daftar', 'success');
        }).catch(error => {
            console.error('Gagal menghapus transaksi pending:', error);
        });

        closePendingTransactionsModal();
        if (document.getElementById('transaksi-page').style.display !== 'block') {
            openTransaksiPage();
        }
    }
}

function saveDraftTransaction() {
    if (cart.length === 0) {
        showNotification('Keranjang kosong, tidak ada yang disimpan', 'warning');
        return;
    }
    document.getElementById('pending-code-input').value = '';
    document.getElementById('pending-code-modal').style.display = 'flex';
}

function closePendingCodeModal() {
    document.getElementById('pending-code-modal').style.display = 'none';
}

async function confirmSaveDraft() {
    const pendingCode = document.getElementById('pending-code-input').value.trim();
    closePendingCodeModal();

    const total = cart.reduce((sum, c) => sum + c.subtotal, 0);
    const transactionData = {
        pendingCode: pendingCode || `Pending ${new Date().toLocaleString()}`,
        cart: cart.map(c => ({
            itemId: c.item.id,
            itemName: c.item.name,
            qty: c.qty,
            unitConversion: c.unitConversion ? { ...c.unitConversion } : null,
            weightGram: c.weightGram,
            pricePerUnit: c.pricePerUnit,
            subtotal: c.subtotal,
            isBundle: c.isBundle || false,
            bundleId: c.bundleId,
            components: c.components
        })),
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerName: selectedCustomer ? selectedCustomer.name : null,
        total: total,
        createdAt: new Date().toISOString()
    };
    try {
        showLoading();
        await savePendingTransaction(transactionData);
        showNotification('Transaksi disimpan sebagai draft', 'success');
    } catch (error) {
        showNotification('Gagal menyimpan draft: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function savePendingTransaction(transactionData) {
    try {
        const now = new Date().toISOString();
        const data = { ...transactionData, createdAt: now };
        const id = await dbAdd(STORES.PENDING_TRANSACTIONS, data);
        data.id = id;
        pendingTransactions.push(data);
        updatePendingBadge();
        await updateDashboard();
        return data;
    } catch (error) {
        console.error('Error saving pending transaction:', error);
        throw error;
    }
}

async function deletePendingTransaction(id) {
    try {
        await dbDelete(STORES.PENDING_TRANSACTIONS, id);
        pendingTransactions = pendingTransactions.filter(t => t.id !== id);
        updatePendingBadge();
        await updateDashboard();
    } catch (error) {
        console.error('Error deleting pending transaction:', error);
        throw error;
    }
}

// ==================== FUNGSI LAPORAN PENJUALAN ====================
function openLaporanPage() {
    window.open('laporan.html', '_blank');
}

// ==================== FUNGSI PEMBELIAN ====================
function openPembelianPage() {
    window.open('pembelian.html', '_blank');
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

// ==================== FUNGSI DASHBOARD ====================
async function updateDashboard() {
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
        notif.innerHTML = `💰 Total piutang dari ${customersWithOutstanding.length} pelanggan: ${formatRupiah(totalOutstanding)}. <button onclick="openDaftarCustomerModal()">Lihat</button>`;
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

// ==================== FUNGSI HALAMAN CUSTOMER ====================
function openAddCustomerPage() {
    editingCustomerId = null;
    document.getElementById('customer-page-title').textContent = 'Tambah Pelanggan';
    document.getElementById('customer-code').value = '';
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-level').value = 'Bronze';
    document.getElementById('customer-contact').value = '';
    document.getElementById('customer-account').value = '';
    document.getElementById('customer-bank').value = '';
    document.getElementById('customer-token').value = '';
    document.getElementById('customer-email').value = '';
    document.getElementById('customer-address').value = '';
    showCustomerPage();
}

function openEditCustomerPage(id) {
    const cust = customers.find(c => c.id === id);
    if (!cust) return;
    editingCustomerId = id;
    document.getElementById('customer-page-title').textContent = 'Edit Pelanggan';
    document.getElementById('customer-code').value = cust.code || '';
    document.getElementById('customer-name').value = cust.name || '';
    document.getElementById('customer-level').value = cust.level || 'Bronze';
    document.getElementById('customer-contact').value = cust.contact || '';
    document.getElementById('customer-account').value = cust.accountNumber || '';
    document.getElementById('customer-bank').value = cust.bankName || '';
    document.getElementById('customer-token').value = cust.token || '';
    document.getElementById('customer-email').value = cust.email || '';
    document.getElementById('customer-address').value = cust.address || '';
    showCustomerPage();
}

function showCustomerPage() {
    document.querySelector('.main-content').style.display = 'none';
    document.getElementById('transaksi-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('payment-page').style.display = 'none';
    document.getElementById('customer-list-page').style.display = 'none';
    document.getElementById('supplier-add-page').style.display = 'none';
    document.getElementById('supplier-list-page').style.display = 'none';
    document.getElementById('customer-add-page').style.display = 'block';
    closeDrawer();
}

function openListCustomerPage() {
    document.querySelector('.main-content').style.display = 'none';
    document.getElementById('transaksi-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('payment-page').style.display = 'none';
    document.getElementById('customer-add-page').style.display = 'none';
    document.getElementById('supplier-add-page').style.display = 'none';
    document.getElementById('supplier-list-page').style.display = 'none';
    document.getElementById('customer-list-page').style.display = 'block';
    renderCustomerList();
    closeDrawer();
}

function closeCustomerPage() {
    document.getElementById('customer-add-page').style.display = 'none';
    document.getElementById('customer-list-page').style.display = 'none';
    document.querySelector('.main-content').style.display = 'block';
}

function renderCustomerList() {
    const container = document.getElementById('customer-list-container');
    if (!container) return;
    if (customers.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">Belum ada pelanggan.</p>';
        return;
    }
    let html = '<table class="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>Level</th><th>Kontak</th><th>Piutang</th><th>Aksi</th></tr></thead><tbody>';
    customers.forEach(c => {
        html += `<tr>
            <td>${c.code || '-'}</td>
            <td>${c.name}</td>
            <td>${c.level || 'Bronze'}</td>
            <td>${c.contact || '-'}</td>
            <td>${formatRupiah(c.outstanding || 0)}</td>
            <td>
                <button class="action-btn edit-btn" onclick="openEditCustomerPage(${c.id})">${icons.edit}</button>
                <button class="action-btn delete-btn" onclick="deleteCustomer(${c.id})">${icons.delete}</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function saveCustomer() {
    const code = document.getElementById('customer-code').value.trim();
    const name = document.getElementById('customer-name').value.trim();
    const level = document.getElementById('customer-level').value;
    const contact = document.getElementById('customer-contact').value.trim();
    const accountNumber = document.getElementById('customer-account').value.trim();
    const bankName = document.getElementById('customer-bank').value.trim();
    const token = document.getElementById('customer-token').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const address = document.getElementById('customer-address').value.trim();

    if (!code || !name) {
        showNotification('Kode dan Nama harus diisi', 'error');
        return;
    }

    const duplicate = customers.find(c => c.code === code && c.id !== editingCustomerId);
    if (duplicate) {
        showNotification('Kode pelanggan sudah digunakan', 'error');
        return;
    }

    const now = new Date().toISOString();
    try {
        showLoading();
        if (editingCustomerId) {
            const cust = customers.find(c => c.id === editingCustomerId);
            if (cust) {
                cust.code = code;
                cust.name = name;
                cust.level = level;
                cust.contact = contact;
                cust.accountNumber = accountNumber;
                cust.bankName = bankName;
                cust.token = token;
                cust.email = email;
                cust.address = address;
                cust.updatedAt = now;
                await dbPut(STORES.CUSTOMERS, cust);
            }
        } else {
            const newCust = {
                code, name, level, contact, accountNumber, bankName, token, email, address,
                outstanding: 0,
                createdAt: now,
                updatedAt: now
            };
            await dbAdd(STORES.CUSTOMERS, newCust);
        }
        await loadCustomers();
        showNotification('Pelanggan berhasil disimpan', 'success');
        openListCustomerPage();
    } catch (error) {
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteCustomer(id) {
    if (!confirm('Hapus pelanggan ini?')) return;
    try {
        showLoading();
        await dbDelete(STORES.CUSTOMERS, id);
        customers = customers.filter(c => c.id !== id);
        if (selectedCustomer && selectedCustomer.id === id) {
            selectedCustomer = null;
            document.getElementById('customer-badge').style.display = 'none';
        }
        renderCustomerList();
        showNotification('Pelanggan dihapus', 'success');
    } catch (error) {
        showNotification('Gagal hapus: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function openDaftarCustomerModal() {
    openListCustomerPage();
}

// ==================== FUNGSI HALAMAN SUPPLIER ====================
function openAddSupplierPage() {
    editingSupplierId = null;
    document.getElementById('supplier-page-title').textContent = 'Tambah Supplier';
    document.getElementById('supplier-code').value = '';
    document.getElementById('supplier-name').value = '';
    document.getElementById('supplier-contact').value = '';
    document.getElementById('supplier-address').value = '';
    document.getElementById('supplier-email').value = '';
    document.getElementById('supplier-account').value = '';
    document.getElementById('supplier-bank').value = '';
    showSupplierPage();
}

function openEditSupplierPage(id) {
    const sup = suppliers.find(s => s.id === id);
    if (!sup) return;
    editingSupplierId = id;
    document.getElementById('supplier-page-title').textContent = 'Edit Supplier';
    document.getElementById('supplier-code').value = sup.code || '';
    document.getElementById('supplier-name').value = sup.name || '';
    document.getElementById('supplier-contact').value = sup.contact || '';
    document.getElementById('supplier-address').value = sup.address || '';
    document.getElementById('supplier-email').value = sup.email || '';
    document.getElementById('supplier-account').value = sup.accountNumber || '';
    document.getElementById('supplier-bank').value = sup.bankName || '';
    showSupplierPage();
}

function showSupplierPage() {
    document.querySelector('.main-content').style.display = 'none';
    document.getElementById('transaksi-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('payment-page').style.display = 'none';
    document.getElementById('customer-add-page').style.display = 'none';
    document.getElementById('customer-list-page').style.display = 'none';
    document.getElementById('supplier-list-page').style.display = 'none';
    document.getElementById('supplier-add-page').style.display = 'block';
    closeDrawer();
}

function openListSupplierPage() {
    document.querySelector('.main-content').style.display = 'none';
    document.getElementById('transaksi-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('payment-page').style.display = 'none';
    document.getElementById('customer-add-page').style.display = 'none';
    document.getElementById('customer-list-page').style.display = 'none';
    document.getElementById('supplier-add-page').style.display = 'none';
    document.getElementById('supplier-list-page').style.display = 'block';
    renderSupplierList();
    closeDrawer();
}

function closeSupplierPage() {
    document.getElementById('supplier-add-page').style.display = 'none';
    document.getElementById('supplier-list-page').style.display = 'none';
    document.querySelector('.main-content').style.display = 'block';
}

function renderSupplierList() {
    const container = document.getElementById('supplier-list-container');
    if (!container) return;
    if (suppliers.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">Belum ada supplier.</p>';
        return;
    }
    let html = '<table class="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>Kontak</th><th>Email</th><th>Aksi</th></tr></thead><tbody>';
    suppliers.forEach(s => {
        html += `<tr>
            <td>${s.code || '-'}</td>
            <td>${s.name}</td>
            <td>${s.contact || '-'}</td>
            <td>${s.email || '-'}</td>
            <td>
                <button class="action-btn edit-btn" onclick="openEditSupplierPage(${s.id})">${icons.edit}</button>
                <button class="action-btn delete-btn" onclick="deleteSupplier(${s.id})">${icons.delete}</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function saveSupplier() {
    const code = document.getElementById('supplier-code').value.trim();
    const name = document.getElementById('supplier-name').value.trim();
    const contact = document.getElementById('supplier-contact').value.trim();
    const address = document.getElementById('supplier-address').value.trim();
    const email = document.getElementById('supplier-email').value.trim();
    const accountNumber = document.getElementById('supplier-account').value.trim();
    const bankName = document.getElementById('supplier-bank').value.trim();

    if (!code || !name) {
        showNotification('Kode dan Nama harus diisi', 'error');
        return;
    }

    const duplicate = suppliers.find(s => s.code === code && s.id !== editingSupplierId);
    if (duplicate) {
        showNotification('Kode supplier sudah digunakan', 'error');
        return;
    }

    const now = new Date().toISOString();
    try {
        showLoading();
        if (editingSupplierId) {
            const sup = suppliers.find(s => s.id === editingSupplierId);
            if (sup) {
                sup.code = code;
                sup.name = name;
                sup.contact = contact;
                sup.address = address;
                sup.email = email;
                sup.accountNumber = accountNumber;
                sup.bankName = bankName;
                sup.updatedAt = now;
                await dbPut(STORES.SUPPLIERS, sup);
            }
        } else {
            const newSup = {
                code, name, contact, address, email, accountNumber, bankName,
                createdAt: now,
                updatedAt: now
            };
            await dbAdd(STORES.SUPPLIERS, newSup);
        }
        await loadSuppliers();
        showNotification('Supplier berhasil disimpan', 'success');
        openListSupplierPage();
    } catch (error) {
        showNotification('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteSupplier(id) {
    if (!confirm('Hapus supplier ini?')) return;
    try {
        showLoading();
        await dbDelete(STORES.SUPPLIERS, id);
        suppliers = suppliers.filter(s => s.id !== id);
        renderSupplierList();
        showNotification('Supplier dihapus', 'success');
    } catch (error) {
        showNotification('Gagal hapus: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
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
        currentFilteredItems = [...kasirItems];
        await loadKasirSatuan();
        await loadCustomers();
        await loadSuppliers();
        await loadPendingTransactions();
        await loadBundles();
        await loadCartFromLocalStorage();
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
        else if (event.target.id === 'inventory-modal') closeInventoryModal();
        else if (event.target.id === 'customer-modal') closeCustomerModal?.();
        else if (event.target.id === 'list-customer-modal') closeListCustomerModal?.();
        else if (event.target.id === 'supplier-modal') closeSupplierModal?.();
        else if (event.target.id === 'list-supplier-modal') closeListSupplierModal?.();
        else if (event.target.id === 'select-customer-modal') closeSelectCustomerModal();
        else if (event.target.id === 'pending-transactions-modal') closePendingTransactionsModal();
        else if (event.target.id === 'confirm-piutang-modal') closeConfirmPiutangModal();
        else if (event.target.id === 'pending-code-modal') closePendingCodeModal();
        else if (event.target.id === 'create-admin-modal') closeCreateAdminModal();
        else if (event.target.id === 'user-modal') closeUserModal();
        else if (event.target.id === 'bundle-modal') closeBundleModal();
        else if (event.target.id === 'customer-add-page') closeCustomerPage();
        else if (event.target.id === 'customer-list-page') closeCustomerPage();
        else if (event.target.id === 'supplier-add-page') closeSupplierPage();
        else if (event.target.id === 'supplier-list-page') closeSupplierPage();
    }
};

document.addEventListener('visibilitychange', () => { 
    if (!document.hidden) { 
        console.log('Page became visible, refreshing data...'); 
        refreshData(); 
    } 
});
