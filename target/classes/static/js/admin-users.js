
    const state = {
        currentUserId: null,
        currentUsername: /*[[${username}]]*/ 'Admin',
        allUsers: [],
        dataLoaded: false
    };

    const API_ENDPOINTS = {
        REFRESH: '/api/auth/refresh',
        LOGOUT: '/api/auth/logout',
        USER_STATS: '/api/admin/users/stats',
        USERS: '/api/admin/users',
        USER_ROLE: (userId) => `/api/admin/users/${userId}/role`,
        DELETE_USER: (userId) => `/api/admin/users/${userId}`
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
        deleteUserModal: 'deleteUserModal'
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

    document.addEventListener('DOMContentLoaded', () => {
        if (state.dataLoaded) return;

        state.dataLoaded = true;
        initializeUI();
        loadData();
        setupEventListeners();
    });

    function initializeUI() {
        createSnowflakes();
        setupFormSelectStyling();
    }

    function loadData() {
        loadUserStatistics();
        loadAllUsers();
    }

    function setupEventListeners() {
        // Search input listener with debounce
        const searchInput = document.getElementById(ELEMENTS.searchInput);
        if (searchInput) {
            searchInput.addEventListener('input', debounce(searchUsers, 300));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    function setupFormSelectStyling() {
        const selects = document.querySelectorAll('.form-select');
        selects.forEach(select => {
            select.addEventListener('focus', function() {
                this.style.outline = 'none';
            });
        });
    }

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

    function getAccessToken() {
        let token = localStorage.getItem('accessToken');

        if (!token || isTokenExpired(token)) {
            return refreshAccessToken();
        }

        return token;
    }

    function refreshAccessToken() {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API_ENDPOINTS.REFRESH, false);
        xhr.setRequestHeader('Content-Type', 'application/json');

        try {
            xhr.send();

            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.accessToken) {
                    localStorage.setItem('accessToken', response.accessToken);
                    return response.accessToken;
                }
            }

            redirectToLogin();
            return null;
        } catch (error) {
            console.error('Token refresh error:', error);
            redirectToLogin();
            return null;
        }
    }

    function isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;
        } catch (error) {
            console.error('Token validation error:', error);
            return true;
        }
    }

    function redirectToLogin() {
        clearAuthData();
        window.location.href = '/ConsoleApp/login';
    }

    function clearAuthData() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('username');
    }

    async function logout() {
        try {
            await fetch(API_ENDPOINTS.LOGOUT, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            redirectToLogin();
        }
    }

    async function makeAuthenticatedRequest(url, options = {}) {
        const token = getAccessToken();
        if (!token) {
            redirectToLogin();
            throw new Error('No valid access token');
        }

        const requestOptions = {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, requestOptions);

        if (response.status === 401) {
            redirectToLogin();
            throw new Error('Authentication failed');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        return response;
    }

    async function loadUserStatistics() {
        try {
            const response = await makeAuthenticatedRequest(API_ENDPOINTS.USER_STATS);
            const data = await response.json();

            updateStatistics(data);
        } catch (error) {
            console.error('Error loading user statistics:', error);
            showAlert('Error loading user statistics', ALERT_TYPES.DANGER);
        }
    }

    function updateStatistics(data) {
        updateElement(ELEMENTS.totalUsers, data.totalUsers || 0);
        updateElement(ELEMENTS.adminUsers, data.adminUsers || 0);
        updateElement(ELEMENTS.regularUsers, data.regularUsers || 0);
    }

    function updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    async function loadAllUsers() {
        try {
            const response = await makeAuthenticatedRequest(API_ENDPOINTS.USERS);
            const data = await response.json();

            state.allUsers = Array.isArray(data) ? data : [];
            displayUsers(state.allUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            showAlert('Error loading users', ALERT_TYPES.DANGER);
            state.allUsers = [];
            displayUsers([]);
        }
    }

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
    }

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
    }

    function getRoleBadgeClass(role) {
        return ROLE_CLASSES[role] || ROLE_CLASSES.USER;
    }

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
    }

    function openEditRoleModal(userId, username, currentRole) {
        state.currentUserId = userId;

        updateElement(ELEMENTS.modalUsername, username);

        const roleSelect = document.getElementById(ELEMENTS.roleSelect);
        if (roleSelect) {
            roleSelect.value = currentRole;
        }

        showModal(ELEMENTS.editRoleModal);
    }

    function openDeleteUserModal(userId, username) {
        state.currentUserId = userId;
        updateElement(ELEMENTS.deleteUsername, username);
        showModal(ELEMENTS.deleteUserModal);
    }

    function showModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    function hideModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
    }

    async function confirmRoleChange() {
        const roleSelect = document.getElementById(ELEMENTS.roleSelect);
        if (!roleSelect || !state.currentUserId) {
            showAlert('Invalid role selection', ALERT_TYPES.WARNING);
            return;
        }

        const newRole = roleSelect.value;

        try {
            const response = await makeAuthenticatedRequest(
                API_ENDPOINTS.USER_ROLE(state.currentUserId),
                {
                    method: 'PUT',
                    body: JSON.stringify({ role: newRole })
                }
            );

            if (response.ok) {
                showAlert('User role updated successfully!', ALERT_TYPES.SUCCESS);
                hideModal(ELEMENTS.editRoleModal);
                await loadAllUsers();
            } else {
                throw new Error('Failed to update user role');
            }
        } catch (error) {
            console.error('Error updating user role:', error);
            showAlert('Error updating user role', ALERT_TYPES.DANGER);
        }
    }

    async function confirmDeleteUser() {
        if (!state.currentUserId) return;

        try {
            const response = await makeAuthenticatedRequest(
                API_ENDPOINTS.DELETE_USER(state.currentUserId),
                { method: 'DELETE' }
            );

            if (response.ok) {
                showAlert('User deleted successfully!', ALERT_TYPES.SUCCESS);
                hideModal(ELEMENTS.deleteUserModal);
                await loadAllUsers();
            } else {
                throw new Error('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showAlert('Error deleting user', ALERT_TYPES.DANGER);
        }
    }

    function searchUsers() {
        const searchInput = document.getElementById(ELEMENTS.searchInput);
        if (!searchInput) return;

        const searchTerm = searchInput.value.toLowerCase().trim();

        const filteredUsers = state.allUsers.filter(user =>
            user.username.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );

        displayUsers(filteredUsers);
    }

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
    }

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
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showAlert(message, type) {
        // Simple alert implementation - could be replaced with a proper notification system
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${message}`);
    }
