// Filter the loaded records without replacing nodes or their action handlers.
export function mountAdminLists(root) {
  for (const panel of root.querySelectorAll('.admin-page > .partner-panel')) {
    const rows = [...panel.children].filter(node => node.matches('.admin-row,.admin-audit-item'));
    if (!rows.length) continue;
    const controls = document.createElement('div');
    controls.className = 'admin-list-controls';
    controls.innerHTML = '<label>Buscar nos registros carregados<input class="input" type="search" placeholder="Nome, e-mail, pedido…"></label><label>Situação<select class="input"><option value="">Todas</option></select></label><div class="admin-list-pagination"><button class="btn btn-outline" type="button" data-prev>Anterior</button><span role="status" aria-live="polite"></span><button class="btn btn-outline" type="button" data-next>Próxima</button></div>';
    const search = controls.querySelector('input');
    const select = controls.querySelector('select');
    const statusOf = row => row.querySelector(':scope > em')?.textContent.trim() || '';
    const statuses = [...new Set(rows.map(statusOf).filter(Boolean))].sort();
    for (const status of statuses) { const option = document.createElement('option'); option.value = status; option.textContent = status; select.append(option); }
    select.closest('label').hidden = !statuses.length;
    const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    let page = 0;
    const size = 15;
    const previous = controls.querySelector('[data-prev]');
    const next = controls.querySelector('[data-next]');
    function update() {
      const term = normalize(search.value.trim());
      const matches = rows.filter(row => normalize(row.textContent).includes(term) && (!select.value || statusOf(row) === select.value));
      const pages = Math.max(1, Math.ceil(matches.length / size));
      page = Math.min(page, pages - 1);
      const shown = new Set(matches.slice(page * size, (page + 1) * size));
      rows.forEach(row => { row.hidden = !shown.has(row); });
      controls.querySelector('[role=status]').textContent = matches.length ? `${matches.length} registros · Página ${page + 1} de ${pages}` : 'Nenhum registro encontrado';
      previous.disabled = page === 0; next.disabled = page === pages - 1;
    }
    search.addEventListener('input', () => { page = 0; update(); });
    select.addEventListener('change', () => { page = 0; update(); });
    previous.onclick = () => { page--; update(); };
    next.onclick = () => { page++; update(); };
    panel.insertBefore(controls, rows[0]); update();
  }
}
