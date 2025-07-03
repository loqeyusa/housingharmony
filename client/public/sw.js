const CACHE_NAME = 'housing-manager-v1';
const urlsToCache = [
  '/',
  '/mobile',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install service worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Cache addAll failed:', error);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to external domains
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }

        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            
            // Return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/mobile');
            }
            
            throw error;
          });
      })
  );
});

// Activate service worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync data when back online
      syncData()
    );
  }
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Housing Manager',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Housing Manager', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/mobile')
    );
  }
});

// Sync data function
async function syncData() {
  try {
    console.log('[Service Worker] Syncing data...');
    
    // Get pending data from IndexedDB
    const pendingData = await getPendingData();
    
    if (pendingData && pendingData.length > 0) {
      for (const data of pendingData) {
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data.payload)
          });
          
          if (response.ok) {
            await removePendingData(data.id);
            console.log('[Service Worker] Synced data:', data.id);
          }
        } catch (error) {
          console.error('[Service Worker] Sync failed for:', data.id, error);
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync data failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingData() {
  // In a real implementation, this would get data from IndexedDB
  return [];
}

async function removePendingData(id) {
  // In a real implementation, this would remove data from IndexedDB
  console.log('Removing pending data:', id);
}

// Handle app updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});