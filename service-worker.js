const CACHE_NAME = "word-snap-v52";
const APP_SHELL = [
  "./",
  "./index.html",
  "./vocabulary-match.html",
  "./js/engine.js",
  "./js/habit.js",
  "./js/wordbooks.js",
  "./js/fx.js",
  "./js/sentence.js",
  "./js/ai.js",
  "./js/ai-api.js",
  "./js/ai-worker.js",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      // Only our own old versions: the on-device AI keeps its model in "webllm/…" caches.
      .then(keys => Promise.all(keys.filter(key => key.startsWith("word-snap-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./vocabulary-match.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Grammar libraries (vendor/) are cached here on first use; failed probes are not.
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
