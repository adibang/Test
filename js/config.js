// ==================== KONFIGURASI BARCODE & STRUK ====================

// Load konfigurasi barcode dari database
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

// Simpan konfigurasi barcode
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

// Simpan dari UI
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

// Load konfigurasi struk
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

// Simpan konfigurasi struk
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

// Menampilkan modal settings (seluruh konten settings)
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

    // Event listener untuk update total digit
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
    
    // Panggil fungsi renderUserListSettings dari auth.js
    renderUserListSettings();
    document.getElementById('settings-modal').style.display = 'flex';
    closeDrawer();
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}
