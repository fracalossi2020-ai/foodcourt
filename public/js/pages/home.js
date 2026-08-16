import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { restaurantCard, skeletonCards, errorState, bindGotos, greeting } from '../core/ui.js'

export async function render(view, boot) {
  view.innerHTML = `<div class="page"><div class="greeting"><h1>${greeting()}, ${esc(boot.user.name)} 👋</h1><p>Encontre sua próxima refeição.</p></div>${skeletonCards(4)}</div>`
  let data
  try { data = await api.home() } catch { view.innerHTML = `<div class="page">${errorState(() => render(view, boot))}</div>`; return }
  view.innerHTML = `<div class="page customer-home">
    <div class="greeting"><h1>${greeting()}, ${esc(boot.user.name)} 👋</h1><p>Entrega em <b class="brand-text">${esc(store.address.label)}</b> • Escolha, peça e acompanhe tudo por aqui.</p></div>
    <section class="customer-banner"><div><span>FEITO PARA VOCÊ</span><h2>O que você quer pedir hoje?</h2><p>Restaurantes, mercados e suas comidas favoritas perto de você.</p><a href="#/buscar" class="btn btn-primary">Buscar comida</a></div><div>🍔 🍕 🍣</div></section>
    <section class="section"><div class="section-head"><div><h2>Categorias</h2><div class="sub">Explore por tipo de comida</div></div><a href="#/buscar" class="see-all">Ver todas →</a></div><div class="cat-scroll no-scrollbar">${boot.categories.map(c => `<div class="cat-tile" data-cat="${esc(c.query)}" role="button" tabindex="0"><div class="cat-bubble">${c.emoji}</div><span>${esc(c.name)}</span></div>`).join('')}</div></section>
    ${data.sections.slice(0,4).map(s => `<section class="section"><div class="section-head"><div><h2>${esc(s.title)}</h2>${s.subtitle?`<div class="sub">${esc(s.subtitle)}</div>`:''}</div><a href="#/buscar" class="see-all">Ver todos →</a></div><div class="hscroll no-scrollbar">${s.restaurants.map(r=>restaurantCard(r)).join('')}</div></section>`).join('')}
  </div>`
  bindGotos(view)
  view.querySelectorAll('[data-cat]').forEach(tile => {
    const go = () => { location.hash = `#/buscar?q=${encodeURIComponent(tile.dataset.cat)}` }
    tile.addEventListener('click', go); tile.addEventListener('keydown', e => { if (e.key === 'Enter') go() })
  })
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
