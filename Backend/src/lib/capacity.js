'use strict';
const bucket = value => Math.floor(new Date(value).getTime() / 1800000);
function available(store, orders, date) {
  const limit = Number(store.scheduledCapacity || 0);
  if (!limit) return true;
  return orders.filter(order => order.storeId === store.id && order.scheduledAt && bucket(order.scheduledAt) === bucket(date) && order.status !== 'cancelled').length < limit;
}
function normalize(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 0 || limit > 500) throw new Error('Informe um limite entre 0 e 500 pedidos por intervalo.');
  return limit;
}
module.exports = { available, normalize };
