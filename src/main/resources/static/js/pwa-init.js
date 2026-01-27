/**
 * PWA Initialization - Register Service Worker and handle PWA installation
 */

const PWAManager = {
    /**
     * Initialize PWA features
     */
    init() {
        this.registerServiceWorker();
        this.handleInstallPrompt();
        this.checkForUpdates();
    },
    
    /**
     * Register Service Worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                });
                
                console.log('[PWA] Service Worker registered:', registration.scope);
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.notifyUpdate();
                        }
                    });
                });
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        } else {
            console.log('[PWA] Service Worker not supported');
        }
    },
    
    /**
     * Handle PWA install prompt
     */
    handleInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent default install prompt
            e.preventDefault();
            deferredPrompt = e;
            
            // Show custom install button/banner
            this.showInstallButton(deferredPrompt);
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            deferredPrompt = null;
            this.hideInstallButton();
            
            if (window.SharedUtils) {
                SharedUtils.showAlert('App installed! You can now use APMS offline.', 'success');
            }
        });
    },
    
    /**
     * Show install button
     */
    showInstallButton(deferredPrompt) {
        const installBtn = document.getElementById('installAppBtn');
        if (installBtn) {
            installBtn.style.display = 'block';
            
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const result = await deferredPrompt.userChoice;
                    
                    console.log('[PWA] Install prompt result:', result.outcome);
                    deferredPrompt = null;
                }
            });
        }
    },
    
    /**
     * Hide install button
     */
    hideInstallButton() {
        const installBtn = document.getElementById('installAppBtn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    },
    
    /**
     * Notify user of available update
     */
    notifyUpdate() {
        if (window.SharedUtils) {
            const updateNotification = SharedUtils.showAlert(
                'A new version is available! Refresh to update.',
                'info',
                0
            );
            
            // Add reload button to the alert
            const reloadBtn = document.createElement('button');
            reloadBtn.className = 'btn btn-sm btn-primary ms-2';
            reloadBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Reload';
            reloadBtn.onclick = () => window.location.reload();
            
            updateNotification.appendChild(reloadBtn);
        }
    },
    
    /**
     * Check for updates periodically
     */
    checkForUpdates() {
        if ('serviceWorker' in navigator) {
            // Check for updates every hour
            setInterval(async () => {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    registration.update();
                }
            }, 60 * 60 * 1000); // 1 hour
        }
    },
    
    /**
     * Check if app is installed
     * @returns {boolean}
     */
    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    },
    
    /**
     * Check if offline
     * @returns {boolean}
     */
    isOffline() {
        return !navigator.onLine;
    }
};

// ============================================================================
// REQUEST CACHE MANAGER
// ============================================================================
const RequestCache = {
    cache: new Map(),
    TTL: 5 * 60 * 1000, // 5 minutes default
    
    /**
     * Set cached response
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in ms
     */
    set(key, value, ttl = this.TTL) {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl
        });
    },
    
    /**
     * Get cached response
     * @param {string} key - Cache key
     * @returns {any|null} - Cached value or null
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        const age = Date.now() - item.timestamp;
        if (age > item.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    },
    
    /**
     * Invalidate specific cache key
     * @param {string} key - Cache key to invalidate
     */
    invalidate(key) {
        this.cache.delete(key);
    },
    
    /**
     * Invalidate all matching keys
     * @param {string} pattern - Pattern to match (e.g., '/api/projects')
     */
    invalidatePattern(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    },
    
    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    },
    
    /**
     * Get cache size
     * @returns {number}
     */
    size() {
        return this.cache.size;
    }
};

// Auto-initialize PWA features
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWAManager.init());
} else {
    PWAManager.init();
}

// Export globally
if (typeof window !== 'undefined') {
    window.PWAManager = PWAManager;
    window.RequestCache = RequestCache;
}