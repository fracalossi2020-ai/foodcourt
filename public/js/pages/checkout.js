import { store } from '../store.js'
import { api } from '../api.js'
import { esc, money, toast, emptyState } from '../ui.js'
import { setFeeContext, renderCartUI } from '../cart.js'

export async function render(view, boot) {
  const { cart } = store
  if (!cart.items.length) {
    view.innerHTML = `<div class="page">${emptyState({ emoji: '🛒', title: 'Seu carrinho está vazio', sub: 'Adicione itens para finalizar um pedido.', action: '#/', actionLabel: 'Explorar restaurantes' })}</div>`
    return
  }

  const rest = await api.restaurant(cart.restaurantId).then(d => d.restaurant).catch(() => null)
  const fee = rest?.deliveryFee ?? 0
  const freeMin = rest?.freeShippingMin ?? 0
  setFeeContext(fee, freeMin)

  let step = 1
  const state = {
    addressId: store.address.id,
    delivery: 'standard',
    payment: 'pix'
  }

  function draw() {
    const steps = ['Endereço', 'Entrega', 'Pagamento', 'Revisão']
    view.innerHTML = `
    <div class="page" style="max-width:680px;margin:0 auto">
      <h1 class="h-lg" style="margin-bottom:18px">Finalizar pedido</h1>
      <div class="steps">
        ${steps.map((s, i) => `
          <div class="step ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}">
            <div class="step-track"><div class="step-fill"></div></div>
            <span>${i + 1}. ${s}</span>
          </div>`).join('')}
      </div>
      <div id="stepBody"></div>
      <div class="checkout-nav">
        ${step > 1 ? '<button class="btn btn-ghost" data-back>← Voltar</button>' : ''}
        ${step < 4 ? '<button class="btn btn-primary" data-next>Continuar →</button>' : '<button class="btn btn-primary btn-lg" data-place>FINALIZAR PEDIDO 🍔</button>'}
      </div>
    </div>`
    const body = document.getElementById('stepBody')
    if (step === 1) drawAddress(body)
    else if (step === 2) drawDelivery(body)
    else if (step === 3) drawPayment(body)
    else drawReview(body)
    view.querySelector('[data-back]')?.addEventListener('click', () => { step--; draw() })
    view.querySelector('[data-next]')?.addEventListener('click', () => {
      if (step === 1 && !store.addresses.find(a => a.id === state.addressId)) { toast('Selecione um endereço', 'error', '⚠️'); return }
      step++; draw(); window.scrollTo({ top: 0, behavior: 'smooth' })
    })
    view.querySelector('[data-place]')?.addEventListener('click', placeOrder)
  }

  function drawAddress(body) {
    body.innerHTML = `
      <h2 class="h-md" style="margin-bottom:14px">📍 Onde entregar?</h2>
      ${store.addresses.map(a => addrCard(a, state.addressId === a.id, 'addressId')).join('')}
      <button class="select-card" data-newaddr style="border-style:dashed">
        <span class="sc-emoji">➕</span>
        <span class="sc-main"><span class="sc-title">Adicionar novo endereço</span><span class="sc-sub">Busque pelo CEP ou rua</span></span>
      </button>`
    bindSelects(body, 'addressId', drawAddress, state)
    body.querySelector('[data-newaddr]')?.addEventListener('click', () => toast('Cadastro de endereço disponível em breve', 'info', '🚧'))
  }

  function drawDelivery(body) {
    const addr = store.addresses.find(a => a.id === state.addressId)
    body.innerHTML = `
      <h2 class="h-md" style="margin-bottom:14px">🚴 Como quer receber?</h2>
      <div class="card" style="padding:13px 16px;margin-bottom:16px;display:flex;gap:10px;align-items:center">
        <span>📍</span>
        <div class="text-sm muted">Entrega em <b style="color:var(--text)">${esc(addr.label)}</b> — ${esc(addr.street)}</div>
      </div>
      ${deliveryCard('standard', 'Entrega padrão', `${rest?.deliveryTime?.[0] ?? 25}–${rest?.deliveryTime?.[1] ?? 40} min`, fee === 0 ? 'Grátis' : money(fee))}
      ${deliveryCard('eco', 'Eco FC — mais lenta, menos emissão', '+10 min', fee === 0 ? 'Grátis' : money(fee))}
      ${deliveryCard('priority', 'Prioridade FC', `${Math.max(10, (rest?.deliveryTime?.[0] ?? 25) - 8)}–${Math.max(15, (rest?.deliveryTime?.[1] ?? 40) - 10)} min`, money(fee + 4.9))}`
    bindSelects(body, 'delivery', drawDelivery, state)
  }

  function drawPayment(body) {
    body.innerHTML = `
      <h2 class="h-md" style="margin-bottom:14px">💳 Forma de pagamento</h2>
      ${boot.paymentMethods.map(pm => `
        <button class="select-card ${state.payment === pm.id ? 'selected' : ''}" data-select="payment" data-value="${pm.id}">
          <span class="sc-emoji">${pm.emoji}</span>
          <span class="sc-main">
            <span class="sc-title">${esc(pm.name)}</span>
            <span class="sc-sub">${esc(pm.description)}</span>
          </span>
          <span class="radio-big"></span>
        </button>`).join('')}`
    bindSelects(body, 'payment', drawPayment, state)
  }

  function prioExtra() { return state.delivery === 'priority' ? 4.9 : 0 }

  function drawReview(body) {
    const t = store.cartTotals(fee, freeMin)
    const grand = t.total + prioExtra()
    const addr = store.addresses.find(a => a.id === state.addressId)
    const pm = boot.paymentMethods.find(p => p.id === state.payment)
    body.innerHTML = `
      <h2 class="h-md" style="margin-bottom:14px">🧾 Revise seu pedido</h2>
      <div class="card" style="padding:6px 16px;margin-bottom:14px">
        ${cart.items.map(i => `
          <div class="cart-item">
            <div class="ci-emoji">${i.emoji}</div>
            <div class="ci-info">
              <div class="ci-name">${i.qty}× ${esc(i.name)}</div>
              ${i.optionNames?.length ? `<div class="ci-detail">${esc(i.optionNames.join(', '))}</div>` : ''}
            </div>
            <span class="ci-price">${money(i.unitPrice * i.qty)}</span>
          </div>`).join('')}
      </div>
      <div class="card" style="padding:16px;margin-bottom:14px;display:flex;flex-direction:column;gap:9px">
        <div class="pair text-sm"><span>📍</span> <b>${esc(addr.label)}</b> — <span class="muted">${esc(addr.street)}</span></div>
        <div class="pair text-sm"><span>🚴</span> <span class="muted">${state.delivery === 'priority' ? 'Entrega prioritária' : state.delivery === 'eco' ? 'Eco FC' : 'Entrega padrão'}</span></div>
        <div class="pair text-sm"><span>💳</span> <span class="muted">${esc(pm.name)}</span></div>
      </div>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        <div class="totals-row"><span>Taxa de entrega</span><span>${t.fee === 0 && !prioExtra() ? '<b class="brand-text">Grátis</b>' : money(t.fee + prioExtra())}</span></div>
        ${t.discount ? `<div class="totals-row discount"><span>Cupom ${t.coupon.code}</span><span>-${money(t.discount)}</span></div>` : ''}
        <div class="totals-row total"><span>Total</span><span class="val">${money(grand)}</span></div>
      </div>`
  }

  function addrCard(a, selected) {
    return `
    <button class="select-card ${selected ? 'selected' : ''}" data-select="addressId" data-value="${a.id}">
      <span class="sc-emoji">${a.emoji}</span>
      <span class="sc-main">
        <span class="sc-title">${esc(a.label)}</span>
        <span class="sc-sub">${esc(a.street)} • ${esc(a.city)}</span>
      </span>
      <span class="radio-big"></span>
    </button>`
  }

  function deliveryCard(id, title, sub, price) {
    return `
    <button class="select-card ${state.delivery === id ? 'selected' : ''}" data-select="delivery" data-value="${id}">
      <span class="sc-emoji">${id === 'eco' ? '🌱' : id === 'priority' ? '⚡' : '🚴'}</span>
      <span class="sc-main">
        <span class="sc-title">${esc(title)}</span>
        <span class="sc-sub">${esc(sub)}</span>
      </span>
      <span class="sc-end"><span class="${price === 'Grátis' ? 'free' : ''}">${price}</span></span>
    </button>`
  }

  function placeOrder() {
    const t = store.cartTotals(fee, freeMin)
    const grand = +(t.total + prioExtra()).toFixed(2)
    const addr = store.addresses.find(a => a.id === state.addressId)
    const pm = boot.paymentMethods.find(p => p.id === state.payment)
    const order = store.addOrder({
      id: 'FC' + Date.now().toString().slice(-6),
      restaurantId: cart.restaurantId,
      restaurantName: cart.items[0].restaurantName,
      emoji: rest?.logo || '🍔',
      items: cart.items.map(i => ({ ...i })),
      summary: cart.items.reduce((s, i) => s + `${i.qty}× ${i.name}`, '').slice(0, 60),
      subtotal: t.subtotal, fee: t.fee + prioExtra(), discount: t.discount, total: grand,
      coupon: t.coupon?.code || null,
      address: `${addr.label} — ${addr.street}`,
      payment: pm.name,
      createdAt: Date.now(),
      dateLabel: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      rated: false
    })
    store.cartClear()
    renderCartUI()
    toast('Pedido confirmado! 🎉', 'success', '✅')
    location.hash = `#/pedido/${order.id}`
  }

  draw()
}

function bindSelects(body, key, redraw, state) {
  body.querySelectorAll(`[data-select="${key}"]`).forEach(c => c.addEventListener('click', () => {
    state[key] = c.dataset.value
    redraw(body)
  }))
}
