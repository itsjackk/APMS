// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIG = {
    API_ENDPOINTS: {
        LOGIN: '/api/auth/login',
        REFRESH: '/api/auth/refresh',
        VERIFY_TOKEN: '/api/auth/verify'
    },
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'accessToken',
        USERNAME: 'username',
        REMEMBER_ME: 'rememberMe'
    },
    ROUTES: {
        LOGIN: '/ConsoleApp/login',
        DASHBOARD: '/ConsoleApp/dashboard'
    },
    TOKEN: {
        STANDARD_LIFETIME: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        REMEMBER_ME_LIFETIME: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        REFRESH_BUFFER: 5 * 60 * 1000 // Refresh 5 minutes before expiry
    },
    REDIRECT_LOOP: {
        MAX_REDIRECTS: 3,
        TIMEOUT: 5000,
        STORAGE_KEY: 'loginRedirectCount',
        TIMESTAMP_KEY: 'loginRedirectTimestamp'
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const AuthState = {
    isLoading: false,

    /**
     * Get access token from localStorage
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * Set access token in localStorage
     * @param {string} token
     */
    setToken(token) {
        if (token) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token);
        }
    },

    /**
     * Get username from localStorage
     * @returns {string|null}
     */
    getUsername() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.USERNAME);
    },

    /**
     * Set username in localStorage
     * @param {string} username
     */
    setUsername(username) {
        if (username) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.USERNAME, username);
        }
    },

    /**
     * Set remember me preference
     * @param {boolean} rememberMe
     */
    setRememberMe(rememberMe) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());
    },

    /**
     * Get remember me preference
     * @returns {boolean}
     */
    getRememberMe() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.REMEMBER_ME) === 'true';
    },

    /**
     * Check if remember me is enabled
     * @returns {boolean}
     */
    isRememberMeEnabled() {
        return this.getRememberMe();
    },

    /**
     * Get refresh token from localStorage
     * @returns {string|null}
     */
    getRefreshToken() {
        return localStorage.getItem('refreshToken');
    },

    /**
     * Set refresh token in localStorage
     * @param {string} token
     */
    setRefreshToken(token) {
        if (token) {
            localStorage.setItem('refreshToken', token);
        }
    },

    /**
     * Clear all authentication data
     */
    clearToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USERNAME);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
        localStorage.removeItem('refreshToken');
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Token utilities
 */
const TokenUtils = {
    /**
     * Decode JWT token
     * @param {string} token
     * @returns {object|null}
     */
    decode(token) {
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
    isExpired(token) {
        const payload = this.decode(token);
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
        const payload = this.decode(token);
        if (!payload || !payload.exp) return true;

        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;

        return timeUntilExpiry < CONFIG.TOKEN.REFRESH_BUFFER;
    },

    /**
     * Get time until token expires
     * @param {string} token
     * @returns {number} - Time in milliseconds
     */
    getTimeUntilExpiry(token) {
        const payload = this.decode(token);
        if (!payload || !payload.exp) return 0;

        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        return Math.max(0, expiryTime - currentTime);
    },

    /**
     * Check if token has remember me flag
     * @param {string} token
     * @returns {boolean}
     */
    hasRememberMe(token) {
        const payload = this.decode(token);
        return payload?.rememberMe === true;
    }
};

/**
 * Redirect loop detection utilities
 */
const RedirectLoopDetector = {
    /**
     * Increment redirect counter
     */
    incrementCounter() {
        const count = this.getCounter();
        const timestamp = Date.now();

        localStorage.setItem(CONFIG.REDIRECT_LOOP.STORAGE_KEY, (count + 1).toString());
        localStorage.setItem(CONFIG.REDIRECT_LOOP.TIMESTAMP_KEY, timestamp.toString());
    },

    /**
     * Get current redirect counter
     * @returns {number}
     */
    getCounter() {
        const count = localStorage.getItem(CONFIG.REDIRECT_LOOP.STORAGE_KEY);
        const timestamp = localStorage.getItem(CONFIG.REDIRECT_LOOP.TIMESTAMP_KEY);

        if (!count || !timestamp) return 0;

        const timeSinceLastRedirect = Date.now() - parseInt(timestamp);

        if (timeSinceLastRedirect > CONFIG.REDIRECT_LOOP.TIMEOUT) {
            this.reset();
            return 0;
        }

        return parseInt(count) || 0;
    },

    /**
     * Check if in redirect loop
     * @returns {boolean}
     */
    isInLoop() {
        return this.getCounter() >= CONFIG.REDIRECT_LOOP.MAX_REDIRECTS;
    },

    /**
     * Reset redirect counter
     */
    reset() {
        localStorage.removeItem(CONFIG.REDIRECT_LOOP.STORAGE_KEY);
        localStorage.removeItem(CONFIG.REDIRECT_LOOP.TIMESTAMP_KEY);
    },

    /**
     * Check if was redirected from protected page
     * @returns {boolean}
     */
    wasRedirectedFromProtectedPage() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('redirect') || document.referrer.includes('/dashboard');
    }
};

/**
 * Alert/Notification utilities
 */
const AlertUtils = {
    /**
     * Show alert message
     * @param {string} message
     * @param {string} type - 'success', 'danger', 'warning', 'info'
     * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide)
     */
    show(message, type = 'info', duration = 0) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) {
            console.warn('Alert container not found');
            return;
        }

        this.clear();

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.setAttribute('role', 'alert');
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        alertContainer.appendChild(alert);

        if (duration > 0) {
            setTimeout(() => this.clear(), duration);
        }
    },

    /**
     * Clear all alerts
     */
    clear() {
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
    }
};

/**
 * Visual effects utilities
 */
const VisualEffects = {
    /**
     * Create snowflake effect
     */
    createSnowflakes() {
        const container = document.getElementById('snowflakes');
        if (!container) return;

        const fragment = document.createDocumentFragment();
        const snowflakeCount = 50;

        for (let i = 0; i < snowflakeCount; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.innerHTML = '❄';

            Object.assign(snowflake.style, {
                left: `${Math.random() * 100}%`,
                animationDuration: `${5 + Math.random() * 10}s`,
                animationDelay: `${Math.random() * 5}s`,
                fontSize: `${0.5 + Math.random() * 1.5}em`
            });

            fragment.appendChild(snowflake);
        }

        container.appendChild(fragment);
    }
};

// ============================================================================
// UI MANAGEMENT
// ============================================================================

const UIManager = {
    elements: {
        loginForm: null,
        usernameInput: null,
        passwordInput: null,
        togglePasswordBtn: null,
        loginBtn: null,
        loginBtnText: null,
        loginBtnSpinner: null,
        rememberMeCheckbox: null
    },

    /**
     * Initialize UI elements
     */
    init() {
        this.elements.loginForm = document.getElementById('loginForm');
        this.elements.usernameInput = document.getElementById('username');
        this.elements.passwordInput = document.getElementById('password');
        this.elements.togglePasswordBtn = document.getElementById('togglePassword');
        this.elements.loginBtn = document.getElementById('loginBtn');
        this.elements.loginBtnText = document.getElementById('loginBtnText');
        this.elements.loginBtnSpinner = document.getElementById('loginBtnSpinner');
        this.elements.rememberMeCheckbox = document.getElementById('rememberMe');

        this.attachEventListeners();
    },

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                AuthService.handleLogin();
            });
        }

        if (this.elements.togglePasswordBtn) {
            this.elements.togglePasswordBtn.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        if (this.elements.passwordInput) {
            this.elements.passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    AuthService.handleLogin();
                }
            });
        }
    },

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility() {
        const passwordField = this.elements.passwordInput;
        const icon = this.elements.togglePasswordBtn?.querySelector('i');

        if (!passwordField || !icon) return;

        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            this.elements.togglePasswordBtn.setAttribute('aria-label', 'Hide password');
        } else {
            passwordField.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            this.elements.togglePasswordBtn.setAttribute('aria-label', 'Show password');
        }
    },

    /**
     * Set loading state for login button
     * @param {boolean} loading - Whether to show loading state
     */
    setLoadingState(loading) {
        if (!this.elements.loginBtn) return;

        AuthState.isLoading = loading;

        this.elements.loginBtn.disabled = loading;

        if (this.elements.loginBtnText) {
            this.elements.loginBtnText.style.display = loading ? 'none' : 'inline';
        }

        if (this.elements.loginBtnSpinner) {
            this.elements.loginBtnSpinner.style.display = loading ? 'inline-block' : 'none';
        }

        // Disable form inputs during loading
        if (this.elements.usernameInput) {
            this.elements.usernameInput.disabled = loading;
        }
        if (this.elements.passwordInput) {
            this.elements.passwordInput.disabled = loading;
        }
    },

    /**
     * Get form values
     * @returns {object} - Form data
     */
    getFormData() {
        return {
            username: this.elements.usernameInput?.value.trim() || '',
            password: this.elements.passwordInput?.value || '',
            rememberMe: this.getRememberMeState()
        };
    },

    /**
     * Get remember me checkbox state
     * @returns {boolean}
     */
    getRememberMeState() {
        return this.elements.rememberMeCheckbox?.checked || false;
    },

    /**
     * Clear form fields
     */
    clearForm() {
        if (this.elements.usernameInput) {
            this.elements.usernameInput.value = '';
        }
        if (this.elements.passwordInput) {
            this.elements.passwordInput.value = '';
        }
        if (this.elements.rememberMeCheckbox) {
            this.elements.rememberMeCheckbox.checked = false;
        }
    },

    /**
     * Validate form inputs
     * @returns {object} - Validation result
     */
    validateForm() {
        const { username, password, rememberMe } = this.getFormData();

        if (!username) {
            return {
                valid: false,
                message: 'Please enter your username'
            };
        }

        if (!password) {
            return {
                valid: false,
                message: 'Please enter your password'
            };
        }

        if (username.length < 3) {
            return {
                valid: false,
                message: 'Username must be at least 3 characters'
            };
        }

        return { valid: true };
    }
};

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

const AuthService = {
    /**
     * Check if user is already authenticated
     */
    async checkExistingAuth() {
        const storedToken = AuthState.getToken();

        if (!storedToken) {
            console.log('No stored token found');
            return;
        }

        // Check for redirect loop first
        if (RedirectLoopDetector.isInLoop()) {
            console.warn('Redirect loop detected, clearing tokens');
            AuthState.clearToken();
            RedirectLoopDetector.reset();
            AlertUtils.show('Your session is invalid. Please login again.', 'warning');
            return;
        }

        // If we were redirected from a protected page, the token is likely invalid
        if (RedirectLoopDetector.wasRedirectedFromProtectedPage()) {
            console.log('Redirected from protected page, clearing potentially invalid token');
            AuthState.clearToken();
            RedirectLoopDetector.reset();
            AlertUtils.show('Your session has expired. Please login again.', 'info');
            return;
        }

        // Check if token is expired (client-side check)
        if (TokenUtils.isExpired(storedToken)) {
            console.log('Token expired, clearing storage');
            AuthState.clearToken();
            RedirectLoopDetector.reset();
            return;
        }

        // Check if remember me was enabled in previous session
        const rememberMeEnabled = AuthState.isRememberMeEnabled();
        if (rememberMeEnabled) {
            // For remember me sessions, check if token needs refresh
            if (TokenUtils.needsRefresh(storedToken)) {
                console.log('Token needs refresh, attempting refresh...');
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    console.log('Token refreshed successfully, redirecting to dashboard');
                    RedirectLoopDetector.incrementCounter();
                    this.redirectToDashboard();
                    return;
                } else {
                    console.log('Token refresh failed, clearing storage');
                    AuthState.clearToken();
                    RedirectLoopDetector.reset();
                    AlertUtils.show('Your session has expired. Please login again.', 'info');
                    return;
                }
            }
        }

        // Token appears valid, verify with server
        console.log('Token found, verifying with server...');
        const isValid = await this.verifyTokenWithServer(storedToken);

        if (isValid) {
            console.log('Token verified, redirecting to dashboard');
            RedirectLoopDetector.incrementCounter();
            this.redirectToDashboard();
        } else {
            console.log('Token invalid on server, clearing storage');
            AuthState.clearToken();
            RedirectLoopDetector.reset();
            AlertUtils.show('Your session is no longer valid. Please login again.', 'info');
        }
    },

    /**
     * Refresh access token using refresh token
     * @returns {Promise<boolean>} - True if refresh successful
     */
    async refreshAccessToken() {
        const refreshToken = AuthState.getRefreshToken();
        if (!refreshToken) {
            console.warn('No refresh token available');
            return false;
        }

        try {
            const response = await fetch(CONFIG.API_ENDPOINTS.REFRESH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Token refresh successful:', data);

                // Store new tokens
                AuthState.setToken(data.accessToken);

                // Update remember me preference based on new token
                const rememberMe = TokenUtils.hasRememberMe(data.accessToken);
                AuthState.setRememberMe(rememberMe);

                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.warn('Token refresh failed:', response.status, errorData);
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    },

    /**
     * Verify token validity with server
     * @param {string} token - Token to verify
     * @returns {Promise<boolean>} - True if valid, false otherwise
     */
    async verifyTokenWithServer(token) {
        try {
            const response = await fetch(CONFIG.API_ENDPOINTS.VERIFY_TOKEN, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Token verification successful:', data);
                return data.valid === true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.warn('Token verification failed:', response.status, errorData);
                return false;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    },

    /**
     * Handle login form submission
     */
    async handleLogin() {
        // Prevent multiple submissions
        if (AuthState.isLoading) return;

        // Validate form
        const validation = UIManager.validateForm();
        if (!validation.valid) {
            AlertUtils.show(validation.message, 'warning');
            return;
        }

        const { username, password, rememberMe } = UIManager.getFormData();

        UIManager.setLoadingState(true);
        AlertUtils.clear();

        try {
            const response = await fetch(CONFIG.API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, rememberMe }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                await this.handleLoginSuccess(data, rememberMe);
            } else {
                this.handleLoginError(data);
            }
        } catch (error) {
            console.error('Login error:', error);
            AlertUtils.show(`Network error: ${error.message}`, 'danger');
        } finally {
            UIManager.setLoadingState(false);
        }
    },

    /**
     * Handle successful login
     * @param {object} data - Response data from server
     * @param {boolean} rememberMe - Remember me preference
     */
    async handleLoginSuccess(data, rememberMe) {
        console.log('Login successful');

        // Clear any redirect loop tracking
        RedirectLoopDetector.reset();

        // Store authentication data
        AuthState.setToken(data.accessToken);
        AuthState.setUsername(data.username);
        AuthState.setRememberMe(rememberMe);

        if (data.refreshToken) {
                AuthState.setRefreshToken(data.refreshToken);
            }

        // Show success message
        AlertUtils.show(`Login successful! Welcome ${data.username}`, 'success', 2000);

        // Wait for localStorage to be written and alert to be visible
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to dashboard
        this.redirectToDashboard();
    },

    /**
     * Handle login error
     * @param {object} data - Error data from server
     */
    handleLoginError(data) {
        console.error('Login failed:', data);

        const errorMessage = data.message || 'Login failed. Please check your credentials.';
        AlertUtils.show(errorMessage, 'danger');

        // Clear password field on error
        if (UIManager.elements.passwordInput) {
            UIManager.elements.passwordInput.value = '';
            UIManager.elements.passwordInput.focus();
        }
    },

    /**
     * Redirect to dashboard
     */
    redirectToDashboard() {
        window.location.href = CONFIG.ROUTES.DASHBOARD;
    }
};

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

/**
 * Initialize the application when DOM is ready
 */
function initializeApp() {
    console.log('Initializing login page...');

    // Create visual effects
    VisualEffects.createSnowflakes();

    // Initialize UI
    UIManager.init();

    // Check for existing authentication
    AuthService.checkExistingAuth();

    console.log('Login page initialized');
}

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
