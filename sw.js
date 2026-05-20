// Minimal SW for /pwa/ app with offline caching & form handling
const CACHE_NAME = 'my-pwa-v1';
const APP_FOLDER = '/pwa/';
const FILES_TO_CACHE = [
  APP_FOLDER,
  APP_FOLDER + 'index.html',
  APP_FOLDER + 'app.js',
  APP_FOLDER + 'manifest.json',
  APP_FOLDER + 'test.png'
  // Add any additional files your app needs offline
];

// Install: cache essential files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Cache install failed:', err))
  );
});

// Activate: claim clients immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Fetch: cache-first for static assets, fallback for navigation
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // Skip non-GET requests

  const url = new URL(event.request.url);

  // Handle form submissions (POST)
  if (url.pathname.includes('/submit.php') && event.request.method === 'POST') {
    event.respondWith(handleFormSubmit(event.request));
    return;
  }

  // Handle navigations (page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // Try cache first
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Try network
        return await fetch(event.request);
      } catch {
        // Offline fallback
        return await caches.match(APP_FOLDER + 'index.html') ||
               new Response('<h1>Offline</h1><p>Connect to internet and refresh.</p>', {
                 status: 503,
                 headers: {'Content-Type': 'text/html'}
               });
      }
    })());
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Handle offline form submissions
async function handleFormSubmit(request) {
  if (navigator.onLine) return fetch(request); // Online: normal submit

  const formData = await request.formData();
  const formObject = Object.fromEntries(formData);
  formObject.timestamp = Date.now();

  // Save to IndexedDB
  const db = await openDB();
  const tx = db.transaction('forms', 'readwrite');
  tx.objectStore('forms').add(formObject);
  await tx.done;

  return new Response(JSON.stringify({success: true, message: 'Saved offline!'}), {
    headers: {'Content-Type': 'application/json'}
  });
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PWAForms', 2);
    request.onerror = (e) => reject(e.target.error);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('forms')) {
        db.createObjectStore('forms', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}