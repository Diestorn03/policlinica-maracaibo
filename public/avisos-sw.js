// Service worker de los avisos del panel del médico (src/components/tele/alarma.ts lo registra con alcance /medico/).
// Existe porque Android solo muestra notificaciones desde un service worker. No intercepta peticiones ni guarda caché:
// solo lleva al panel cuando el médico toca la notificación «Paciente en espera».
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const panel = ventanas.find((v) => v.url.startsWith(self.registration.scope));
    return panel ? panel.focus() : self.clients.openWindow(e.notification.data?.url || self.registration.scope);
  })());
});
