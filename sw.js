const CACHE = "stargate-edu-shop-v7";
const ASSETS = ["/", "/index.html", "/start.html", "/checkout.html", "/success.html", "/cancel.html", "/catalog.js", "/payment-links.js", "/payment-config.js", "/legal.js", "/store.js", "/manifest.json", "/faq.html",
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
  // Payment routing can be activated independently of a site release. Always
  // revalidate these small configuration files so an old empty key/link is not
  // held by the service-worker cache.
  const liveConfig = url.pathname === "/payment-config.js" || url.pathname === "/payment-links.js";
  if (e.request.mode === "navigate" || liveConfig) {
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
