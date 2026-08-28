import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { restaurantCard, productCard, emptyState, bindGotos, skeletonCards, esc } from '../core/ui.js'

let debounceTimer

function categoryIcon(id) {
  const paths = {
    burger:'<path d="M5 11c.4-3.4 3-5 7-5s6.6 1.6 7 5H5Zm-1 3h16M5 17h14l-1 3H6l-1-3Z"/><path d="M7 14l2 2 3-2 3 2 2-2"/>',
    pizza:'<path d="m5 20 4-16c6 1 9 4 11 9L5 20Z"/><path d="M9 5c3 3 6 5 10 7"/><circle cx="11" cy="11" r="1"/><circle cx="14" cy="15" r="1"/>',
    japanese:'<ellipse cx="8" cy="8" rx="5" ry="2.5"/><path d="M3 8v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V8M15 8h6v9c0 1.7-6 1.7-6 0V8Z"/><path d="M16 11h4M6 6.5v3M9 6v4"/>',
    healthy:'<path d="M4 12h16c-.5 5-3.2 8-8 8s-7.5-3-8-8Z"/><path d="M8 12c-2-3 1-5 3-2 0-4 5-4 4 0 3-2 5 0 3 2"/><path d="M12 8c0-2 1-3 3-4"/>',
    chicken:'<path d="M15 14c-3 3-7 2-8-1s1-7 4-8 6 1 6 4c0 2-.5 3.5-2 5Z"/><path d="m8 15-2 2-2-1-2 2 4 4 2-2-1-2 2-2"/>',
    mexican:'<path d="m4 18 7-14c5 2 8 6 9 11L4 18Z"/><path d="M8 10c4 0 7 2 10 5M11 8l1 2M8 14l2 1M14 12l1 2"/>',
    pasta:'<path d="M4 12h16c-.5 5-3.2 8-8 8s-7.5-3-8-8Z"/><path d="M6 12c1-3 3-4 6-4s5 1 6 4M9 8c-1-2 0-3 2-4M13 8c-1-2 0-3 2-4"/>',
    dessert:'<path d="M5 11h14v9H5v-9Z"/><path d="m5 11 7-6 7 6M8 9c2 2 5 2 8 0M12 5V3"/>',
    coffee:'<path d="M5 8h12v6c0 3-2 5-6 5s-6-2-6-5V8Z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 5c0-1 1-1 1-2M12 5c0-1 1-1 1-2"/>',
    drinks:'<path d="M7 7h10l-1 14H8L7 7Z"/><path d="m10 7 5-5M9 11h6M12 11v7"/>',
    market:'<path d="M5 9h14l-1 11H6L5 9Z"/><path d="M8 9c0-4 8-4 8 0M9 12v5M12 12v5M15 12v5"/>'
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[id] || paths.healthy}</svg>`
}

function categoryButton(category) {
  return `<button class="search-category" data-sug="${esc(category.query)}"><span>${categoryIcon(category.id)}</span><b>${esc(category.name)}</b></button>`
}

function filterIcon(name) {
  const paths={all:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',open:'<circle cx="12" cy="12" r="6" fill="currentColor" opacity=".22"/><circle cx="12" cy="12" r="6"/>',free:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 18h5l2-7h-5M14 13h5l2 5M7 8h4"/>',promo:'<path d="M3 4h8l10 10-7 7L4 11V4Z"/><circle cx="8" cy="8" r="1.2"/>',fast:'<path d="M13 2 5 14h7l-1 8 8-12h-7l1-8Z"/>',rating:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',budget:'<circle cx="12" cy="12" r="9"/><path d="M14.5 8.5c-.5-.7-1.2-1-2.4-1-1.4 0-2.4.7-2.4 1.8 0 2.8 5.1 1.2 5.1 4.2 0 1.2-1 2-2.6 2-1.2 0-2.1-.4-2.8-1.1M12 5.5v13"/>'}
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`
}

export async function render(view, boot, _params = {}, query = new URLSearchParams()) {
  const initialQ = query.get?.('q') || query.q || ''
  const allData = await api.search('').catch(() => ({ restaurants: [] }))
  window.__restByTag = (tag) => allData.restaurants.find(r => (r.tags || []).includes(tag))
  view.innerHTML = `
  <div class="page search-page">
    <header class="search-visual-hero"><div><span>TUDO QUE VOCÊ QUER</span><h1>Buscar</h1><p>Encontre restaurantes, pratos, bebidas e mercados perto de você.</p></div></header>
    <div class="searchbar-lg searchbar-floating">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:var(--text-3)"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="searchInput" type="search" placeholder="Restaurantes, pratos, bebidas, mercados..." autocomplete="off" value="${initialQ.replace(/"/g, '&quot;')}" aria-label="Buscar">
      <button class="btn btn-dark btn-sm" id="clearSearch" hidden aria-label="Limpar busca">✕</button>
    </div>

    <div class="tabs" id="filterTabs" style="margin-top:18px">
      <button class="chip active" data-filter="all">${filterIcon('all')}<span>Tudo</span></button>
      <button class="chip" data-filter="open">${filterIcon('open')}<span>Abertos</span></button>
      <button class="chip" data-filter="free">${filterIcon('free')}<span>Entrega grátis</span></button>
      <button class="chip" data-filter="promo">${filterIcon('promo')}<span>Com promoção</span></button>
      <button class="chip" data-filter="fast">${filterIcon('fast')}<span>Até 35 min</span></button>
      <button class="chip" data-filter="rating">${filterIcon('rating')}<span>Nota 4,7+</span></button>
      <button class="chip" data-filter="budget">${filterIcon('budget')}<span>Econômicos</span></button>
    </div>

    <div id="searchBody">${initialQ ? '' : idleView(boot)}</div>
  </div>`

  const input = document.getElementById('searchInput')
  const body = document.getElementById('searchBody')
  const clearBtn = document.getElementById('clearSearch')

  if (initialQ) await runSearch(initialQ)

  input.addEventListener('input', () => {
    clearBtn.hidden = !input.value
    clearTimeout(debounceTimer)
    const q = input.value.trim()
    if (!q) { body.innerHTML = idleView(boot); return }
    debounceTimer = setTimeout(() => runSearch(q), 280)
  })
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      store.pushSearch(input.value.trim())
      runSearch(input.value.trim())
    }
  })
  clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.hidden = true; body.innerHTML = idleView(boot); input.focus() })
  bindGotos(body)

  function idleView(bootData) {
    return `
      ${store.searchHistory.length ? `
      <div class="section" style="margin-top:6px">
        <div class="section-head"><h2 style="font-size:1.05rem">Buscas recentes</h2></div>
        ${store.searchHistory.map(h => `
          <div class="hist-row" data-hist="${esc(h)}">
            <span style="color:var(--text-3)">🕘</span><span>${esc(h)}</span>
            <button class="x" data-hist-x="${esc(h)}" aria-label="Remover do histórico">✕</button>
          </div>`).join('')}
      </div>` : ''}
      <div class="section">
        <div class="section-head"><h2 style="font-size:1.05rem">Mais buscadas</h2></div>
        <div class="search-category-grid">
          ${bootData.categories.map(categoryButton).join('')}
        </div>
      </div>
      <div class="section">
        <div class="section-head"><h2 style="font-size:1.05rem">Sugestões para você</h2></div>
        <div class="hscroll no-scrollbar">${bootData.categories.slice(0, 5).map(c => {
          const r = window.__restByTag?.(c.query)
          return r ? restaurantCard(r) : ''
        }).join('')}</div>
      </div>`
  }

  async function runSearch(q, filter = 'all') {
    body.innerHTML = skeletonCards(3)
    let data
    try { data = await api.search(q) } catch { body.innerHTML = '<div class="state-box"><div class="state-emoji">📡</div><h3>Erro na busca</h3><p>Tente novamente.</p></div>'; return }

    let rests = data.restaurants
    if (filter === 'open') rests = rests.filter(r => r.open)
    if (filter === 'free') rests = rests.filter(r => r.deliveryFee === 0 || r.freeShippingMin > 0)
    if (filter === 'promo') rests = rests.filter(r => r.promo)
    if (filter === 'fast') rests = rests.filter(r => r.deliveryTime[1] <= 35)
    if (filter === 'rating') rests = rests.filter(r => r.rating >= 4.7)
    if (filter === 'budget') rests = rests.filter(r => r.priceRange === '$')

    const relatedCats = data.categories.slice(0, 5)
    const products = data.products.slice(0, 8)

    if (!rests.length && !products.length) {
      body.innerHTML = emptyState({ emoji: '🔍', title: `Nada encontrado para “${q}”`, sub: 'Verifique a escrita ou tente um termo mais geral, como “pizza” ou “combo”.', action: '#/buscar', actionLabel: 'Ver sugestões' })
      return
    }

    body.innerHTML = `
      ${relatedCats.length ? `
      <div class="search-category-grid search-category-grid-related">
        ${relatedCats.map(categoryButton).join('')}
      </div>` : ''}
      ${rests.length ? `
      <section class="section" style="margin-top:8px">
        <div class="section-head"><div><h2>Restaurantes</h2><div class="sub">${rests.length} resultado(s)</div></div></div>
        <div class="grid-rest">${rests.map(r => restaurantCard(r)).join('')}</div>
      </section>` : ''}
      ${products.length ? `
      <section class="section">
        <div class="section-head"><div><h2>Pratos e produtos</h2><div class="sub">Encontrados na sua busca</div></div></div>
        <div class="hscroll no-scrollbar">${products.map(p => productCard(p, p.restaurantId, p.restaurantName)).join('')}</div>
      </section>` : ''}
    `
    bindGotos(body)
    bindSug(body)
  }

  function bindSug(root) {
    root.querySelectorAll('[data-sug]').forEach(b => b.addEventListener('click', () => {
      input.value = b.dataset.sug
      clearBtn.hidden = false
      runSearch(b.dataset.sug, currentFilter())
    }))
    root.querySelectorAll('[data-hist]').forEach(h => h.addEventListener('click', e => {
      if (e.target.closest('[data-hist-x]')) return
      input.value = h.dataset.hist
      clearBtn.hidden = false
      runSearch(h.dataset.hist)
    }))
    root.querySelectorAll('[data-hist-x]').forEach(x => x.addEventListener('click', e => {
      e.stopPropagation()
      store.removeSearch(x.dataset.histX)
      body.innerHTML = idleView(boot)
      bindSug(body)
    }))
  }

  function currentFilter() {
    return document.querySelector('#filterTabs .chip.active')?.dataset.filter || 'all'
  }
  document.querySelectorAll('#filterTabs .chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('#filterTabs .chip').forEach(x => x.classList.remove('active'))
    c.classList.add('active')
    const q = input.value.trim()
    if (q) runSearch(q, c.dataset.filter)
  }))

  bindSug(body)
}

export function registerRestLookup(fn) { window.__restByTag = fn }
