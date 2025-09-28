// ===================================================================================
// DAREMON Radio ETS - Service Worker v10
//
// Strategie:
// - Zwiększono wersję cache do v10, aby wymusić aktualizację wszystkich zasobów.
// - Dodano agresywne czyszczenie starych plików cache z wyszukiwarki.
// - Poprawa zarządzania cache dla lepszej wydajności.
// ===================================================================================

const CACHE_NAME = 'daremon-radio-v10'; // WAŻNE: Zmiana wersji cache

// Basis app-resources (App Shell) z dodanymi ikonami
const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './app.js',
    './styles.css',
    './manifest.json',
    './playlist.json',
    './locales/nl.json',
    './locales/pl.json',
    './icons/icon-192.png', // Dodano
    './icons/icon-512.png', // Dodano
    './icons/favicon.svg' // Dodano
];

// Agresywne usuwanie starych cache przy instalacji
self.addEventListener('install', e => {
    console.log('[Service Worker] Instalacja nowej wersji v10...');
    e.waitUntil(
        // Najpierw usuń wszystkie stare cache
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
                    .map(cacheName => {
                        console.log('[Service Worker] Usuwanie starego cache podczas instalacji:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => {
            // Następnie utwórz nowy cache
            return caches.open(CACHE_NAME).then(cache => {
                console.log('[Service Worker] Caching van basis app-resources.');
                return cache.addAll(APP_SHELL_ASSETS);
            });
        }).catch(err => {
            console.error('[Service Worker] Fout podczas instalacji:', err);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    console.log('[Service Worker] Aktywacja v10...');
    e.waitUntil(
        Promise.all([
            // Usuń wszystkie stare cache
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Usuwanie starego cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Wyczyść też cache przeglądarki poprzez dodanie timestamp do headerów
            self.clients.matchAll().then(clients => {
                return Promise.all(clients.map(client => {
                    return client.postMessage({
                        type: 'CACHE_UPDATED',
                        version: 'v10'
                    });
                }));
            })
        ])
    );
    return self.clients.claim();
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Stale-while-revalidate dla playlisty i tłumaczeń
    if (url.pathname.endsWith('playlist.json') || url.pathname.includes('/locales/')) {
        e.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(e.request).then(cachedResponse => {
                    const fetchPromise = fetch(e.request).then(networkResponse => {
                        cache.put(e.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(err => {
                        console.warn('[Service Worker] Błąd sieci, używam cache dla:', e.request.url, err);
                        return cachedResponse; // Zwróć z cache jeśli sieć zawiedzie
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Cache first, then network dla audio
    if (url.pathname.startsWith('/music/')) {
        e.respondWith(
            caches.match(e.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(e.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Cache first dla reszty zasobów (app shell)
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request).catch(err => {
                console.error('[Service Worker] Błąd fetch dla:', e.request.url, err);
                // Opcjonalnie: Zwróć stronę błędu offline
            });
        })
    );
});
