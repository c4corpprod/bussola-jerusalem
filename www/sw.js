/* ═══════════════════════════════════════════════════════════════
   🕎 SERVICE WORKER — Bússola para Jerusalém (PWA)
   © 2026 Marcos Fernando — C4 Corporation
   
   Cache-first para assets estáticos, Network-first para API
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'bussola-jerusalem-v14';
const STATIC_CACHE = 'bussola-static-v5';
const API_CACHE = 'bussola-api-v4';
const BIBLE_CACHE = 'bussola-bible-v2';
const USER_DATA_CACHE = 'bussola-userdata-v1';
const BIBLE_META_PREFIX = './data/bibles/__meta__/';

// CDN base — mesma URL usada em bible.js
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/c4corpprod/bussola-jerusalem@main/www/data/bibles';

// Assets estáticos para pré-cache (Shell do App)
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './js/compass.js',
    './js/geolocation.js',
    './js/maps.js',
    './js/pix.js',
    './js/music.js',
    './js/community.js',
    './js/bible.js',
    './js/bible-features.js',
    './js/bible-ui-injector.js',
    './js/studies.js',
    './assets/img/icon-192.png',
    './assets/img/icon-512.png',
    './assets/melodia-hebraica.mp3'
];

// CDN resources to cache
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;700&family=Frank+Ruhl+Libre:wght@400;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js'
];

// ─── INSTALL ───
self.addEventListener('install', event => {
    console.log('🕎 Service Worker: Instalando...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Cacheando assets estáticos...');
                return cache.addAll(STATIC_ASSETS).catch(err => {
                    console.warn('⚠️ Falha ao cachear alguns assets:', err);
                    // Cacheia individualmente para não falhar tudo
                    return Promise.allSettled(
                        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
                    );
                });
            })
            .then(() => {
                // Cacheia CDN assets separadamente
                return caches.open(STATIC_CACHE).then(cache => 
                    Promise.allSettled(
                        CDN_ASSETS.map(url => cache.add(url).catch(() => {}))
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ─── ACTIVATE ───
self.addEventListener('activate', event => {
    console.log('🕎 Service Worker: Ativando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== STATIC_CACHE && name !== API_CACHE && name !== BIBLE_CACHE && name !== USER_DATA_CACHE)
                    .map(name => {
                        console.log(`🗑️ Removendo cache antigo: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

function buildBiblePath(id, book) {
    return `${CDN_BASE}/${id}/${book}.json`;
}

function buildMetaPath(id) {
    return `${BIBLE_META_PREFIX}${id}.json`;
}

async function getTranslationMeta(cache, id) {
    const res = await cache.match(buildMetaPath(id));
    if (!res) return null;
    try {
        return await res.json();
    } catch {
        return null;
    }
}

async function setTranslationMeta(cache, tr, cachedFiles, errors) {
    const meta = {
        id: tr.id,
        files: tr.files,
        lang: tr.lang || null,
        version: tr.version || null,
        cachedFiles,
        errors,
        updatedAt: new Date().toISOString()
    };

    await cache.put(
        buildMetaPath(tr.id),
        new Response(JSON.stringify(meta), {
            headers: { 'Content-Type': 'application/json' }
        })
    );
}

async function countCachedFiles(cache, tr) {
    let count = 0;
    for (let book = 1; book <= tr.files; book++) {
        const existing = await cache.match(buildBiblePath(tr.id, book));
        if (existing) count++;
    }
    return count;
}

async function downloadTranslation(cache, tr, client, counters, forceAll) {
    const meta = await getTranslationMeta(cache, tr.id);
    const currentCount = await countCachedFiles(cache, tr);
    const versionChanged = !!(meta && meta.version && tr.version && meta.version !== tr.version);
    const shouldDownload = forceAll || versionChanged || currentCount < tr.files;

    if (!shouldDownload) {
        counters.downloaded += tr.files;
        client.postMessage({
            type: 'DOWNLOAD_PROGRESS',
            downloaded: counters.downloaded,
            totalFiles: counters.totalFiles,
            errors: counters.errors,
            currentTranslation: tr.id,
            version: tr.version || ''
        });
        return;
    }

    if (versionChanged) {
        for (let book = 1; book <= tr.files; book++) {
            await cache.delete(buildBiblePath(tr.id, book));
        }
    }

    let localErrors = 0;
    for (let book = 1; book <= tr.files; book++) {
        const url = buildBiblePath(tr.id, book);
        try {
            const existing = await cache.match(url);
            if (!existing) {
                const resp = await fetch(url);
                if (resp.ok) await cache.put(url, resp.clone());
                else {
                    localErrors++;
                    counters.errors++;
                }
            }
        } catch {
            localErrors++;
            counters.errors++;
        }

        counters.downloaded++;
        if (counters.downloaded % 5 === 0 || counters.downloaded === counters.totalFiles) {
            client.postMessage({
                type: 'DOWNLOAD_PROGRESS',
                downloaded: counters.downloaded,
                totalFiles: counters.totalFiles,
                errors: counters.errors,
                currentTranslation: tr.id,
                version: tr.version || ''
            });
        }
    }

    const refreshed = await countCachedFiles(cache, tr);
    await setTranslationMeta(cache, tr, refreshed, localErrors);
}

// ─── FETCH ───
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora requests não-GET
    if (request.method !== 'GET') return;

    // Ignora chrome-extension, etc
    if (!url.protocol.startsWith('http')) return;

    // API requests → Network-first com fallback para cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Google Static Maps → Network-first (mapa muda com posição)
    if (url.hostname === 'maps.googleapis.com') {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Firebase/Firestore requests — Network-first (dados em tempo real)
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firestore.googleapis.com')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Google Identity Services — Network-only (auth)
    if (url.hostname === 'accounts.google.com') {
        return; // Deixa o browser resolver
    }

    // Bible JSON data → Cache-first (offline support)
    // Intercepta tanto URL local quanto CDN (jsdelivr)
    if (url.pathname.includes('/data/bibles/') ||
        (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/data/bibles/'))) {
        event.respondWith(bibleCacheStrategy(request));
        return;
    }

    // Todos os outros → Cache-first
    event.respondWith(cacheFirstStrategy(request));
});

// ─── ESTRATÉGIAS ───

/**
 * Cache-first: tenta cache, fallback para rede
 */
async function cacheFirstStrategy(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        // Cacheia resposta válida
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Fallback offline para páginas HTML
        if (request.destination === 'document') {
            return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first: tenta rede, fallback para cache
 */
async function networkFirstStrategy(request) {
    try {
        const response = await fetch(request);
        // Cacheia respostas de API válidas
        if (response.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;

        return new Response(
            JSON.stringify({ error: 'Sem conexão', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * Bible cache: cache-first, armazena no cache dedicado
 */
async function bibleCacheStrategy(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(BIBLE_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response(JSON.stringify([]), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
}

function userDataPath(key) {
    return `./__userdata__/${key}.json`;
}

async function saveUserData(key, data) {
    const cache = await caches.open(USER_DATA_CACHE);
    const payload = {
        key,
        data,
        updatedAt: new Date().toISOString()
    };
    await cache.put(
        userDataPath(key),
        new Response(JSON.stringify(payload), {
            headers: { 'Content-Type': 'application/json' }
        })
    );
    return payload;
}

async function loadUserData(key) {
    const cache = await caches.open(USER_DATA_CACHE);
    const res = await cache.match(userDataPath(key));
    if (!res) return null;
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function replyToClient(event, payload) {
    if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(payload);
    } else if (event.source && event.source.postMessage) {
        event.source.postMessage(payload);
    }
}

// ─── MESSAGE: Download Bíblias Offline ───
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'DOWNLOAD_BIBLES') {
        const translations = event.data.translations; // [{id, files}]
        downloadBiblesOffline(event.source, translations, true);
    }
    if (event.data && event.data.type === 'SYNC_BIBLES') {
        const translations = event.data.translations; // [{id, files, version, lang}]
        syncBiblesOffline(event.source, translations);
    }
    if (event.data && event.data.type === 'CHECK_CACHED_BIBLES') {
        checkCachedBibles(event.source, event.data.translations);
    }
    if (event.data && event.data.type === 'GET_BIBLE_STOCK') {
        getBibleStock(event.source, event.data.translations || []);
    }

    if (event.data && event.data.type === 'SAVE_FAVORITES') {
        event.waitUntil((async () => {
            const saved = await saveUserData('favorites', event.data.payload || []);
            replyToClient(event, { type: 'SW_SAVE_OK', key: 'favorites', payload: saved });
        })());
    }

    if (event.data && event.data.type === 'LOAD_FAVORITES') {
        event.waitUntil((async () => {
            const payload = await loadUserData('favorites');
            replyToClient(event, { type: 'SW_LOAD_OK', key: 'favorites', payload });
        })());
    }

    if (event.data && event.data.type === 'SAVE_HISTORY') {
        event.waitUntil((async () => {
            const saved = await saveUserData('history', event.data.payload || {});
            replyToClient(event, { type: 'SW_SAVE_OK', key: 'history', payload: saved });
        })());
    }

    if (event.data && event.data.type === 'LOAD_HISTORY') {
        event.waitUntil((async () => {
            const payload = await loadUserData('history');
            replyToClient(event, { type: 'SW_LOAD_OK', key: 'history', payload });
        })());
    }

    if (event.data && event.data.type === 'SAVE_STUDIES_NOTES') {
        event.waitUntil((async () => {
            const saved = await saveUserData('studies-notes', event.data.payload || {});
            replyToClient(event, { type: 'SW_SAVE_OK', key: 'studies-notes', payload: saved });
        })());
    }

    if (event.data && event.data.type === 'LOAD_STUDIES_NOTES') {
        event.waitUntil((async () => {
            const payload = await loadUserData('studies-notes');
            replyToClient(event, { type: 'SW_LOAD_OK', key: 'studies-notes', payload });
        })());
    }
});

async function downloadBiblesOffline(client, translations, forceAll) {
    const cache = await caches.open(BIBLE_CACHE);
    const counters = { totalFiles: 0, downloaded: 0, errors: 0 };
    translations.forEach(t => counters.totalFiles += t.files);

    for (const tr of translations) {
        await downloadTranslation(cache, tr, client, counters, forceAll);
    }
    client.postMessage({
        type: 'DOWNLOAD_COMPLETE',
        downloaded: counters.downloaded,
        totalFiles: counters.totalFiles,
        errors: counters.errors
    });
}

async function syncBiblesOffline(client, translations) {
    const cache = await caches.open(BIBLE_CACHE);
    const toSync = [];

    for (const tr of translations) {
        const count = await countCachedFiles(cache, tr);
        if (count > 0) toSync.push(tr);
    }

    if (!toSync.length) {
        client.postMessage({ type: 'DOWNLOAD_COMPLETE', downloaded: 0, totalFiles: 0, errors: 0 });
        return;
    }

    await downloadBiblesOffline(client, toSync, false);
}

async function checkCachedBibles(client, translationIds) {
    const cache = await caches.open(BIBLE_CACHE);
    const result = {};
    for (const item of translationIds) {
        const id = typeof item === 'string' ? item : item.id;
        const files = typeof item === 'string' ? 86 : item.files;
        let count = 0;
        for (let b = 1; b <= files; b++) {
            if (await cache.match(buildBiblePath(id, b))) count++;
        }
        result[id] = count;
    }
    client.postMessage({ type: 'CACHED_BIBLES_STATUS', result });
}

async function getBibleStock(client, translations) {
    const cache = await caches.open(BIBLE_CACHE);
    const result = {};

    for (const tr of translations) {
        const cachedFiles = await countCachedFiles(cache, tr);
        const meta = await getTranslationMeta(cache, tr.id);
        const cachedVersion = meta?.version || null;
        const upToDate = !!(cachedFiles && tr.version && cachedVersion === tr.version && cachedFiles >= tr.files);

        result[tr.id] = {
            cachedFiles,
            totalFiles: tr.files,
            cachedVersion,
            requestedVersion: tr.version || null,
            upToDate
        };
    }

    client.postMessage({ type: 'BIBLE_STOCK_STATUS', result });
}

// ─── BACKGROUND SYNC (futuro) ───
self.addEventListener('sync', event => {
    if (event.tag === 'sync-posts') {
        console.log('🔄 Sincronizando posts pendentes...');
        // TODO: Implementar sync de posts offline
    }
});

// ─── PUSH NOTIFICATIONS (futuro) ───
self.addEventListener('push', event => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || '🕎 Bússola para Jerusalém', {
            body: data.body || 'Nova notificação da comunidade',
            icon: '/assets/img/icon-192.png',
            badge: '/assets/img/icon-72.png',
            tag: data.tag || 'default',
            data: data.url || '/'
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || '/')
    );
});
