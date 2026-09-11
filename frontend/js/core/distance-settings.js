import { esc } from './ui.js';
export function mountDistance(form, store) {
  if (!form) return;
  const pricing = store.distancePricing || {};
  const section = document.createElement('section'); section.className = 'wide';
  section.innerHTML = `<h3>Frete por trajeto</h3><label><input name="distanceEnabled" type="checkbox" ${pricing.enabled ? 'checked' : ''}> Calcular pela distância de carro até o cliente</label><p>Requer Google Routes configurado no servidor. Tarifa = taxa base + quilômetros do trajeto × valor por km. O alcance também é verificado em pedidos com frete grátis.</p><label>Taxa base (R$)<input class="input" name="distanceBase" type="number" min="0" max="100" step="0.01" value="${esc(pricing.baseFee ?? 0)}"></label><label>Valor por km (R$)<input class="input" name="distancePerKm" type="number" min="0" max="50" step="0.01" value="${esc(pricing.perKm ?? 0)}"></label><label>Alcance máximo do trajeto (km)<input class="input" name="distanceMax" type="number" min="0.1" max="100" step="0.1" value="${esc(pricing.maxKm ?? 15)}"></label><p>Desmarcado mantém o frete fixo. As regras de frete grátis e prioridade continuam valendo. Endereços completos da loja e do cliente são necessários.</p>`;
  form.querySelector('button').before(section);
}
export function readDistance(values) {
  return { enabled: values.distanceEnabled === 'on', baseFee: Number(values.distanceBase), perKm: Number(values.distancePerKm), maxKm: Number(values.distanceMax) };
}
