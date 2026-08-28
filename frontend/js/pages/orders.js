import { store } from '../core/store.js'
import { esc, money, emptyState, bindGotos, toast } from '../core/ui.js'
import { renderCartUI } from '../core/cart.js'
import { api } from '../core/api.js'

export async function render(view, _boot) {
  const TABS = { active: '📦 Em andamento', past: '🕘 Anteriores' }
  let tab = 'active'
  const serverPayload = await api.orders().catch(() => ({ orders: [] }))
  const serverOrders = serverPayload.orders.map(order => ({ ...order, createdAt:new Date(order.createdAt).getTime(), dateLabel:new Date(order.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}), emoji:'🍔', summary:order.items.map(item=>`${item.quantity}× ${item.name}`).join(', '), restaurantName:order.restaurantName||'Estabelecimento', rated:false }))
  const allOrders = [...serverOrders, ...store.orders.filter(local => !serverOrders.some(server => server.id === local.id))]

  function draw() {
    const dayMs = 1000 * 60 * 40
    const active = allOrders.filter(o => !['delivered','cancelled'].includes(o.status) && Date.now() - o.createdAt < dayMs * 72)
    const past = allOrders.filter(o => ['delivered','cancelled'].includes(o.status) || Date.now() - o.createdAt >= dayMs * 72)
    const list = tab === 'active' ? active : past

    view.innerHTML = `
    <div class="page account-destination-page">
      <a class="profile-back" href="#/perfil">← <span>Voltar ao perfil</span></a>
      <header class="destination-heading"><span class="destination-icon">📦</span><div><span class="account-kicker">MINHA CONTA</span><h1>Meus pedidos</h1><p>Acompanhe entregas e peça seus favoritos novamente.</p></div></header>
      <div class="destination-summary"><div><b>${active.length}</b><span>Em andamento</span></div><div><b>${past.length}</b><span>Entregues</span></div><a href="#/inicio">+ Novo pedido</a></div>
      <div class="tabs modern-tabs">
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
      const order = allOrders.find(item => item.id === b.dataset.repeat)
      if (!order) return
      store.repeatOrder(order)
      renderCartUI()
      toast('Pedido reconstruído no carrinho', 'success', '↻')
      location.hash = '#/checkout'
    }))
    view.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => {
      const order = allOrders.find(item => item.id === b.dataset.rate)
      if (!order) return
      const comment = window.prompt('Conte como foi sua experiência:') || ''
      api.createReview({ orderId:order.id, rating:5, comment }).then(()=>{order.rated=true;toast('Avaliação enviada! Você ganhou 10 pontos FC.','success','⭐');draw()}).catch(error=>toast(error.message,'error'))
    }))
  }

  function orderCard(o) {
    const active = !['delivered','cancelled'].includes(o.status)
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
