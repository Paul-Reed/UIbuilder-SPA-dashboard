const CACHE_NAME = 'pwa-dashboard-v1'

const FILES_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './index.js',
  './manifest.webmanifest',
  '../uibuilder/uibuilder.iife.min.js',
  '../uibuilder/utils/uibrouter.iife.min.js',
  '../uibuilder/vendor/justgage/raphael.min.js',
  '../uibuilder/vendor/justgage/dist/justgage.min.js',
  '../uibuilder/vendor/plotly.js-basic-dist-min/plotly-basic.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './views/charger.html',
  './views/energy.html',
  './views/server.html'
]

// Install: Cache all necessary assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  )
})

// Activate: Remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  )
  self.clients.claim()
})

// Fetch: Serve from cache first
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  )
})

