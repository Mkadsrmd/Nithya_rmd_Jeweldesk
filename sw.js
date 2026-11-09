/* JewelOS service worker — offline shell + reliable updates (no _headers needed).
   Strategy: network-first for our own HTML/JS/CSS so the newest deploy is fetched
   whenever the device is online; the cached copy is used only when offline. */
const CACHE_NAME = 'thangamos-prod-v5-2026-11-09';  // #18-#20 places + crm link
const CORE = [
  './','./index.html','./sales.html','./crm.html','./shop.html','./manifest.json',
  './css/crm.css','./css/billing.css','./css/thangamos.css',
  './js/supabase-config.js','./js/cloud.js','./js/db.js','./js/billing-sync.js','./js/invoice-template.js','./js/billing.js',
  './js/admin.js','./js/crm.js','./js/module-shell.js','./js/billing-pages.js','./js/bridge.js','./js/settings-extra.js','./js/reports-billing.js',
  './icon-192.png','./icon-512.png','./apple-touch-icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// save a fresh copy into the cache (best-effort)
function freshen(req, resp){
  try { const copy = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy).catch(()=>{})); } catch(_){}
  return resp;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);

  // page navigations: try network, fall back to the matching cached page, then home
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(resp => freshen(e.request, resp))
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // our own assets: network-first (latest when online), cache fallback when offline
  if (u.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then(resp => freshen(e.request, resp))
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // cross-origin (Supabase, CDN): go straight to network, don't cache
  // (let it fail naturally offline)
});
