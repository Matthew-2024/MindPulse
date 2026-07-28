const CACHE_NAME = "mindpulse-web-v2";
const CORE_ASSETS = [
  "./心晴MindPulse_Web原型.html",
  "./src/rules/browser-engine.js",
  "./src/domain/decision-policy.js",
  "./src/features/memo/memo-model.js",
  "./src/features/schedule/schedule-model.js",
  "./src/features/bottle/bottle-repository.js",
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
