
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

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    createSnowflakes();
    loadProjects();
    initializeProgressModal();
    attachEventListeners();
});

function attachEventListeners() {
    const elements = {
        statusFilter: document.getElementById('statusFilter'),
        sortBy: document.getElementById('sortBy'),
        logoutBtn: document.getElementById('logoutBtn'),
        saveProgressBtn: document.getElementById('saveProgressBtn')
    };

    if (elements.statusFilter) {
        elements.statusFilter.addEventListener('change', filterProjects);
    }
    if (elements.sortBy) {
        elements.sortBy.addEventListener('change', sortProjects);
    }
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    if (elements.saveProgressBtn) {
        elements.saveProgressBtn.addEventListener('click', saveProgress);
    }
}

function initializeProgressModal() {
    const modalElement = document.getElementById('progressModal');
    if (!modalElement) return;

    state.progressModal = new bootstrap.Modal(modalElement);

    const progressRange = document.getElementById('progressRange');
    const progressBarText = document.getElementById('progressBarText');
    const progressPreview = document.getElementById('progressPreview');

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
        range: document.getElementById('progressRange'),
        text: document.getElementById('progressBarText'),
        preview: document.getElementById('progressPreview')
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
    const container = document.getElementById('snowflakes');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const snowflakeCount = 50;

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
        animationDuration: `${5 + Math.random() * 10}s`,
        animationDelay: `${Math.random() * 5}s`,
        fontSize: `${0.5 + Math.random() * 1.5}em`
    });

    return snowflake;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } finally {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('username');
        window.location.href = '/ConsoleApp/login';
    }
}

async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        redirectToLogin();
        return false;
    }

    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }
            return true;
        }
    } catch (error) {
        // Silent error handling
    }

    redirectToLogin();
    return false;
}

async function makeAuthenticatedRequest(url, options = {}) {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        throw new Error('No access token available');
    }

    const requestOptions = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers
        }
    };

    let response = await fetch(url, requestOptions);

    if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
            const newAccessToken = localStorage.getItem('accessToken');
            requestOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, requestOptions);
        } else {
            throw new Error('Authentication failed');
        }
    }

    return response;
}

function redirectToLogin() {
    window.location.href = '/ConsoleApp/login';
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

async function loadProjects() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            redirectToLogin();
            return;
        }

        const response = await fetch('/api/projects', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            state.allProjects = await response.json();
            displayProjects(state.allProjects);
        } else if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                await loadProjects();
            } else {
                redirectToLogin();
            }
        } else {
            throw new Error('Failed to load projects');
        }
    } catch (error) {
        showError('Error loading projects. Please try again.');
    }
}

function displayProjects(projects) {
    const container = document.getElementById('projectsList');
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = createEmptyState();
        return;
    }

    const projectsHtml = projects.map(createProjectCard).join('');
    container.innerHTML = `<div class="row">${projectsHtml}</div>`;
}

function createEmptyState() {
    return `
        <div class="text-center py-5">
            <i class="fas fa-folder-open fa-3x mb-3"></i>
            <h4>No Projects Found</h4>
            <p>Create your first project to get started!</p>
            <a href="/ConsoleApp/projects/create" class="btn btn-primary">
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
    if (progress < 30) return 'danger';
    if (progress < 70) return 'warning';
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
    const statusFilter = document.getElementById('statusFilter');
    if (!statusFilter) return;

    const statusValue = statusFilter.value;
    const filtered = statusValue
        ? state.allProjects.filter(p => p.status === statusValue)
        : state.allProjects;
    displayProjects(filtered);
}

function sortProjects() {
    const sortByElement = document.getElementById('sortBy');
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
    }

    displayProjects(sorted);
}

// ============================================================================
// PROGRESS UPDATE FUNCTIONALITY
// ============================================================================

async function saveProgress() {
    if (!state.currentProjectId) {
        showToast('Error: No project selected', 'danger');
        return;
    }

    const progressValue = document.getElementById('progressRange').value;
    const saveBtn = document.getElementById('saveProgressBtn');

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';

    try {
        const response = await makeAuthenticatedRequest(`/api/projects/${state.currentProjectId}/progress`, {
            method: 'PATCH',
            body: JSON.stringify({ progress: parseInt(progressValue) })
        });

        if (response.ok) {
            await response.json();

            state.progressModal.hide();
            showToast('Progress updated successfully!', 'success');
            await loadProjects();
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `Failed to update progress (Status: ${response.status})`;
            throw new Error(errorMessage);
        }
    } catch (error) {
        showToast('Error updating progress: ' + error.message, 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i> Save Progress';
    }
}

// ============================================================================
// PROJECT ACTIONS
// ============================================================================

function editProject(projectId) {
    window.location.href = `/ConsoleApp/projects/edit/${projectId}`;
}

async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    const accessToken = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            state.allProjects = state.allProjects.filter(p => p.id !== projectId);
            displayProjects(state.allProjects);
            showToast('Project deleted successfully!', 'success');
        } else if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                await deleteProject(projectId);
            } else {
                redirectToLogin();
            }
        } else {
            throw new Error('Failed to delete project');
        }
    } catch (error) {
        showToast('Failed to delete project. Please try again.', 'danger');
    }
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('notificationToast');
    const toastBody = document.getElementById('toastMessage');
    const toastHeader = toastEl.querySelector('.toast-header');

    if (!toastEl || !toastBody || !toastHeader) return;

    toastBody.textContent = message;
    toastHeader.className = 'toast-header';

    if (type === 'success') {
        toastHeader.classList.add('bg-success', 'text-white');
    } else if (type === 'danger') {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastHeader.classList.add('bg-warning');
    }

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

function showError(message) {
    const projectsList = document.getElementById('projectsList');
    if (projectsList) {
        projectsList.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>${message}
            </div>
        `;
    }
}