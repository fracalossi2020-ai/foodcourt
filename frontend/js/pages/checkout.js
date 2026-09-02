import { store } from '../core/store.js'
import { api } from '../core/api.js'
import { esc, money, toast, emptyState } from '../core/ui.js'
import { setFeeContext, renderCartUI } from '../core/cart.js'

let activePixTimer = null
export function cleanup() { if (activePixTimer) clearInterval(activePixTimer); activePixTimer = null }

export async function render(view, boot) {
  cleanup()
  const { cart } = store
  if (!cart.items.length) {
    view.innerHTML = `<div class="page">${emptyState({ emoji: '🛒', title: 'Seu carrinho está vazio', sub: 'Adicione itens para finalizar um pedido.', action: '#/', actionLabel: 'Explorar restaurantes' })}</div>`
    return
  }

  const rest = await api.restaurant(cart.restaurantId).then(d => d.restaurant).catch(() => null)
  const cartGroups = Object.values(cart.items.reduce((groups,item) => { const restaurantId=item.restaurantId||cart.restaurantId; (groups[restaurantId] ||= { restaurantId, restaurantName:item.restaurantName, items:[] }).items.push(item); return groups }, {}))
  const savedAddresses = () => store.addresses.filter(address => address.street)
  const fee = rest?.deliveryFee ?? 0
  const freeMin = rest?.freeShippingMin ?? 0
  setFeeContext(fee, freeMin)

  let step = 1
  const state = {
    addressId: savedAddresses()[0]?.id || null,
    delivery: 'standard',
    payment: 'pix',
    scheduledAt: null,
    card: null,
    pixCharge: null
  }

  function draw() {
    cleanup()
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
        ${step < 4 ? `<button class="btn btn-primary" data-next>${nextStepLabel()} →</button>` : `<button class="btn btn-primary btn-lg" data-place>${state.payment === 'pix' ? 'Confirmar pedido após o Pix' : 'Finalizar pedido'} →</button>`}
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
      <label class="card" style="display:block;padding:16px;margin-top:14px"><b>Agendar entrega (opcional)</b><small style="display:block;margin:5px 0 10px">Escolha uma data e horário nos próximos 7 dias.</small><input class="input" type="datetime-local" data-scheduled-at value="${state.scheduledAt||''}"></label><div class="delivery-estimate-note"><span>⏱</span><p><b>Os prazos são estimativas</b><small>Podem variar conforme o preparo da loja, trânsito e disponibilidade de entregadores.</small></p></div>`
    body.querySelector('[data-scheduled-at]')?.addEventListener('change',event=>{state.scheduledAt=event.currentTarget.value})
    bindSelects(body, 'delivery', drawDelivery, state)
  }

  function drawPayment(body) {
    const t = store.cartTotals(fee, freeMin)
    const total = t.total + prioExtra()
    const available = boot.paymentMethods.filter(pm => ['pix', 'credit'].includes(pm.id))
    body.innerHTML = `
      <div class="payment-heading"><div><span class="checkout-kicker">PAGAMENTO SEGURO</span><h2 class="h-md">Como você quer pagar?</h2><p>Escolha uma opção para este pedido de <b>${money(total)}</b>.</p></div><span class="payment-lock">🔒</span></div>
      <div class="payment-method-grid">${available.map(pm => `
        <button class="select-card ${state.payment === pm.id ? 'selected' : ''}" data-select="payment" data-value="${pm.id}">
          <span class="sc-emoji ${pm.id === 'pix' ? 'pix-brand-icon' : pm.id === 'credit' ? 'card-brand-icon' : ''}">${pm.id === 'pix' ? pixLogo() : pm.id === 'credit' ? cardLogo() : pm.emoji}</span>
          <span class="sc-main">
            <span class="sc-title">${pm.id === 'credit' ? 'Cartão de crédito' : 'Pix'}</span>
            <span class="sc-sub">${pm.id === 'credit' ? (state.card ? `${esc(state.card.brand)} terminado em ${esc(state.card.last4)}` : 'Cadastre seu cartão com segurança') : 'QR Code ou Pix copia e cola'}</span>
          </span>
          <span class="radio-big"></span>
        </button>`).join('')}</div>
      ${state.payment === 'credit' ? cardForm() : `<aside class="pix-preview"><span>⚡</span><div><b>Pagamento rápido pelo aplicativo do seu banco</b><small>Na próxima etapa você poderá escanear o QR Code ou copiar o código Pix com o valor de ${money(total)} já preenchido.</small></div></aside>`}
      <div class="test-payment-note"><b>AMBIENTE DE TESTE</b><span>O FoodCourt ainda não confirma pagamentos automaticamente. Não compartilhe dados de cartão reais nesta demonstração.</span></div>`
    bindSelects(body, 'payment', drawPayment, state)
    bindCardForm(body)
  }

  function nextStepLabel() {
    if (step === 1) return 'Continuar para entrega'
    if (step === 2) return 'Continuar para pagamento'
    return state.payment === 'pix' ? 'Gerar QR Code Pix' : 'Revisar pedido'
  }

  function cardForm() {
    return `<form class="checkout-card-form" data-card-form autocomplete="off">
      <div class="card-visual"><span>FOODCOURT • TESTE</span><i>◉</i><strong data-card-preview>•••• •••• •••• ${state.card?.last4 || '0000'}</strong><small><span data-name-preview>${esc(state.card?.holder || 'NOME NO CARTÃO')}</span><span>${esc(state.card?.expiry || 'MM/AA')}</span></small></div>
      <div class="card-fields">
        <label class="wide"><span>Número do cartão</span><input name="number" inputmode="numeric" placeholder="0000 0000 0000 0000" maxlength="19" required></label>
        <label class="wide"><span>Nome impresso</span><input name="holder" placeholder="Como aparece no cartão" maxlength="40" required></label>
        <label><span>Validade</span><input name="expiry" inputmode="numeric" placeholder="MM/AA" maxlength="5" required></label>
        <label><span>CVV</span><input name="cvv" type="password" inputmode="numeric" placeholder="•••" maxlength="4" required></label>
        <label class="save-card-check wide"><input name="save" type="checkbox" checked><span>Salvar somente bandeira e últimos 4 dígitos neste dispositivo</span></label>
      </div>
      ${state.card ? `<div class="card-saved">✓ Cartão de teste ${esc(state.card.brand)} •••• ${esc(state.card.last4)} pronto para continuar.</div>` : ''}
    </form>`
  }

  function bindCardForm(body) {
    const form = body.querySelector('[data-card-form]')
    if (!form) return
    const number = form.elements.number
    const holder = form.elements.holder
    const expiry = form.elements.expiry
    number.addEventListener('input', () => { const digits=number.value.replace(/\D/g,'').slice(0,16);number.value=digits.replace(/(.{4})/g,'$1 ').trim();form.querySelector('[data-card-preview]').textContent=(digits.padEnd(16,'•').match(/.{1,4}/g)||[]).join(' ') })
    holder.addEventListener('input', () => { form.querySelector('[data-name-preview]').textContent=holder.value.toUpperCase()||'NOME NO CARTÃO' })
    expiry.addEventListener('input', () => { const digits=expiry.value.replace(/\D/g,'').slice(0,4);expiry.value=digits.length>2?`${digits.slice(0,2)}/${digits.slice(2)}`:digits })
    form.elements.cvv.addEventListener('input', event => { event.target.value=event.target.value.replace(/\D/g,'').slice(0,4) })
  }

  function validateCard() {
    const form = view.querySelector('[data-card-form]')
    if (!form) return false
    const digits=form.elements.number.value.replace(/\D/g,'');const holder=form.elements.holder.value.trim();const expiry=form.elements.expiry.value;const cvv=form.elements.cvv.value
    const luhn=digits.length>=13&&[...digits].reverse().reduce((sum,n,index)=>{let value=Number(n);if(index%2){value*=2;if(value>9)value-=9}return sum+value},0)%10===0
    const match=expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
    if(!luhn){toast('Digite um número de cartão de teste válido.','error','⚠️');form.elements.number.focus();return false}
    if(!holder){toast('Informe o nome impresso no cartão.','error','⚠️');form.elements.holder.focus();return false}
    if(!match||cvv.length<3){toast('Confira a validade e o CVV.','error','⚠️');return false}
    const brand=/^4/.test(digits)?'Visa':/^5[1-5]/.test(digits)?'Mastercard':'Cartão'
    state.card={brand,last4:digits.slice(-4),holder,expiry};form.elements.number.value='';form.elements.cvv.value='';return true
  }

  function prioExtra() { return state.delivery === 'priority' ? 4.9 : 0 }

  function drawReview(body) {
    const t = store.cartTotals(fee, freeMin)
    const grand = t.total + prioExtra()
    const addr = savedAddresses().find(a => a.id === state.addressId)
    const pm = boot.paymentMethods.find(p => p.id === state.payment)
    if (state.payment === 'pix' && state.pixCharge) {
      body.innerHTML = `<section class="pix-payment-screen">
        <header><span class="checkout-kicker">PIX • AMBIENTE DE TESTE</span><h2>Pague ${money(grand)} pelo Pix</h2><p>Abra o aplicativo do seu banco, escaneie o QR Code ou use o Pix copia e cola.</p><div class="pix-expiry" data-pix-expiry><span>⏱ Este código expira em</span><strong data-pix-timer>07:00</strong><i><b data-pix-progress></b></i></div></header>
        <div class="pix-payment-layout"><div class="pix-qr-card"><img src="${state.pixCharge.qrCode}" alt="QR Code Pix no valor de ${money(grand)}"><span>Valor exato do pedido</span><strong>${money(grand)}</strong></div>
        <div class="pix-payment-content"><ol><li><b>Abra o app do seu banco</b><small>Escolha a opção pagar com Pix.</small></li><li><b>Escaneie ou copie</b><small>O valor já está incluído no código.</small></li><li><b>Confira antes de pagar</b><small>Favorecido esperado: FOODCOURT.</small></li></ol><label><span>Pix copia e cola</span><div><input value="${esc(state.pixCharge.payload)}" readonly data-pix-code><button type="button" data-copy-pix>Copiar código</button></div></label><aside>⚠️ Esta chave pode gerar uma transferência real. O modo local não verifica a aprovação automaticamente.</aside></div></div>
      </section>`
      body.querySelector('[data-copy-pix]')?.addEventListener('click', async event => { try{await navigator.clipboard.writeText(state.pixCharge.payload)}catch{const input=body.querySelector('[data-pix-code]');input.select();document.execCommand('copy')}event.currentTarget.textContent='✓ Copiado';toast('Código Pix copiado.','success','✓') })
      startPixTimer(body, grand)
      return
    }
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
        <div class="pair text-sm"><span>🚴</span> <span class="muted">${state.delivery === 'priority' ? 'Entrega prioritária' : 'Entrega padrão'}</span></div>
        <div class="pair text-sm"><span>💳</span> <span class="muted">${state.card ? `${esc(state.card.brand)} •••• ${esc(state.card.last4)}` : esc(pm.name)}</span></div>
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

  async function placeOrder() {
    const t = store.cartTotals(fee, freeMin)
    const addr = savedAddresses().find(a => a.id === state.addressId)
    const pm = boot.paymentMethods.find(p => p.id === state.payment)
    const placeButton = view.querySelector('[data-place]')
    if (placeButton) { placeButton.disabled = true; placeButton.textContent = 'CONFIRMANDO...' }
    try {
      const results = await Promise.all(cartGroups.map(group => api.createOrder({ storeId:group.restaurantId, items:group.items.map(item => ({ productId:item.id,quantity:item.qty,options:item.optionNames||[] })), addressId:addr.id, address:`${addr.label} — ${addr.street}${addr.number?', '+addr.number:''}`, paymentMethod:pm.name, paymentIntentId:state.payment==='pix'?state.pixCharge?.id:null, couponCode:t.coupon?.code||'', scheduledAt:state.scheduledAt||null })))
      const localOrders = results.map((result,index) => { const serverOrder=result.order; const group=cartGroups[index]; return store.addOrder({
      id: serverOrder.id,
      restaurantId: group.restaurantId,
      restaurantName: group.restaurantName,
      emoji: rest?.logo || '🍔',
      items: group.items.map(i => ({ ...i })),
      summary: group.items.map(i=>`${i.qty}× ${i.name}`).join(', ').slice(0,60),
      subtotal: serverOrder.subtotal, fee: serverOrder.deliveryFee, discount:serverOrder.discount, total:serverOrder.total,
      coupon: t.coupon?.code || null,
      address: `${addr.label} — ${addr.street}`,
      payment: pm.name,
      serverSynced: true, status: serverOrder.status, createdAt: new Date(serverOrder.createdAt).getTime(),
      dateLabel: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      rated: false
      }) })
      store.cartClear();renderCartUI();toast(`${localOrders.length} ${localOrders.length===1?'pedido confirmado':'pedidos confirmados'} e enviados às lojas! 🎉`,'success','✅');location.hash=localOrders.length===1?`#/pedido/${localOrders[0].id}`:'#/pedidos'
    } catch (error) { toast(error.message,'error','⚠️'); if(placeButton){placeButton.disabled=false;placeButton.textContent='FINALIZAR PEDIDO 🍔'} }
  }

  view.addEventListener('click', async event => {
    if (event.target.closest('[data-back]')) { step = Math.max(1, step - 1); draw(); return }
    if (event.target.closest('[data-next]')) {
      if (step === 1 && !savedAddresses().find(address => address.id === state.addressId)) { toast('Adicione e selecione um endereço para continuar','error','⚠️'); return }
      if (step === 3 && state.payment === 'credit' && !state.card && !validateCard()) return
      if (step === 3 && state.payment === 'pix') {
        const button=event.target.closest('[data-next]');button.disabled=true;button.textContent='Gerando Pix...'
        try { const totals=store.cartTotals(fee,freeMin);state.pixCharge=await api.createPixCharge(+(totals.total+prioExtra()).toFixed(2));state.pixCharge.expiresAt=Number(state.pixCharge.expiresAt)||Date.now()+420000 }
        catch(error){toast(error.message||'Não foi possível gerar o Pix.','error','⚠️');button.disabled=false;button.textContent='Continuar →';return}
      }
      step = Math.min(4, step + 1)
      try { draw(); window.scrollTo({ top:0, behavior:'smooth' }) } catch (error) { step = Math.max(1,step-1); toast('Não foi possível avançar: '+error.message,'error','⚠️'); draw() }
    }
  })
  draw()

  function startPixTimer(body, amount) {
    cleanup()
    const timer=body.querySelector('[data-pix-timer]');const progress=body.querySelector('[data-pix-progress]');const box=body.querySelector('[data-pix-expiry]')
    const duration=420000
    const tick=async()=>{
      const remaining=Math.max(0,(state.pixCharge?.expiresAt||0)-Date.now());const totalSeconds=Math.ceil(remaining/1000);const minutes=Math.floor(totalSeconds/60);const seconds=totalSeconds%60
      if(timer)timer.textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
      if(progress)progress.style.width=`${Math.max(0,Math.min(100,remaining/duration*100))}%`
      if(remaining>0)return
      cleanup();box?.classList.add('expired');if(timer)timer.textContent='EXPIRADO';const copy=body.querySelector('[data-copy-pix]');if(copy)copy.disabled=true
      toast('O QR Code expirou. Estamos gerando um novo Pix.','info','⏱')
      try{state.pixCharge=await api.createPixCharge(amount);state.pixCharge.expiresAt=Number(state.pixCharge.expiresAt)||Date.now()+duration;drawReview(body);toast('Novo QR Code Pix gerado.','success','✓')}
      catch(error){box?.classList.add('refresh-error');if(timer)timer.textContent='TENTE NOVAMENTE';toast(error.message||'Não foi possível renovar o Pix.','error','⚠️')}
    }
    tick();activePixTimer=setInterval(tick,1000)
  }
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
