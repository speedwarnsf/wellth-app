/* Wellth Service Worker — Push Notifications for Daily Tips */

const CACHE_NAME = 'wellth-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== 'wellth-v3').map(n => caches.delete(n))
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== 'wellth-v3').map(n => caches.delete(n))
    )).then(() => clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Wellth', body: 'Your daily tip is ready.', url: '/' };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/tips.png',
    badge: '/icons/tips.png',
    tag: 'wellth-daily-tip',
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Read Tip' },
      { action: 'dismiss', title: 'Later' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
