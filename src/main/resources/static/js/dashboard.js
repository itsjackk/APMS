        const username = /*[[${username}]]*/ 'User';
        const userRole = /*[[${role}]]*/ 'USER';
        const totalUsers = /*[[${totalUsers}]]*/ 0;

        // Flags to prevent duplicate operations
        let isRedirecting = false;
        let isLoadingData = false;
        let projectsLoaded = false; // NEW: Track if projects are already loaded

        // ==================== CONFIGURATION ====================
        const CONFIG = {
            TOKEN_REFRESH_INTERVAL: 20 * 60 * 1000, // 20 minutes
            API_ENDPOINTS: {
                ADMIN_STATS: '/api/admin/stats',
                PROJECT_STATS: '/api/projects/stats',
                ASSIGNED_COUNT: '/api/projects/assigned/count',
                PROJECTS: '/api/projects',
                AUTH_REFRESH: '/api/auth/refresh',
                AUTH_LOGOUT: '/api/auth/logout'
            },
            ROUTES: {
                LOGIN: '/ConsoleApp/login',
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
            isTokenExpired(token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const currentTime = Math.floor(Date.now() / 1000);
                    return payload.exp < currentTime;
                } catch (error) {
                    console.error('Error parsing token:', error);
                    return true;
                }
            },

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

        // ==================== AUTHENTICATION SERVICE ====================
        const AuthService = {
            getAccessToken() {
                try {
                    const token = localStorage.getItem('accessToken');
                    if (!token) {
                        console.log('No access token found');
                        return null;
                    }

                    if (Utils.isTokenExpired(token)) {
                        console.log('Access token is expired');
                        this.clearAuthData();
                        return null;
                    }

                    return token;
                } catch (error) {
                    console.error('Error parsing token:', error);
                    localStorage.removeItem('accessToken');
                    return null;
                }
            },

            clearAuthData() {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('username');
            },

            redirectToLogin() {
                if (AppState.isRedirecting) return;

                AppState.setRedirecting(true);
                console.log('Redirecting to login page...');

                this.clearAuthData();
                window.location.href = CONFIG.ROUTES.LOGIN;
            },

            async refreshAccessToken() {
                try {
                    const response = await fetch(CONFIG.API_ENDPOINTS.AUTH_REFRESH, {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        localStorage.setItem('accessToken', data.accessToken);
                        return true;
                    } else {
                        console.error('Failed to refresh token');
                        this.clearAuthData();
                        return false;
                    }
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    return false;
                }
            },

            async refreshToken() {
                if (AppState.isRedirecting) {
                    return false;
                }

                try {
                    const currentToken = localStorage.getItem('accessToken');
                    if (!currentToken || Utils.isTokenExpired(currentToken)) {
                        console.log('Cannot refresh - no valid token available');
                        UIManager.showAlert('Session expired. Please log in again.', 'warning');
                        setTimeout(() => {
                            this.redirectToLogin();
                        }, 2000);
                        return false;
                    }

                    const response = await fetch(CONFIG.API_ENDPOINTS.AUTH_REFRESH, {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.accessToken) {
                            localStorage.setItem('accessToken', data.accessToken);
                            UIManager.showAlert('Session refreshed successfully!', 'success');
                            return true;
                        }
                    } else if (response.status === 401) {
                        console.log('Refresh token is invalid or expired');
                        UIManager.showAlert('Session expired. Please log in again.', 'warning');
                        setTimeout(() => {
                            this.redirectToLogin();
                        }, 2000);
                        return false;
                    } else {
                        console.log('Failed to refresh token, status:', response.status);
                        UIManager.showAlert('Failed to refresh session', 'danger');
                        return false;
                    }
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    if (!AppState.isRedirecting) {
                        UIManager.showAlert('Error refreshing session: ' + error.message, 'danger');
                    }
                    return false;
                }
                return false;
            },

            async logout() {
                try {
                    await fetch(CONFIG.API_ENDPOINTS.AUTH_LOGOUT, {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    this.clearAuthData();
                    window.location.href = CONFIG.ROUTES.LOGIN;
                }
            }
        };

        // ==================== API SERVICE ====================
        const APIService = {
            async makeAuthenticatedRequest(url, options = {}) {
                if (AppState.isRedirecting) {
                    throw new Error('Redirect in progress');
                }

                const accessToken = AuthService.getAccessToken();

                if (!accessToken) {
                    AuthService.redirectToLogin();
                    throw new Error('No valid access token');
                }

                const headers = {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json',
                    ...options.headers
                };

                try {
                    const response = await fetch(url, {
                        ...options,
                        headers
                    });

                    // If we get 401, the token is invalid/expired
                    if (response.status === 401) {
                        console.log('Received 401 from:', url, '- redirecting to login');
                        AuthService.redirectToLogin();
                        throw new Error('Authentication failed');
                    }

                    return response;
                } catch (error) {
                    // Only redirect on auth errors, not network errors
                    if (error.message === 'Authentication failed') {
                        throw error;
                    }
                    console.error('Request error for', url, ':', error);
                    throw error;
                }
            }
        };

        // Create snowflakes
        function createSnowflakes() {
            const snowflakesContainer = document.getElementById('snowflakes');
            const snowflakeCount = 50;

            for (let i = 0; i < snowflakeCount; i++) {
                const snowflake = document.createElement('div');
                snowflake.className = 'snowflake';
                snowflake.innerHTML = '❄';

                // Random position and animation duration
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

        // ==================== PAGE LOAD ====================
        document.addEventListener('DOMContentLoaded', function() {
            createSnowflakes();

            const accessToken = AuthService.getAccessToken();

            // If no valid token, redirect immediately
            if (!accessToken) {
                console.log('No valid access token found, redirecting to login');
                AuthService.redirectToLogin();
                return;
            }
            loadDashboardData();
        });

        // ==================== TOKEN MANAGEMENT ====================
        function getAccessToken() {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.log('No access token in localStorage');
                return null;
            }

            // Check if token is expired
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expirationTime = payload.exp * 1000;
                const currentTime = Date.now();

                if (currentTime >= expirationTime) {
                    console.log('Access token is expired');
                    localStorage.removeItem('accessToken');
                    return null;
                }

                return token;
            } catch (error) {
                console.error('Error parsing token:', error);
                localStorage.removeItem('accessToken');
                return null;
            }
        }

        function redirectToLogin() {
            if (isRedirecting) return;

            isRedirecting = true;
            console.log('Redirecting to login page...');

            // Clear tokens
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');

            // Redirect
            window.location.href = '/ConsoleApp/login';
        }

        // ==================== DATA LOADING ====================
        async function loadDashboardData() {
            // Prevent multiple simultaneous calls
            if (isLoadingData) {
                console.log('Data loading already in progress, skipping duplicate call');
                return;
            }

            isLoadingData = true;

            try {
                const accessToken = AuthService.getAccessToken();
                if (!accessToken) {
                    console.log('No valid access token, redirecting to login');
                    AuthService.redirectToLogin();
                    return;
                }

                // Load statistics based on user role
                //if (userRole === 'ADMIN') {
                //    await loadAdminStats();
                //} else {
                //    await loadProjectStats();
                //}
                await loadProjectStats();

                // Load recent projects ONLY ONCE
                if (!projectsLoaded) {
                    await loadRecentProjects();
                    projectsLoaded = true; // Mark as loaded
                } else {
                    console.log('Projects already loaded, skipping duplicate call');
                }

            } catch (error) {
                console.error('Error loading dashboard data:', error);
                if (!isRedirecting) {
                    UIManager.showAlert('Error loading dashboard data', 'danger');
                }
            } finally {
                isLoadingData = false;
            }
        }

        // ==================== ADMIN STATS ====================
        async function loadAdminStats() {
            if (AppState.isRedirecting) return;

            try {
                const response = await APIService.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.ADMIN_STATS);

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
                    APIService.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.PROJECT_STATS),
                    APIService.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.ASSIGNED_COUNT)
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
                const response = await APIService.makeAuthenticatedRequest(CONFIG.API_ENDPOINTS.PROJECTS + '?limit=6');

                if (response.ok) {
                    const projects = await response.json();
                    UIManager.displayRecentProjects(projects);
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

        // ==================== HELPER FUNCTIONS ====================
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function getStatusColor(status) {
            switch(status) {
                case 'COMPLETED': return 'success';
                case 'IN_PROGRESS': return 'primary';
                case 'ON_HOLD': return 'warning';
                case 'CANCELLED': return 'danger';
                case 'PLANNING': return 'info';
                default: return 'secondary';
            }
        }

        function getProgressColor(progress) {
            if (progress < 30) return 'danger';
            if (progress < 70) return 'warning';
            return 'success';
        }

        function showAlert(message, type) {
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

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (alertContainer.parentNode) {
                    alertContainer.parentNode.removeChild(alertContainer);
                }
            }, 5000);
        }

        // ==================== UTILITY FUNCTIONS ====================

        function isTokenExpired(token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const currentTime = Math.floor(Date.now() / 1000);
                return payload.exp < currentTime;
            } catch (error) {
                console.error('Error parsing token:', error);
                return true;
            }
        }

        function clearAuthData() {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('username');
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }

        function getPriorityColor(priority) {
            const colors = {
                'LOW': 'success',
                'MEDIUM': 'primary',
                'HIGH': 'warning',
                'CRITICAL': 'danger'
            };
            return colors[priority] || 'secondary';
        }

        // ==================== AUTHENTICATION FUNCTIONS ====================

        // Update the refresh token function to only work for manual refresh button
        async function refreshToken() {
            if (AppState.isRedirecting) {
                return false;
            }

            try {
                // Only allow manual refresh if we have a valid (non-expired) access token
                const currentToken = localStorage.getItem('accessToken');
                if (!currentToken || Utils.isTokenExpired(currentToken)) {
                    console.log('Cannot refresh - no valid token available');
                    UIManager.showAlert('Session expired. Please log in again.', 'warning');
                    setTimeout(() => {
                        AuthService.redirectToLogin();
                    }, 2000);
                    return false;
                }

                const response = await fetch(CONFIG.API_ENDPOINTS.AUTH_REFRESH, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.accessToken) {
                        localStorage.setItem('accessToken', data.accessToken);
                        UIManager.showAlert('Session refreshed successfully!', 'success');
                        return true;
                    }
                } else if (response.status === 401) {
                    console.log('Refresh token is invalid or expired');
                    UIManager.showAlert('Session expired. Please log in again.', 'warning');
                    setTimeout(() => {
                        AuthService.redirectToLogin();
                    }, 2000);
                    return false;
                } else {
                    console.log('Failed to refresh token, status:', response.status);
                    UIManager.showAlert('Failed to refresh session', 'danger');
                    return false;
                }
            } catch (error) {
                console.error('Error refreshing token:', error);
                if (!AppState.isRedirecting) {
                    UIManager.showAlert('Error refreshing session: ' + error.message, 'danger');
                }
                return false;
            }
            return false;
        }

        // ==================== USER ACTIONS ====================

        async function logout() {
            try {
                await fetch(CONFIG.API_ENDPOINTS.AUTH_LOGOUT, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                AuthService.clearAuthData();
                window.location.href = CONFIG.ROUTES.LOGIN;
            }
        }

        // ==================== PAGE INITIALIZATION ====================

        // Auto-refresh token before it expires (every 20 minutes)
        setInterval(async () => {
            const token = localStorage.getItem('accessToken');
            if (token && !Utils.isTokenExpired(token)) {
                console.log('Auto-refreshing access token...');
                await AuthService.refreshAccessToken();
            }
        }, CONFIG.TOKEN_REFRESH_INTERVAL); // 20 minutes

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

// Add this to your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...

    // Initialize Christmas countdown
    initChristmasCountdown();

    // ... rest of existing code ...
});

// Optional: Cleanup function when leaving the page
window.addEventListener('beforeunload', function() {
    if (window.christmasCountdownInterval) {
        clearInterval(window.christmasCountdownInterval);
    }
});