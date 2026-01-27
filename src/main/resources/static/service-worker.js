/**
 * Service Worker for APMS - Provides offline support and caching
 * Version: 1.0.0
 */

const CACHE_VERSION = 'apms-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Resources to cache immediately on install
const STATIC_RESOURCES = [
    '/ConsoleApp/login',
    '/ConsoleApp/dashboard',
    '/css/dashboard.css',
    '/css/login.css',
    '/css/projects.css',
    '/css/profile.css',
    '/css/snowflakes.css',
    '/css/theme-dark.css',
    '/js/shared-utils.js',
    '/js/auth-utils.js',
    '/js/visual-effects.js',
    '/js/theme-manager.js',
    '/manifest.json'
];

// API endpoints to cache (with network-first strategy)
const API_ENDPOINTS = [
    '/api/projects',
    '/api/projects/stats',
    '/api/user/profile',
    '/api/admin/stats'
];

// ============================================================================
// INSTALL EVENT - Cache static resources
// ============================================================================
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[Service Worker] Caching static resources');
                return cache.addAll(STATIC_RESOURCES.map(url => new Request(url, {
                    cache: 'reload'
                })));
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName.startsWith('apms-') && 
                                   cacheName !== STATIC_CACHE && 
                                   cacheName !== API_CACHE && 
                                   cacheName !== IMAGE_CACHE;
                        })
                        .map((cacheName) => {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ============================================================================
// FETCH EVENT - Serve from cache or network
// ============================================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-HTTP requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Skip authentication/token requests (always go to network)
    if (url.pathname.includes('/api/auth/')) {
        return;
    }
    
    // Handle different types of requests with appropriate strategies
    if (request.method !== 'GET') {
        // POST, PUT, DELETE - always go to network
        event.respondWith(networkOnly(request));
    } else if (url.pathname.startsWith('/api/')) {
        // API requests - network first, fallback to cache
        event.respondWith(networkFirst(request, API_CACHE));
    } else if (isImageRequest(url.pathname)) {
        // Images - cache first, fallback to network
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
    } else if (isStaticResource(url.pathname)) {
        // Static resources - cache first
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else {
        // Everything else - network first
        event.respondWith(networkFirst(request, STATIC_CACHE));
    }
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Network First Strategy - Try network, fallback to cache
 * Best for dynamic content that should be fresh
 */
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('[Service Worker] Serving from cache:', request.url);
            return cachedResponse;
        }
        
        // If request is an API call, return offline message
        if (request.url.includes('/api/')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. Please check your connection.'
            }), {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Return offline page for HTML requests
        return caches.match('/ConsoleApp/login');
    }
}

/**
 * Cache First Strategy - Try cache, fallback to network
 * Best for static resources that don't change often
 */
async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        throw error;
    }
}

/**
 * Network Only Strategy - Always fetch from network
 * Used for authentication and mutations
 */
async function networkOnly(request) {
    return fetch(request);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isStaticResource(pathname) {
    return pathname.startsWith('/css/') ||
           pathname.startsWith('/js/') ||
           pathname.startsWith('/fonts/') ||
           pathname.endsWith('.css') ||
           pathname.endsWith('.js') ||
           pathname.endsWith('.json') ||
           pathname.endsWith('.woff') ||
           pathname.endsWith('.woff2') ||
           pathname.endsWith('.ttf');
}

function isImageRequest(pathname) {
    return pathname.startsWith('/images/') ||
           pathname.endsWith('.png') ||
           pathname.endsWith('.jpg') ||
           pathname.endsWith('.jpeg') ||
           pathname.endsWith('.gif') ||
           pathname.endsWith('.svg') ||
           pathname.endsWith('.webp') ||
           pathname.endsWith('.ico');
}

// ============================================================================
// BACKGROUND SYNC (for offline actions)
// ============================================================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-projects') {
        event.waitUntil(syncProjects());
    }
});

async function syncProjects() {
    // Sync any pending project updates when back online
    console.log('[Service Worker] Syncing projects...');
    // Implementation depends on your offline queue strategy
}

// ============================================================================
// PUSH NOTIFICATIONS (future feature)
// ============================================================================
self.addEventListener('push', (event) => {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        data: {
            url: data.url || '/ConsoleApp/dashboard'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

console.log('[Service Worker] Loaded successfully');