const CACHE = "stargate-edu-shop-v2";
const ASSETS = ["/", "/index.html", "/checkout.html", "/catalog.js", "/payment-links.js", "/store.js", "/manifest.json",
  "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.mode === "navigate") {
    // HTML: network-first (항상 최신, 오프라인 시 캐시)
    e.respondWith(
      fetch(e.request)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html")))
    );
  } else {
    // 정적 자산: cache-first
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        const cp = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return res;
      }))
    );
  }
});
