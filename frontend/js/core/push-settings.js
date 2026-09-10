import { api } from './api.js';
export async function mountPush(view) {
  const section = document.createElement('section'); section.className = 'card'; section.style.cssText = 'padding:20px;margin:16px 0';
  section.innerHTML = '<h2>Notificações neste dispositivo</h2><p>Receba um aviso quando houver atualizações na sua conta. O conteúdo do pedido não aparece na notificação.</p><p role="status">Consultando disponibilidade…</p><button class="btn btn-outline" disabled>Ativar notificações</button>';
  view.querySelector('.page')?.append(section);
  const status = section.querySelector('[role=status]'), button = section.querySelector('button');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { status.textContent = 'Este navegador não oferece notificações push nesta configuração.'; return; }
  try {
    const config = await api.pushConfig();
    if (!config.enabled) { status.textContent = 'O serviço de notificações ainda não foi ativado pelo FoodCourt.'; return; }
    const registration = await navigator.serviceWorker.register('/push-worker.js');
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    const draw = () => { button.textContent = subscription ? 'Desativar neste dispositivo' : 'Ativar notificações'; status.textContent = subscription ? 'Este navegador possui uma inscrição. Desative e ative novamente para vinculá-la à conta atual.' : 'Ative para receber avisos neste navegador.'; button.disabled = false; };
    draw();
    button.onclick = async () => {
      button.disabled = true;
      try {
        if (subscription) { await api.savePushSubscription(subscription.toJSON(), true); await subscription.unsubscribe(); subscription = null; }
        else {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') throw new Error('Permissão não concedida. Você pode alterá-la nas configurações do navegador.');
          const base64 = config.publicKey.replace(/-/g, '+').replace(/_/g, '/');
          const key = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), char => char.charCodeAt(0));
          subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
          try { await api.savePushSubscription(subscription.toJSON()); }
          catch (error) { await subscription.unsubscribe(); subscription = null; throw error; }
        }
        draw();
      } catch (error) { status.textContent = error.message; button.disabled = false; }
    };
  } catch { status.textContent = 'Não foi possível preparar as notificações agora.'; }
}
