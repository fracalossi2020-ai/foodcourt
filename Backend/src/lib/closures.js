'use strict';

function dateKey(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeClosures(value) {
  if (!Array.isArray(value) || value.length > 60) throw new Error('Cadastre no máximo 60 datas de fechamento.');
  const result = [];
  for (const entry of value) {
    const date = String(entry?.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
      throw new Error('Informe uma data de fechamento válida.');
    if (result.some(item => item.date === date)) throw new Error('Há datas de fechamento repetidas.');
    result.push({ date, reason: String(entry.reason || '').trim().slice(0, 100) });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function isClosedDate(store, date = new Date()) {
  return (store.closures || []).some(entry => entry.date === dateKey(date));
}

module.exports = { dateKey, normalizeClosures, isClosedDate };
