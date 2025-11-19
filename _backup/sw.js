// Service Worker for offline functionality
const CACHE_NAME = 'barcode-scanner-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Files to cache immediately
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/config.js',
    '/js/db.js',
    '/js/api.js',
    '/js/scanner.js',
    '/js/location.js',
    '/js/ui.js',
    '/js/app.js',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // API requests - network first, fallback to cache
    if (url.origin === 'https://barcode-api.koch-solutions.com') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE)
                            .then(cache => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(request);
                })
        );
        return;
    }

    // Static assets - cache first, fallback to network
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then(response => {
                        // Cache new resources
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(RUNTIME_CACHE)
                                .then(cache => cache.put(request, responseClone));
                        }
                        return response;
                    });
            })
    );
});

// Background sync for pending scans
self.addEventListener('sync', event => {
    if (event.tag === 'sync-scans') {
        event.waitUntil(syncPendingScans());
    }
});

// Sync pending scans function
async function syncPendingScans() {
    try {
        // This will be handled by the main app
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_SCANS'
            });
        });
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Handle messages from clients
self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
