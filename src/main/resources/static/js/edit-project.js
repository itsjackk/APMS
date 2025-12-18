// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

const projectId = window.PROJECT_CONFIG?.projectId;
const userRole = window.PROJECT_CONFIG?.userRole || 'USER';
const username = window.PROJECT_CONFIG?.username;
let currentProject = null;

// ============================================================================
// DOM READY & INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    createSnowflakes();

    if (!projectId || projectId === '' || projectId === 'null') {
        showError('No project ID provided. Please navigate to this page from the projects list.');
        return;
    }

    initializeFormHandler();
    loadProjectDetails();
});

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('editProjectForm').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
}

function showForm() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('editProjectForm').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('editProjectForm').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();

    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    alertContainer.innerHTML = alertHTML;

    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// ============================================================================
// SNOWFLAKES ANIMATION
// ============================================================================

function createSnowflakes() {
    const snowflakesContainer = document.getElementById('snowflakes');
    if (!snowflakesContainer) return;

    const snowflakeCount = 50;

    for (let i = 0; i < snowflakeCount; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = '❄';

        const leftPos = Math.random() * 100;
        const animationDuration = 5 + Math.random() * 10;
        const animationDelay = Math.random() * 5;
        const size = 0.5 + Math.random() * 1.5;

        snowflake.style.left = `${leftPos}%`;
        snowflake.style.animationDuration = `${animationDuration}s`;
        snowflake.style.animationDelay = `${animationDelay}s`;
        snowflake.style.fontSize = `${size}em`;

        snowflakesContainer.appendChild(snowflake);
    }
}

// ============================================================================
// PROJECT DATA MANAGEMENT - Now using AuthUtils
// ============================================================================

async function loadProjectDetails() {
    showLoading();

    try {
        const response = await AuthUtils.makeAuthenticatedRequest(`/api/projects/${projectId}`);

        if (response.ok) {
            const project = await response.json();
            currentProject = project;
            populateForm(project);
            showForm();
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `Failed to load project (Status: ${response.status})`;
            throw new Error(errorMessage);
        }
    } catch (error) {
        if (error.message.includes('Authentication failed') || error.message.includes('Unauthorized')) {
            return; // AuthUtils already handles redirect
        }
        showError(error.message);
    }
}

function populateForm(project) {
    document.getElementById('projectName').value = project.name || '';
    document.getElementById('projectDescription').value = project.description || '';
    document.getElementById('projectStatus').value = project.status || 'PLANNING';
    document.getElementById('projectPriority').value = project.priority || 'MEDIUM';
    document.getElementById('createdBy').value = project.createdByName || project.createdBy || 'N/A';

    if (project.startDate) {
        const startDate = project.startDate.split('T')[0];
        document.getElementById('startDate').value = startDate;
    }

    if (project.endDate) {
        const endDate = project.endDate.split('T')[0];
        document.getElementById('endDate').value = endDate;
    }
}

async function updateProject(projectData) {
    try {
        const response = await AuthUtils.makeAuthenticatedRequest(`/api/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });

        if (response.ok) {
            const updatedProject = await response.json();
            showAlert('Project updated successfully!', 'success');
            currentProject = updatedProject;

            setTimeout(() => {
                window.location.href = '/ConsoleApp/projects';
            }, 1500);
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `Failed to update project (Status: ${response.status})`;
            throw new Error(errorMessage);
        }
    } catch (error) {
        if (error.message.includes('Authentication failed') || error.message.includes('Unauthorized')) {
            return; // AuthUtils already handles redirect
        }
        throw error;
    }
}

// ============================================================================
// FORM HANDLING
// ============================================================================

function initializeFormHandler() {
    const form = document.getElementById('editProjectForm');

    if (!form) {
        return;
    }

    form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');

    submitBtn.disabled = true;
    submitText.style.display = 'none';
    submitSpinner.style.display = 'inline';

    try {
        const projectData = {
            name: document.getElementById('projectName').value.trim(),
            description: document.getElementById('projectDescription').value.trim() || null,
            status: document.getElementById('projectStatus').value,
            priority: document.getElementById('projectPriority').value,
            startDate: document.getElementById('startDate').value || null,
            endDate: document.getElementById('endDate').value || null
        };

        if (!projectData.name) {
            throw new Error('Project name is required.');
        }

        if (projectData.endDate && projectData.startDate &&
            new Date(projectData.endDate) < new Date(projectData.startDate)) {
            throw new Error('End date cannot be before start date.');
        }

        if (projectData.startDate) {
            projectData.startDate = projectData.startDate + 'T00:00:00';
        }
        if (projectData.endDate) {
            projectData.endDate = projectData.endDate + 'T00:00:00';
        }

        await updateProject(projectData);
    } catch (error) {
        if (error.message.includes('Authentication failed') || error.message.includes('Unauthorized')) {
            return; // AuthUtils already handles redirect
        }
        showAlert(error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitSpinner.style.display = 'none';
    }
}

// ============================================================================
// LOGOUT FUNCTIONALITY - Now using AuthUtils
// ============================================================================

async function logout() {
    await AuthUtils.logout();
}