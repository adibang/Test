// ==================== FUNGSI DEBUG ====================
function showDebugError(message) {
    const el = document.getElementById('debug-error');
    if (el) {
        el.style.display = 'block';
        el.innerHTML = '❌ Error: ' + message;
    } else {
        alert('Error: ' + message);
    }
}

// ==================== VARIABEL GLOBAL KHUSUS HALAMAN ====================
let editingCustomerId = null;
let editingSupplierId = null;

// ==================== CEK SESSION ====================
async function checkSession() {
    const savedUser = sessionStorage.getItem('currentUser');
    if (!savedUser) {
        window.location.href = 'index.html';
        return false;
    }
    try {
        const parsed = JSON.parse(savedUser);
        // Pastikan user masih ada di database
        const user = await dbGet(STORES.USERS, parsed.id);
        if (!user && parsed.id !== 'bypass') {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return false;
        }
        // Tampilkan nama user
        document.getElementById('user-name-display').textContent = user ? user.name : parsed.name;
        return true;
    } catch (e) {
        console.error('Error checkSession:', e);
        window.location.href = 'index.html';
        return false;
    }
}

// ==================== INISIALISASI HALAMAN ====================
async function initRelasiPage() {
    showLoading();
    try {
        // Pastikan variabel global terdefinisi
        if (typeof customers === 'undefined') window.customers = [];
        if (typeof suppliers === 'undefined') window.suppliers = [];

        await initDatabase();
        const sessionOk = await checkSession();
        if (!sessionOk) return;

        // Muat data customer dan supplier
        await loadCustomers();
        await loadSuppliers();

        // Tentukan action dari URL
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');

        if (action === 'customerAdd') {
            showAddCustomerPage();
        } else if (action === 'customerEdit') {
            const id = urlParams.get('id');
            if (id) showEditCustomerPage(parseInt(id));
            else window.location.href = 'relasi.html?action=customerList';
        } else if (action === 'customerList') {
            showListCustomerPage();
        } else if (action === 'supplierAdd') {
            showAddSupplierPage();
        } else if (action === 'supplierEdit') {
            const id = urlParams.get('id');
            if (id) showEditSupplierPage(parseInt(id));
            else window.location.href = 'relasi.html?action=supplierList';
        } else if (action === 'supplierList') {
            showListSupplierPage();
        } else {
            // Default: tampilkan pilihan
            showDefaultPage();
        }
    } catch (error) {
        console.error('Error init relasi page:', error);
        showDebugError(error.message);
        showNotification('Gagal memuat halaman: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== HALAMAN DEFAULT ====================
function showDefaultPage() {
    const html = `
        <div class="page">
            <div class="page-header">
                <h2>Manajemen Relasi</h2>
            </div>
            <div class="page-content" style="text-align:center; padding:40px;">
                <p>Silakan pilih menu:</p>
                <div style="display:flex; gap:20px; justify-content:center; margin-top:20px;">
                    <button class="form-button-primary" onclick="window.location.href='?action=customerList'">Daftar Pelanggan</button>
                    <button class="form-button-primary" onclick="window.location.href='?action=supplierList'">Daftar Supplier</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('relasi-content').innerHTML = html;
}

// ==================== FUNGSI CUSTOMER ====================
function showAddCustomerPage() {
    editingCustomerId = null;
    const html = `
        <div class="page">
            <div class="page-header">
                <button class="back-button" onclick="window.location.href='?action=customerList'" title="Kembali">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h2>Tambah Pelanggan</h2>
            </div>
            <div class="page-content">
                <form id="customer-form" onsubmit="event.preventDefault();">
                    <div class="form-group">
                        <label>Kode Pelanggan *</label>
                        <input type="text" id="customer-code" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label>Nama Pelanggan *</label>
                        <input type="text" id="customer-name" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label>Level Pelanggan</label>
                        <select id="customer-level" class="form-input">
                            <option value="Bronze">Bronze</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="Platinum">Platinum</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Kontak (Telp/HP)</label>
                        <input type="text" id="customer-contact" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>No Rekening</label>
                        <input type="text" id="customer-account" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Nama Bank</label>
                        <input type="text" id="customer-bank" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>No Token Listrik</label>
                        <input type="text" id="customer-token" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="customer-email" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Alamat</label>
                        <textarea id="customer-address" class="form-input" rows="3"></textarea>
                    </div>
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button type="button" class="form-button-secondary" onclick="window.location.href='?action=customerList'">Batal</button>
                        <button type="button" class="form-button-primary" onclick="saveCustomer()">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('relasi-content').innerHTML = html;
}

function showEditCustomerPage(id) {
    const cust = customers.find(c => c.id === id);
    if (!cust) {
        showNotification('Pelanggan tidak ditemukan', 'error');
        window.location.href = '?action=customerList';
        return;
    }
    editingCustomerId = id;
    showAddCustomerPage(); // akan menampilkan form kosong, lalu kita isi
    // Setelah form dirender, isi nilai
    setTimeout(() => {
        document.getElementById('customer-code').value = cust.code || '';
        document.getElementById('customer-name').value = cust.name || '';
        document.getElementById('customer-level').value = cust.level || 'Bronze';
        document.getElementById('customer-contact').value = cust.contact || '';
        document.getElementById('customer-account').value = cust.accountNumber || '';
        document.getElementById('customer-bank').value = cust.bankName || '';
        document.getElementById('customer-token').value = cust.token || '';
        document.getElementById('customer-email').value = cust.email || '';
        document.getElementById('customer-address').value = cust.address || '';
    }, 0);
}

function showListCustomerPage() {
    renderCustomerList();
}

function renderCustomerList() {
    const container = document.getElementById('relasi-content');
    let html = `
        <div class="page">
            <div class="page-header">
                <button class="back-button" onclick="window.location.href='index.html'" title="Kembali">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h2>Daftar Pelanggan</h2>
                <button class="form-button-primary" style="margin-left:auto;" onclick="window.location.href='?action=customerAdd'">+ Tambah</button>
            </div>
            <div class="page-content">
                <div id="customer-list-container"></div>
            </div>
        </div>
    `;
    container.innerHTML = html;

    const listContainer = document.getElementById('customer-list-container');
    if (!customers || customers.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding:20px;">Belum ada pelanggan.</p>';
        return;
    }
    let tableHtml = '<table class="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>Level</th><th>Kontak</th><th>Piutang</th><th>Aksi</th></tr></thead><tbody>';
    customers.forEach(c => {
        tableHtml += `<tr>
            <td>${c.code || '-'}</td>
            <td>${c.name}</td>
            <td>${c.level || 'Bronze'}</td>
            <td>${c.contact || '-'}</td>
            <td>${formatRupiah(c.outstanding || 0)}</td>
            <td>
                <button class="action-btn edit-btn" onclick="window.location.href='?action=customerEdit&id=${c.id}'">${icons.edit}</button>
                <button class="action-btn delete-btn" onclick="deleteCustomer(${c.id})">${icons.delete}</button>
            </td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';
    listContainer.innerHTML = tableHtml;
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
        window.location.href = '?action=customerList';
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
        renderCustomerList();
        showNotification('Pelanggan dihapus', 'success');
    } catch (error) {
        showNotification('Gagal hapus: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== FUNGSI SUPPLIER ====================
function showAddSupplierPage() {
    editingSupplierId = null;
    const html = `
        <div class="page">
            <div class="page-header">
                <button class="back-button" onclick="window.location.href='?action=supplierList'" title="Kembali">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h2>Tambah Supplier</h2>
            </div>
            <div class="page-content">
                <form id="supplier-form" onsubmit="event.preventDefault();">
                    <div class="form-group">
                        <label>Kode Supplier *</label>
                        <input type="text" id="supplier-code" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label>Nama Supplier *</label>
                        <input type="text" id="supplier-name" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label>Kontak (Telp/HP)</label>
                        <input type="text" id="supplier-contact" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Alamat</label>
                        <textarea id="supplier-address" class="form-input" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="supplier-email" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>No Rekening</label>
                        <input type="text" id="supplier-account" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Nama Bank</label>
                        <input type="text" id="supplier-bank" class="form-input">
                    </div>
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button type="button" class="form-button-secondary" onclick="window.location.href='?action=supplierList'">Batal</button>
                        <button type="button" class="form-button-primary" onclick="saveSupplier()">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('relasi-content').innerHTML = html;
}

function showEditSupplierPage(id) {
    const sup = suppliers.find(s => s.id === id);
    if (!sup) {
        showNotification('Supplier tidak ditemukan', 'error');
        window.location.href = '?action=supplierList';
        return;
    }
    editingSupplierId = id;
    showAddSupplierPage();
    setTimeout(() => {
        document.getElementById('supplier-code').value = sup.code || '';
        document.getElementById('supplier-name').value = sup.name || '';
        document.getElementById('supplier-contact').value = sup.contact || '';
        document.getElementById('supplier-address').value = sup.address || '';
        document.getElementById('supplier-email').value = sup.email || '';
        document.getElementById('supplier-account').value = sup.accountNumber || '';
        document.getElementById('supplier-bank').value = sup.bankName || '';
    }, 0);
}

function showListSupplierPage() {
    renderSupplierList();
}

function renderSupplierList() {
    const container = document.getElementById('relasi-content');
    let html = `
        <div class="page">
            <div class="page-header">
                <button class="back-button" onclick="window.location.href='index.html'" title="Kembali">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h2>Daftar Supplier</h2>
                <button class="form-button-primary" style="margin-left:auto;" onclick="window.location.href='?action=supplierAdd'">+ Tambah</button>
            </div>
            <div class="page-content">
                <div id="supplier-list-container"></div>
            </div>
        </div>
    `;
    container.innerHTML = html;

    const listContainer = document.getElementById('supplier-list-container');
    if (!suppliers || suppliers.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding:20px;">Belum ada supplier.</p>';
        return;
    }
    let tableHtml = '<table class="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>Kontak</th><th>Email</th><th>Aksi</th></tr></thead><tbody>';
    suppliers.forEach(s => {
        tableHtml += `<tr>
            <td>${s.code || '-'}</td>
            <td>${s.name}</td>
            <td>${s.contact || '-'}</td>
            <td>${s.email || '-'}</td>
            <td>
                <button class="action-btn edit-btn" onclick="window.location.href='?action=supplierEdit&id=${s.id}'">${icons.edit}</button>
                <button class="action-btn delete-btn" onclick="deleteSupplier(${s.id})">${icons.delete}</button>
            </td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';
    listContainer.innerHTML = tableHtml;
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
        window.location.href = '?action=supplierList';
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

// ==================== MULAI ====================
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Cek dependensi
        if (typeof initDatabase !== 'function') throw new Error('initDatabase tidak ditemukan. Pastikan database.js dimuat.');
        if (typeof loadCustomers !== 'function') throw new Error('loadCustomers tidak ditemukan. Pastikan data.js dimuat.');
        if (typeof loadSuppliers !== 'function') throw new Error('loadSuppliers tidak ditemukan. Pastikan data.js dimuat.');
        if (typeof STORES === 'undefined') throw new Error('STORES tidak ditemukan. Pastikan constants.js dimuat.');
        if (typeof icons === 'undefined') throw new Error('icons tidak ditemukan. Pastikan constants.js dimuat.');
        if (typeof formatRupiah !== 'function') throw new Error('formatRupiah tidak ditemukan. Pastikan utils.js dimuat.');

        await initRelasiPage();
    } catch (error) {
        console.error('Fatal error:', error);
        showDebugError(error.message);
        hideLoading();
    }
});
