import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { restaurantCard, productCard, emptyState, bindGotos, skeletonCards, esc } from '../core/ui.js'

let debounceTimer

export async function render(view, boot, params = {}, query = new URLSearchParams()) {
  const initialQ = query.get?.('q') || query.q || ''
  const allData = await api.search('').catch(() => ({ restaurants: [] }))
  window.__restByTag = (tag) => allData.restaurants.find(r => (r.tags || []).includes(tag))
  view.innerHTML = `
  <div class="page">
    <h1 class="h-lg" style="margin-bottom:16px">Buscar</h1>
    <div class="searchbar-lg">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:var(--text-3)"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="searchInput" type="search" placeholder="Restaurantes, pratos, bebidas, mercados..." autocomplete="off" value="${initialQ.replace(/"/g, '&quot;')}" aria-label="Buscar">
      <button class="btn btn-dark btn-sm" id="clearSearch" hidden aria-label="Limpar busca">✕</button>
    </div>

    <div class="tabs" id="filterTabs" style="margin-top:18px">
      <button class="chip active" data-filter="all">Tudo</button>
      <button class="chip" data-filter="open">🟢 Abertos</button>
      <button class="chip" data-filter="free">🚴 Frete grátis</button>
      <button class="chip" data-filter="promo">🏷️ Com promoção</button>
      <button class="chip" data-filter="fast">⚡ Até 35 min</button>
      <button class="chip" data-filter="rating">⭐ Nota 4,7+</button>
      <button class="chip" data-filter="budget">💚 Econômicos</button>
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
        <div class="hscroll no-scrollbar" style="flex-wrap:wrap;overflow:visible">
          ${bootData.categories.map(c => `<button class="chip" data-sug="${esc(c.query)}">${c.emoji} ${esc(c.name)}</button>`).join('')}
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
      <div class="hscroll no-scrollbar" style="margin-bottom:22px">
        ${relatedCats.map(c => `<button class="chip" data-sug="${esc(c.query)}">${c.emoji} ${esc(c.name)}</button>`).join('')}
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
