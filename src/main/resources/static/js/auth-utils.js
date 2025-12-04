
/**
 * Shared Authentication Utilities
 * Used across all protected pages for token management
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const AUTH_CONFIG = {
    API_ENDPOINTS: {
        REFRESH: '/api/auth/refresh',
        LOGOUT: '/api/auth/logout',
        VERIFY: '/api/auth/verify'
    },
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'accessToken',
        REFRESH_TOKEN: 'refreshToken',
        USERNAME: 'username',
        REMEMBER_ME: 'rememberMe'
    },
    ROUTES: {
        LOGIN: '/ConsoleApp/login',
        DASHBOARD: '/ConsoleApp/dashboard'
    },
    TOKEN: {
        REFRESH_BUFFER: 5 * 60 * 1000, // Refresh 5 minutes before expiry
        MAX_REFRESH_ATTEMPTS: 3,
        REFRESH_RETRY_DELAY: 1000 // 1 second
    }
};

// ============================================================================
// TOKEN UTILITIES
// ============================================================================

const TokenManager = {
    /**
     * Get access token from localStorage
     * @returns {string|null}
     */
    getAccessToken() {
        return localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * Get refresh token from localStorage
     * @returns {string|null}
     */
    getRefreshToken() {
        return localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    },

    /**
     * Set access token in localStorage
     * @param {string} token
     */
    setAccessToken(token) {
        if (token) {
            localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token);
        }
    },

    /**
     * Set refresh token in localStorage
     * @param {string} token
     */
    setRefreshToken(token) {
        if (token) {
            localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, token);
        }
    },

    /**
     * Get username from localStorage
     * @returns {string|null}
     */
    getUsername() {
        return localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USERNAME);
    },

    /**
     * Check if remember me is enabled
     * @returns {boolean}
     */
    isRememberMeEnabled() {
        return localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.REMEMBER_ME) === 'true';
    },

    /**
     * Clear all authentication data
     */
    clearAuth() {
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.USERNAME);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.REMEMBER_ME);
    },

    /**
     * Decode JWT token
     * @param {string} token
     * @returns {object|null}
     */
    decodeToken(token) {
        if (!token) return null;

        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    },

    /**
     * Check if token is expired
     * @param {string} token
     * @returns {boolean}
     */
    isTokenExpired(token) {
        const payload = this.decodeToken(token);
        if (!payload || !payload.exp) return true;

        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    },

    /**
     * Check if token needs refresh (within buffer time)
     * @param {string} token
     * @returns {boolean}
     */
    needsRefresh(token) {
        const payload = this.decodeToken(token);
        if (!payload || !payload.exp) return true;

        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;

        return timeUntilExpiry < AUTH_CONFIG.TOKEN.REFRESH_BUFFER;
    },

    /**
     * Get time until token expires (in milliseconds)
     * @param {string} token
     * @returns {number}
     */
    getTimeUntilExpiry(token) {
        const payload = this.decodeToken(token);
        if (!payload || !payload.exp) return 0;

        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        return Math.max(0, expiryTime - currentTime);
    }
};

// ============================================================================
// REFRESH TOKEN SERVICE
// ============================================================================

const RefreshTokenService = {
    isRefreshing: false,
    refreshPromise: null,
    refreshAttempts: 0,

    /**
     * Refresh access token using refresh token
     * @returns {Promise<boolean>}
     */
    async refreshAccessToken() {
        // If already refreshing, return the existing promise
        if (this.isRefreshing && this.refreshPromise) {
            console.log('Token refresh already in progress, waiting...');
            return this.refreshPromise;
        }

        // Check refresh attempts
        if (this.refreshAttempts >= AUTH_CONFIG.TOKEN.MAX_REFRESH_ATTEMPTS) {
            console.error('Max refresh attempts reached');
            this.resetRefreshState();
            return false;
        }

        this.isRefreshing = true;
        this.refreshAttempts++;

        this.refreshPromise = this._performRefresh();
        const result = await this.refreshPromise;

        this.isRefreshing = false;
        this.refreshPromise = null;

        if (result) {
            this.refreshAttempts = 0; // Reset on success
        }

        return result;
    },

    /**
     * Perform the actual token refresh
     * @private
     * @returns {Promise<boolean>}
     */
    async _performRefresh() {
        const refreshToken = TokenManager.getRefreshToken();

        if (!refreshToken) {
            console.warn('No refresh token available');
            return false;
        }

        try {
            console.log('Attempting to refresh access token...');

            const response = await fetch(AUTH_CONFIG.API_ENDPOINTS.REFRESH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Token refresh successful');

                // Store new tokens
                TokenManager.setAccessToken(data.accessToken);
                if (data.refreshToken) {
                    TokenManager.setRefreshToken(data.refreshToken);
                }

                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.warn('Token refresh failed:', response.status, errorData.message);
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    },

    /**
     * Reset refresh state
     */
    resetRefreshState() {
        this.isRefreshing = false;
        this.refreshPromise = null;
        this.refreshAttempts = 0;
    }
};

// ============================================================================
// AUTHENTICATION GUARD
// ============================================================================

const AuthGuard = {
    /**
     * Check authentication and refresh token if needed
     * @returns {Promise<boolean>} - True if authenticated, false otherwise
     */
    async checkAuth() {
        const accessToken = TokenManager.getAccessToken();

        // No token at all
        if (!accessToken) {
            console.log('No access token found');
            this.redirectToLogin();
            return false;
        }

        // Token is expired
        if (TokenManager.isTokenExpired(accessToken)) {
            console.log('Access token expired, attempting refresh...');
            const refreshed = await RefreshTokenService.refreshAccessToken();

            if (!refreshed) {
                console.log('Token refresh failed, redirecting to login');
                this.redirectToLogin();
                return false;
            }

            console.log('Token refreshed successfully');
            return true;
        }

        // Token needs refresh soon (proactive refresh)
        if (TokenManager.needsRefresh(accessToken)) {
            console.log('Access token needs refresh, refreshing proactively...');
            // Don't wait for this, let it happen in background
            RefreshTokenService.refreshAccessToken().catch(err => {
                console.warn('Background token refresh failed:', err);
            });
        }

        return true;
    },

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        TokenManager.clearAuth();
        window.location.href = AUTH_CONFIG.ROUTES.LOGIN;
    }
};

// ============================================================================
// AUTHENTICATED FETCH WRAPPER
// ============================================================================

const AuthenticatedFetch = {
    /**
     * Make an authenticated fetch request with automatic token refresh
     * @param {string} url - Request URL
     * @param {object} options - Fetch options
     * @returns {Promise<Response>}
     */
    async fetch(url, options = {}) {
        // Ensure we have a valid token
        const isAuthenticated = await AuthGuard.checkAuth();
        if (!isAuthenticated) {
            throw new Error('Not authenticated');
        }

        // Get current access token
        const accessToken = TokenManager.getAccessToken();

        // Add authorization header
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        // Make the request
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include'
        });

        // If unauthorized, try to refresh and retry once
        if (response.status === 401) {
            console.log('Received 401, attempting token refresh...');

            const refreshed = await RefreshTokenService.refreshAccessToken();

            if (refreshed) {
                console.log('Token refreshed, retrying request...');

                // Retry with new token
                const newHeaders = {
                    ...headers,
                    'Authorization': `Bearer ${TokenManager.getAccessToken()}`
                };

                return fetch(url, {
                    ...options,
                    headers: newHeaders,
                    credentials: 'include'
                });
            } else {
                console.warn('Token refresh failed, redirecting to login');
                AuthGuard.redirectToLogin();
                throw new Error('Authentication failed after refresh');
            }
        }

        return response;
    }
};
