// ============================================================================
// SHARED CONSTANTS
// ============================================================================
const SharedConfig = {
    API_BASE: '/api',
    CONSOLE_BASE: '/ConsoleApp',
    
    API_ENDPOINTS: {
        // Auth
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        REFRESH: '/api/auth/refresh',
        LOGOUT: '/api/auth/logout',
        LOGOUT_ALL: '/api/auth/logout-all',
        VERIFY: '/api/auth/verify',
        DASHBOARD: '/api/auth/dashboard',
        
        // Projects
        PROJECTS: '/api/projects',
        PROJECTS_UPDATED: '/api/projects/projects-updated',
        PROJECT_STATS: '/api/projects/stats',
        PROJECT_BY_ID: (id) => `/api/projects/${id}`,
        PROJECT_PROGRESS: (id) => `/api/projects/${id}/progress`,
        ASSIGNED_COUNT: '/api/projects/assigned/count',
        SYNC_GITHUB: '/api/projects/sync-github',
        
        // Admin
        ADMIN_USERS: '/api/admin/users',
        ADMIN_PROJECTS: '/api/admin/projects',
        ADMIN_STATS: '/api/admin/stats',
        ADMIN_USER_STATS: '/api/admin/users/stats',
        ADMIN_USER_ROLE: (userId) => `/api/admin/users/${userId}/role`,
        ADMIN_DELETE_USER: (userId) => `/api/admin/users/${userId}`,
        
        // User
        USER_PROFILE: '/api/user/profile',
        USER_PASSWORD: '/api/user/change-password'
    },
    
    ROUTES: {
        LOGIN: '/ConsoleApp/login',
        DASHBOARD: '/ConsoleApp/dashboard',
        PROJECTS: '/ConsoleApp/projects',
        PROJECTS_CREATE: '/ConsoleApp/projects/create',
        PROJECTS_EDIT: (id) => `/ConsoleApp/projects/edit/${id}`,
        PROFILE: '/ConsoleApp/profile',
        ADMIN_PROJECTS: '/ConsoleApp/admin/projects',
        ADMIN_USERS: '/ConsoleApp/admin/users'
    },
    
    ALERT_TYPES: {
        SUCCESS: 'success',
        DANGER: 'danger',
        WARNING: 'warning',
        INFO: 'info'
    },
    
    STATUS_COLORS: {
        COMPLETED: 'success',
        IN_PROGRESS: 'primary',
        ON_HOLD: 'warning',
        CANCELLED: 'danger',
        PLANNING: 'info'
    },
    
    PRIORITY_COLORS: {
        LOW: 'success',
        MEDIUM: 'primary',
        HIGH: 'warning',
        CRITICAL: 'danger'
    },
    
    STATUS_ORDER: {
        PLANNING: 1,
        IN_PROGRESS: 2,
        ON_HOLD: 3,
        COMPLETED: 4,
        CANCELLED: 5
    },
    
    PRIORITY_ORDER: {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4
    },
    
    PROGRESS_THRESHOLDS: {
        LOW: 30,
        MEDIUM: 70
    }
};

// ============================================================================
// SHARED ERROR MESSAGES
// ============================================================================
const ErrorMessages = {
    // Network & Connection
    NETWORK_ERROR: 'Network error. Please check your connection.',
    CONNECTION_FAILED: 'Connection failed. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    
    // Authentication
    AUTH_FAILED: 'Authentication failed. Please log in again.',
    SESSION_EXPIRED: 'Session expired. Please log in again.',
    INVALID_CREDENTIALS: 'Invalid username or password.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    
    // Validation
    REQUIRED_FIELD: (field) => `${field} is required`,
    MIN_LENGTH: (field, length) => `${field} must be at least ${length} characters`,
    MAX_LENGTH: (field, length) => `${field} must not exceed ${length} characters`,
    INVALID_EMAIL: 'Please enter a valid email address',
    PASSWORD_MISMATCH: 'Passwords do not match',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters',
    INVALID_DATE: 'Please enter a valid date',
    END_BEFORE_START: 'End date cannot be before start date',
    
    // Projects
    PROJECT_NOT_FOUND: 'Project not found',
    PROJECT_LOAD_FAILED: 'Failed to load projects',
    PROJECT_CREATE_FAILED: 'Failed to create project',
    PROJECT_UPDATE_FAILED: 'Failed to update project',
    PROJECT_DELETE_FAILED: 'Failed to delete project',
    PROJECT_NAME_REQUIRED: 'Project name is required',
    
    // Users
    USER_NOT_FOUND: 'User not found',
    USER_LOAD_FAILED: 'Failed to load users',
    USER_CREATE_FAILED: 'Failed to create user',
    USER_UPDATE_FAILED: 'Failed to update user',
    USER_DELETE_FAILED: 'Failed to delete user',
    USERNAME_EXISTS: 'Username already exists',
    EMAIL_EXISTS: 'Email already exists',
    
    // Generic
    LOAD_FAILED: (item) => `Failed to load ${item}`,
    SAVE_FAILED: (item) => `Failed to save ${item}`,
    DELETE_FAILED: (item) => `Failed to delete ${item}`,
    UPDATE_FAILED: (item) => `Failed to update ${item}`,
    OPERATION_FAILED: 'Operation failed. Please try again.',
    UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.'
};

// ============================================================================
// SHARED SUCCESS MESSAGES
// ============================================================================
const SuccessMessages = {
    // Authentication
    LOGIN_SUCCESS: 'Login successful! Redirecting...',
    LOGOUT_SUCCESS: 'Logged out successfully',
    REGISTER_SUCCESS: 'Registration successful!',
    
    // Projects
    PROJECT_CREATED: 'Project created successfully!',
    PROJECT_UPDATED: 'Project updated successfully!',
    PROJECT_DELETED: 'Project deleted successfully!',
    PROGRESS_UPDATED: 'Progress updated successfully!',
    
    // Users
    USER_CREATED: 'User created successfully!',
    USER_UPDATED: 'User updated successfully!',
    USER_DELETED: 'User deleted successfully!',
    ROLE_UPDATED: 'User role updated successfully!',
    
    // Profile
    PROFILE_UPDATED: 'Profile updated successfully!',
    PASSWORD_CHANGED: 'Password changed successfully!',
    
    // Generic
    SAVE_SUCCESS: (item) => `${item} saved successfully!`,
    DELETE_SUCCESS: (item) => `${item} deleted successfully!`,
    UPDATE_SUCCESS: (item) => `${item} updated successfully!`
};

// ============================================================================
// SHARED UTILITIES
// ============================================================================
const SharedUtils = {
    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} - Escaped HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Format date consistently
     * @param {string|Date} dateString - Date to format
     * @param {object} options - Intl.DateTimeFormat options
     * @returns {string} - Formatted date
     */
    formatDate(dateString, options = {}) {
        if (!dateString) return 'N/A';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };
        
        try {
            return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
        } catch {
            return 'Invalid date';
        }
    },
    
    /**
     * Get status badge color
     * @param {string} status - Project status
     * @returns {string} - Bootstrap color class
     */
    getStatusColor(status) {
        return SharedConfig.STATUS_COLORS[status] || 'secondary';
    },
    
    /**
     * Get priority badge color
     * @param {string} priority - Project priority
     * @returns {string} - Bootstrap color class
     */
    getPriorityColor(priority) {
        return SharedConfig.PRIORITY_COLORS[priority] || 'secondary';
    },
    
    /**
     * Get progress bar color based on percentage
     * @param {number} progress - Progress percentage (0-100)
     * @returns {string} - Bootstrap color class
     */
    getProgressColor(progress) {
        if (progress < SharedConfig.PROGRESS_THRESHOLDS.LOW) return 'danger';
        if (progress < SharedConfig.PROGRESS_THRESHOLDS.MEDIUM) return 'warning';
        return 'success';
    },
    
    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Show alert notification
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, danger, warning, info)
     * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
     * @returns {HTMLElement} - Alert element
     */
    showAlert(message, type = 'info', duration = 5000) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px; max-width: 500px;';
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
            ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        if (duration > 0) {
            setTimeout(() => {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 150);
            }, duration);
        }
        
        return alertDiv;
    },
    
    /**
     * Get appropriate icon for alert type
     * @param {string} type - Alert type
     * @returns {string} - FontAwesome icon class
     */
    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    },
    
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid
     */
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    /**
     * Validate progress value
     * @param {number} progress - Progress value
     * @returns {boolean} - True if valid (0-100)
     */
    isValidProgress(progress) {
        return typeof progress === 'number' && progress >= 0 && progress <= 100;
    },
    
    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} - True if successful
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textarea);
            return result;
        }
    },
    
    /**
     * Get element by ID safely
     * @param {string} elementId - Element ID
     * @returns {HTMLElement|null} - Element or null
     */
    getElement(elementId) {
        return document.getElementById(elementId);
    },
    
    /**
     * Get element value safely
     * @param {string} elementId - Element ID
     * @returns {string} - Element value or empty string
     */
    getElementValue(elementId) {
        const element = this.getElement(elementId);
        return element ? element.value.trim() : '';
    },
    
    /**
     * Set element value safely
     * @param {string} elementId - Element ID
     * @param {string} value - Value to set
     */
    setElementValue(elementId, value) {
        const element = this.getElement(elementId);
        if (element) {
            element.value = value;
        }
    },
    
    /**
     * Update element text content
     * @param {string} elementId - Element ID
     * @param {string} text - Text to set
     */
    updateElementText(elementId, text) {
        const element = this.getElement(elementId);
        if (element) {
            element.textContent = text;
        }
    },
    
    /**
     * Show loading spinner in element
     * @param {string} elementId - Container element ID
     * @param {string} message - Loading message
     */
    showLoading(elementId, message = 'Loading...') {
        const element = this.getElement(elementId);
        if (element) {
            element.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">${this.escapeHtml(message)}</p>
                </div>
            `;
        }
    },
    
    /**
     * Hide loading spinner
     * @param {string} elementId - Container element ID
     */
    hideLoading(elementId) {
        const element = this.getElement(elementId);
        if (element) {
            element.innerHTML = '';
        }
    },
    
    /**
     * Disable form during submission
     * @param {HTMLFormElement} form - Form element
     * @param {boolean} disabled - Whether to disable
     */
    setFormDisabled(form, disabled) {
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => {
            input.disabled = disabled;
        });
    },
    
    /**
     * Format number with thousands separator
     * @param {number} num - Number to format
     * @returns {string} - Formatted number
     */
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    },
    
    /**
     * Calculate days between dates
     * @param {Date|string} startDate - Start date
     * @param {Date|string} endDate - End date
     * @returns {number} - Number of days
     */
    daysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    
    /**
     * Check if date is in the past
     * @param {Date|string} date - Date to check
     * @returns {boolean} - True if in past
     */
    isDatePast(date) {
        return new Date(date) < new Date();
    },
    
    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} - Truncated text
     */
    truncateText(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
};

// ============================================================================
// LOADING MANAGER
// ============================================================================
const LoadingManager = {
    /**
     * Show loading state on element
     * @param {string} elementId - Element ID
     * @param {string} message - Loading message
     */
    show(elementId, message = 'Loading...') {
        SharedUtils.showLoading(elementId, message);
    },
    
    /**
     * Hide loading state
     * @param {string} elementId - Element ID
     */
    hide(elementId) {
        SharedUtils.hideLoading(elementId);
    },
    
    /**
     * Show loading state on button
     * @param {HTMLElement} button - Button element
     * @param {string} loadingText - Text to show while loading
     */
    setButtonLoading(button, loadingText = 'Loading...') {
        if (!button) return;
        
        button.disabled = true;
        button.dataset.originalHtml = button.innerHTML;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${loadingText}
        `;
    },
    
    /**
     * Reset button from loading state
     * @param {HTMLElement} button - Button element
     */
    resetButton(button) {
        if (!button) return;
        
        button.disabled = false;
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
            delete button.dataset.originalHtml;
        }
    }
};

// ============================================================================
// FORM VALIDATOR
// ============================================================================
const FormValidator = {
    /**
     * Validate form data against rules
     * @param {object} formData - Form data to validate
     * @param {object} rules - Validation rules
     * @returns {object} - {isValid: boolean, errors: object}
     */
    validate(formData, rules) {
        const errors = {};
        
        for (const [field, value] of Object.entries(formData)) {
            const rule = rules[field];
            if (!rule) continue;
            
            // Required validation
            if (rule.required && (!value || value === '')) {
                errors[field] = ErrorMessages.REQUIRED_FIELD(field);
                continue;
            }
            
            // Skip other validations if value is empty and not required
            if (!value) continue;
            
            // Min length
            if (rule.minLength && value.length < rule.minLength) {
                errors[field] = ErrorMessages.MIN_LENGTH(field, rule.minLength);
            }
            
            // Max length
            if (rule.maxLength && value.length > rule.maxLength) {
                errors[field] = ErrorMessages.MAX_LENGTH(field, rule.maxLength);
            }
            
            // Email format
            if (rule.format === 'email' && !SharedUtils.isValidEmail(value)) {
                errors[field] = ErrorMessages.INVALID_EMAIL;
            }
            
            // Pattern matching
            if (rule.pattern && !rule.pattern.test(value)) {
                errors[field] = rule.message || `Invalid ${field} format`;
            }
            
            // Custom validator
            if (rule.validator && typeof rule.validator === 'function') {
                const result = rule.validator(value);
                if (result !== true) {
                    errors[field] = result;
                }
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },
    
    /**
     * Show field error
     * @param {HTMLElement} field - Input element
     * @param {string} message - Error message
     */
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
    
    /**
     * Clear field error
     * @param {HTMLElement} field - Input element
     */
    clearFieldError(field) {
        if (!field) return;
        
        field.classList.remove('is-invalid');
        const errorDiv = field.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
            errorDiv.remove();
        }
    },
    
    /**
     * Clear all form errors
     * @param {HTMLFormElement} form - Form element
     */
    clearFormErrors(form) {
        if (!form) return;
        
        const invalidFields = form.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => this.clearFieldError(field));
    }
};

// ============================================================================
// MODAL MANAGER
// ============================================================================
const ModalManager = {
    /**
     * Show Bootstrap modal
     * @param {string} modalId - Modal element ID
     * @returns {bootstrap.Modal|null} - Modal instance
     */
    show(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            return modal;
        }
        return null;
    },
    
    /**
     * Hide Bootstrap modal
     * @param {string} modalId - Modal element ID
     */
    hide(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
    },
    
    /**
     * Get modal instance
     * @param {string} modalId - Modal element ID
     * @returns {bootstrap.Modal|null} - Modal instance
     */
    getInstance(modalId) {
        const modalElement = document.getElementById(modalId);
        return modalElement ? bootstrap.Modal.getInstance(modalElement) : null;
    }
};

// Export globally
if (typeof window !== 'undefined') {
    window.SharedConfig = SharedConfig;
    window.SharedUtils = SharedUtils;
    window.ErrorMessages = ErrorMessages;
    window.SuccessMessages = SuccessMessages;
    window.LoadingManager = LoadingManager;
    window.FormValidator = FormValidator;
    window.ModalManager = ModalManager;
}