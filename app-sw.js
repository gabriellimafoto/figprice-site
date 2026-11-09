const CACHE = "figprice-app-4.14";
const ARQUIVOS = ["./app", "./app-manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, {cache: "reload"})))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* App: busca a versão nova primeiro (até 4 s); sem internet, usa a guardada. */
function redePrimeiro(req){
  return caches.open(CACHE).then(c => {
    const rede = fetch(req, {cache: "no-store"}).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
    const espera = new Promise(ok => setTimeout(ok, 4000));
    return Promise.race([rede.catch(() => null), espera.then(() => null)]).then(r =>
      r || c.match(req, {ignoreSearch: true}).then(salvo => salvo || rede));
  });
}
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com"){
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(h => h || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  if (/^\/(app|app\.html)$/.test(url.pathname)){ e.respondWith(redePrimeiro(e.request)); return; }
  if (!/^\/(app-manifest\.webmanifest|icon-(192|512)\.png)$/.test(url.pathname)) return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(salvo => {
    const rede = fetch(e.request).then(r => { if (r.ok){ const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; }).catch(() => salvo);
    return salvo || rede;
  }));
});
