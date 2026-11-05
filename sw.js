// Offline copy for ADHD Rating Forms (adhd-forms.github.io), same logic as Pediatric Tools' worker.
// Network first: online, every page and file comes fresh from the site (revalidated past the browser
// cache), so a fix reaches phones on the next online load. The saved copy is used only when the network fails.
// Answers live after "#" in links and in localStorage. Browsers don't send the "#" part, but req.url includes it,
// so it is removed before anything is fetched or saved.
// Any ?v= bump, new or renamed file: update PRECACHE with the exact URL the page requests and bump CACHE.
const CACHE = "adhd-forms-v21";
const PRECACHE = [
  "/", "/clinic.html", "/credits.html", "/credits.js", "/feedback.html", "/feedback.js?v=1", "/qi.html",
  "/manifest.webmanifest", "/clinic.webmanifest",
  "/shared.js?v=6", "/fonts/atkinson-hyperlegible-next-latin.woff2",
  "/vanderbilt-forms.js?v=3", "/vanderbilt-score.js?v=2", "/vanderbilt-codes.js?v=4",
  "/vanderbilt-strings-en.js?v=8", "/vanderbilt-page.js?v=11", "/vanderbilt-note-template.js?v=2",
  "/vanderbilt-report.js?v=3", "/vanderbilt-clinic.js?v=12", "/vanderbilt-scan.js?v=2",
  "/scared.html", "/scared-forms.js?v=1", "/scared-score.js?v=1", "/scared-codes.js?v=1", "/scared-page.js?v=2",
  "/scared-note-template.js?v=1", "/scared-report.js?v=1", "/scared-clinic.js?v=2",
  "/vendor/qrcode-generator-2.0.4.js", "/vendor/jsQR-1.4.0.js",
  "/favicon.svg", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(PRECACHE.map(url => new Request(url, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("adhd-forms-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  url.hash = "";
  event.respondWith(fromNetwork(url.href).catch(() => fromCache(req, url.href)));
});

async function fromNetwork(address) {
  const res = await fetch(address, { cache: "no-cache", credentials: "same-origin" });
  if (res.redirected) return Response.redirect(res.url, 302);
  // Only good same-origin answers replace the saved copy; an error page during a deploy never does.
  if (res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then(cache => cache.put(address, copy));
  }
  return res;
}

async function fromCache(req, address) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(address, { ignoreSearch: req.mode === "navigate" });
  if (hit) return hit;
  if (req.mode !== "navigate") throw new Error("offline and not saved");
  return (await cache.match("/")) || Response.error();
}
