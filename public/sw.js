// Service Worker for Spanish Language Learning App
console.log('Service Worker starting up...');

// Detect if we're in a development environment
const isDevelopment = self.location.hostname === 'localhost' || 
                    self.location.hostname.includes('replit') ||
                    self.location.hostname.includes('.repl.co');

console.log('Service Worker running in', isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION', 'mode');

// If in development mode, immediately unregister this service worker
if (isDevelopment) {
  console.log('Development mode detected - disabling service worker caching');
  self.registration.unregister()
    .then(() => {
      console.log('Service worker has been unregistered in development mode');
    });
}

const CACHE_NAME = 'spanish-learning-cache-v2';  // Changed version to force update

// Assets to cache initially
const INITIAL_CACHED_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add CSS and JS files that are critical for initial render
];

// Install event - cache initial resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching initial resources');
        return cache.addAll(INITIAL_CACHED_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Now ready to handle fetches');
      return self.clients.claim();
    })
  );
});

// Bypass cache in development mode
self.addEventListener('fetch', (event) => {
  // Check if we're in development mode
  const isDevelopment = self.location.hostname === 'localhost' || 
                        self.location.hostname.includes('replit') ||
                        self.location.hostname.includes('.repl.co');

  // For development, always go to network and never cache
  if (isDevelopment) {
    console.log('Service Worker: Development mode - bypassing cache for', event.request.url);
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API calls - we want fresh data for those
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, clone it and cache it
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // When network fails, try to serve from cache
        console.log('Service Worker: Serving from cache for', event.request.url);
        return caches.match(event.request);
      })
  );
});

// Handle message events (e.g., from the main thread)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});