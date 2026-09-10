import { esc } from './ui.js';

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export function mountShifts(form, extra = {}) {
  if (!form) return;
  for (const day of days) {
    const row = form.elements[day + 'Start'].closest('.schedule-day');
    const container = document.createElement('div');
    container.style.cssText = 'display:grid;gap:8px;width:100%;flex-basis:100%;grid-column:1 / -1';
    container.dataset.extraDay = day;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-outline btn-sm'; button.textContent = 'Adicionar turno';
    button.dataset.addShift = day;
    const update = () => {
      const enabled = form.elements[day + 'Enabled'].checked;
      container.querySelectorAll('input').forEach(input => { input.disabled = !enabled; });
      button.disabled = !enabled || container.querySelectorAll('[data-shift]').length >= 2;
    };
    function add(range = ['18:00', '23:00']) {
      const shift = document.createElement('div'); shift.dataset.shift = '';
      shift.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px';
      shift.innerHTML = `<span>Turno adicional</span><input type="time" aria-label="Abertura do turno adicional" required value="${esc(range[0])}"><span>até</span><input type="time" aria-label="Fechamento do turno adicional" required value="${esc(range[1])}"><button class="btn btn-ghost btn-sm" type="button">Remover turno</button>`;
      shift.querySelector('button').onclick = () => { shift.remove(); update(); };
      container.insertBefore(shift, button); update();
    }
    container.append(button); row.append(container);
    (extra[day] || []).forEach(add);
    button.onclick = () => { add(); };
    form.elements[day + 'Enabled'].addEventListener('change', update);
    form.querySelectorAll('[data-schedule-preset]').forEach(preset => preset.addEventListener('click', () => { container.querySelectorAll('[data-shift]').forEach(shift => shift.remove()); queueMicrotask(update); }));
    update();
  }
}
export function readShifts(form) {
  return Object.fromEntries(days.map(day => [day, form.elements[day + 'Enabled'].checked ? [...form.querySelectorAll(`[data-extra-day="${day}"] [data-shift]`)].map(row => [...row.querySelectorAll('input')].map(input => input.value)) : []]));
}
