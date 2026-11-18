/* Offline support for the installed app (plan step 5). The page itself: network first, so an update shows up on
   the next open; the saved copy when there's no signal. Libraries and fonts: saved copy first, refreshed in the
   background. Database calls (supabase.co) are never cached here: the app keeps its own copy of your data. */
const V = 'vdc1c1b94ae';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './evidence.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())) });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())) });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || /supabase\.co$/.test(u.hostname)) return;
  if (r.mode === 'navigate' || (u.origin === location.origin && u.pathname.endsWith('.html'))) {
    e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => {   /* always ask GitHub for the newest page (it otherwise allows a 10-minute-old copy) */ const c = res.clone(); caches.open(V).then(x => x.put('./index.html', c)); return res }).catch(() => caches.match('./index.html')));
    return;
  }
  if (u.origin === location.origin || /(jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)) } return res }).catch(() => hit);
      return hit || net;
    }));
  }
});
