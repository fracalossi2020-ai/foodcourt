self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('FoodCourt', {
    body: 'Você tem uma atualização. Entre na sua conta para consultar.',
    tag: 'foodcourt-update', data: { url: '/#/notificacoes' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/#/notificacoes'));
});
