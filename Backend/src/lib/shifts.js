'use strict';
const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
function ranges(store, day) {
  const primary = store.hours?.[day];
  if (!primary?.[0] || !primary?.[1]) return [];
  return [primary, ...(store.extraHours?.[day] || [])];
}
function normalize(extra, hours) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) throw new Error('Turnos inválidos.');
  const result = {};
  const occupied = new Set();
  for (const [index, day] of days.entries()) {
    const entries = extra[day] || [];
    if (!Array.isArray(entries) || entries.length > 2) throw new Error('Use no máximo três turnos por dia.');
    result[day] = entries;
    const primary = hours?.[day];
    if (!primary?.[0] && !primary?.[1]) { if (entries.length) throw new Error('Ative o dia antes de adicionar turnos.'); continue; }
    for (const range of [primary, ...entries]) {
      if (!Array.isArray(range) || range.length !== 2 || range.some(time => typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error('Preencha horários válidos para cada turno.');
      const start = minutes(range[0]);
      let end = minutes(range[1]);
      if (end <= start) end += 1440;
      for (let minute = start; minute < end; minute++) {
        const key = (index * 1440 + minute) % 10080;
        if (occupied.has(key)) throw new Error('Há turnos sobrepostos. Revise também o dia seguinte.');
        occupied.add(key);
      }
    }
  }
  return result;
}
function isOpen(store, clock) {
  const today = ranges(store, clock.day);
  if (today.some(([a, b]) => { const start = minutes(a), end = minutes(b); return start === end || (end > start ? clock.minutes >= start && clock.minutes < end : clock.minutes >= start); })) return true;
  return ranges(store, days[(days.indexOf(clock.day) + 6) % 7]).some(([a, b]) => minutes(b) < minutes(a) && clock.minutes < minutes(b));
}
module.exports = { normalize, isOpen };
