/* ============================================================
   NM Plotter — Service Worker
   Makes the tool work with no signal:
     - Precaches the app shell (index.html). All libraries (Leaflet,
       protomaps-leaflet, jsPDF, html2canvas) are now inlined INTO
       index.html, so caching the shell is all that's needed for the
       app to open and the map to draw offline — no CDN dependency.
     - Caches png.pmtiles (the offline map) if present, and serves
       HTTP Range requests for it from cache (PMTiles reads tiles
       by byte range, so we slice the cached file -> 206 responses).
   Bump CACHE when you change index.html, so devices pull the new
   copy instead of an old cached one.
   ============================================================ */
const CACHE = 'nmplotter-v110';
const TERRAIN_CACHE = 'nmplotter-terrain';

const SHELL = [
  './',
  './index.html',
  './png.pmtiles'   // optional — install won't fail if it isn't there yet
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // allSettled so a missing png.pmtiles (or one CDN hiccup) doesn't abort install
    await Promise.allSettled(SHELL.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k !== TERRAIN_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Keep the (large) pmtiles archive in memory once read, so range requests
// don't re-decode the whole cached file every time.
const pmBuffers = {};

async function rangeFromCache(request, rangeHeader) {
  const url = request.url.split('#')[0];
  if (!pmBuffers[url]) {
    const cache = await caches.open(CACHE);
    let full = await cache.match(url, { ignoreSearch: true });
    if (!full) {
      try {
        full = await fetch(url);
        if (full && full.ok) cache.put(url, full.clone());
      } catch (_) { return new Response('', { status: 503 }); }
    }
    if (!full || !full.ok) return new Response('', { status: 503 });
    pmBuffers[url] = await full.arrayBuffer();
  }
  const buf = pmBuffers[url];
  const total = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || '');
  let start = m && m[1] !== '' ? parseInt(m[1], 10) : 0;
  let end   = m && m[2] !== '' ? parseInt(m[2], 10) : total - 1;
  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end) || end >= total) end = total - 1;
  if (start > end) start = 0;
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': String(slice.byteLength),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Terrain elevation tiles (cross-origin): serve downloaded offline tiles from the
  // dedicated terrain cache; otherwise go to network. The tiles were stored with a
  // CORS fetch, so the cached response stays readable for the canvas pixel decode.
  if (url.hostname.indexOf('amazonaws.com') >= 0 && url.pathname.indexOf('/terrarium/') >= 0) {
    e.respondWith(
      caches.open(TERRAIN_CACHE)
        .then(function (c) { return c.match(req); })
        .then(function (hit) { return hit || fetch(req); })
    );
    return;
  }

  const isPmtiles = url.pathname.endsWith('.pmtiles');
  const range = req.headers.get('range');

  // PMTiles byte-range request -> serve a slice from the cached archive
  if (isPmtiles && range) {
    e.respondWith(rangeFromCache(req, range));
    return;
  }

  // Everything else: cache-first, fall back to network, then cache the result.
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && (url.origin === self.location.origin)) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (_) {
      // Offline and not in cache. For navigations, fall back to the shell.
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return new Response('', { status: 503, statusText: 'offline' });
    }
  })());
});
