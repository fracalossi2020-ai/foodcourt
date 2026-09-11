import { api } from './api.js';

const requests = new WeakMap();
export async function updateDeliveryMap(root, order) {
  const old = root.querySelector('[data-delivery-map]');
  if (order.status !== 'out_for_delivery') { old?.remove(); return; }
  const section = old || document.createElement('section');
  section.dataset.deliveryMap = ''; section.className = 'card'; section.style.cssText = 'padding:18px;margin-top:16px';
  if (!old) {
    section.innerHTML = '<h2>Localização do entregador</h2><p data-location-time></p><a data-position-link class="btn btn-outline" target="_blank" rel="noopener noreferrer" hidden>Abrir posição no mapa</a><div data-route-opt hidden><p>Ao abrir a rota, a posição do entregador e o endereço de entrega serão enviados ao Google Maps.</p><button class="btn btn-outline" data-open-route>Mostrar rota e previsão</button></div><div data-live-route></div>';
    root.append(section);
    section.querySelector('[data-open-route]').onclick = () => {
      section.dataset.routeAccepted = 'true';
      section.querySelector('[data-route-opt]').hidden = true;
      updateDeliveryMap(root, order);
    };
  }
  const revision = (requests.get(section) || 0) + 1;
  requests.set(section, revision);
  const current = () => section.isConnected && requests.get(section) === revision;
  const route = section.querySelector('[data-live-route]');
  try {
    const { position, routeEnabled } = await api.orderLocation(order.id);
    if (!current()) return;
    const link = section.querySelector('[data-position-link]');
    const option = section.querySelector('[data-route-opt]');
    if (!position) {
      section.querySelector('[data-location-time]').textContent = 'Sem localização recente. O entregador precisa ativar o compartilhamento e manter conexão.';
      link.hidden = true; option.hidden = true; route.replaceChildren(); return;
    }
    const url = new URL('https://www.openstreetmap.org/');
    url.searchParams.set('mlat', position.latitude); url.searchParams.set('mlon', position.longitude);
    url.hash = `map=16/${position.latitude}/${position.longitude}`;
    section.querySelector('[data-location-time]').textContent = `Atualizada às ${new Date(position.updatedAt).toLocaleTimeString('pt-BR')} · precisão aproximada de ${Math.round(position.accuracy)} m`;
    link.href = url.href; link.hidden = false;
    option.hidden = !routeEnabled || section.dataset.routeAccepted === 'true';
    if (!routeEnabled || section.dataset.routeAccepted !== 'true') { route.replaceChildren(); return; }
    const result = await api.orderRoute(order.id);
    if (!current()) return;
    if (route.dataset.calculatedAt === result.calculatedAt && route.querySelector('iframe')) return;
    const iframe = document.createElement('iframe');
    const embed = new URL(result.embedUrl);
    if (embed.origin !== 'https://www.google.com' || embed.pathname !== '/maps/embed/v1/directions') throw new Error('Mapa indisponível.');
    iframe.src = embed.href; iframe.title = 'Rota aproximada da entrega no Google Maps';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.cssText = 'width:100%;height:320px;border:0;border-radius:12px;margin-top:12px';
    const description = document.createElement('p');
    description.textContent = `Google Maps · cerca de ${result.minutes} min de trajeto de carro. Estimativa às ${new Date(result.calculatedAt).toLocaleTimeString('pt-BR')}; pode variar conforme veículo, paradas e trânsito.`;
    route.replaceChildren(description, iframe); route.dataset.calculatedAt = result.calculatedAt;
  } catch {
    if (!current()) return;
    route.replaceChildren();
    section.querySelector('[data-location-time]').textContent = 'Localização ou previsão indisponível agora. A consulta será repetida automaticamente.';
    section.querySelector('[data-position-link]').hidden = true;
  }
}
