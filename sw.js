/* DroneStudio : service worker (ouverture hors connexion).
   Change le numéro de version après une modification des icônes ou du manifeste. */
const CACHE = 'dronestudio-v6';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon.ico', './archivo.woff2', './archivo.ttf'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.indexOf('dronestudio-') === 0 && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.searchParams.has('vcheck')) return; /* vérification de version : toujours le réseau */

  /* Pages : réseau d'abord (mises à jour immédiates), cache si hors connexion */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return res;
      }).catch(() => caches.match(req)
        .then(hit => hit || caches.match('./index.html'))
        .then(hit => hit || caches.match('./'))
        .then(hit => hit || Response.error()))
    );
    return;
  }

  /* Fichiers de l'app et polices : cache d'abord, rafraîchi en arrière-plan */
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === self.location.origin || fonts) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
          return res;
        }).catch(() => hit || Response.error());
        return hit || net;
      })
    );
  }
});
