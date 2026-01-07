const AuthUtils = {
    CONFIG: {
        API_ENDPOINTS: {
            REFRESH: '/api/auth/refresh',
            LOGOUT: '/api/auth/logout',
            VERIFY: '/api/auth/verify'
        },
        STORAGE_KEYS: {
            ACCESS_TOKEN: 'accessToken',
            USERNAME: 'username'
        },
        ROUTES: {
            LOGIN: '/ConsoleApp/login',
            DASHBOARD: '/ConsoleApp/dashboard'
        },
        TOKEN_EXPIRY_BUFFER: 60, // Refresh 60 seconds before expiry
        PAGE_LOADER: {
            MIN_DISPLAY_TIME: 500, // Minimum time to show loader (ms)
            MAX_DISPLAY_TIME: 2000, // Maximum time to show loader (ms)
            FADE_OUT_DURATION: 1500 // Fade out animation duration (ms)
        }
    },

    isTokenExpired(token) {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < (currentTime + this.CONFIG.TOKEN_EXPIRY_BUFFER);
        } catch (error) {
            console.error('Error checking token expiry:', error);
            return true;
        }
    },
getAccessToken() {
    return localStorage.getItem(this.CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
},

    async refreshAccessToken() {
        try {
            const response = await fetch(this.CONFIG.API_ENDPOINTS.REFRESH, {
                method: 'POST',
                credentials: 'include', // Send HttpOnly cookie
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.accessToken) {
                    localStorage.setItem(this.CONFIG.STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
                    console.log('Access token refreshed successfully');
                    return data.accessToken;
                }
            } else if (response.status === 403) {
                // Token reuse detected
                console.error('Token reuse detected - security violation');
                this.redirectToLogin();
            } else if (response.status === 401) {
                // Refresh token expired
                console.warn('Refresh token expired');
                this.redirectToLogin();
            }

            return null;
        } catch (error) {
            console.error('Token refresh error:', error);
            return null;
        }
    },

    async getValidToken() {
        let token = localStorage.getItem(this.CONFIG.STORAGE_KEYS.ACCESS_TOKEN);

        if (!token || this.isTokenExpired(token)) {
            console.log('Token expired or missing, refreshing...');
            token = await this.refreshAccessToken();

            if (!token) {
                this.redirectToLogin();
                return null;
            }
        }

        return token;
    },

    async makeAuthenticatedRequest(url, options = {}) {
        const token = await this.getValidToken();

        if (!token) {
            throw new Error('No valid access token');
        }

        const requestOptions = {
            ...options,
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        let response = await fetch(url, requestOptions);

        // If still 401, try one more time with fresh token
        if (response.status === 401) {
            console.log('Received 401, attempting token refresh...');
            const newToken = await this.refreshAccessToken();

            if (newToken) {
                requestOptions.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, requestOptions);

                if (response.status === 401) {
                    // Still unauthorized after refresh
                    this.redirectToLogin();
                    throw new Error('Authentication failed after token refresh');
                }
            } else {
                this.redirectToLogin();
                throw new Error('Authentication failed - could not refresh token');
            }
        }

        if (!response.ok && response.status !== 401) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        return response;
    },

    async logout() {
        try {
            await fetch(this.CONFIG.API_ENDPOINTS.LOGOUT, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
            this.redirectToLogin();
        }
    },

    clearAuthData() {
        localStorage.removeItem(this.CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(this.CONFIG.STORAGE_KEYS.USERNAME);
    },

    redirectToLogin() {
        this.clearAuthData();
        window.location.href = this.CONFIG.ROUTES.LOGIN;
    },

    getUsername() {
        return localStorage.getItem(this.CONFIG.STORAGE_KEYS.USERNAME);
    },

    setUsername(username) {
        if (username) {
            localStorage.setItem(this.CONFIG.STORAGE_KEYS.USERNAME, username);
        }
    },

    async isAuthenticated() {
        const token = await this.getValidToken();
        return token !== null;
    }
};


function createPageLoader() {
    const loaderHTML = `
        <div id="pageLoader" class="page-loader">
            <div class="loader-content">
                <div class="snowflake-loader">
                    <i class="fas fa-snowflake"></i>
                </div>
                <div class="loader-text">Loading...</div>
                <div class="loader-progress">
                    <div class="loader-progress-bar"></div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', loaderHTML);
}

function hidePageLoader() {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;

    // Add fade-out class
    loader.classList.add('fade-out');

    // Remove loader after animation completes
    setTimeout(() => {
        loader.remove();
        document.body.classList.remove('loader-active');
    }, AuthUtils.CONFIG.PAGE_LOADER.FADE_OUT_DURATION);
}

function initializePageLoader() {
    const startTime = Date.now();

    // Create and show loader immediately
    createPageLoader();
    document.body.classList.add('loader-active');

    // Wait for page to be fully loaded
    const hideLoader = () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(
            0,
            AuthUtils.CONFIG.PAGE_LOADER.MIN_DISPLAY_TIME - elapsedTime
        );

        // Ensure loader shows for minimum time
        setTimeout(() => {
            hidePageLoader();
        }, remainingTime);
    };

    // Hide loader when page is fully loaded
    if (document.readyState === 'complete') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader);

        // Fallback: hide after max time even if page hasn't fully loaded
        setTimeout(() => {
            hidePageLoader();
        }, AuthUtils.CONFIG.PAGE_LOADER.MAX_DISPLAY_TIME);
    }
}

initializePageLoader();

function toggleSnowflakes() {
    const snowflakesContainer = document.getElementById('snowflakes');
    const toggleButton = document.getElementById('snowflakeToggle');

    if (!snowflakesContainer) return;

    // Get current state from localStorage, default to 'visible'
    const currentState = localStorage.getItem('snowflakesVisible') || 'visible';
    const newState = currentState === 'visible' ? 'hidden' : 'visible';

    // Update localStorage
    localStorage.setItem('snowflakesVisible', newState);

    // Toggle visibility
    if (newState === 'hidden') {
        snowflakesContainer.style.display = 'none';
        if (toggleButton) {
            toggleButton.classList.remove('active');
            toggleButton.style.opacity = '0.5';
        }
    } else {
        snowflakesContainer.style.display = 'block';
        if (toggleButton) {
            toggleButton.classList.add('active');
            toggleButton.style.opacity = '1';
        }
    }
}


function initializeSnowflakesState() {
    const snowflakesContainer = document.getElementById('snowflakes');
    const toggleButton = document.getElementById('snowflakeToggle');

    if (!snowflakesContainer) return;

    // Get saved state from localStorage, default to 'visible'
    const savedState = localStorage.getItem('snowflakesVisible') || 'visible';

    // Apply saved state
    if (savedState === 'hidden') {
        snowflakesContainer.style.display = 'none';
        if (toggleButton) {
            toggleButton.classList.remove('active');
            toggleButton.style.opacity = '0.5';
        }
    } else {
        snowflakesContainer.style.display = 'block';
        if (toggleButton) {
            toggleButton.classList.add('active');
            toggleButton.style.opacity = '1';
        }
    }

    // Add event listener to toggle button
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleSnowflakes);
    }
}

// Initialize snowflakes state when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSnowflakesState);
} else {
    initializeSnowflakesState();
}

window.AuthUtils = AuthUtils;