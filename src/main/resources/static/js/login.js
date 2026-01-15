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
        STANDARD_LIFETIME: 25 * 60 * 1000, // 25 minutes in milliseconds
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
// STORAGE MANAGER (Must be defined before AuthState)
// ============================================================================

const StorageManager = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.error('Error reading from localStorage');
            return null;
        }
    },

    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('Error writing to localStorage');
            if (error.name === 'QuotaExceededError') {
                AlertUtils.show(
                    'Storage quota exceeded. Please clear your browser data.',
                    'warning'
                );
            }
            return false;
        }
    },

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage');
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage');
        }
    },

    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const AuthState = {
    isLoading: false,

    getToken() {
        return StorageManager.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    },

    setToken(token) {
        if (token) {
            StorageManager.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token);
        }
    },

    getUsername() {
        return StorageManager.getItem(CONFIG.STORAGE_KEYS.USERNAME);
    },

    setUsername(username) {
        if (username) {
            StorageManager.setItem(CONFIG.STORAGE_KEYS.USERNAME, username);
        }
    },

    setRememberMe(rememberMe) {
        StorageManager.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());
    },

    getRememberMe() {
        return StorageManager.getItem(CONFIG.STORAGE_KEYS.REMEMBER_ME) === 'true';
    },

    isRememberMeEnabled() {
        return this.getRememberMe();
    },

    clearToken() {
        StorageManager.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        StorageManager.removeItem(CONFIG.STORAGE_KEYS.USERNAME);
        StorageManager.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const InputSanitizer = {
    sanitizeUsername(username) {
        return username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_.-]/g, '');
    },

    sanitizeEmail(email) {
        return email
            .trim()
            .toLowerCase();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

const TokenUtils = {
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
            console.error('Error decoding token');
            return null;
        }
    },

    isExpired(token) {
        const payload = this.decode(token);
        if (!payload || !payload.exp) return true;

        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    },

    needsRefresh(token) {
        const payload = this.decode(token);
        if (!payload || !payload.exp) return true;

        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;

        return timeUntilExpiry < CONFIG.TOKEN.REFRESH_BUFFER;
    },

    getTimeUntilExpiry(token) {
        const payload = this.decode(token);
        if (!payload || !payload.exp) return 0;

        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        return Math.max(0, expiryTime - currentTime);
    },

    hasRememberMe(token) {
        const payload = this.decode(token);
        return payload?.rememberMe === true;
    }
};

const RedirectLoopDetector = {
    incrementCounter() {
        const count = this.getCounter();
        const timestamp = Date.now();

        StorageManager.setItem(CONFIG.REDIRECT_LOOP.STORAGE_KEY, (count + 1).toString());
        StorageManager.setItem(CONFIG.REDIRECT_LOOP.TIMESTAMP_KEY, timestamp.toString());
    },

    getCounter() {
        const count = StorageManager.getItem(CONFIG.REDIRECT_LOOP.STORAGE_KEY);
        const timestamp = StorageManager.getItem(CONFIG.REDIRECT_LOOP.TIMESTAMP_KEY);

        if (!count || !timestamp) return 0;

        const timeSinceLastRedirect = Date.now() - parseInt(timestamp);

        if (timeSinceLastRedirect > CONFIG.REDIRECT_LOOP.TIMEOUT) {
            this.reset();
            return 0;
        }

        return parseInt(count) || 0;
    },

    isInLoop() {
        return this.getCounter() >= CONFIG.REDIRECT_LOOP.MAX_REDIRECTS;
    },

    reset() {
        StorageManager.removeItem(CONFIG.REDIRECT_LOOP.STORAGE_KEY);
        StorageManager.removeItem(CONFIG.REDIRECT_LOOP.TIMESTAMP_KEY);
    },

    wasRedirectedFromProtectedPage() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('redirect') || document.referrer.includes('/dashboard');
    }
};

const AlertUtils = {
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

    clear() {
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
    }
};

// ============================================================================
// RATE LIMITING
// ============================================================================

const RateLimiter = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    STORAGE_KEY: 'loginAttempts',
    LOCKOUT_KEY: 'loginLockout',

    getAttempts() {
        const attempts = StorageManager.getItem(this.STORAGE_KEY);
        return attempts ? JSON.parse(attempts) : { count: 0, timestamp: Date.now() };
    },

    incrementAttempts() {
        const attempts = this.getAttempts();

        if (Date.now() - attempts.timestamp > 60000) {
            attempts.count = 1;
            attempts.timestamp = Date.now();
        } else {
            attempts.count++;
        }

        StorageManager.setItem(this.STORAGE_KEY, JSON.stringify(attempts));

        if (attempts.count >= this.MAX_ATTEMPTS) {
            this.lockAccount();
        }

        return attempts.count;
    },

    lockAccount() {
        const lockoutTime = Date.now() + this.LOCKOUT_DURATION;
        StorageManager.setItem(this.LOCKOUT_KEY, lockoutTime.toString());
    },

    isLocked() {
        const lockoutTime = StorageManager.getItem(this.LOCKOUT_KEY);
        if (!lockoutTime) return false;

        const timeRemaining = parseInt(lockoutTime) - Date.now();
        if (timeRemaining <= 0) {
            this.reset();
            return false;
        }

        return true;
    },

    getTimeRemaining() {
        const lockoutTime = StorageManager.getItem(this.LOCKOUT_KEY);
        if (!lockoutTime) return 0;

        const timeRemaining = parseInt(lockoutTime) - Date.now();
        return Math.max(0, Math.ceil(timeRemaining / 1000));
    },

    reset() {
        StorageManager.removeItem(this.STORAGE_KEY);
        StorageManager.removeItem(this.LOCKOUT_KEY);
    },

    getRemainingAttempts() {
        const attempts = this.getAttempts();
        return Math.max(0, this.MAX_ATTEMPTS - attempts.count);
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

        if (this.elements.usernameInput) {
            this.elements.usernameInput.addEventListener('input', () => {
                this.clearFieldError(this.elements.usernameInput);
            });
        }

        if (this.elements.passwordInput) {
            this.elements.passwordInput.addEventListener('input', () => {
                this.clearFieldError(this.elements.passwordInput);
            });
        }
    },

    togglePasswordVisibility() {
        const type = this.elements.passwordInput.type === 'password' ? 'text' : 'password';
        this.elements.passwordInput.type = type;

        const icon = this.elements.togglePasswordBtn.querySelector('i');
        if (icon) {
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        }
    },

    setLoadingState(isLoading) {
        AuthState.isLoading = isLoading;

        if (this.elements.loginBtn) {
            this.elements.loginBtn.disabled = isLoading;
        }

        if (this.elements.loginBtnText) {
            this.elements.loginBtnText.style.display = isLoading ? 'none' : 'inline';
        }

        if (this.elements.loginBtnSpinner) {
            this.elements.loginBtnSpinner.style.display = isLoading ? 'inline-block' : 'none';
        }

        if (this.elements.usernameInput) {
            this.elements.usernameInput.disabled = isLoading;
        }

        if (this.elements.passwordInput) {
            this.elements.passwordInput.disabled = isLoading;
        }

        if (this.elements.rememberMeCheckbox) {
            this.elements.rememberMeCheckbox.disabled = isLoading;
        }
    },

    getFormData() {
        return {
            username: this.elements.usernameInput?.value.trim() || '',
            password: this.elements.passwordInput?.value || '',
            rememberMe: this.elements.rememberMeCheckbox?.checked || false
        };
    },

    clearForm() {
        if (this.elements.loginForm) {
            this.elements.loginForm.reset();
        }
        this.clearAllErrors();
    },

    showFieldError(field, message) {
        if (!field) return;

        field.classList.add('is-invalid');

        let errorDiv = field.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('invalid-feedback')) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            field.parentNode.insertBefore(errorDiv, field.nextSibling);
        }
        errorDiv.textContent = message;
    },

    clearFieldError(field) {
        if (!field) return;

        field.classList.remove('is-invalid');
        const errorDiv = field.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
            errorDiv.remove();
        }
    },

    clearAllErrors() {
        const invalidFields = document.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => this.clearFieldError(field));
    },

    validateForm() {
        const { username, password } = this.getFormData();
        this.clearAllErrors();

        let isValid = true;

        if (!username) {
            this.showFieldError(this.elements.usernameInput, 'Username is required');
            isValid = false;
        } else if (username.length < 3) {
            this.showFieldError(this.elements.usernameInput, 'Username must be at least 3 characters');
            isValid = false;
        }

        if (!password) {
            this.showFieldError(this.elements.passwordInput, 'Password is required');
            isValid = false;
        } else if (password.length < 4) {
            this.showFieldError(this.elements.passwordInput, 'Password must be at least 6 characters');
            isValid = false;
        }

        return isValid;
    }
};

// ============================================================================
// AUTHENTICATION SERVICE - Now using AuthUtils
// ============================================================================

const AuthService = {
    async handleLogin() {
    if (AuthState.isLoading) return;

    if (RateLimiter.isLocked()) {
        const timeRemaining = RateLimiter.getTimeRemaining();
        const minutes = Math.floor(timeRemaining / 60);
        AlertUtils.show(
            `Account locked. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
            'danger'
        );
        return;
    }

    if (!UIManager.validateForm()) {
        return;
    }

    UIManager.setLoadingState(true);
    AlertUtils.clear();

    const { username, password, rememberMe } = UIManager.getFormData();

    try {
        const response = await fetch(CONFIG.API_ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username: InputSanitizer.sanitizeUsername(username),
                password: password,
                rememberMe: rememberMe
            })
        });

        const data = await response.json();

        if (response.ok && data.accessToken) {
            RateLimiter.reset();
            await this.handleLoginSuccess(data, rememberMe);
        } else {
            const remainingAttempts = RateLimiter.incrementAttempts();
            const attemptsLeft = RateLimiter.getRemainingAttempts();

            if (RateLimiter.isLocked()) {
                const timeRemaining = RateLimiter.getTimeRemaining();
                const minutes = Math.floor(timeRemaining / 60);
                AlertUtils.show(
                    `Too many failed attempts. Account locked for ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
                    'danger'
                );
            } else if (attemptsLeft <= 2) {
                AlertUtils.show(
                    `${data.message || 'Login failed'}. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
                    'danger'
                );
            } else {
                AlertUtils.show(
                    data.message || 'Invalid username or password',
                    'danger'
                );
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        AlertUtils.show(
            'Connection error. Please check your internet connection and try again.',
            'danger'
        );
    } finally {
        UIManager.setLoadingState(false);
    }
},

async handleLoginSuccess(data, rememberMe) {
    AuthState.setToken(data.accessToken);
    AuthState.setUsername(data.username);
    AuthState.setRememberMe(rememberMe);

    UIManager.clearForm();
    AlertUtils.show('Login successful! Redirecting...', 'success', 1500);
    RedirectLoopDetector.reset();

    setTimeout(() => {
        this.redirectToDashboard();
    }, 1500);
},

redirectToDashboard() {
    window.location.href = CONFIG.ROUTES.DASHBOARD;
},

async checkExistingAuth() {
    const token = AuthState.getToken();

    if (!token) {
        return;
    }

    if (TokenUtils.isExpired(token)) {
        await AuthUtils.refreshToken();
        const newToken = AuthState.getToken();

        if (newToken && !TokenUtils.isExpired(newToken)) {
            if (RedirectLoopDetector.isInLoop()) {
                AuthState.clearToken();
                AlertUtils.show('Session expired. Please login again.', 'warning');
                return;
            }
            RedirectLoopDetector.incrementCounter();
            this.redirectToDashboard();
        } else {
            AuthState.clearToken();
        }
        return;
    }

    if (RedirectLoopDetector.isInLoop()) {
        AuthState.clearToken();
        AlertUtils.show('Session expired. Please login again.', 'warning');
        return;
    }

    RedirectLoopDetector.incrementCounter();
    this.redirectToDashboard();
},

async logout() {
    await AuthUtils.logout();
    RateLimiter.reset();
    RedirectLoopDetector.reset();
    AlertUtils.show('Logged out successfully', 'success', 2000);
}
};
// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

const KeyboardShortcuts = {
    init() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus username
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            UIManager.elements.usernameInput?.focus();
        }

        // Escape to clear form
        if (e.key === 'Escape') {
            UIManager.clearForm();
            AlertUtils.clear();
        }
    });
}
};

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

function initializeApp() {

    VisualEffects.createSnowflakes();
    UIManager.init();
    KeyboardShortcuts.init();

    if (RateLimiter.isLocked()) {
        const timeRemaining = RateLimiter.getTimeRemaining();
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        AlertUtils.show(
            `Too many failed attempts. Please try again in ${minutes}m ${seconds}s`,
            'danger'
        );
    }

    AuthService.checkExistingAuth();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
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

// ============================================================================
// NETWORK UTILITIES
// ============================================================================

const NetworkUtils = {
    isOnline() {
        return navigator.onLine;
    },

    checkBeforeRequest() {
        if (!this.isOnline()) {
            AlertUtils.show(
                'No internet connection. Please check your network and try again.',
                'danger'
            );
            return false;
        }
        return true;
    },

    init() {
        window.addEventListener('online', () => {
            AlertUtils.show('Connection restored', 'success', 3000);
        });

        window.addEventListener('offline', () => {
            AlertUtils.show('Connection lost. Please check your internet connection.', 'danger');
        });
    }
};

NetworkUtils.init();