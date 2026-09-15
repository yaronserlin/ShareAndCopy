/**
 * Service worker for the installed app.
 *
 * Two jobs, deliberately kept small:
 *
 * 1. Serve the app shell. A navigation is answered from the network
 *    first and falls back to the cached shell, so launching the PWA
 *    works with a flaky or absent connection instead of showing the
 *    browser's offline page. Hashed build assets are cached as they are
 *    requested.
 *
 * 2. Receive Web Push messages and turn them into notifications, and
 *    focus (or open) the app when one is clicked.
 *
 * API traffic is never cached. Auth responses in particular must always
 * come from the server - a cached 401, or a stale `/auth/verify`, would
 * be worse than no cache at all.
 */

const VERSION = 'v1';
const SHELL_CACHE = `sac-shell-${VERSION}`;
const ASSET_CACHE = `sac-assets-${VERSION}`;

/** Requests that must always hit the network. */
const NEVER_CACHE = ['/api/', '/socket.io/', '/env-config.js'];

/** Minimal shell kept so a cold launch renders something. */
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_URLS))
            .catch(() => undefined)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith('sac-') && key !== SHELL_CACHE && key !== ASSET_CACHE)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

/** Lets the page tell a waiting worker to take over immediately. */
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

/** @param {Request} request */
const isCacheable = (request) => {
    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return false;
    if (request.method !== 'GET') return false;

    return !NEVER_CACHE.some((path) => url.pathname.startsWith(path));
};

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (!isCacheable(request)) {
        return;
    }

    // Navigations: network first, so a deployed update is picked up
    // immediately, with the cached shell as the offline fallback.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
                    return response;
                })
                .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/')))
        );
        return;
    }

    // Everything else: serve from cache when present, and refresh the
    // entry in the background. Build assets are content-hashed, so a
    // cached copy is never the wrong copy.
    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || network;
        })
    );
});

self.addEventListener('push', (event) => {
    let payload = {};

    try {
        payload = event.data ? event.data.json() : {};
    } catch {
        payload = { title: 'Share & Copy', body: event.data ? event.data.text() : '' };
    }

    const title = payload.title || 'Share & Copy';
    const options = {
        body: payload.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        tag: payload.tag || 'share-and-copy',
        renotify: Boolean(payload.tag),
        timestamp: payload.timestamp || Date.now(),
        data: {
            url: payload.url || '/dashboard',
            category: payload.category || null,
            ...payload.data
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Prefer an already-open window: the app is a single session
            // per device, and opening a second one is never what the
            // person tapping the notification wanted.
            const existing = clientList.find((client) => client.url.startsWith(self.location.origin));

            if (existing) {
                existing.focus();
                if ('navigate' in existing && !existing.url.startsWith(targetUrl)) {
                    return existing.navigate(targetUrl).catch(() => undefined);
                }
                return undefined;
            }

            return self.clients.openWindow(targetUrl);
        })
    );
});
