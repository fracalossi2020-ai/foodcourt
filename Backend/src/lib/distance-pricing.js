'use strict';
const crypto = require('node:crypto');
const quotes = new Map();
const pending = new Map();
function normalize(value) {
  if (!value || value.enabled !== true) return { enabled: false };
  const { baseFee, perKm, maxKm } = value;
  if (![baseFee, perKm, maxKm].every(item => typeof item === 'number' && Number.isFinite(item)) || baseFee < 0 || baseFee > 100 || perKm < 0 || perKm > 50 || maxKm <= 0 || maxKm > 100) throw new Error('Defina taxa base (0–100), valor por km (0–50) e alcance (até 100 km).');
  return { enabled: true, baseFee: Math.round(baseFee * 100) / 100, perKm: Math.round(perKm * 100) / 100, maxKm };
}
function addressText(address) {
  if (!address?.street || !address?.number || !address?.city || !address?.state) throw new Error('Complete rua, número, cidade e estado do endereço para calcular o trajeto.');
  return [address.street, address.number, address.neighborhood, address.city, address.state, address.cep, 'Brasil'].filter(Boolean).join(', ');
}
function signature(store, address, userId) {
  if (!address) throw new Error('Selecione um endereço válido para calcular o frete.');
  return crypto.createHash('sha256').update(JSON.stringify([userId, store.id, address.id, addressText(store.address), addressText(address), store.distancePricing])).digest('hex');
}
async function create(store, address, userId, request = fetch) {
  if (!store.distancePricing?.enabled) throw new Error('Esta loja usa frete fixo.');
  if (!process.env.GOOGLE_ROUTES_API_KEY) throw new Error('O cálculo de trajeto está indisponível. Escolha retirada ou tente mais tarde.');
  const pricing = normalize(store.distancePricing), key = signature(store, address, userId);
  for (const [id, quote] of quotes) if (quote.expiresAt <= Date.now()) quotes.delete(id);
  const cached = [...quotes.values()].find(item => item.signature === key);
  if (cached) return publicQuote(cached);
  if (pending.has(key)) return pending.get(key);
  const task = (async () => {
    let payload;
    try {
      const response = await request('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST', signal: AbortSignal.timeout(10000), redirect: 'error',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_ROUTES_API_KEY, 'X-Goog-FieldMask': 'routes.distanceMeters' },
        body: JSON.stringify({ origin: { address: addressText(store.address) }, destination: { address: addressText(address) }, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE', computeAlternativeRoutes: false, languageCode: 'pt-BR', units: 'METRIC' }),
      });
      if (!response.ok) throw new Error('provider');
      payload = await response.json();
    } catch { throw new Error('Não foi possível calcular o trajeto. Tente novamente ou escolha retirada.'); }
    const meters = payload.routes?.[0]?.distanceMeters;
    if (!Number.isFinite(meters) || meters < 0) throw new Error('Não foi encontrado um trajeto para este endereço.');
    if (meters / 1000 > pricing.maxKm) throw new Error('O endereço está além do alcance de entrega da loja.');
    const quote = { id: crypto.randomUUID(), signature: key, meters, fee: Math.round((pricing.baseFee + pricing.perKm * meters / 1000) * 100) / 100, expiresAt: Date.now() + 10 * 60000 };
    if (quotes.size >= 5000) quotes.delete(quotes.keys().next().value);
    quotes.set(quote.id, quote); return publicQuote(quote);
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
function publicQuote(quote) { return { id: quote.id, distanceKm: quote.meters / 1000, fee: quote.fee, expiresAt: new Date(quote.expiresAt).toISOString() }; }
function validate(id, store, address, userId) {
  const quote = quotes.get(id);
  if (!quote || quote.expiresAt <= Date.now() || quote.signature !== signature(store, address, userId)) throw new Error('O cálculo do frete expirou ou mudou. Volte à revisão para recalcular.');
  return publicQuote(quote);
}
module.exports = { normalize, create, validate };
