const CACHE_NAME = "mindpulse-web-v2";
const CORE_ASSETS = [
  "./心晴MindPulse_Web原型.html",
  "./src/rules/browser-engine.js",
  "./src/rules/browser-cases.js",
  "./src/storage/vault-store.js",
  "./src/config/runtime-config.js",
  "./src/state/store.js",
  "./src/security/risk-gate.js",
  "./src/selectors/score-selectors.js",
  "./manifest.webmanifest",
  "./assets/mindpulse-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
