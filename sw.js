const CACHE_NAME = 'hikeathon-2025-v1'
const STATIC_CACHE_URLS = [
  '/hikeathon-2025/',
  '/hikeathon-2025/manifest.json',
  '/hikeathon-2025/favicon.ico'
]

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  // Skip cross-origin requests and API calls
  if (!event.request.url.startsWith(self.location.origin) ||
      event.request.url.includes('/api/') ||
      event.request.url.includes('supabase.co')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url)
          return response
        }

        // Otherwise fetch from network
        console.log('Fetching from network:', event.request.url)
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone the response for caching
            const responseToCache = response.clone()

            caches.open(CACHE_NAME)
              .then(cache => {
                // Only cache GET requests for static assets
                if (event.request.method === 'GET' &&
                    (event.request.url.endsWith('.js') ||
                     event.request.url.endsWith('.css') ||
                     event.request.url.endsWith('.html') ||
                     event.request.url.endsWith('.png') ||
                     event.request.url.endsWith('.jpg') ||
                     event.request.url.endsWith('.svg'))) {
                  cache.put(event.request, responseToCache)
                }
              })

            return response
          })
      })
      .catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/hikeathon-2025/')
        }
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered')
    // Handle offline queue sync here
  }
})

// Push notifications (if implemented later)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json()
    console.log('Push notification received:', data)
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/hikeathon-2025/favicon.ico',
        badge: '/hikeathon-2025/favicon.ico',
        data: data.url
      })
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close()
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    )
  }
})