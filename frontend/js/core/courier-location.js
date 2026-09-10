import { api } from './api.js';

export function mountLocation(view, delivery) {
  if (delivery?.status !== 'out_for_delivery') return () => {};
  let watch = null, timer = null, latest = null, busy = false, generation = 0, lastSent = 0, sampledAt = 0;
  const section = document.createElement('section');
  section.className = 'partner-panel';
  section.innerHTML = '<h2>Localização para o cliente</h2><p>Compartilhe sua posição enquanto esta tela estiver aberta. A posição fica disponível apenas para o cliente desta entrega e expira após dois minutos sem atualização.</p><button class="btn btn-outline" data-location-toggle>Compartilhar localização</button><p role="status" data-location-status>Desativado.</p>';
  view.querySelector('.courier-page').append(section);
  const button = section.querySelector('button'), status = section.querySelector('[role=status]');
  const stop = () => {
    generation++;
    if (watch !== null) navigator.geolocation.clearWatch(watch);
    watch = null; latest = null; clearInterval(timer);
    button.textContent = 'Compartilhar localização'; status.textContent = 'Compartilhamento desativado.';
    api.courierLocation({ deliveryId: delivery.id, stop: true }).catch(() => {});
  };
  async function send() {
    if (!latest || busy || watch === null || Date.now() - lastSent < 10000) return;
    if (Date.now() - sampledAt > 60000) { status.textContent = 'Aguardando uma nova posição do GPS.'; return; }
    const currentGeneration = generation;
    busy = true; lastSent = Date.now();
    try { await api.courierLocation({ deliveryId: delivery.id, ...latest }); if (generation === currentGeneration) status.textContent = 'Localização enviada às ' + new Date().toLocaleTimeString('pt-BR'); }
    catch (error) { if (generation === currentGeneration) status.textContent = 'Não foi possível atualizar: ' + error.message; }
    finally { busy = false; if (generation !== currentGeneration) api.courierLocation({ deliveryId: delivery.id, stop: true }).catch(() => {}); }
  }
  button.onclick = () => {
    if (watch !== null) { stop(); return; }
    if (!navigator.geolocation) { status.textContent = 'Localização não suportada neste navegador.'; return; }
    status.textContent = 'Aguardando permissão e localização…'; button.textContent = 'Parar compartilhamento';
    watch = navigator.geolocation.watchPosition(position => {
      sampledAt = Date.now();
      latest = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
      send();
    }, () => { stop(); status.textContent = 'Sem acesso à localização. Confira a permissão do navegador e tente novamente.'; }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    timer = setInterval(send, 15000);
  };
  window.addEventListener('pagehide', stop);
  return () => { stop(); window.removeEventListener('pagehide', stop); };
}
