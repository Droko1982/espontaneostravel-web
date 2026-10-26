/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Service worker del conserje (viaje.html).
   Estrategia "red primero": con internet siempre se ve lo último; sin señal
   (Cocora, páramo, carretera) se usa la última copia guardada.
   Solo guarda los archivos del conserje y el pronóstico; no toca el resto del sitio.
   Al cambiar estos archivos no hace falta tocar nada: con red siempre se descargan.
   ========================================================================== */
const CACHE = "esp-conserje-v5";
const CORE = ["viaje.html", "css/styles.css", "css/maps.css", "css/fonts.css", "assets/fonts/inter-latin.woff2", "assets/fonts/fraunces-latin.woff2", "js/kb.js", "js/jenny-data.js", "js/plans.js", "js/qrscan.js", "js/concierge.js", "js/maps.js",
  "data/bookings.json", "data/jenny.json", "data/jenny.i18n.json", "data/geo.json", "assets/img/logo.png", "assets/img/icon-192.png", "viaje.webmanifest"];

self.addEventListener("install", (e) => {
  // Cada archivo por separado: si uno falta, el resto igual queda disponible sin señal
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("esp-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function isCore(url) { return CORE.some((p) => url.pathname.endsWith("/" + p)); }

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const conciergePage = req.mode === "navigate" && url.pathname.endsWith("/viaje.html");
  const mine = url.origin === self.location.origin && (conciergePage || isCore(url));
  const meteo = url.hostname === "api.open-meteo.com";
  if (!mine && !meteo) return; // todo lo demás: comportamiento normal del navegador

  // Con señal débil (Cocora, páramo) no esperar indefinidamente: a los 4 s se usa la copia guardada;
  // si no hay copia, se sigue esperando la red.
  // La página del conserje se revalida siempre con el servidor (sin usar la copia de 10 min del navegador):
  // así, con señal, se ve el último cambio publicado. Los JS/CSS llevan ?v= de versión y no lo necesitan.
  const net = fetch(req, conciergePage ? { cache: "no-cache" } : undefined).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      // viaje.html se guarda sin parámetros: la reserva va en la URL (?code= / ?d=)
      const key = conciergePage ? new Request(url.origin + url.pathname) : req;
      caches.open(CACHE).then((c) => c.put(key, copy));
    }
    return res;
  });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000));
  const cached = () => caches.match(req, { ignoreSearch: conciergePage || url.pathname.endsWith("bookings.json") });
  e.respondWith(Promise.race([net, timeout]).catch(() => cached().then((hit) => hit || net)));
});
