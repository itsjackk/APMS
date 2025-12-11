// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
    allProjects: [],
    currentProjectId: null,
    progressModal: null
};

// ============================================================================
// CONSTANTS
// ============================================================================

const API_ENDPOINTS = {
    PROJECTS: '/api/projects',
    PROJECTS_UPDATED: '/api/projects/projects-updated',
    PROJECT_PROGRESS: (id) => `/api/projects/${id}/progress`,
    PROJECT_BY_ID: (id) => `/api/projects/${id}`
};

const ROUTES = {
    CREATE_PROJECT: '/ConsoleApp/projects/create',
    EDIT_PROJECT: (id) => `/ConsoleApp/projects/edit/${id}`
};

const ALERT_TYPES = {
    SUCCESS: 'success',
    DANGER: 'danger',
    INFO: 'info',
    WARNING: 'warning'
};

const ELEMENTS = {
    projectsList: 'projectsList',
    statusFilter: 'statusFilter',
    sortBy: 'sortBy',
    logoutBtn: 'logoutBtn',
    saveProgressBtn: 'saveProgressBtn',
    progressModal: 'progressModal',
    progressRange: 'progressRange',
    progressBarText: 'progressBarText',
    progressPreview: 'progressPreview',
    notificationToast: 'notificationToast',
    toastMessage: 'toastMessage',
    snowflakes: 'snowflakes'
};

const STATUS_COLORS = {
    COMPLETED: 'success',
    IN_PROGRESS: 'primary',
    ON_HOLD: 'warning',
    CANCELLED: 'danger',
    PLANNING: 'info'
};

const PRIORITY_COLORS = {
    LOW: 'success',
    MEDIUM: 'primary',
    HIGH: 'warning',
    CRITICAL: 'danger'
};

const PRIORITY_ORDER = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
};

const STATUS_ORDER = {
    PLANNING: 1,
    IN_PROGRESS: 2,
    ON_HOLD: 3,
    COMPLETED: 4,
    CANCELLED: 5
};

const PROGRESS_THRESHOLDS = {
    LOW: 30,
    MEDIUM: 70
};

const SNOWFLAKE_CONFIG = {
    COUNT: 50,
    MIN_DURATION: 5,
    MAX_DURATION: 15,
    MIN_SIZE: 0.5,
    MAX_SIZE: 2
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const isAuth = await AuthUtils.isAuthenticated();
    if (!isAuth) {
        AuthUtils.redirectToLogin();
        return;
    }

    createSnowflakes();
    loadProjects();
    initializeProgressModal();
    attachEventListeners();
});

function attachEventListeners() {
    const elements = {
        statusFilter: document.getElementById(ELEMENTS.statusFilter),
        sortBy: document.getElementById(ELEMENTS.sortBy),
        logoutBtn: document.getElementById(ELEMENTS.logoutBtn),
        saveProgressBtn: document.getElementById(ELEMENTS.saveProgressBtn)
    };

    if (elements.statusFilter) {
        elements.statusFilter.addEventListener('change', filterProjects);
    }
    if (elements.sortBy) {
        elements.sortBy.addEventListener('change', sortProjects);
    }
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await AuthUtils.logout();
        });
    }
    if (elements.saveProgressBtn) {
        elements.saveProgressBtn.addEventListener('click', saveProgress);
    }
}

function initializeProgressModal() {
    const modalElement = document.getElementById(ELEMENTS.progressModal);
    if (!modalElement) return;

    state.progressModal = new bootstrap.Modal(modalElement);

    const progressRange = document.getElementById(ELEMENTS.progressRange);
    const progressBarText = document.getElementById(ELEMENTS.progressBarText);
    const progressPreview = document.getElementById(ELEMENTS.progressPreview);

    if (progressRange && progressBarText && progressPreview) {
        progressRange.addEventListener('input', (e) => {
            const value = e.target.value;
            updateProgressPreview(value, progressBarText, progressPreview);
        });
    }
}

function updateProgressPreview(value, textElement, barElement) {
    textElement.textContent = `${value}%`;
    barElement.style.width = `${value}%`;
    barElement.setAttribute('aria-valuenow', value);
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

function openProgressModal(projectId, currentProgress) {
    state.currentProjectId = projectId;

    const elements = {
        range: document.getElementById(ELEMENTS.progressRange),
        text: document.getElementById(ELEMENTS.progressBarText),
        preview: document.getElementById(ELEMENTS.progressPreview)
    };

    if (!elements.range || !elements.text || !elements.preview) return;

    elements.range.value = currentProgress;
    updateProgressPreview(currentProgress, elements.text, elements.preview);

    if (state.progressModal) {
        state.progressModal.show();
    }
}

// ============================================================================
// UI EFFECTS
// ============================================================================

function createSnowflakes() {
    const container = document.getElementById(ELEMENTS.snowflakes);
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const snowflakeCount = SNOWFLAKE_CONFIG.COUNT;

    for (let i = 0; i < snowflakeCount; i++) {
        const snowflake = createSnowflake();
        fragment.appendChild(snowflake);
    }

    container.appendChild(fragment);
}

function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.innerHTML = '❄';

    Object.assign(snowflake.style, {
        left: `${Math.random() * 100}%`,
        animationDuration: `${SNOWFLAKE_CONFIG.MIN_DURATION + Math.random() * (SNOWFLAKE_CONFIG.MAX_DURATION - SNOWFLAKE_CONFIG.MIN_DURATION)}s`,
        animationDelay: `${Math.random() * 5}s`,
        fontSize: `${SNOWFLAKE_CONFIG.MIN_SIZE + Math.random() * (SNOWFLAKE_CONFIG.MAX_SIZE - SNOWFLAKE_CONFIG.MIN_SIZE)}em`
    });

    return snowflake;
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

async function loadProjects() {
    try {
        const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.PROJECTS_UPDATED, {
            method: 'GET'
        });

        if (response.ok) {
            state.allProjects = await response.json();
            displayProjects(state.allProjects);
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to load projects (Status: ${response.status})`);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showError(`Error loading projects: ${error.message}`);
    }
}

function displayProjects(projects) {
    const container = document.getElementById(ELEMENTS.projectsList);
    if (!container) {
        console.error('Projects list container not found');
        return;
    }

    if (!Array.isArray(projects)) {
        console.error('Invalid projects data:', projects);
        showError('Invalid project data received');
        return;
    }

    if (projects.length === 0) {
        container.innerHTML = createEmptyState();
        return;
    }

    try {
        const projectsHtml = projects.map(createProjectCard).join('');
        container.innerHTML = `<div class="row">${projectsHtml}</div>`;
    } catch (error) {
        console.error('Error creating project cards:', error);
        showError('Error displaying projects');
    }
}

function createEmptyState() {
    return `
        <div class="text-center py-5">
            <i class="fas fa-folder-open fa-3x mb-3"></i>
            <h4>No Projects Found</h4>
            <p>Create your first project to get started!</p>
            <a href="${ROUTES.CREATE_PROJECT}" class="btn btn-primary">
                <i class="fas fa-plus me-2"></i> Create Project
            </a>
        </div>
    `;
}

function createProjectCard(project) {
    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card project-card h-100">
                <div class="card-body">
                    <div class="project-header">
                        <h5 class="card-title mb-2">${escapeHtml(project.name)}</h5>
                        <div class="project-description">
                            <p class="card-text small mb-0">${escapeHtml(project.description || 'No description')}</p>
                            ${project.url ? `
                                <p class="card-text small mb-0">
                                    <i class="fas fa-link me-1"></i>
                                    <a href="${escapeHtml(project.url)}"
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       class="project-url-link">
                                        ${escapeHtml(project.url)}
                                    </a>
                                </p>
                            ` : ''}
                        </div>
                    </div>

                    <div class="project-footer">
                        ${createProjectInfo(project)}
                        ${createProgressBar(project)}
                        ${createBadges(project)}
                        ${createDates(project)}
                        ${createActions(project)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createProjectInfo(project) {
    return `
        <div class="d-flex align-items-center small mb-3">
            <i class="fas fa-user me-2"></i>
            <span>Created by: <strong>${escapeHtml(project.createdByName || 'N/A')}</strong></span>
        </div>
    `;
}

function createProgressBar(project) {
    const progress = project.progress || 0;
    return `
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <small>Progress</small>
                <small class="fw-bold">${progress}%</small>
            </div>
            <div class="progress">
                <div class="progress-bar bg-${getProgressColor(progress)}"
                     role="progressbar"
                     style="width: ${progress}%"></div>
            </div>
        </div>
    `;
}

function createBadges(project) {
    return `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge bg-${STATUS_COLORS[project.status] || 'secondary'} status-badge">
                ${project.status || 'PLANNING'}
            </span>
            <span class="badge bg-${PRIORITY_COLORS[project.priority] || 'secondary'} priority-badge">
                ${project.priority || 'MEDIUM'}
            </span>
        </div>
    `;
}

function createDates(project) {
    let html = '';
    if (project.startDate) {
        html += `
            <div class="small mb-2">
                <i class="fas fa-calendar-alt me-1"></i>
                Start: ${formatDate(project.startDate)}
            </div>
        `;
    }
    if (project.endDate) {
        html += `
            <div class="small mb-2">
                <i class="fas fa-calendar-check me-1"></i>
                End: ${formatDate(project.endDate)}
            </div>
        `;
    }
    return html;
}

function createActions(project) {
    return `
        <div class="project-actions">
            <button class="btn btn-sm btn-primary"
                    onclick="openProgressModal('${project.id}', ${project.progress || 0})">
                <i class="fas fa-chart-line me-1"></i> Progress
            </button>
            <button class="btn btn-sm btn-primary"
                    onclick="editProject('${project.id}')">
                <i class="fas fa-edit me-1"></i> Edit
            </button>
            <button class="btn btn-sm btn-outline-danger"
                    onclick="deleteProject('${project.id}')">
                <i class="fas fa-trash me-1"></i> Delete
            </button>
        </div>
    `;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getProgressColor(progress) {
    if (progress < PROGRESS_THRESHOLDS.LOW) return 'danger';
    if (progress < PROGRESS_THRESHOLDS.MEDIUM) return 'warning';
    return 'success';
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// ============================================================================
// FILTERING AND SORTING
// ============================================================================

function filterProjects() {
    const statusFilter = document.getElementById(ELEMENTS.statusFilter);
    if (!statusFilter) {
        console.warn('Status filter element not found');
        return;
    }

    const statusValue = statusFilter.value;
    const filtered = statusValue
        ? state.allProjects.filter(p => p.status === statusValue)
        : [...state.allProjects]; // Create a copy to avoid mutation

    displayProjects(filtered);
}

function sortProjects() {
    const sortByElement = document.getElementById(ELEMENTS.sortBy);
    if (!sortByElement) return;

    const sortBy = sortByElement.value;
    const sorted = [...state.allProjects];

    switch(sortBy) {
        case 'name':
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'createdAt':
            sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
        case 'progress':
            sorted.sort((a, b) => (b.progress || 0) - (a.progress || 0));
            break;
        case 'priority':
            sorted.sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
            break;
        case 'status':
            sorted.sort((a, b) => (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0));
            break;
    }

    displayProjects(sorted);
}

// ============================================================================
// PROGRESS UPDATE FUNCTIONALITY
// ============================================================================

async function saveProgress() {
    if (!state.currentProjectId) {
        showToast('Error: No project selected', ALERT_TYPES.DANGER);
        return;
    }

    const progressElement = document.getElementById(ELEMENTS.progressRange);
    if (!progressElement) {
        showToast('Error: Progress input not found', ALERT_TYPES.DANGER);
        return;
    }

    const progressValue = parseInt(progressElement.value);

    // Validate progress value
    if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
        showToast('Error: Invalid progress value (must be 0-100)', ALERT_TYPES.DANGER);
        return;
    }

    const saveBtn = document.getElementById(ELEMENTS.saveProgressBtn);
    if (!saveBtn) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';

    try {
        const response = await AuthUtils.makeAuthenticatedRequest(
            API_ENDPOINTS.PROJECT_PROGRESS(state.currentProjectId),
            {
                method: 'PATCH',
                body: JSON.stringify({ progress: progressValue })
            }
        );

        if (response.ok) {
            await response.json();

            state.progressModal.hide();
            showToast('Progress updated successfully!', ALERT_TYPES.SUCCESS);
            await loadProjects();
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `Failed to update progress (Status: ${response.status})`;
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Error updating progress:', error);
        showToast(`Error updating progress: ${error.message}`, ALERT_TYPES.DANGER);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i> Save Progress';
    }
}

// ============================================================================
// PROJECT ACTIONS
// ============================================================================

function editProject(projectId) {
    window.location.href = ROUTES.EDIT_PROJECT(projectId);
}

async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    try {
        const response = await AuthUtils.makeAuthenticatedRequest(API_ENDPOINTS.PROJECT_BY_ID(projectId), {
            method: 'DELETE'
        });

        if (response.ok) {
            state.allProjects = state.allProjects.filter(p => p.id !== projectId);
            displayProjects(state.allProjects);
            showToast('Project deleted successfully!', ALERT_TYPES.SUCCESS);
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to delete project (Status: ${response.status})`);
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast(`Failed to delete project: ${error.message}`, ALERT_TYPES.DANGER);
    }
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

function showToast(message, type = ALERT_TYPES.INFO) {
    const toastEl = document.getElementById(ELEMENTS.notificationToast);
    const toastBody = document.getElementById(ELEMENTS.toastMessage);
    const toastHeader = toastEl.querySelector('.toast-header');

    if (!toastEl || !toastBody || !toastHeader) return;

    toastBody.textContent = message;
    toastHeader.className = 'toast-header';

    if (type === ALERT_TYPES.SUCCESS) {
        toastHeader.classList.add('bg-success', 'text-white');
    } else if (type === ALERT_TYPES.DANGER) {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === ALERT_TYPES.WARNING) {
        toastHeader.classList.add('bg-warning');
    }

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

function showError(message) {
    const projectsList = document.getElementById(ELEMENTS.projectsList);
    if (projectsList) {
        projectsList.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>${message}
            </div>
        `;
    }
}