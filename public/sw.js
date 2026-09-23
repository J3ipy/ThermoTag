const CACHE = "thermotag-shell-v1";
const API_CACHE = "thermotag-shipments-v1";
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch("/", { cache: "reload" });
      if (!response.ok) return;
      await cache.put("/", response.clone());
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)]
        .map(match => match[1]).filter(path => !path.startsWith("/api/") && !path.startsWith("//"));
      await Promise.allSettled([...new Set(assets)].map(path => cache.add(path)));
    } catch { /* the next online navigation can populate the cache */ }
  })());
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("thermotag-") && ![CACHE, API_CACHE].includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;
  if (url.pathname === "/api/shipments") {
    event.respondWith(fetch(event.request).then(async response => {
      if (response.ok) await (await caches.open(API_CACHE)).put("/api/shipments", response.clone());
      return response;
    }).catch(async () => (await caches.open(API_CACHE)).match("/api/shipments") || new Response(null, { status: 503 })));
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(async response => {
      if (response.ok && response.headers.get("content-type")?.includes("text/html")) await (await caches.open(CACHE)).put("/", response.clone());
      return response;
    }).catch(async () => (await caches.open(CACHE)).match("/") || new Response("Abra o ThermoTag com conexão uma vez antes de usar offline.", { status: 503 })));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && ["script", "style", "font", "image"].includes(event.request.destination)) await cache.put(event.request, response.clone());
    return response;
  })());
});
