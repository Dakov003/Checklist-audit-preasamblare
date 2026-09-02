// Service worker - cache-first, ca aplicatia sa mearga integral pe avion.
// Orice fisier nou trebuie adaugat aici, altfel nu va fi disponibil offline.

var CACHE_NAME = "audit-preasamblare-v1";

var FISIERE_DE_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./data/checklist.json",
  "./lib/jspdf.umd.min.js",
  "./lib/jspdf.plugin.autotable.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (eveniment) {
  self.skipWaiting();
  eveniment.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FISIERE_DE_CACHE);
    })
  );
});

self.addEventListener("activate", function (eveniment) {
  eveniment.waitUntil(
    caches.keys().then(function (numeCache) {
      return Promise.all(
        numeCache
          .filter(function (nume) { return nume !== CACHE_NAME; })
          .map(function (nume) { return caches.delete(nume); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (eveniment) {
  eveniment.respondWith(
    caches.match(eveniment.request).then(function (raspunsDinCache) {
      return raspunsDinCache || fetch(eveniment.request);
    })
  );
});
