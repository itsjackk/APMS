
// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const state = {
    userData: null,
    isEditMode: false
};

// ============================================================================
// CONSTANTS
// ============================================================================
const ELEMENTS = {
    viewMode: 'viewMode',
    editMode: 'editMode',
    profileForm: 'profileForm',
    passwordForm: 'passwordForm',
    editButton: 'editButton',
    cancelButton: 'cancelButton',
    snowflakes: 'snowflakes'
};

const DISPLAY_FIELDS = {
    username: 'displayUsername',
    usernameGHUB: 'displayUsernameGHUB',
    email: 'displayEmail',
    createdAt: 'displayCreatedAt'
};

const EDIT_FIELDS = {
    username: 'editUsername',
    email: 'editEmail',
    usernameGHUB: 'editUsernameGHUB'
};

const PASSWORD_FIELDS = {
    current: 'currentPassword',
    new: 'newPassword',
    confirm: 'confirmPassword'
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    createSnowflakes();
    initializeEventListeners();
    loadUserProfile();
});

// ============================================================================
// UI EFFECTS
// ============================================================================
function createSnowflakes() {
    const container = document.getElementById(ELEMENTS.snowflakes);
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const snowflakeCount = 50;

    for (let i = 0; i < snowflakeCount; i++) {
        fragment.appendChild(createSnowflake());
    }

    container.appendChild(fragment);
}

function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.innerHTML = '❄';

    Object.assign(snowflake.style, {
        left: `${Math.random() * 100}%`,
        animationDuration: `${5 + Math.random() * 10}s`,
        animationDelay: `${Math.random() * 5}s`,
        fontSize: `${0.5 + Math.random() * 1.5}em`
    });

    return snowflake;
}

// ============================================================================
// AUTHENTICATION & TOKEN MANAGEMENT
// ============================================================================
function getAccessToken() {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    if (isTokenExpired(token)) {
        clearAuthData();
        return null;
    }
    return token;
}

function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    } catch (error) {
        return true;
    }
}

function clearAuthData() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
}

function redirectToLogin() {
    window.location.href = '/ConsoleApp/login';
}

async function makeAuthenticatedRequest(url, options = {}) {
    const accessToken = getAccessToken();
    if (!accessToken) {
        redirectToLogin();
        throw new Error('No valid access token');
    }

    const requestOptions = {
        ...options,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    const response = await fetch(url, requestOptions);

    if (response.status === 401) {
        clearAuthData();
        redirectToLogin();
        throw new Error('Authentication failed');
    }

    return response;
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================
async function loadUserProfile() {
    try {
        const response = await makeAuthenticatedRequest('/api/user/profile');

        if (response.ok) {
            const responseText = await response.text();
            state.userData = JSON.parse(responseText);
            displayUserProfile(state.userData);
        }
    } catch (error) {
        showAlert('Error loading profile data', 'danger');
    }
}

function displayUserProfile(user) {
    if (!user) return;

    updateElement(DISPLAY_FIELDS.username, user.username || 'Not set');
    updateElement(DISPLAY_FIELDS.usernameGHUB, user.usernameGHUB || 'Not set');
    updateElement(DISPLAY_FIELDS.email, user.email || 'Not set');
    updateElement(DISPLAY_FIELDS.createdAt, formatDate(user.createdAt));

    updateInputValue(EDIT_FIELDS.username, user.username || '');
    updateInputValue(EDIT_FIELDS.email, user.email || '');
    updateInputValue(EDIT_FIELDS.usernameGHUB, user.usernameGHUB || '');
}

function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function updateInputValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    }
}

function toggleEditMode() {
    const viewMode = document.getElementById(ELEMENTS.viewMode);
    const editMode = document.getElementById(ELEMENTS.editMode);

    if (!viewMode || !editMode) return;

    state.isEditMode = !state.isEditMode;

    if (state.isEditMode) {
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
    } else {
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function initializeEventListeners() {
    setupProfileFormListener();
    setupPasswordFormListener();
    setupButtonListeners();
}

function setupProfileFormListener() {
    const form = document.getElementById(ELEMENTS.profileForm);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleProfileUpdate();
    });
}

function setupPasswordFormListener() {
    const form = document.getElementById(ELEMENTS.passwordForm);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePasswordChange();
    });
}

function setupButtonListeners() {
    const editButton = document.getElementById(ELEMENTS.editButton);
    const cancelButton = document.getElementById(ELEMENTS.cancelButton);

    if (editButton) {
        editButton.addEventListener('click', toggleEditMode);
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            toggleEditMode();
            if (state.userData) {
                displayUserProfile(state.userData);
            }
        });
    }
}

// ============================================================================
// FORM HANDLERS
// ============================================================================
async function handleProfileUpdate() {
    const email = getInputValue(EDIT_FIELDS.email);
    const usernameGHUB = getInputValue(EDIT_FIELDS.usernameGHUB);

    try {
        const response = await makeAuthenticatedRequest('/api/user/profile', {
            method: 'PUT',
            body: JSON.stringify({ email, usernameGHUB })
        });

        if (response.ok) {
            showAlert('Profile updated successfully!', 'success');
            await loadUserProfile();
            toggleEditMode();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Failed to update profile', 'danger');
        }
    } catch (error) {
        showAlert('Error updating profile', 'danger');
    }
}

async function handlePasswordChange() {
    const currentPassword = getInputValue(PASSWORD_FIELDS.current);
    const newPassword = getInputValue(PASSWORD_FIELDS.new);
    const confirmPassword = getInputValue(PASSWORD_FIELDS.confirm);

    if (!validatePasswordChange(newPassword, confirmPassword)) {
        return;
    }

    try {
        const response = await makeAuthenticatedRequest('/api/user/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (response.ok) {
            showAlert('Password updated successfully!', 'success');
            clearPasswordForm();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Failed to update password', 'danger');
        }
    } catch (error) {
        showAlert('Error changing password', 'danger');
    }
}

function validatePasswordChange(newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match!', 'danger');
        return false;
    }

    if (newPassword.length < 8) {
        showAlert('Password must be at least 8 characters long!', 'danger');
        return false;
    }

    return true;
}

function clearPasswordForm() {
    const form = document.getElementById(ELEMENTS.passwordForm);
    if (form) {
        form.reset();
    }
}

function getInputValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value.trim() : '';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = createAlertElement(message, type);
    const container = document.querySelector('.main-content');

    if (!container) return;

    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function createAlertElement(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    return alertDiv;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================================================
// LOGOUT
// ============================================================================
function logout() {
    clearAuthData();
    redirectToLogin();
}

window.logout = logout;