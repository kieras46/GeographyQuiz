// Service worker – pozwala zainstalować grę na telefonie i grać offline.
// Po zmianie plików gry podnieś numer wersji, żeby telefony pobrały nowe pliki.
const VERSION = "v2";
const APP_CACHE = "flagi-app-" + VERSION;
const FLAG_CACHE = "flagi-flags"; // flagi się nie zmieniają, więc ten cache nie ma wersji

const APP_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/i18n.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("flagi-app-") && k !== APP_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Flagi: najpierw z pamięci telefonu, a jeśli ich nie ma – z internetu (i zapisz)
  if (url.hostname === "flagcdn.com") {
    event.respondWith(flagFirst(url.href));
    return;
  }

  // Pliki gry: od razu z pamięci, w tle pobierz nowszą wersję na następne uruchomienie
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function flagFirst(href) {
  const cache = await caches.open(FLAG_CACHE);
  const hit = await cache.match(href);
  if (hit) return hit;
  try {
    const res = await fetch(href, { mode: "cors" });
    if (res.ok) cache.put(href, res.clone());
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(APP_CACHE);
  const key = req.mode === "navigate" ? "./index.html" : req;
  const hit = await cache.match(key, { ignoreSearch: true });
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await network) || new Response("Offline", { status: 503 });
}
