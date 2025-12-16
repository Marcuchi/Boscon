// Service Worker para Boscon App
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejar notificaciones push (si se integrara backend en el futuro)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Boscon';
  const options = {
    body: data.body || 'Tienes nuevas tareas pendientes.',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s',
    badge: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmf3SKqXHbDSUx84ijPnHgqampfkEGRjUt_A&s'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Manejar click en la notificación para abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la ventana ya está abierta, enfocarla
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Si no, abrir una nueva (a la raiz)
      return self.clients.openWindow('/');
    })
  );
});