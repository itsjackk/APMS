/**
 * Theme Manager - Dark Mode Support
 * Provides theme switching functionality with localStorage persistence
 */

const ThemeManager = {
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark',
        AUTO: 'auto'
    },
    
    STORAGE_KEY: 'apms-theme',
    
    /**
     * Initialize theme system
     */
    init() {
        const savedTheme = this.getSavedTheme();
        this.applyTheme(savedTheme);
        this.setupThemeToggle();
        this.listenForSystemThemeChanges();
    },
    
    /**
     * Get saved theme from localStorage
     * @returns {string} - Theme name
     */
    getSavedTheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        return saved || this.THEMES.AUTO;
    },
    
    /**
     * Get effective theme (resolves 'auto' to light/dark)
     * @returns {string} - 'light' or 'dark'
     */
    getEffectiveTheme() {
        const theme = this.getSavedTheme();
        
        if (theme === this.THEMES.AUTO) {
            return this.getSystemTheme();
        }
        
        return theme;
    },
    
    /**
     * Get system preferred theme
     * @returns {string} - 'light' or 'dark'
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.THEMES.DARK;
        }
        return this.THEMES.LIGHT;
    },
    
    /**
     * Apply theme to document
     * @param {string} theme - Theme to apply
     */
    applyTheme(theme) {
        const effectiveTheme = theme === this.THEMES.AUTO ? this.getSystemTheme() : theme;
        
        // Set data attribute on body
        document.body.setAttribute('data-theme', effectiveTheme);
        
        // Save preference
        localStorage.setItem(this.STORAGE_KEY, theme);
        
        // Update toggle button if exists
        this.updateToggleButton(effectiveTheme);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: effectiveTheme } 
        }));
        
        console.log(`Theme applied: ${effectiveTheme}`);
    },
    
    /**
     * Toggle between light and dark
     */
    toggle() {
        const current = this.getEffectiveTheme();
        const newTheme = current === this.THEMES.LIGHT ? this.THEMES.DARK : this.THEMES.LIGHT;
        this.applyTheme(newTheme);
    },
    
    /**
     * Setup theme toggle button
     */
    setupThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    },
    
    /**
     * Update toggle button icon
     * @param {string} theme - Current theme
     */
    updateToggleButton(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (!toggleBtn) return;
        
        const icon = toggleBtn.querySelector('i');
        if (!icon) return;
        
        icon.className = theme === this.THEMES.DARK 
            ? 'fas fa-sun' 
            : 'fas fa-moon';
    },
    
    /**
     * Listen for system theme changes (when using auto mode)
     */
    listenForSystemThemeChanges() {
        if (!window.matchMedia) return;
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            const savedTheme = this.getSavedTheme();
            if (savedTheme === this.THEMES.AUTO) {
                this.applyTheme(this.THEMES.AUTO);
            }
        });
    },
    
    /**
     * Get current theme
     * @returns {string} - Current theme
     */
    getCurrentTheme() {
        return this.getEffectiveTheme();
    },
    
    /**
     * Check if dark mode is active
     * @returns {boolean}
     */
    isDarkMode() {
        return this.getEffectiveTheme() === this.THEMES.DARK;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

// Export globally
if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
}