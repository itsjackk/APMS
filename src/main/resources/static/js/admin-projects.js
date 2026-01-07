// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    API_ENDPOINTS: {
        PROJECTS: '/api/admin/projects',
        USERS: '/api/admin/users'
    },
    UI: {
        SNOWFLAKE_COUNT: 50
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const AppState = {
    allProjects: [],
    filteredProjects: [],

    setProjects(projects) {
        this.allProjects = projects;
        this.filteredProjects = [...projects];
    },

    getProject(projectId) {
        return this.allProjects.find(p => p.id === projectId);
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Utils = {
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getStatusColor(status) {
        const colors = {
            'PLANNING': 'secondary',
            'IN_PROGRESS': 'primary',
            'ON_HOLD': 'warning',
            'COMPLETED': 'success',
            'CANCELLED': 'danger'
        };
        return colors[status] || 'secondary';
    },

    getPriorityColor(priority) {
        const colors = {
            'LOW': 'success',
            'MEDIUM': 'info',
            'HIGH': 'warning',
            'CRITICAL': 'danger'
        };
        return colors[priority] || 'secondary';
    },

    getPriorityOrder(priority) {
        const order = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
        return order[priority] || 0;
    },

    getStatusOrder(status) {
        const order = { 'PLANNING': 1, 'IN_PROGRESS': 2, 'ON_HOLD': 3, 'COMPLETED': 4, 'CANCELLED': 5 };
        return order[status] || 0;
    }
};

// ============================================================================
// API SERVICE
// ============================================================================

const APIService = {
    async fetchProjects() {
        const response = await AuthUtils.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.PROJECTS);
        return await response.json();
    },

    async fetchUsers() {
        const response = await AuthUtils.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.USERS);
        return await response.json();
    },

    async updateProject(projectId, projectData) {
        const response = await AuthUtils.makeAuthenticatedRequest(
            `${CONFIG.API_ENDPOINTS.PROJECTS}/${projectId}`,
            {
                method: 'PUT',
                body: JSON.stringify(projectData)
            }
        );
        return await response.json();
    },

    async deleteProject(projectId) {
        await AuthUtils.makeAuthenticatedRequest(
            `${CONFIG.API_ENDPOINTS.PROJECTS}/${projectId}`,
            {
                method: 'DELETE'
            }
        );
    }
};

// ============================================================================
// UI MANAGEMENT
// ============================================================================

const UIManager = {
    showProjectsLoading() {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = `
            <div class="text-center">
                <div class="loading-spinner"></div>
                <p class="text-white mt-2">Loading projects...</p>
            </div>
        `;
    },

    showStatsLoading() {
        const statsContainer = document.getElementById('statsContainer');
        statsContainer.innerHTML = `
            <div class="col-md-12 text-center">
                <div class="loading-spinner"></div>
                <p class="text-white mt-2">Loading statistics...</p>
            </div>
        `;
    },

    showProjectsError(message = 'Failed to load projects. Please try again.') {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>${Utils.escapeHtml(message)}
            </div>
        `;
    },

    showStatsError(message = 'Failed to load statistics. Please try again.') {
        const statsContainer = document.getElementById('statsContainer');
        statsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>${Utils.escapeHtml(message)}
            </div>
        `;
    },

    displayProjects(projects) {
        const projectsList = document.getElementById('projectsList');

        if (projects.length === 0) {
            projectsList.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>No projects found.
                </div>
            `;
            return;
        }

        const projectsHTML = projects.map(project => this.createProjectCard(project)).join('');
        projectsList.innerHTML = projectsHTML;
    },

    createProjectCard(project) {
        return `
            <div class="project-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h4>${Utils.escapeHtml(project.name)}</h4>
                        <p class="text-muted">${Utils.escapeHtml(project.description || 'No description')}</p>
                        <div class="d-flex flex-wrap gap-2">
                            <span class="badge bg-${Utils.getStatusColor(project.status)} status-badge">
                                ${project.status.replace('_', ' ')}
                            </span>
                            <span class="badge bg-${Utils.getPriorityColor(project.priority)} priority-badge">
                                ${project.priority}
                            </span>
                            <span class="user-badge">
                                <i class="fas fa-user me-1"></i>Created by: ${Utils.escapeHtml(project.createdByName || 'Unknown')}
                            </span>
                            <span class="user-badge">
                                <i class="fas fa-user-check me-1"></i>Assigned to: ${Utils.escapeHtml(project.assignedToName || 'Unassigned')}
                            </span>
                            <span class="user-badge">
                                <i class="fas fa-layer-group me-1"></i> ${project.isGlobal ? 'Global' : 'Personal'}
                            </span>
                        </div>
                    </div>
                    <div class="text-end ms-3">
                        <div class="progress mb-2" style="width: 150px; height: 10px;">
                            <div class="progress-bar" role="progressbar" style="width: ${project.progress || 0}%"></div>
                        </div>
                        <small class="text-muted d-block">${project.progress || 0}% Complete</small>
                        <small class="text-muted d-block mb-2">Created: ${Utils.formatDate(project.createdAt)}</small>
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-primary" onclick="editProject('${project.id}')">
                                <i class="fas fa-edit me-1"></i>Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteProject('${project.id}')">
                                <i class="fas fa-trash me-1"></i>Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    updateStatistics(projects) {
        const statsContainer = document.getElementById('statsContainer');
        const total = projects.length;
        const completed = projects.filter(p => p.status === 'COMPLETED').length;
        const inProgress = projects.filter(p => p.status === 'IN_PROGRESS').length;
        const highPriority = projects.filter(p => p.priority === 'HIGH' || p.priority === 'CRITICAL').length;
        
        statsContainer.innerHTML = `
            <div class="col-md-3">
                <div class="stats-card text-center">
                    <div class="stats-icon text-primary">
                        <i class="fas fa-tasks"></i>
                    </div>
                    <h3>${total}</h3>
                    <p>Total Projects</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card text-center">
                    <div class="stats-icon text-success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>${completed}</h3>
                    <p>Completed</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card text-center">
                    <div class="stats-icon text-info">
                        <i class="fas fa-spinner"></i>
                    </div>
                    <h3>${inProgress}</h3>
                    <p>In Progress</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card text-center">
                    <div class="stats-icon text-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>${highPriority}</h3>
                    <p>High Priority</p>
                </div>
            </div>
        `;
    }
};

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

const ModalManager = {
    editModal: null,
    
    init() {
        this.editModal = new bootstrap.Modal(document.getElementById('editModal'));
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        const typeSelect = document.getElementById('editProjectType');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => this.handleTypeChange());
        }
    },
    
    handleTypeChange() {
        const typeSelect = document.getElementById('editProjectType');
        const assignUserSection = document.getElementById('editAssignUserSection');
        
        if (typeSelect.value === 'global') {
            assignUserSection.style.display = 'block';
            const currentAssignedUserId = document.getElementById('editAssignedUser').dataset.currentUserId || null;
            this.populateUsersDropdown(currentAssignedUserId);
        } else {
            assignUserSection.style.display = 'none';
        }
    },

    async populateUsersDropdown(currentAssignedUserName = null) {
        const select = document.getElementById('editAssignedUser');

        select.innerHTML = '<option value="">Loading users...</option>';
        select.disabled = true;

        try {
            const users = await APIService.fetchUsers();

            select.innerHTML = '<option value="">Not assigned</option>';

            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username}${user.email ? ' (' + user.email + ')' : ''}`;

                if (currentAssignedUserName && user.username === currentAssignedUserName) {
                    option.selected = true;
                }

                select.appendChild(option);
            });

            select.disabled = false;
        } catch (error) {
            select.innerHTML = '<option value="">Failed to load users</option>';
            select.disabled = false;
        }
    },

    show() {
        this.editModal.show();
    },

    hide() {
        this.editModal.hide();
    }
};

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

const ProjectManager = {
    async loadProjects() {
        UIManager.showProjectsLoading();
        UIManager.showStatsLoading();

        try {
            const projects = await APIService.fetchProjects();
            AppState.setProjects(projects);
            UIManager.displayProjects(projects);
            UIManager.updateStatistics(projects);
        } catch (error) {
            console.error('Error loading projects:', error);
            UIManager.showProjectsError();
            UIManager.showStatsError();
        }
    },

    filterProjects() {
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;

        AppState.filteredProjects = AppState.allProjects.filter(project => {
            const matchesStatus = !statusFilter || project.status === statusFilter;
            const matchesPriority = !priorityFilter || project.priority === priorityFilter;
            const matchesType = !typeFilter || (typeFilter === 'global' ? project.isGlobal : !project.isGlobal);

            return matchesStatus && matchesPriority && matchesType;
        });

        UIManager.displayProjects(AppState.filteredProjects);
        UIManager.updateStatistics(AppState.filteredProjects);
    },

    sortProjects() {
        const sortBy = document.getElementById('sortBy').value;

        AppState.filteredProjects.sort((a, b) => {
            switch(sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'createdAt':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'progress':
                    return (b.progress || 0) - (a.progress || 0);
                case 'priority':
                    return Utils.getPriorityOrder(b.priority) - Utils.getPriorityOrder(a.priority);
                case 'status':
                    return Utils.getStatusOrder(a.status) - Utils.getStatusOrder(b.status);
                default:
                    return 0;
            }
        });

        UIManager.displayProjects(AppState.filteredProjects);
    },

    openEditModal(projectId) {
        const project = AppState.getProject(projectId);
        if (!project) {
            console.error('Project not found:', projectId);
            return;
        }

        document.getElementById('editProjectId').value = project.id;
        document.getElementById('editProjectName').value = project.name;
        document.getElementById('editProjectDescription').value = project.description || '';
        document.getElementById('editProjectStatus').value = project.status;
        document.getElementById('editProjectPriority').value = project.priority;
        document.getElementById('editProjectType').value = project.isGlobal ? 'global' : 'personal';
        document.getElementById('editProjectProgress').value = project.progress || 0;
        document.getElementById('editProjectOwner').value = project.createdByName || '';

        const assignUserSection = document.getElementById('editAssignUserSection');

        if (project.isGlobal) {
            assignUserSection.style.display = 'block';
            const assignedUserName = project.assignedToName || null;
            ModalManager.populateUsersDropdown(assignedUserName);
        } else {
            assignUserSection.style.display = 'none';
        }

        ModalManager.show();
    },

    async saveProjectChanges() {
        const projectId = document.getElementById('editProjectId').value;
        const isGlobal = document.getElementById('editProjectType').value === 'global';

        const updatedProject = {
            name: document.getElementById('editProjectName').value,
            description: document.getElementById('editProjectDescription').value,
            status: document.getElementById('editProjectStatus').value,
            priority: document.getElementById('editProjectPriority').value,
            isGlobal: isGlobal,
            progress: parseInt(document.getElementById('editProjectProgress').value)
        };

        if (isGlobal) {
            const assignedUserId = document.getElementById('editAssignedUser').value;
            updatedProject.assignedUserId = assignedUserId || null;
        } else {
            updatedProject.assignedUserId = null;
        }

        try {
            await APIService.updateProject(projectId, updatedProject);
            ModalManager.hide();
            await this.loadProjects();
        } catch (error) {
            alert('Failed to update project. Please try again.');
        }
    },

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        try {
            await APIService.deleteProject(projectId);
            await this.loadProjects();
        } catch (error) {
            alert('Failed to delete project. Please try again.');
        }
    }
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function logout() {
            await AuthUtils.logout();
        }

// ============================================================================
// GLOBAL FUNCTIONS (for onclick handlers in HTML)
// ============================================================================

function filterProjects() {
    ProjectManager.filterProjects();
}

function sortProjects() {
    ProjectManager.sortProjects();
}

function editProject(projectId) {
    ProjectManager.openEditModal(projectId);
}

function saveProjectChanges() {
    ProjectManager.saveProjectChanges();
}

function deleteProject(projectId) {
    ProjectManager.deleteProject(projectId);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    const isAuthenticated = await AuthUtils.isAuthenticated();
    if (!isAuthenticated) {
        return;
    }

    ModalManager.init();
    VisualEffects.createSnowflakes();

    ProjectManager.loadProjects();
});