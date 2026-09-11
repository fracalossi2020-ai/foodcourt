let promptEvent = null;
export const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); promptEvent = event;
  window.dispatchEvent(new Event('fc:install-ready'));
});
window.addEventListener('appinstalled', () => { promptEvent = null; window.dispatchEvent(new Event('fc:install-ready')); });
export const canInstall = () => Boolean(promptEvent);
export async function install() {
  if (!promptEvent) return false;
  const event = promptEvent; promptEvent = null;
  try { await event.prompt(); return (await event.userChoice).outcome === 'accepted'; }
  finally { window.dispatchEvent(new Event('fc:install-ready')); }
}
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/push-worker.js').catch(() => {});
}
