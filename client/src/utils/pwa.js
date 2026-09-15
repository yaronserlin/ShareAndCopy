/**
 * Progressive-web-app plumbing: service worker registration, update
 * handling, and the small checks the UI needs about how the app is
 * running (installed vs. in a browser tab).
 *
 * The worker is registered only in production builds. In development
 * Vite serves modules straight from source, and a caching worker sitting
 * in front of that is a reliable way to spend an afternoon debugging a
 * stale bundle.
 */

/** Where the service worker is served from (it must sit at the root to control the whole scope). */
const SERVICE_WORKER_URL = '/sw.js';

/** @returns {boolean} Whether service workers are usable in this browser. */
export const isServiceWorkerSupported = () => 'serviceWorker' in navigator;

/**
 * Whether the app is running as an installed PWA rather than in a
 * regular browser tab. `standalone` on `navigator` is the iOS-specific
 * spelling of the same idea.
 *
 * @returns {boolean}
 */
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

/**
 * Registers the service worker and reports updates.
 *
 * When a new version is installed while an old one is still controlling
 * the page, a `pwa:update-available` event is dispatched on `window` so
 * the UI can offer to reload - rather than silently swapping the app out
 * from under someone mid-transfer.
 *
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export const registerServiceWorker = async () => {
    if (!isServiceWorkerSupported() || !import.meta.env.PROD) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });

        registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;

            installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                    window.dispatchEvent(new CustomEvent('pwa:update-available', {
                        detail: { registration }
                    }));
                }
            });
        });

        // A new worker taking control means the app it serves has
        // changed; reload once so the running page matches it.
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloading) return;
            reloading = true;
            window.location.reload();
        });

        return registration;
    } catch (error) {
        console.error('Service worker registration failed', error);
        return null;
    }
};

/**
 * Activates a waiting service worker. The page reloads via the
 * `controllerchange` handler above once it takes over.
 *
 * @param {ServiceWorkerRegistration} registration
 */
export const applyUpdate = (registration) => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
};

/**
 * Returns the active registration, waiting for one if the worker is
 * still starting up. Push subscription needs this.
 *
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export const getServiceWorkerRegistration = async () => {
    if (!isServiceWorkerSupported()) return null;

    try {
        return await navigator.serviceWorker.ready;
    } catch {
        return null;
    }
};
