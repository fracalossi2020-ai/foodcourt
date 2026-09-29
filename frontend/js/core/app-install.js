let promptEvent = null;
// Device detection, not viewport width: a narrow desktop window is not a phone.
const phoneDevice = navigator.userAgentData?.mobile === true ||
  /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(navigator.userAgent) ||
  (matchMedia('(pointer: coarse)').matches && matchMedia('(max-width: 600px)').matches);
document.documentElement.classList.toggle('phone-device', phoneDevice);
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

function showInstallInvite() {
  if (!phoneDevice || installed() || document.querySelector('.install-invite')) return;
  try { if (sessionStorage.getItem('fc-install-dismissed')) return; } catch { /* Storage can be unavailable. */ }
  const invite = document.createElement('aside');
  invite.className = 'install-invite';
  invite.setAttribute('aria-label', 'Adicionar FoodCourt à tela inicial');
  invite.innerHTML = '<div><strong>FoodCourt na tela inicial</strong><p>Acesse seus pedidos com um toque.</p></div><button type="button" data-add>Adicionar</button><button type="button" data-dismiss aria-label="Fechar convite">×</button>';
  invite.querySelector('[data-dismiss]').onclick = () => {
    try { sessionStorage.setItem('fc-install-dismissed', '1'); } catch { /* Optional preference. */ }
    invite.remove();
  };
  invite.querySelector('[data-add]').onclick = async () => {
    if (canInstall()) {
      try { if (await install()) invite.remove(); } catch { location.hash = '#/instalar'; }
    } else { location.hash = '#/instalar'; invite.remove(); }
  };
  document.body.append(invite);
  window.addEventListener('appinstalled', () => invite.remove(), { once: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showInstallInvite, { once:true });
else showInstallInvite();
