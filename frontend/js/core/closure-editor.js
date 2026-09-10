import { esc } from './ui.js';

export function mountClosures(form, closures = []) {
  if (!form) return;
  const section = document.createElement('section');
  section.style.cssText = 'margin-top:20px;padding:16px;border:1px solid var(--border);border-radius:16px';
  section.innerHTML = '<h3>Feriados e datas de fechamento</h3><p>Não receber novos pedidos nestas datas (horário de Brasília). Pedidos já confirmados continuam válidos. Com a programação automática ativada, a loja volta a seguir os horários semanais no dia seguinte.</p><div data-closures></div><button type="button" class="btn btn-outline" data-add-closure>Adicionar data</button><p>As alterações serão aplicadas ao salvar os horários.</p>';
  const rows = section.querySelector('[data-closures]');
  function add(entry = {}) {
    const row = document.createElement('div');
    row.dataset.closureRow = '';
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:12px 0';
    row.innerHTML = `<input class="input" style="width:auto" type="date" aria-label="Data de fechamento" data-closure-date required value="${esc(entry.date || '')}"><input class="input" style="flex:1;min-width:160px" data-closure-reason aria-label="Motivo do fechamento" maxlength="100" placeholder="Motivo (opcional)" value="${esc(entry.reason || '')}"><button type="button" class="btn btn-ghost" aria-label="Remover data de fechamento">Remover</button>`;
    row.querySelector('button').onclick = () => row.remove();
    rows.append(row);
    return row;
  }
  closures.forEach(add);
  section.querySelector('[data-add-closure]').onclick = () => add().querySelector('input').focus();
  form.querySelector('button[type="submit"],button:not([type])').before(section);
}

export function readClosures(form) {
  return [...form.querySelectorAll('[data-closure-row]')].map(row => ({
    date: row.querySelector('[data-closure-date]').value,
    reason: row.querySelector('[data-closure-reason]').value,
  }));
}
