/* Service worker: bump RELEASE_CACHE on every release so updated code is not trapped behind stale cache. */
const RELEASE_CACHE = 'progression-v5';
const APP_SHELL = ['./','./index.html','./styles.css','./manifest.webmanifest','./js/app.js','./js/state.js','./js/engine.js','./js/views.js','./js/wizard.js','./js/charts.js','./js/trackers.js','./js/supabase.js','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
const isCode = url => new URL(url).pathname.endsWith('.js') || new URL(url).pathname.endsWith('.css') || new URL(url).pathname.endsWith('/') || new URL(url).pathname.endsWith('index.html');
self.addEventListener('install', event => event.waitUntil(caches.open(RELEASE_CACHE).then(cache => Promise.allSettled(APP_SHELL.map(u => cache.add(u)))).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== RELEASE_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  const url = new URL(request.url);
  const staticAsset = url.pathname.endsWith('.png') || url.hostname.includes('fonts.') || url.hostname.includes('fonts.gstatic.com');
  if (isCode(url) || request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { if(response.ok){const copy=response.clone(); caches.open(RELEASE_CACHE).then(cache=>cache.put(request,copy));} return response; }).catch(() => caches.match(request).then(cached => cached || caches.match('./index.html'))));
  } else if (staticAsset) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if(response.ok){const copy=response.clone(); caches.open(RELEASE_CACHE).then(cache=>cache.put(request,copy));} return response; })));
  }
});
