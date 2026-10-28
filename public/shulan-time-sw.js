/* Shulan time PWA: installation helper only. Personal workspace data is never cached here. */
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
