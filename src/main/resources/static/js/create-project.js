// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const state = {
    isAdmin: false,
    userRole: /*[[${role}]]*/ 'USER',
    dataLoaded: false
};

// ============================================================================
// CONSTANTS
// ============================================================================
const API_ENDPOINTS = {
    REFRESH: '/api/auth/refresh',
    DASHBOARD: '/api/auth/dashboard',
    USERS: '/api/admin/users',
    PROJECTS: '/api/projects'
};

const ROUTES = {
    LOGIN: '/ConsoleApp/login',
    PROJECTS: '/ConsoleApp/projects'
};

const ELEMENTS = {
    snowflakes: 'snowflakes',
    createProjectForm: 'createProjectForm',
    adminSection: 'adminSection',
    adminBadge: 'adminBadge',
    projectType: 'projectType',
    assignUserSection: 'assignUserSection',
    assignedUser: 'assignedUser',
    submitBtn: 'submitBtn',
    submitText: 'submitText',
    submitSpinner: 'submitSpinner',
    alertContainer: 'alertContainer',
    startDate: 'startDate',
    endDate: 'endDate',
    projectName: 'projectName',
    projectDescription: 'projectDescription',
    projectStatus: 'projectStatus',
    projectPriority: 'projectPriority'
};

const ALERT_TYPES = {
    SUCCESS: 'success',
    DANGER: 'danger',
    WARNING: 'warning',
    INFO: 'info'
};

const PROJECT_TYPES = {
    GLOBAL: 'global',
    PERSONAL: 'personal'
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (state.dataLoaded) return;

    state.dataLoaded = true;
    initializePage();
});

async function initializePage() {
    createSnowflakes();
    setDefaultStartDate();
    await checkUserRole();
    setupEventListeners();
}

function setDefaultStartDate() {
    const startDateElement = document.getElementById(ELEMENTS.startDate);
    if (startDateElement) {
        startDateElement.valueAsDate = new Date();
    }
}

function setupEventListeners() {
    const form = document.getElementById(ELEMENTS.createProjectForm);
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    const projectTypeElement = document.getElementById(ELEMENTS.projectType);
    if (projectTypeElement) {
        projectTypeElement.addEventListener('change', handleProjectTypeChange);
    }
}

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

    if (!token || isTokenExpired(token)) {
        localStorage.removeItem('accessToken');
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
        console.error('Token validation error:', error);
        return true;
    }
}

async function refreshToken() {
    try {
        const response = await fetch(API_ENDPOINTS.REFRESH, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                return true;
            }
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
    return false;
}

function redirectToLogin() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    window.location.href = ROUTES.LOGIN;
}

function logout() {
    redirectToLogin();
}

// ============================================================================
// API CALLS
// ============================================================================
async function makeAuthenticatedRequest(url, options = {}) {
    let token = getAccessToken();

    if (!token) {
        const refreshed = await refreshToken();
        if (!refreshed) {
            redirectToLogin();
            throw new Error('Authentication required');
        }
        token = getAccessToken();
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
        const refreshed = await refreshToken();
        if (refreshed) {
            // Retry with new token
            token = getAccessToken();
            requestOptions.headers['Authorization'] = `Bearer ${token}`;
            return await fetch(url, requestOptions);
        }
        redirectToLogin();
        throw new Error('Authentication failed');
    }

    return response;
}

// ============================================================================
// USER ROLE MANAGEMENT
// ============================================================================
async function checkUserRole() {
    try {
        // First check server-side role
        if (state.userRole === 'ADMIN') {
            state.isAdmin = true;
            showAdminSection();
            await loadUsers();
            return;
        }

        // Fallback to API check
        const token = getAccessToken();
        if (!token) {
            console.log('No access token, redirecting to login');
            redirectToLogin();
            return;
        }

        const response = await makeAuthenticatedRequest(API_ENDPOINTS.DASHBOARD);

        if (response.ok) {
            const data = await response.json();

            if (isUserAdmin(data)) {
                state.isAdmin = true;
                showAdminSection();
                await loadUsers();
            }
        }
    } catch (error) {
        console.error('Error checking user role:', error);

        // Fallback: check username
        const username = localStorage.getItem('username');
        if (username && isAdminUsername(username)) {
            state.isAdmin = true;
            showAdminSection();
            await loadUsers();
        }
    }
}

function isUserAdmin(data) {
    return data.role === 'ADMIN' ||
           data.userRole === 'ADMIN' ||
           (data.user && data.user.role === 'ADMIN') ||
           (data.authorities && data.authorities.includes('ROLE_ADMIN'));
}

function isAdminUsername(username) {
    return username.toLowerCase().includes('admin') || username === 'admin';
}

function showAdminSection() {
    const adminSection = document.getElementById(ELEMENTS.adminSection);
    const adminBadge = document.getElementById(ELEMENTS.adminBadge);

    if (adminSection) adminSection.style.display = 'block';
    if (adminBadge) adminBadge.style.display = 'inline';
}

function handleProjectTypeChange(event) {
    const assignUserSection = document.getElementById(ELEMENTS.assignUserSection);
    const assignedUser = document.getElementById(ELEMENTS.assignedUser);

    if (!assignUserSection) return;

    if (event.target.value === PROJECT_TYPES.GLOBAL) {
        assignUserSection.style.display = 'block';
    } else {
        assignUserSection.style.display = 'none';
        if (assignedUser) assignedUser.value = '';
    }
}

async function loadUsers() {
    try {
        const response = await makeAuthenticatedRequest(API_ENDPOINTS.USERS);

        if (response.ok) {
            const users = await response.json();
            populateUserDropdown(users);
        } else {
            console.warn('Could not load users list, status:', response.status);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function populateUserDropdown(users) {
    const userSelect = document.getElementById(ELEMENTS.assignedUser);
    if (!userSelect) return;

    // Clear existing options
    userSelect.innerHTML = '<option value="">Select a user...</option>';

    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.username} (${user.email || 'No email'})`;
        userSelect.appendChild(option);
    });
}

// ============================================================================
// FORM HANDLING
// ============================================================================
async function handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById(ELEMENTS.submitBtn);
    const submitText = document.getElementById(ELEMENTS.submitText);
    const submitSpinner = document.getElementById(ELEMENTS.submitSpinner);

    // Show loading state
    setLoadingState(submitBtn, submitText, submitSpinner, true);

    try {
        const projectData = collectFormData();

        // Validate form data
        const validationError = validateProjectData(projectData);
        if (validationError) {
            showAlert(validationError, ALERT_TYPES.DANGER);
            return;
        }

        // Get access token
        const accessToken = getAccessToken();
        if (!accessToken) {
            showAlert('Authentication required. Please log in again.', ALERT_TYPES.DANGER);
            redirectToLogin();
            return;
        }

        // Submit project
        await submitProject(projectData, accessToken);

    } catch (error) {
        console.error('Error creating project:', error);
        showAlert('An error occurred while creating the project. Please try again.', ALERT_TYPES.DANGER);
    } finally {
        // Reset loading state
        setLoadingState(submitBtn, submitText, submitSpinner, false);
    }
}

function collectFormData() {
    const projectData = {
        name: getElementValue(ELEMENTS.projectName).trim(),
        description: getElementValue(ELEMENTS.projectDescription).trim() || null,
        status: getElementValue(ELEMENTS.projectStatus),
        priority: getElementValue(ELEMENTS.projectPriority),
        startDate: getElementValue(ELEMENTS.startDate) || null,
        endDate: getElementValue(ELEMENTS.endDate) || null
    };

    // Add admin-specific fields
    if (state.isAdmin) {
        projectData.projectType = getElementValue(ELEMENTS.projectType);
        if (projectData.projectType === PROJECT_TYPES.GLOBAL) {
            projectData.assignedUserId = getElementValue(ELEMENTS.assignedUser) || null;
        }
    }

    return projectData;
}

function getElementValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : '';
}

function validateProjectData(projectData) {
    if (!projectData.name) {
        return 'Project name is required';
    }

    // Validate date logic
    if (projectData.startDate && projectData.endDate) {
        const start = new Date(projectData.startDate);
        const end = new Date(projectData.endDate);
        if (end < start) {
            return 'End date cannot be before start date';
        }
    }

    return null;
}

async function submitProject(projectData, accessToken) {
    const response = await makeAuthenticatedRequest(API_ENDPOINTS.PROJECTS, {
        method: 'POST',
        body: JSON.stringify(projectData)
    });

    const result = await response.json();

    if (response.ok) {
        showAlert('Project created successfully!', ALERT_TYPES.SUCCESS);

        // Reset form
        document.getElementById(ELEMENTS.createProjectForm).reset();
        document.getElementById(ELEMENTS.startDate).valueAsDate = new Date();
        document.getElementById(ELEMENTS.projectPriority).value = 'MEDIUM';

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = ROUTES.PROJECTS;
        }, 1500);
    } else {
        if (response.status === 401) {
            showAlert('Session expired. Please log in again.', ALERT_TYPES.DANGER);
            setTimeout(() => {
                redirectToLogin();
            }, 2000);
        } else {
            showAlert(result.message || 'Failed to create project', ALERT_TYPES.DANGER);
        }
    }
}

function setLoadingState(submitBtn, submitText, submitSpinner, isLoading) {
    submitBtn.disabled = isLoading;
    submitText.style.display = isLoading ? 'none' : 'inline';
    submitSpinner.style.display = isLoading ? 'inline' : 'none';
}

function showAlert(message, type) {
    const alertContainer = document.getElementById(ELEMENTS.alertContainer);

    // Remove existing alerts
    alertContainer.innerHTML = '';

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertContainer.appendChild(alertDiv);
}