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
    document.querySelector('.main-content').style.display = 'block';
    document.getElementById('transaksi-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('payment-page').style.display = 'none';
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

// ==================== FUNGSI MANAJEMEN PENGGUNA (MODAL) ====================
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
