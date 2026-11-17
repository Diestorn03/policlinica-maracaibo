// Service worker de la app instalable (manifest.webmanifest; lo registra src/scripts/instalable.ts con el alcance del sitio).
// Algunas versiones de Chrome todavía piden un «fetch» que responda para ofrecer «Instalar»; este solo atiende la apertura de
// páginas: va siempre a la red y, si no hay conexión, muestra sin-conexion.html en vez del dinosaurio de Chrome.
// No guarda nada más en caché: el sitio, los paneles, la API, los documentos y la videollamada van siempre a la red.
// En /medico/ manda avisos-sw.js (su alcance es más específico): ese panel no ve esta página.
const CACHE = 'pm-sin-conexion-1';
const PAGINA = new URL('sin-conexion.html', self.registration.scope).href;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(PAGINA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await self.registration.navigationPreload?.enable();   // la página se pide mientras arranca el service worker: no la demora
    for (const k of await caches.keys()) if (k.startsWith('pm-sin-conexion-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;   // recursos, API, documentos y videollamada: el navegador hace lo de siempre
  e.respondWith((async () => {
    try {
      return (await e.preloadResponse) || (await fetch(e.request));
    } catch {
      return (await caches.match(PAGINA)) || Response.error();
    }
  })());
});
