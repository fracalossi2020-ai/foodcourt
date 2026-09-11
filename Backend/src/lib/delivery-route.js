'use strict';
const crypto = require('node:crypto');
const cache = new Map();
const pending = new Map();

function configured() { return Boolean(process.env.GOOGLE_ROUTES_API_KEY && process.env.GOOGLE_MAPS_EMBED_KEY && process.env.GOOGLE_ROUTES_API_KEY !== process.env.GOOGLE_MAPS_EMBED_KEY); }
async function calculate(order, delivery, position, request = fetch) {
  if (!configured()) throw new Error('Mapa e previsão ainda não configurados.');
  if (!position || Date.now() - Date.parse(position.updatedAt) > 120000 || position.accuracy > 200) throw new Error('Aguarde uma localização recente e mais precisa do entregador.');
  const destination = String(order.address || '').split(' — ').slice(-1)[0].trim();
  if (!destination) throw new Error('Endereço do pedido indisponível.');
  const key = crypto.createHash('sha256').update(JSON.stringify([order.id, delivery.id, delivery.courierId, destination])).digest('hex');
  for (const [id, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(id);
  if (cache.has(key)) {
    const entry = cache.get(key);
    if (entry.error) throw new Error(entry.error);
    return entry.value;
  }
  if (pending.has(key)) return pending.get(key);
  const task = (async () => {
    try {
      const response = await request('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_ROUTES_API_KEY, 'X-Goog-FieldMask': 'routes.duration' },
        body: JSON.stringify({ origin: { location: { latLng: { latitude: position.latitude, longitude: position.longitude } } }, destination: { address: destination }, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE', languageCode: 'pt-BR' }),
      });
      if (!response.ok) throw new Error('provider');
      const payload = await response.json();
      const duration = payload.routes?.[0]?.duration;
      if (typeof duration !== 'string' || !/^\d+(\.\d+)?s$/.test(duration)) throw new Error('duration');
      const seconds = Number(duration.slice(0, -1));
      if (!Number.isFinite(seconds) || seconds > 86400) throw new Error('duration');
      const embed = new URL('https://www.google.com/maps/embed/v1/directions');
      embed.search = new URLSearchParams({ key: process.env.GOOGLE_MAPS_EMBED_KEY, origin: `${position.latitude},${position.longitude}`, destination, mode: 'driving', language: 'pt-BR' }).toString();
      const value = { minutes: Math.max(1, Math.ceil(seconds / 60)), calculatedAt: new Date().toISOString(), embedUrl: embed.href };
      cache.set(key, { value, expiresAt: Date.now() + 60000 });
      return value;
    } catch {
      const message = 'Previsão indisponível agora. Tente novamente em um minuto.';
      cache.set(key, { error: message, expiresAt: Date.now() + 60000 });
      throw new Error(message);
    } finally {
      if (cache.size > 1000) cache.delete(cache.keys().next().value);
    }
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
module.exports = { configured, calculate };
