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
        TOKEN_EXPIRY_BUFFER: 60 // Refresh 60 seconds before expiry
    },

    isTokenExpired(token) {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            // Add buffer to refresh before actual expiry
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

    /**
     * Check if user is authenticated (has valid token)
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        const token = await this.getValidToken();
        return token !== null;
    }
};

// Make it available globally
window.AuthUtils = AuthUtils;