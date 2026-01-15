const state = {
    allUsers: [],
    currentUserId: null,
    currentUsername: localStorage.getItem('username') || '',
    dataLoaded: false
};

const API_ENDPOINTS = {
    USER_STATS: '/api/admin/users/stats',
    USERS: '/api/admin/users',
    USER_ROLE: (userId) => `/api/admin/users/${userId}/role`,
    DELETE_USER: (userId) => `/api/admin/users/${userId}`,
    REGISTER: '/api/auth/register'
};

const ELEMENTS = {
    snowflakes: 'snowflakes',
    usersList: 'usersList',
    searchInput: 'searchInput',
    totalUsers: 'totalUsers',
    adminUsers: 'adminUsers',
    regularUsers: 'regularUsers',
    modalUsername: 'modalUsername',
    deleteUsername: 'deleteUsername',
    roleSelect: 'roleSelect',
    editRoleModal: 'editRoleModal',
    deleteUserModal: 'deleteUserModal',
    createUserModal: 'createUserModal'
};

const ROLE_CLASSES = {
    ADMIN: 'bg-danger',
    USER: 'bg-success'
};

const ALERT_TYPES = {
    SUCCESS: 'success',
    DANGER: 'danger',
    WARNING: 'warning',
    INFO: 'info'
};

const SNOWFLAKE_CONFIG = {
    COUNT: 50,
    MIN_DURATION: 5,
    MAX_DURATION: 15,
    MIN_SIZE: 0.5,
    MAX_SIZE: 2
};

const PASSWORD_CONFIG = {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false
};

document.addEventListener('DOMContentLoaded', () => {
    if (state.dataLoaded) return;

    state.dataLoaded = true;
    initializeUI();
    loadData();
    setupEventListeners();
});

function initializeUI() {
    VisualEffects.createSnowflakes();
    setupFormSelectStyling();
};

function loadData() {
    loadUserStatistics();
    loadAllUsers();
};

function setupEventListeners() {
    // Search input listener with debounce
    const searchInput = document.getElementById(ELEMENTS.searchInput);
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchUsers, 300));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Create user form submission
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', createNewUser);
    }

    // Password match validation
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    // Modal reset on close
    const createUserModal = document.getElementById('createUserModal');
    if (createUserModal) {
        createUserModal.addEventListener('hidden.bs.modal', resetCreateUserModal);
    }
};

function setupFormSelectStyling() {
    const selects = document.querySelectorAll('.form-select');
    selects.forEach(select => {
        select.addEventListener('focus', function() {
            this.style.outline = 'none';
        });
    });
};

// ============================================================================
// AUTHENTICATION - Now using AuthUtils
// ============================================================================

async function logout() {
    await AuthUtils.logout();
};

// ============================================================================
// API REQUESTS - Now using AuthUtils
// ============================================================================

async function loadUserStatistics() {
    try {
        const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.USER_STATS);
        const data = await response.json();
        updateStatistics(data);
    } catch (error) {
        console.error('Error loading user statistics:', error);
        showAlert('Error loading user statistics', ALERT_TYPES.DANGER);
    }
};

function updateStatistics(data) {
    updateElement(ELEMENTS.totalUsers, data.totalUsers || 0);
    updateElement(ELEMENTS.adminUsers, data.adminUsers || 0);
    updateElement(ELEMENTS.regularUsers, data.regularUsers || 0);
};

function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
};

async function loadAllUsers() {
    try {
        const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.USERS);
        const data = await response.json();

        state.allUsers = Array.isArray(data) ? data : [];
        displayUsers(state.allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users', ALERT_TYPES.DANGER);
        state.allUsers = [];
        displayUsers([]);
    }
};

function displayUsers(users) {
    const container = document.getElementById(ELEMENTS.usersList);
    if (!container) return;

    container.innerHTML = '';

    if (!users || users.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No users found.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    users.forEach(user => {
        fragment.appendChild(createUserCard(user));
    });

    container.appendChild(fragment);
};

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'card user-card';
    card.innerHTML = `
        <div class="card-body d-flex justify-content-between align-items-center">
            <div>
                <h5>${escapeHtml(user.username)}</h5>
                <p class="text-muted mb-0">${escapeHtml(user.email)}</p>
            </div>
            <div class="d-flex align-items-center">
                <span class="role-badge ${getRoleBadgeClass(user.role)} me-3">
                    ${escapeHtml(user.role)}
                </span>
                <div>
                    ${createActionButtons(user)}
                </div>
            </div>
        </div>
    `;
    return card;
};

function getRoleBadgeClass(role) {
    return ROLE_CLASSES[role] || ROLE_CLASSES.USER;
};

function createActionButtons(user) {
    // Prevent self-deletion/editing if this is the current user
    const isCurrentUser = user.username === state.currentUsername;
    const disabledClass = isCurrentUser ? 'disabled' : '';
    const disabledAttr = isCurrentUser ? 'disabled' : '';

    return `
        <button class="btn btn-sm btn-outline-primary action-btn me-2 ${disabledClass}"
                onclick="openEditRoleModal('${user.id}', '${escapeHtml(user.username)}', '${user.role}')"
                ${disabledAttr}>
            <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-sm btn-outline-danger action-btn ${disabledClass}"
                onclick="openDeleteUserModal('${user.id}', '${escapeHtml(user.username)}')"
                ${disabledAttr}>
            <i class="fas fa-trash"></i> Delete
        </button>
    `;
};

function openEditRoleModal(userId, username, currentRole) {
    state.currentUserId = userId;

    updateElement(ELEMENTS.modalUsername, username);

    const roleSelect = document.getElementById(ELEMENTS.roleSelect);
    if (roleSelect) {
        roleSelect.value = currentRole;
    }

    showModal(ELEMENTS.editRoleModal);
};

function openDeleteUserModal(userId, username) {
    state.currentUserId = userId;
    updateElement(ELEMENTS.deleteUsername, username);
    showModal(ELEMENTS.deleteUserModal);
};

function showModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
};

function hideModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
};

async function confirmRoleChange() {
    const roleSelect = document.getElementById(ELEMENTS.roleSelect);
    if (!roleSelect || !state.currentUserId) {
        showAlert('Invalid role selection', ALERT_TYPES.WARNING);
        return;
    }

    const newRole = roleSelect.value;

    try {
        const response = await AuthUtils.makeAuthenticatedRequest(
            API_ENDPOINTS.USER_ROLE(state.currentUserId),
            {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            }
        );

        if (response.ok) {
            showAlert('User role updated successfully!', ALERT_TYPES.SUCCESS);
            hideModal(ELEMENTS.editRoleModal);
            await loadUserStatistics();
            await loadAllUsers();
        } else {
            throw new Error('Failed to update user role');
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        showAlert('Error updating user role', ALERT_TYPES.DANGER);
    }
};

async function confirmDeleteUser() {
    if (!state.currentUserId) return;

    try {
        const response = await AuthUtils.makeAuthenticatedRequest(
            API_ENDPOINTS.DELETE_USER(state.currentUserId),
            { method: 'DELETE' }
        );

        if (response.ok) {
            showAlert('User deleted successfully!', ALERT_TYPES.SUCCESS);
            hideModal(ELEMENTS.deleteUserModal);
            await loadUserStatistics();
            await loadAllUsers();
        } else {
            throw new Error('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Error deleting user', ALERT_TYPES.DANGER);
    }
};

function searchUsers() {
    const searchInput = document.getElementById(ELEMENTS.searchInput);
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase().trim();

    const filteredUsers = state.allUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );

    displayUsers(filteredUsers);
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

function handleKeyboardShortcuts(event) {
    // ESC key to close modals
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// ==================== CREATE USER ====================

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'Icon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

/**
 * Validate password match
 */
function validatePasswordMatch() {
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('confirmPassword').setCustomValidity('Passwords do not match');
        return false;
    } else {
        document.getElementById('confirmPassword').setCustomValidity('');
        return true;
    }
};

function resetCreateUserModal() {
    // Reset form
    const form = document.getElementById('createUserForm');
    form.reset();

    // Reset password visibility icons
    const newPasswordIcon = document.getElementById('newPasswordIcon');
    const confirmPasswordIcon = document.getElementById('confirmPasswordIcon');

    if (newPasswordIcon) {
        newPasswordIcon.classList.remove('fa-eye-slash');
        newPasswordIcon.classList.add('fa-eye');
    }

    if (confirmPasswordIcon) {
        confirmPasswordIcon.classList.remove('fa-eye-slash');
        confirmPasswordIcon.classList.add('fa-eye');
    }

    // Reset password input types
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');

    if (newPassword) newPassword.type = 'password';
    if (confirmPassword) confirmPassword.type = 'password';

    // Reset button state (in case it wasn't reset)
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-user-plus me-2"></i> Create User';
    }
};

async function createNewUser(event) {
    event.preventDefault();

    const submitButton = event.target.querySelector('button[type="submit"]');
    if (submitButton.disabled) {
        return;
    }

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';

        const username = document.getElementById('newUsername').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const usernameGHUB = document.getElementById('newUsernameGHUB').value.trim();

        if (!username || !email || !password) {
            showAlert('Please fill in all required fields', ALERT_TYPES.DANGER);
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match', ALERT_TYPES.DANGER);
            return;
        }

        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            showAlert(passwordValidation.errors.join('\n'), ALERT_TYPES.DANGER);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address', ALERT_TYPES.DANGER);
            return;
        }

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            window.location.href = ROUTES.LOGIN;
            return;
        }

        const response = await fetch(API_ENDPOINTS.REGISTER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                usernameGHUB: usernameGHUB || null
            })
        });

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned an invalid response');
        }

        if (response.ok) {
            showAlert('User created successfully!', ALERT_TYPES.SUCCESS);

            const modalElement = document.getElementById(ELEMENTS.createUserModal);
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }

            document.getElementById('createUserForm').reset();

            await loadUserStatistics();
            await loadAllUsers();
        } else {
            const errorMessage = data.message || data.error || 'Failed to create user';
            showAlert(errorMessage, ALERT_TYPES.DANGER);
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showAlert('An unexpected error occurred. Please try again.', ALERT_TYPES.DANGER);
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-user-plus me-2"></i> Create User';
        }
    }
};

function validatePasswordStrength(password) {
    const errors = [];

    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters long`);
    }

    if (PASSWORD_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_CONFIG.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_CONFIG.REQUIRE_NUMBER && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (PASSWORD_CONFIG.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
};

function isPasswordStrong(password) {
    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
        return false;
    }

    if (PASSWORD_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        return false;
    }

    if (PASSWORD_CONFIG.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        return false;
    }

    if (PASSWORD_CONFIG.REQUIRE_NUMBER && !/\d/.test(password)) {
        return false;
    }

    if (PASSWORD_CONFIG.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return false;
    }

    return true;
};

/**
 * Show alert message
 */
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer') || createAlertContainer();

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alertContainer';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    document.body.appendChild(container);
    return container;
}