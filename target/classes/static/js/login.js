// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIG = {
    API_ENDPOINTS: {
        LOGIN: '/api/auth/login',
        VERIFY_TOKEN: '/api/auth/verify'
    },
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'accessToken',
        USERNAME: 'username'
    },
    ROUTES: {
        DASHBOARD: '/ConsoleApp/dashboard'
    },
    SNOWFLAKE_COUNT: 50,
    ALERT_DURATION: 5000,
    REDIRECT_LOOP_DETECTION: {
        MAX_ATTEMPTS: 2,
        RESET_INTERVAL: 5000 // 5 seconds
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const AuthState = {
    accessToken: null,
    isLoading: false,

    setToken(token) {
        this.accessToken = token;
        if (token) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token);
        }
    },

    getToken() {
        return this.accessToken || localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    },

    clearToken() {
        this.accessToken = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USERNAME);
    },

    setUsername(username) {
        if (username) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.USERNAME, username);
        }
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
     * Check if a JWT token is expired
     * @param {string} token - JWT token to check
     * @returns {boolean} - True if expired, false otherwise
     */
    isExpired(token) {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;
        } catch (error) {
            console.error('Error parsing token:', error);
            return true;
        }
    },

    /**
     * Decode JWT token payload
     * @param {string} token - JWT token to decode
     * @returns {object|null} - Decoded payload or null
     */
    decode(token) {
        if (!token) return null;

        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }
};

/**
 * Redirect loop detection utilities
 */
const RedirectLoopDetector = {
    /**
     * Check if we're in a redirect loop
     * @returns {boolean} - True if loop detected
     */
    isInLoop() {
        const count = this.getRedirectCount();
        const lastTime = this.getLastRedirectTime();
        const now = Date.now();

        // Reset counter if enough time has passed
        if (now - lastTime > CONFIG.REDIRECT_LOOP_DETECTION.RESET_INTERVAL) {
            this.reset();
            return false;
        }

        return count >= CONFIG.REDIRECT_LOOP_DETECTION.MAX_ATTEMPTS;
    },

    /**
     * Increment redirect counter
     */
    incrementCounter() {
        const count = this.getRedirectCount();
        sessionStorage.setItem('loginRedirectCount', (count + 1).toString());
        sessionStorage.setItem('lastRedirectTime', Date.now().toString());
    },

    /**
     * Get current redirect count
     * @returns {number}
     */
    getRedirectCount() {
        return parseInt(sessionStorage.getItem('loginRedirectCount') || '0');
    },

    /**
     * Get last redirect timestamp
     * @returns {number}
     */
    getLastRedirectTime() {
        return parseInt(sessionStorage.getItem('lastRedirectTime') || '0');
    },

    /**
     * Reset redirect tracking
     */
    reset() {
        sessionStorage.removeItem('loginRedirectCount');
        sessionStorage.removeItem('lastRedirectTime');
    },

    /**
     * Check if we were redirected from a protected page
     * @returns {boolean}
     */
    wasRedirectedFromProtectedPage() {
        const referrer = document.referrer;
        return referrer && (
            referrer.includes('/ConsoleApp/dashboard') ||
            referrer.includes('/ConsoleApp/projects') ||
            referrer.includes('/ConsoleApp/profile') ||
            referrer.includes('/ConsoleApp/admin')
        );
    }
};

/**
 * Alert/Notification utilities
 */
const AlertUtils = {
    /**
     * Show an alert message
     * @param {string} message - Message to display
     * @param {string} type - Alert type (success, danger, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    show(message, type = 'info', duration = CONFIG.ALERT_DURATION) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.setAttribute('role', 'alert');
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);

        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                if (alert.parentNode) {
                    const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
                    bsAlert.close();
                }
            }, duration);
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
     * Create falling snowflakes animation
     */
    createSnowflakes() {
        const snowflakesContainer = document.getElementById('snowflakes');
        if (!snowflakesContainer) return;

        // Clear existing snowflakes
        snowflakesContainer.innerHTML = '';

        for (let i = 0; i < CONFIG.SNOWFLAKE_COUNT; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.innerHTML = '❄';
            snowflake.setAttribute('aria-hidden', 'true');

            // Random positioning and animation
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
        loginBtnSpinner: null
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

        // Add Enter key support for password field
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
            password: this.elements.passwordInput?.value || ''
        };
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
    },

    /**
     * Validate form inputs
     * @returns {object} - Validation result
     */
    validateForm() {
        const { username, password } = this.getFormData();

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

        const { username, password } = UIManager.getFormData();

        UIManager.setLoadingState(true);
        AlertUtils.clear();

        try {
            const response = await fetch(CONFIG.API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                await this.handleLoginSuccess(data);
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
     */
    async handleLoginSuccess(data) {
        console.log('Login successful');

        // Clear any redirect loop tracking
        RedirectLoopDetector.reset();

        // Store authentication data
        AuthState.setToken(data.accessToken);
        AuthState.setUsername(data.username);

        // Show success message
        AlertUtils.show(`🎄Login successful! Welcome ${data.username}`, 'success', 2000);

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
