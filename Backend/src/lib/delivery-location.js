'use strict';
const positions = new Map();
const active = delivery => delivery?.status === 'out_for_delivery';
function update(delivery, user, body, now = Date.now()) {
  if (!active(delivery) || delivery.courierId !== user.id) throw new Error('Localização disponível apenas para sua entrega em andamento.');
  if (body.stop === true) { positions.delete(delivery.id); return; }
  const { latitude, longitude, accuracy } = body;
  if (![latitude, longitude, accuracy].every(value => typeof value === 'number' && Number.isFinite(value)) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0 || accuracy > 10000) throw new Error('Coordenadas inválidas.');
  positions.set(delivery.id, { latitude, longitude, accuracy, updatedAt: new Date(now).toISOString(), courierId: user.id });
  for (const [id, position] of positions) if (now - Date.parse(position.updatedAt) > 120000) positions.delete(id);
}
function read(delivery, now = Date.now()) {
  const position = positions.get(delivery?.id);
  if (!active(delivery) || !position || position.courierId !== delivery.courierId || now - Date.parse(position.updatedAt) > 120000) { positions.delete(delivery?.id); return null; }
  return { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy, updatedAt: position.updatedAt };
}
module.exports = { update, read };
