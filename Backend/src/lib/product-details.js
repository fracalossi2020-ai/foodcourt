'use strict';
function paused(product, now = Date.now()) { return Date.parse(product?.pausedUntil) > now; }
function normalize(body, previous = {}, now = Date.now()) {
  const result = {};
  for (const key of ['dietary', 'allergens']) {
    const value = body[key] === undefined ? previous[key] || [] : body[key];
    if (!Array.isArray(value) || value.length > 20 || value.some(item => typeof item !== 'string' || !item.trim() || item.length > 60)) throw new Error('Informe até 20 informações alimentares com até 60 caracteres cada.');
    result[key] = [...new Set(value.map(item => item.trim()))];
  }
  result.pausedUntil = previous.pausedUntil || null;
  if (body.pausedUntil !== undefined) {
    const date = Date.parse(body.pausedUntil);
    if (body.pausedUntil === null || body.pausedUntil === '') result.pausedUntil = null;
    else {
      if (!Number.isFinite(date) || date <= now || date > now + 30 * 86400000) throw new Error('A pausa deve terminar no futuro, em até 30 dias.');
      result.pausedUntil = new Date(date).toISOString();
    }
  }
  return result;
}
module.exports = { paused, normalize };
