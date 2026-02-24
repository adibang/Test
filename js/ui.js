// ==================== UI FUNCTIONS ====================

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
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

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.backgroundColor = type === 'success' ? '#006B54' : (type === 'error' ? '#dc3545' : '#ffc107');
    notification.style.display = 'block';
    setTimeout(() => { notification.style.display = 'none'; }, 3000);
}
