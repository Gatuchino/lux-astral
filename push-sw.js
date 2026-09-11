// Service Worker para notificaciones push -- idea #10 de la auditoria de
// producto, a pedido de Christian: recordatorio de sesion reservada.
// Vive en la raiz del sitio (scope "/") para poder despertar la app sin
// importar en que pantalla haya quedado abierta. No cachea nada (no es
// para funcionar offline) -- su unico trabajo es reaccionar a "push".
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || 'Lux Astral';
  const options = {
    body: data.body || '',
    icon: '/assets/favicon/favicon-192x192.png',
    badge: '/assets/favicon/favicon-192x192.png',
    data: { url: data.url || '/Arcana.html' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/Arcana.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
