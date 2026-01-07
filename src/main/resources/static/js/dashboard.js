
        const username = /*[[${username}]]*/ 'User';
        const userRole = /*[[${role}]]*/ 'USER';
        const totalUsers = /*[[${totalUsers}]]*/ 0;

        // ==================== CONFIGURATION ====================
        const CONFIG = {
            TOKEN_REFRESH_INTERVAL: 20 * 60 * 1000, // 20 minutes
            API_ENDPOINTS: {
                ADMIN_STATS: '/api/admin/stats',
                PROJECT_STATS: '/api/projects/stats',
                ASSIGNED_COUNT: '/api/projects/assigned/count',
                PROJECTS: '/api/projects'
            },
            ROUTES: {
                PROJECTS_CREATE: '/ConsoleApp/projects/create',
                PROJECTS_EDIT: '/ConsoleApp/projects/edit'
            }
        };

        // ==================== STATE MANAGEMENT ====================
        const AppState = {
            isRedirecting: false,
            isLoadingData: false,
            projectsLoaded: false,
            userRole: null,
            totalUsers: 0,

            setRedirecting(value) {
                this.isRedirecting = value;
            },

            setLoadingData(value) {
                this.isLoadingData = value;
            },

            setProjectsLoaded(value) {
                this.projectsLoaded = value;
            },

            setUserRole(role) {
                this.userRole = role;
            },

            setTotalUsers(count) {
                this.totalUsers = count;
            }
        };

        // ==================== UTILITY FUNCTIONS ====================
        const Utils = {
            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },

            formatDate(dateString) {
                if (!dateString) return 'N/A';
                return new Date(dateString).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            },

            getStatusColor(status) {
                const colors = {
                    'COMPLETED': 'success',
                    'IN_PROGRESS': 'primary',
                    'ON_HOLD': 'warning',
                    'CANCELLED': 'danger',
                    'PLANNING': 'info'
                };
                return colors[status] || 'secondary';
            },

            getProgressColor(progress) {
                if (progress < 30) return 'danger';
                if (progress < 70) return 'warning';
                return 'success';
            },

            getPriorityColor(priority) {
                const colors = {
                    'LOW': 'success',
                    'MEDIUM': 'primary',
                    'HIGH': 'warning',
                    'CRITICAL': 'danger'
                };
                return colors[priority] || 'secondary';
            }
        };

        // ==================== UI MANAGER ====================
        const UIManager = {
            showAlert(message, type) {
                const alertHtml = `
                    <div class="alert alert-${type} alert-dismissible fade show alert-custom" role="alert">
                        <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                        ${message}
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                `;
                const alertContainer = document.createElement('div');
                alertContainer.innerHTML = alertHtml;
                document.body.appendChild(alertContainer);

                setTimeout(() => {
                    if (alertContainer.parentNode) {
                        alertContainer.parentNode.removeChild(alertContainer);
                    }
                }, 5000);
            },

            displayRecentProjects(projects) {
                const container = document.getElementById('recentProjects');

                if (projects.length === 0) {
                    container.innerHTML = `
                        <div class="col-12 text-center py-4">
                            <i class="fas fa-project-diagram fa-3x mb-3"></i>
                            <h5>No Projects Yet</h5>
                            <p class="">Create your first project to get started!</p>
                            <a href="${CONFIG.ROUTES.PROJECTS_CREATE}" class="btn btn-outline-primary">
                                <i class="fas fa-plus-circle me-2"></i> Create Project
                            </a>
                        </div>
                    `;
                    return;
                }

                const projectsHtml = projects.slice(0, 6).map(project => `
                    <div class="col-md-4 mb-3">
                        <div class="project-card card h-100">
                            <div class="card-body">
                                <h5 class="card-title mb-2">${Utils.escapeHtml(project.name)}</h5>
                                <p class="card-text small project-description">${Utils.escapeHtml(project.description || 'No description')}</p>

                                <div class="project-footer">
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <small class="">Progress</small>
                                            <small class="fw-bold">${project.progress || 0}%</small>
                                        </div>
                                        <div class="progress">
                                            <div class="progress-bar bg-${Utils.getProgressColor(project.progress || 0)}"
                                                 role="progressbar"
                                                 style="width: ${project.progress || 0}%"></div>
                                        </div>
                                    </div>

                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="badge bg-${Utils.getStatusColor(project.status)}">
                                            ${project.status || 'PLANNING'}
                                        </span>
                                        <a href="${CONFIG.ROUTES.PROJECTS_EDIT}/${project.id}" class="btn btn-sm btn-outline-primary">
                                            <i class="fas fa-edit"></i> Edit
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');

                container.innerHTML = projectsHtml;
            },

            updateStatistics(stats, isAdmin = false) {
                document.getElementById('totalProjects').textContent = stats.totalProjects || '0';
                document.getElementById('activeProjects').textContent = stats.inProgressProjects || '0';
                document.getElementById('completedProjects').textContent = stats.completedProjects || '0';

                if (isAdmin && AppState.totalUsers > 0) {
                    document.getElementById('pendingTasks').textContent = AppState.totalUsers;
                } else if (stats.assignedCount !== undefined) {
                    document.getElementById('pendingTasks').textContent = stats.assignedCount || '0';
                }
            }
        };


        // ==================== PAGE LOAD ====================

        // ==================== DATA LOADING ====================
        async function loadDashboardData() {
            if (AppState.isLoadingData) {
                console.log('Data loading already in progress, skipping duplicate call');
                return;
            }

            AppState.setLoadingData(true);  // Changed from: isLoadingData = true;

            try {
                const accessToken = AuthUtils.getAccessToken();
                if (!accessToken) {
                    console.log('No valid access token found, redirecting to login');
                    await AuthUtils.logout();
                    return;
                }

                // Load statistics based on user role
                if (userRole === 'ADMIN') {
                    await loadAdminStats();
                } else {
                    await loadProjectStats();
                }
                if (!AppState.projectsLoaded) {
                    await loadRecentProjects();
                    AppState.setProjectsLoaded(true);  // Changed from: projectsLoaded = true;
                } else {
                    console.log('Projects already loaded, skipping duplicate call');
                }

            } catch (error) {
                console.error('Error loading dashboard data:', error);
                if (!AppState.isRedirecting) {  // Changed from: if (!isRedirecting)
                    UIManager.showAlert('Error loading dashboard data', 'danger');
                }
            } finally {
                AppState.setLoadingData(false);  // Changed from: isLoadingData = false;
            }
        }

        // ==================== ADMIN STATS ====================
        async function loadAdminStats() {
            if (AppState.isRedirecting) return;

            try {
                const response = await AuthUtils.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.ADMIN_STATS);

                if (response.ok) {
                    const stats = await response.json();
                    UIManager.updateStatistics(stats, true);
                    // For admin, assignedProjects shows total users (already set by Thymeleaf)
                } else {
                    console.error('Failed to load admin stats, status:', response.status);
                }
            } catch (error) {
                console.error('Error loading admin stats:', error);
            }
        }

        // ==================== USER PROJECT STATS ====================
        async function loadProjectStats() {
            if (AppState.isRedirecting) return;

            try {
                // Make both requests in parallel to reduce redundancy
                const [statsResponse, assignedResponse] = await Promise.all([
                    AuthUtils.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.PROJECT_STATS),
                    AuthUtils.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.ASSIGNED_COUNT)
                ]);

                if (statsResponse.ok && assignedResponse.ok) {
                    const stats = await statsResponse.json();
                    const assignedData = await assignedResponse.json();

                    UIManager.updateStatistics({
                        totalProjects: stats.totalProjects || '0',
                        inProgressProjects: stats.inProgressProjects || '0',
                        completedProjects: stats.completedProjects || '0',
                        assignedCount: assignedData.count || assignedData || '0'
                    });
                } else {
                    console.error('Failed to load project stats');
                }
            } catch (error) {
                console.error('Error loading project stats:', error);
            }
        }

        // ==================== RECENT PROJECTS (CALLED ONLY ONCE) ====================
        async function loadRecentProjects() {
            if (AppState.isRedirecting || AppState.projectsLoaded) {
                return;
            }

            try {
                const response = await AuthUtils.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.PROJECTS + '?limit=6');

                if (response.ok) {
                    const projects = await response.json();
                    UIManager.displayRecentProjects(projects);
                    loadProjectStats();
                } else {
                    console.error('Failed to load recent projects, status:', response.status);
                    document.getElementById('recentProjects').innerHTML =
                        '<div class="col-12"><p class="text-muted">Failed to load projects</p></div>';
                }
            } catch (error) {
                console.error('Error loading recent projects:', error);
                if (!AppState.isRedirecting) {
                    document.getElementById('recentProjects').innerHTML =
                        '<div class="col-12"><p class="text-muted">Error loading projects</p></div>';
                }
            }
        }

        // ==================== USER ACTIONS ====================

        async function logout() {
            await AuthUtils.logout();
        }

        // ==================== PAGE INITIALIZATION ====================

/**
 * Christmas Countdown Timer
 */
function initChristmasCountdown() {
    const countdownElement = document.getElementById('christmasCountdown');
    const countdownText = document.getElementById('countdownText');

    if (!countdownElement || !countdownText) return;

    function updateCountdown() {
        const now = new Date();
        const currentYear = now.getFullYear();

        // Set Christmas date for current year
        let christmas = new Date(currentYear, 11, 25, 0, 0, 0); // December 25

        // If Christmas has passed this year, set it for next year
        if (now > christmas) {
            christmas = new Date(currentYear + 1, 11, 25, 0, 0, 0);
        }

        const timeDiff = christmas - now;

        // If Christmas is today or has passed, hide the countdown
        if (timeDiff <= 0) {
            countdownElement.style.display = 'none';
            return;
        }

        // Calculate time units
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Format the countdown text
        let countdownHTML = '';

        if (days > 0) {
            countdownHTML = `${days}d ${hours}h ${minutes}m ${seconds}s until Christmas! 🎅`;
        } else if (hours > 0) {
            countdownHTML = `${hours}h ${minutes}m ${seconds}s until Christmas! 🎅`;
        } else if (minutes > 0) {
            countdownHTML = `${minutes}m ${seconds}s until Christmas! 🎅`;
        } else {
            countdownHTML = `${seconds}s until Christmas! 🎅`;
        }

        countdownText.innerHTML = countdownHTML;
        countdownElement.style.display = 'flex';
        countdownElement.style.alignItems = 'center';
    }

    // Update countdown immediately
    updateCountdown();

    // Update countdown every second
    const countdownInterval = setInterval(updateCountdown, 1000);

    // Store interval ID for cleanup if needed
    window.christmasCountdownInterval = countdownInterval;
}

document.addEventListener('DOMContentLoaded', async function() {
    VisualEffects.createSnowflakes();
    initChristmasCountdown();

    // Check authentication
    const accessToken = AuthUtils.getAccessToken();

    if (!accessToken) {
        console.log('No valid access token found, redirecting to login');
        await AuthUtils.logout();
        return;
    }

    loadDashboardData();
});

// Optional: Cleanup function when leaving the page
window.addEventListener('beforeunload', function() {
    if (window.christmasCountdownInterval) {
        clearInterval(window.christmasCountdownInterval);
    }
});