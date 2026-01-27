// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const state = {
    isAdmin: false,
    userRole: /*[[${role}]]*/ 'USER',
    dataLoaded: false
};

// ============================================================================
// CONSTANTS - Use SharedConfig
// ============================================================================
const API_ENDPOINTS = {
    USERS: SharedConfig.API_ENDPOINTS.ADMIN_USERS,
    PROJECTS: SharedConfig.API_ENDPOINTS.PROJECTS
};

const ROUTES = {
    PROJECTS: SharedConfig.ROUTES.PROJECTS
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

const ALERT_TYPES = SharedConfig.ALERT_TYPES;

const PROJECT_TYPES = {
    GLOBAL: 'global',
    PERSONAL: 'personal'
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    if (state.dataLoaded) return;

    state.dataLoaded = true;

    // Check authentication first
    const isAuth = await AuthUtils.isAuthenticated();
    if (!isAuth) {
        AuthUtils.redirectToLogin();
        return;
    }

    await initializePage();
});

async function initializePage() {
    VisualEffects.createSnowflakes();
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
        const response = await AuthUtils.makeAuthenticatedRequest(AuthUtils.CONFIG.API_ENDPOINTS.VERIFY);

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
        const username = AuthUtils.getUsername();
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
        const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.USERS);

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
            SharedUtils.showAlert(validationError, ALERT_TYPES.DANGER);
            return;
        }

        // Submit project
        await submitProject(projectData);

    } catch (error) {
        console.error('Error creating project:', error);
        SharedUtils.showAlert(ErrorMessages.PROJECT_CREATE_FAILED, ALERT_TYPES.DANGER);
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
    // Use FormValidator for comprehensive validation
    const rules = {
        name: {
            required: true,
            minLength: 1,
            maxLength: 100
        },
        description: {
            maxLength: 500
        }
    };
    
    const validation = FormValidator.validate({
        name: projectData.name,
        description: projectData.description
    }, rules);
    
    if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        return firstError;
    }

    // Validate date logic
    if (projectData.startDate && projectData.endDate) {
        const start = new Date(projectData.startDate);
        const end = new Date(projectData.endDate);
        if (end < start) {
            return ErrorMessages.END_BEFORE_START;
        }
    }

    return null;
}

async function submitProject(projectData) {
    const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.PROJECTS, {
        method: 'POST',
        body: JSON.stringify(projectData)
    });

    const result = await response.json();

    if (response.ok) {
        SharedUtils.showAlert(SuccessMessages.PROJECT_CREATED, ALERT_TYPES.SUCCESS);

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
            SharedUtils.showAlert(ErrorMessages.SESSION_EXPIRED, ALERT_TYPES.DANGER);
            setTimeout(() => {
                AuthUtils.redirectToLogin();
            }, 2000);
        } else {
            SharedUtils.showAlert(result.message || ErrorMessages.PROJECT_CREATE_FAILED, ALERT_TYPES.DANGER);
        }
    }
}

function setLoadingState(submitBtn, submitText, submitSpinner, isLoading) {
    submitBtn.disabled = isLoading;
    submitText.style.display = isLoading ? 'none' : 'inline';
    submitSpinner.style.display = isLoading ? 'inline' : 'none';
}

// Use SharedUtils.showAlert instead

async function logout() {
    try {
        await AuthUtils.logout();
    } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, redirect to login
        AuthUtils.redirectToLogin();
    }
}