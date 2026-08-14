import { store } from '../store.js'
import { esc, money, emptyState, bindGotos, toast } from '../ui.js'
import { renderCartUI } from '../cart.js'

export async function render(view, boot) {
  const TABS = { active: '📦 Em andamento', past: '🕘 Anteriores' }
  let tab = 'active'

  function draw() {
    const dayMs = 1000 * 60 * 40
    const active = store.orders.filter(o => Date.now() - o.createdAt < dayMs)
    const past = store.orders.filter(o => Date.now() - o.createdAt >= dayMs)
    const list = tab === 'active' ? active : past

    view.innerHTML = `
    <div class="page">
      <h1 class="h-lg" style="margin-bottom:16px">Meus pedidos</h1>
      <div class="tabs">
        ${Object.entries(TABS).map(([k, label]) => `<button class="chip ${tab === k ? 'active' : ''}" data-tab="${k}">${label}${k === 'active' && active.length ? ` (${active.length})` : ''}</button>`).join('')}
      </div>
      <div id="ordersList">
        ${list.length === 0
          ? emptyState(tab === 'active'
            ? { emoji: '🛍️', title: 'Nenhum pedido em andamento', sub: 'Que tal pedir algo agora? Tem ofertas esperando por você.', action: '#/', actionLabel: 'Fazer um pedido' }
            : { emoji: '📦', title: 'Você ainda não fez nenhum pedido', sub: 'Seu histórico de pedidos aparecerá aqui.', action: '#/', actionLabel: 'Explorar restaurantes' })
          : list.map(orderCard).join('')}
      </div>
    </div>`

    view.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => { tab = t.dataset.tab; draw() }))
    bindGotos(view)
    view.querySelectorAll('[data-repeat]').forEach(b => b.addEventListener('click', () => {
      const order = store.getOrder(b.dataset.repeat)
      if (!order) return
      store.repeatOrder(order)
      renderCartUI()
      toast('Pedido reconstruído no carrinho', 'success', '↻')
      location.hash = '#/checkout'
    }))
    view.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => {
      const order = store.getOrder(b.dataset.rate)
      if (!order) return
      order.rated = true
      toast('Obrigado por avaliar! +10 pontos FC', 'success', '⭐')
      draw()
    }))
  }

  function orderCard(o) {
    const active = Date.now() - o.createdAt < 1000 * 60 * 40
    return `
    <div class="card order-card">
      <div class="order-head">
        <div class="order-logo">${o.emoji}</div>
        <div class="oh-main">
          <b>${esc(o.restaurantName)}</b>
          <div class="text-xs dim">${esc(o.dateLabel)} • #${esc(o.id)}</div>
        </div>
        <span class="badge ${active ? 'badge-brand' : 'badge-dark'}">${active ? '🛵 Em andamento' : '✓ Entregue'}</span>
      </div>
      <div class="order-items">${esc(o.summary)}</div>
      <div class="order-foot">
        <b>${money(o.total)}</b>
        <div class="pair">
          ${active
            ? `<a class="btn btn-primary btn-sm" href="#/pedido/${o.id}">Acompanhar 📍</a>`
            : `<button class="btn btn-primary btn-sm" data-repeat="${o.id}">↻ Pedir novamente</button>
               ${o.rated
                 ? '<span class="badge badge-green">Avaliado ✓</span>'
                 : `<button class="btn btn-ghost btn-sm" data-rate="${o.id}">⭐ Avaliar</button>`}`}
          <a class="btn btn-dark btn-sm" href="#/pedido/${o.id}">Detalhes</a>
        </div>
      </div>
    </div>`
  }

  draw()
}
