import { api } from './api.js';

export async function updateDeliveryMap(root, order) {
  const old = root.querySelector('[data-delivery-map]');
  if (order.status !== 'out_for_delivery') { old?.remove(); return; }
  const section = old || document.createElement('section');
  section.dataset.deliveryMap = ''; section.className = 'card'; section.style.cssText = 'padding:18px;margin-top:16px';
  if (!old) root.append(section);
  try {
    const { position } = await api.orderLocation(order.id);
    if (!section.isConnected) return;
    if (!position) { section.innerHTML = '<h2>Localização do entregador</h2><p>Sem localização recente. O entregador precisa ativar o compartilhamento e manter conexão.</p>'; return; }
    const url = new URL('https://www.openstreetmap.org/');
    url.searchParams.set('mlat', position.latitude); url.searchParams.set('mlon', position.longitude);
    url.hash = `map=16/${position.latitude}/${position.longitude}`;
    section.innerHTML = '<h2>Localização do entregador</h2><p data-location-time></p><a class="btn btn-outline" target="_blank" rel="noopener noreferrer">Abrir posição no mapa</a><p>O mapa abre em outra aba. A posição é aproximada e não representa uma rota ou previsão de chegada.</p>';
    section.querySelector('[data-location-time]').textContent = `Atualizada às ${new Date(position.updatedAt).toLocaleTimeString('pt-BR')} · precisão aproximada de ${Math.round(position.accuracy)} m`;
    section.querySelector('a').href = url.href;
  } catch { if (section.isConnected) section.innerHTML = '<h2>Localização do entregador</h2><p>Não foi possível consultar a localização agora.</p>'; }
}
