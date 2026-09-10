import { store } from '../core/store.js'
import { api } from '../core/api.js'
import { esc, money, toast, emptyState } from '../core/ui.js'
import { setFeeContext } from '../core/cart.js'

import { renderPayment, cleanupPayment, rememberCart } from '../core/payment-screen.js'

let listeners
export function cleanup() { cleanupPayment(); listeners?.abort() }

export async function render(view, boot, _params, query = new URLSearchParams()) {
  cleanup()
  if (query.get('payment')) { await renderPayment(view, query.get('payment')); return }
  const config = await api.paymentConfig()
  listeners = new AbortController()
  const { cart } = store
  if (!cart.items.length) {
    view.innerHTML = `<div class="page">${emptyState({ emoji: '🛒', title: 'Seu carrinho está vazio', sub: 'Adicione itens para finalizar um pedido.', action: '#/', actionLabel: 'Explorar restaurantes' })}</div>`
    return
  }

  const rest = await api.restaurant(cart.restaurantId).then(d => d.restaurant).catch(() => null)
  const cartGroups = Object.values(cart.items.reduce((groups,item) => { const restaurantId=item.restaurantId||cart.restaurantId; (groups[restaurantId] ||= { restaurantId, restaurantName:item.restaurantName, items:[] }).items.push(item); return groups }, {}))
  const restaurants = await Promise.all(cartGroups.map(group => group.restaurantId === rest?.id ? rest : api.restaurant(group.restaurantId).then(result => result.restaurant)))
  const scheduleSlots = (restaurants[0]?.scheduleSlots || []).filter(slot => restaurants.every(restaurant => restaurant.scheduleSlots?.includes(slot)))
  const savedAddresses = () => store.addresses.filter(address => address.street)
  const fee = rest?.deliveryFee ?? 0
  const freeMin = rest?.freeShippingMin ?? 0
  setFeeContext(fee, freeMin)

  let step = 1
  const state = {
    addressId: savedAddresses()[0]?.id || null,
    delivery: 'standard',
    payment: config.methods.find(method => method.enabled && method.id === store.preferredPaymentId)?.id || config.methods.find(method => method.enabled)?.id || 'pix',
    scheduledAt: null,
    quote: null
  }

  function draw() {
    const steps = ['Endereço', 'Entrega', 'Pagamento', 'Revisão']
    view.innerHTML = `
    <div class="page" style="max-width:680px;margin:0 auto">
      <h1 class="h-lg" style="margin-bottom:18px">Finalizar pedido</h1>
      <div class="steps">
        ${steps.map((s, i) => `
          <div class="step ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}" ${i + 1 === step ? 'aria-current="step"' : ''}>
            <div class="step-track"><div class="step-fill"></div></div>
            <span>${i + 1}. ${s}</span>
          </div>`).join('')}
      </div>
      <div id="stepBody"></div>
      <div class="checkout-nav">
        ${step > 1 ? '<button class="btn btn-ghost" data-back>← Voltar</button>' : ''}
        ${step < 4 ? `<button class="btn btn-primary" data-next>${nextStepLabel()} →</button>` : `<button class="btn btn-primary btn-lg" data-place>${state.payment === 'pix' ? 'Gerar Pix e pagar' : 'Ir para pagamento seguro'} →</button>`}
      </div>
    </div>`
    const body = document.getElementById('stepBody')
    if (step === 1) drawAddress(body)
    else if (step === 2) drawDelivery(body)
    else if (step === 3) drawPayment(body)
    else drawReview(body)
    view.querySelector('[data-place]')?.addEventListener('click', placeOrder)
  }

  function drawAddress(body) {
    body.innerHTML = `
      <h2 class="h-md" style="margin-bottom:14px">📍 Onde entregar?</h2>
      ${savedAddresses().length ? savedAddresses().map(a => addrCard(a, state.addressId === a.id, 'addressId')).join('') : '<div class="checkout-no-address"><span>📍</span><div><b>Nenhum endereço cadastrado</b><p>Adicione seu primeiro endereço para continuar. “Casa” e “Trabalho” são apenas exemplos de identificação.</p></div></div>'}
      <button class="select-card" data-newaddr style="border-style:dashed">
        <span class="sc-emoji">➕</span>
        <span class="sc-main"><span class="sc-title">Adicionar novo endereço</span><span class="sc-sub">Busque pelo CEP ou rua</span></span>
      </button>
      <form class="card checkout-address-form" data-address-form hidden>
        <header class="address-form-head"><span>📍</span><div><small>NOVO DESTINO</small><h3>Adicionar endereço</h3><p>Preencha os dados para receber seus pedidos com segurança.</p></div></header>
        <div class="address-form-grid">
          <label><span>Identificação</span><div class="address-input"><i>⌂</i><input name="label" placeholder="Casa, Trabalho..." required maxlength="30"></div></label>
          <label><span>CEP</span><div class="address-input"><i>⌖</i><input name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" required maxlength="9" pattern="\\d{5}-?\\d{3}" title="Digite um CEP válido, como 35180-312"></div></label>
          <div class="cep-feedback wide" data-cep-feedback hidden></div>
          <label class="wide"><span>Rua</span><div class="address-input"><i>⌁</i><input name="street" autocomplete="address-line1" placeholder="Preenchida automaticamente pelo CEP" required maxlength="120"></div></label>
          <label><span>Número e complemento</span><div class="address-input"><i>№</i><input name="number" autocomplete="address-line2" placeholder="123 — Apto 42" required maxlength="60"></div></label>
          <label><span>Bairro</span><div class="address-input"><i>⌂</i><input name="neighborhood" placeholder="Bairro" required maxlength="80"></div></label>
          <label><span>Cidade</span><div class="address-input"><i>◉</i><input name="city" autocomplete="address-level2" placeholder="Cidade" required maxlength="80"></div></label>
          <label><span>Estado</span><div class="address-input"><i>◇</i><input name="state" autocomplete="address-level1" placeholder="UF" required maxlength="2"></div></label>
        </div>
        <aside class="address-privacy"><span>✓</span><p><b>Seus dados estão protegidos</b><small>Usaremos este endereço somente para entregas e informações do pedido.</small></p></aside>
        <div class="address-form-actions"><button class="btn btn-ghost" type="button" data-cancel-address>Cancelar</button><button class="btn btn-primary" type="submit"><span>Salvar endereço</span> →</button></div>
      </form>`
    bindSelects(body, 'addressId', drawAddress, state)
    body.querySelector('[data-newaddr]')?.addEventListener('click', () => { body.querySelector('[data-address-form]').hidden = false; body.querySelector('[data-newaddr]').hidden = true; body.querySelector('[name="label"]').focus() })
    let cepRequest = 0
    body.querySelector('[name="cep"]')?.addEventListener('input', async event => {
      const digits=event.target.value.replace(/\D/g,'').slice(0,8); event.target.value=digits.length>5?`${digits.slice(0,5)}-${digits.slice(5)}`:digits
      const feedback=body.querySelector('[data-cep-feedback]'); if(digits.length<8){feedback.hidden=true;return}
      const request=++cepRequest;feedback.hidden=false;feedback.className='cep-feedback wide loading';feedback.innerHTML='<i></i><span>Buscando endereço...</span>'
      try{
        let address
        try { address=(await api.cep(digits)).address }
        catch { const response=await fetch(`https://viacep.com.br/ws/${digits}/json/`);if(!response.ok)throw new Error('Serviço de CEP indisponível.');const payload=await response.json();if(payload.erro)throw new Error('CEP não encontrado.');address={street:payload.logradouro||'',neighborhood:payload.bairro||'',city:payload.localidade||'',state:payload.uf||''} }
        if(request!==cepRequest)return;body.querySelector('[name="street"]').value=address.street;body.querySelector('[name="neighborhood"]').value=address.neighborhood;body.querySelector('[name="city"]').value=address.city;body.querySelector('[name="state"]').value=address.state;feedback.className='cep-feedback wide success';feedback.innerHTML=`<b>✓ CEP encontrado</b><span>${esc([address.street,address.neighborhood,address.city,address.state].filter(Boolean).join(' · '))}</span>`;body.querySelector('[name="number"]').focus()
      }catch(error){if(request!==cepRequest)return;feedback.className='cep-feedback wide error';feedback.innerHTML=`<b>CEP não localizado</b><span>${esc(error.message||'Preencha o endereço manualmente.')}</span>`}
    })
    body.querySelector('[data-cancel-address]')?.addEventListener('click', () => drawAddress(body))
    body.querySelector('[data-address-form]')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget)
      const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true
      try{const result=await api.saveAddress(Object.fromEntries(form));const address=store.addAddress(result.address);state.addressId=address.id;toast('Endereço adicionado e selecionado.','success','📍');drawAddress(body)}catch(error){toast(error.message,'error');button.disabled=false}
    })
  }

  function drawDelivery(body) {
    const addr = savedAddresses().find(a => a.id === state.addressId)
    body.innerHTML = `
      <h2 class="h-md" style="margin-bottom:14px">🚴 Como quer receber?</h2>
      <div class="card" style="padding:13px 16px;margin-bottom:16px;display:flex;gap:10px;align-items:center">
        <span>📍</span>
        <div class="text-sm muted">Entrega em <b style="color:var(--text)">${esc(addr.label)}</b> — ${esc(addr.street)}</div>
      </div>
      <div class="delivery-choice-list">
        ${deliveryCard('standard', 'Entrega padrão', `${rest?.deliveryTime?.[0] ?? 25}–${rest?.deliveryTime?.[1] ?? 40} min`, fee === 0 ? 'Grátis' : money(fee), 'A loja prepara o pedido na fila normal e o entregador segue o fluxo regular até seu endereço.', 'RECOMENDADA')}
        ${deliveryCard('priority', 'Prioridade FC', `${Math.max(10, (rest?.deliveryTime?.[0] ?? 25) - 8)}–${Math.max(15, (rest?.deliveryTime?.[1] ?? 40) - 10)} min`, money(fee + 4.9), 'Seu pedido recebe prioridade operacional para ser preparado e enviado mais rapidamente.')}
      </div>
      <label class="card" style="display:block;padding:16px;margin-top:14px"><b>Agendar entrega (opcional)</b><small style="display:block;margin:5px 0 10px">Horários de Brasília disponíveis para todas as lojas do pedido nos próximos 7 dias.</small><select class="input" data-scheduled-at><option value="">Pedir agora</option>${scheduleSlots.map(slot => '<option value="' + slot + '" ' + (state.scheduledAt === slot ? 'selected' : '') + '>' + new Date(slot).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) + '</option>').join('')}</select></label><div class="delivery-estimate-note"><span>⏱</span><p><b>Os prazos são estimativas</b><small>Podem variar conforme o preparo da loja, trânsito e disponibilidade de entregadores.</small></p></div>`
    body.querySelector('[data-scheduled-at]')?.addEventListener('change',event=>{state.scheduledAt=event.currentTarget.value})
    bindSelects(body, 'delivery', drawDelivery, state)
  }

  function checkoutBody() {
    const totals = store.cartTotals(fee, freeMin)
    return { groups: cartGroups.map(group => ({ storeId: group.restaurantId, items: group.items.map(item => ({ productId: item.id, quantity: item.qty, options: item.optionNames || [], note: item.note || "" })) })), addressId: state.addressId, delivery: state.delivery, scheduledAt: state.scheduledAt || null, couponCode: totals.coupon?.code || '', method: state.payment }
  }

  function drawPayment(body) {
    body.innerHTML = `<div class="payment-heading"><div><span class="checkout-kicker">PAGAMENTO SEGURO</span><h2 class="h-md">Como você quer pagar?</h2><p>Escolha a forma de pagamento. O total será conferido na revisão.</p></div></div>
      <div class="payment-method-grid">${config.methods.map(method => `<button type="button" class="select-card ${state.payment === method.id ? 'selected' : ''}" data-select="payment" data-value="${method.id}" ${method.enabled ? '' : 'disabled'} aria-pressed="${state.payment === method.id}"><span class="sc-emoji">${method.id === 'pix' ? pixLogo() : cardLogo()}</span><span class="sc-main"><span class="sc-title">${esc(method.name)}</span><span class="sc-sub">${method.enabled ? esc(method.description) : 'Indisponível no momento'}</span></span><span class="radio-big"></span></button>`).join('')}</div>
      <aside class="pix-preview"><div><b>${state.payment === 'pix' ? 'Pix vinculado ao seu pedido' : 'Seus dados ficam com o provedor de pagamento'}</b><small>${state.payment === 'apple_pay' ? 'O Apple Pay aparece na página segura da Stripe quando disponível para seu dispositivo e cartão. Essa página também oferece cartão como alternativa.' : state.payment === 'pix' ? 'A confirmação é automática após a aprovação do banco.' : 'Você informa os dados e autoriza o pagamento na página segura do Mercado Pago.'}</small></div></aside>
      ${config.testMode ? '<p class="test-payment-note">Ambiente de teste: use os dados de teste do provedor.</p>' : ''}`
    bindSelects(body, 'payment', drawPayment, state)
  }

  function nextStepLabel() {
    if (step === 1) return 'Continuar para entrega'
    if (step === 2) return 'Continuar para pagamento'
    return 'Revisar pedido'
  }



  function drawReview(body) {
    const t = { subtotal: state.quote.subtotal, fee: state.quote.deliveryFee, discount: state.quote.discount, coupon: { code: checkoutBody().couponCode } }
    const grand = state.quote.total
    const addr = savedAddresses().find(a => a.id === state.addressId)
    const pm = config.methods.find(p => p.id === state.payment)
    body.innerHTML = `
      <h2 class="h-md" style="margin-bottom:14px">🧾 Revise seu pedido</h2>
      <div class="card" style="padding:6px 16px;margin-bottom:14px">
        ${state.quote.orders.flatMap(order => order.items).map(i => `
          <div class="cart-item">
            <div class="ci-emoji">🍽️</div>
            <div class="ci-info">
              <div class="ci-name">${i.quantity}× ${esc(i.name)}</div>
              ${i.options?.length ? `<div class="ci-detail">${esc(i.options.join(', '))}</div>` : ''}
              ${i.note ? `<div class="ci-detail"><b>Observação:</b> ${esc(i.note)}</div>` : ''}
            </div>
            <span class="ci-price">${money(i.unitPrice * i.quantity)}</span>
          </div>`).join('')}
      </div>
      <div class="card" style="padding:16px;margin-bottom:14px;display:flex;flex-direction:column;gap:9px">
        <div class="pair text-sm"><span>📍</span> <b>${esc(addr.label)}</b> — <span class="muted">${esc(addr.street)}</span></div>
        <div class="pair text-sm"><span>🚴</span> <span class="muted">${state.delivery === 'priority' ? 'Entrega prioritária' : 'Entrega padrão'}</span></div>
        <div class="pair text-sm"><span>💳</span> <span class="muted">${esc(pm.name)}</span></div>
      </div>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        <div class="totals-row"><span>Taxa de entrega</span><span>${t.fee === 0 ? '<b class="brand-text">Grátis</b>' : money(t.fee)}</span></div>
        ${t.discount ? `<div class="totals-row discount"><span>Cupom ${esc(t.coupon.code)}</span><span>-${money(t.discount)}</span></div>` : ''}
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

  function deliveryCard(id, title, sub, price, description, badge = '') {
    return `
    <button class="select-card delivery-choice ${state.delivery === id ? 'selected' : ''}" data-select="delivery" data-value="${id}" aria-pressed="${state.delivery === id}">
      <span class="delivery-choice-icon">${id === 'priority' ? '⚡' : '🚴'}</span>
      <span class="delivery-choice-main">
        <span class="delivery-choice-title">${esc(title)} ${badge ? `<em>${badge}</em>` : ''}</span>
        <span class="delivery-choice-time">⏱ ${esc(sub)}</span>
        <span class="delivery-choice-description">${esc(description)}</span>
      </span>
      <span class="delivery-choice-end"><b class="${price === 'Grátis' ? 'free' : ''}">${price}</b><i></i></span>
    </button>`
  }

  let placing = false
  async function placeOrder() {
    if (placing) return
    placing = true
    const button = view.querySelector('[data-place]')
    button.disabled = true
    button.textContent = 'Preparando pagamento...'
    try {
      const body = checkoutBody()
      const fingerprint = JSON.stringify(body)
      const storageKey = 'fc:checkout-attempt:' + boot.user.id
      let attempt
      try { attempt = JSON.parse(sessionStorage.getItem(storageKey)) } catch {}
      if (!attempt || attempt.fingerprint !== fingerprint) attempt = { fingerprint, key: crypto.randomUUID() }
      sessionStorage.setItem(storageKey, JSON.stringify(attempt))
      const result = await api.checkout({ ...body, expectedTotal: state.quote.total, idempotencyKey: attempt.key })
      rememberCart(result.payment.id, storageKey)
      location.hash = '#/checkout?payment=' + encodeURIComponent(result.payment.id)
    } catch (error) {
      toast(error.message, 'error')
      if (error.status === 409) { step = 3; draw() }
      else { button.disabled = false; button.textContent = 'Tentar novamente' }
    } finally { placing = false }
  }

  view.addEventListener('click', async event => {
    if (event.target.closest('[data-back]')) { step = Math.max(1, step - 1); draw(); return }
    if (event.target.closest('[data-next]')) {
      if (step === 1 && !savedAddresses().find(address => address.id === state.addressId)) { toast('Adicione e selecione um endereço para continuar','error','⚠️'); return }
      if (step === 3) {
        if (!config.methods.find(method => method.id === state.payment)?.enabled) { toast('Escolha uma forma de pagamento disponível.', 'error'); return }
        const button = event.target.closest('[data-next]')
        if (button.disabled) return
        button.disabled = true
        button.textContent = 'Conferindo total...'
        try { state.quote = await api.checkoutQuote(checkoutBody()) }
        catch (error) { toast(error.message, 'error'); button.disabled = false; button.textContent = 'Revisar pedido'; return }
      }
      step = Math.min(4, step + 1)
      try { draw(); window.scrollTo({ top:0, behavior:'smooth' }) } catch (error) { step = Math.max(1,step-1); toast('Não foi possível avançar: '+error.message,'error','⚠️'); draw() }
    }
  }, { signal: listeners.signal })
  draw()

}

function bindSelects(body, key, redraw, state) {
  body.querySelectorAll(`[data-select="${key}"]`).forEach(c => c.addEventListener('click', () => {
    state[key] = c.dataset.value
    redraw(body)
  }))
}

function pixLogo() {
  return `<svg viewBox="0 0 64 64" role="img" aria-label="Pix">
    <path d="M17.3 18.2 27.1 8.4a7 7 0 0 1 9.8 0l9.8 9.8h-4.8c-2.8 0-5.4 1.1-7.4 3.1l-1.4 1.4a1.6 1.6 0 0 1-2.2 0l-1.4-1.4a10.5 10.5 0 0 0-7.4-3.1h-4.8Z"/>
    <path d="m16.1 19.4-7.7 7.7a7 7 0 0 0 0 9.8l7.7 7.7h5.8c2.8 0 5.4-1.1 7.4-3.1l1.4-1.4a1.8 1.8 0 0 0 0-2.4l-4.4-4.4a1.8 1.8 0 0 1 0-2.6l4.4-4.4a1.8 1.8 0 0 0 0-2.4l-1.4-1.4a10.5 10.5 0 0 0-7.4-3.1h-5.8Z"/>
    <path d="m47.9 19.4 7.7 7.7a7 7 0 0 1 0 9.8l-7.7 7.7h-5.8c-2.8 0-5.4-1.1-7.4-3.1l-1.4-1.4a1.8 1.8 0 0 1 0-2.4l4.4-4.4a1.8 1.8 0 0 0 0-2.6l-4.4-4.4a1.8 1.8 0 0 1 0-2.4l1.4-1.4a10.5 10.5 0 0 1 7.4-3.1h5.8Z"/>
    <path d="m17.3 45.8 9.8 9.8a7 7 0 0 0 9.8 0l9.8-9.8h-4.8c-2.8 0-5.4-1.1-7.4-3.1l-1.4-1.4a1.6 1.6 0 0 0-2.2 0l-1.4 1.4a10.5 10.5 0 0 1-7.4 3.1h-4.8Z"/>
  </svg>`
}

function cardLogo() {
  return `<svg viewBox="0 0 64 64" role="img" aria-label="Cartão de crédito">
    <rect x="7" y="12" width="50" height="40" rx="8" fill="none" stroke="currentColor" stroke-width="6"/>
    <path d="M8 23h48v10H8z" fill="currentColor"/>
    <circle cx="21" cy="42" r="6" fill="currentColor"/>
    <circle cx="28" cy="42" r="6" fill="currentColor"/>
    <path d="M39 42h4m5 0h4" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
  </svg>`
}
