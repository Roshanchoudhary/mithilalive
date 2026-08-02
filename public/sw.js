// Service Worker for News Portal CMS
const CACHE_NAME = 'news-portal-v1';
const STATIC_ASSETS = [
  '/',
  '/styles/globals.css',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip API requests
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(fetch(request));
  }

  // Skip admin and employee routes
  if (url.pathname.startsWith('/admin/') || url.pathname.startsWith('/employee/')) {
    return event.respondWith(fetch(request));
  }

  // Cache static assets
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Return cached response if found
          if (cachedResponse) {
            return cachedResponse;
          }

          // Fetch from network
          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, clone));
              }
              return response;
            })
            .catch(() => {
              // Offline fallback - return offline page
              return caches.match('/offline.html');
            });
        })
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body || 'New update available',
    icon: '/images/icon-192.png',
    badge: '/images/badge.png',
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Read More'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'News Update', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    const url = event.notification.data.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});
