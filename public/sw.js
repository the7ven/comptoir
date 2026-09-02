/* Comptoir — Service Worker (Phase 1 : coquille hors-ligne + installabilité)
 *
 * Rôle limité et volontairement simple :
 *   - précache d'une coquille minimale (pages clés + page /offline) ;
 *   - assets figés de Next (/_next/static, hashés) : cache-first ;
 *   - navigations : network-first, repli sur le cache puis sur /offline ;
 *   - autres GET same-origin : stale-while-revalidate.
 *
 * Ce SW ne touche JAMAIS :
 *   - les requêtes non-GET ;
 *   - /api/* (relais webhooks, création staff) ;
 *   - les appels vers Supabase (autre origine, non interceptés).
 *
 * Le cache de données métier (menu, plan de salle) et l'outbox d'écritures
 * viendront aux phases suivantes.
 */

const VERSION = 'v1';
const PRECACHE = `comptoir-precache-${VERSION}`;
const RUNTIME = `comptoir-runtime-${VERSION}`;

// Coquille précachée à l'installation. On reste minimal : les assets hashés
// se rempliront en runtime au fil de la navigation en ligne.
const APP_SHELL = [
  '/',
  '/offline',
  '/dashboard',
  '/auth/login',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // addAll échoue en bloc si une seule URL 404 → on tolère les absences.
      await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PRECACHE, RUNTIME]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('comptoir-') && !keep.has(n)).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// Permet à la page de forcer l'activation d'un SW en attente (bouton "Mettre à jour").
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isCacheableResponse(res) {
  return res && res.status === 200 && res.type === 'basic';
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const fresh = await fetch(request);
    if (isCacheableResponse(fresh)) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request) || await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline');
      if (offline) return offline;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(RUNTIME);
  const fresh = await fetch(request);
  if (isCacheableResponse(fresh)) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((fresh) => {
      if (isCacheableResponse(fresh)) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => null);
  return cached || (await network) || Promise.reject(new Error('offline, pas de cache'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase & co : on laisse passer
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
