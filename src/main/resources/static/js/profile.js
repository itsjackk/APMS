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
const API_ENDPOINTS = {
    PROFILE: '/api/user/profile',
    CHANGE_PASSWORD: '/api/user/change-password'
};

const ALERT_TYPES = {
    SUCCESS: 'success',
    DANGER: 'danger',
    INFO: 'info',
    WARNING: 'warning'
};

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
document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await AuthUtils.isAuthenticated();
    if (!isAuth) {
        AuthUtils.redirectToLogin();
        return;
    }

    VisualEffects.createSnowflakes();
    initializeEventListeners();
    loadUserProfile();
});


// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================
async function loadUserProfile() {
    try {
        const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.PROFILE);

        if (response.ok) {
            const responseText = await response.text();
            state.userData = JSON.parse(responseText);
            displayUserProfile(state.userData);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Error loading profile data', ALERT_TYPES.DANGER);
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
        const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.PROFILE, {
            method: 'PUT',
            body: JSON.stringify({ email, usernameGHUB })
        });

        if (response.ok) {
            showAlert('Profile updated successfully!', ALERT_TYPES.SUCCESS);
            await loadUserProfile();
            toggleEditMode();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Failed to update profile', ALERT_TYPES.DANGER);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Error updating profile', ALERT_TYPES.DANGER);
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
        const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.CHANGE_PASSWORD, {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (response.ok) {
            showAlert('Password updated successfully!', ALERT_TYPES.SUCCESS);
            clearPasswordForm();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Failed to update password', ALERT_TYPES.DANGER);
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showAlert('Error changing password', ALERT_TYPES.DANGER);
    }
}

function validatePasswordChange(newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match!', ALERT_TYPES.DANGER);
        return false;
    }

    if (newPassword.length < 8) {
        showAlert('Password must be at least 8 characters long!', ALERT_TYPES.DANGER);
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

function showAlert(message, type = ALERT_TYPES.INFO) {
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
async function logout() {
    await AuthUtils.logout();
}

window.logout = logout;
