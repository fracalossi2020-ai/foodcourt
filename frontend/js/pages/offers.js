import { store } from '../core/store.js'
import { api } from '../core/api.js'
import { esc, money, bindGotos, toast } from '../core/ui.js'

export async function render(view, boot) {
  let deals = []
  try { deals = await api.flashDeals() } catch { }
  const freeShip = boot.coupons.find(c => c.type === 'shipping')

  view.innerHTML = `
  <div class="page account-destination-page">
    <a class="profile-back" href="#/perfil">← <span>Voltar ao perfil</span></a>
    <header class="destination-heading"><span class="destination-icon">🎟️</span><div><span class="account-kicker">MINHA CONTA</span><h1>Ofertas & Cupons</h1><p>Economize com benefícios selecionados para o seu perfil.</p></div></header>
    <div class="destination-summary"><div><b>${store.coupons.length}</b><span>Na carteira</span></div><div><b>${boot.coupons.length}</b><span>Disponíveis</span></div><a href="#/buscar">Usar agora</a></div>

    ${deals.length ? `<section class="section">
      <div class="section-head">
        <div><h2>⚡ Ofertas relâmpago</h2><div class="sub">Terminam em breve — corra!</div></div>
      </div>
      <div class="hscroll no-scrollbar" id="flashRow">
        ${deals.map(d => flashCard(d)).join('')}
      </div>
    </section>` : ''}

    <section class="section">
      <div class="section-head"><div><h2>🎟️ Cupons disponíveis</h2><div class="sub">Resgate e use no checkout</div></div></div>
      ${boot.coupons.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">
        ${boot.coupons.map(c => couponCard(c)).join('')}
      </div>` : `<div class="card" style="padding:18px"><b>Nenhum cupom disponível agora.</b><div class="muted text-sm" style="margin-top:4px">As lojas publicam cupons por tempo limitado. Volte em breve.</div></div>`}
    </section>

    <section class="section">
      <div class="section-head"><div><h2>🚴 Frete grátis</h2></div></div>
      <div class="card" style="padding:18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div style="font-size:2rem">🛵</div>
        <div style="flex:1;min-width:200px">
          <b>${esc(freeShip?.title || 'Frete grátis')} — ${esc(freeShip?.description || '')}</b>
          <div class="muted text-sm" style="margin-top:2px">Válido em restaurantes parceiros selecionados</div>
        </div>
        <button class="btn btn-outline btn-sm" data-goto="#/buscar?filtro=frete-gratis">Encontrar restaurantes</button>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>🔥 Ofertas de restaurantes</h2></div></div>
      <div class="hscroll no-scrollbar" id="promoRests"></div>
    </section>
  </div>`

  api.home().then(d => {
    const row = document.getElementById('promoRests')
    const promos = []
    d.sections.find(s => s.id === 'offers')?.restaurants.forEach(r => promos.push(r))
    import('../core/ui.js').then(m => {
      row.innerHTML = promos.map(r => m.restaurantCard(r)).join('')
      m.bindGotos(row)
    })
  }).catch(() => { })

  boot.coupons.forEach(c => {
    const btn = view.querySelector(`[data-coupon="${c.code}"]`)
    btn?.addEventListener('click', () => {
      if (store.coupons.includes(c.code)) { toast(`Cupom ${c.code} já está na sua carteira`, 'info', '🎟️'); return }
      store.addCoupon(c.code)
      btn.textContent = '✓ NA CARTEIRA'
      btn.classList.remove('btn-primary'); btn.classList.add('btn-ghost')
      toast(`Cupom ${c.code} resgatado!`, 'success', '🎟️')
    })
  })

  bindGotos(view)
  startCountdowns()
}

function flashCard(d) {
  return `
  <div class="card clickable pcard" style="border-color:var(--brand-border)" data-goto="#/restaurante/${d.restaurantId}">
    <div class="pcard-img" style="background:linear-gradient(160deg,#fff8f2,#fff3e8)">${d.emoji}</div>
    <div class="pcard-body">
      <div class="pcard-name">${esc(d.title)}</div>
      <div class="muted text-xs">${esc(d.subtitle)}</div>
      <div class="pcard-foot">
        <div class="pcard-price">
          <span class="now">${money(d.price)}</span>
          <span class="old">${money(d.oldPrice)}</span>
        </div>
        <span class="countdown" data-ends="${d.endsInMin}"></span>
      </div>
    </div>
  </div>`
}

// Os cupons vêm das promoções das lojas (code, type, value, min, rules{min},
// storeId, personal). Título, descrição e regras são derivados aqui.
function couponTitle(c) {
  if (c.title) return c.title
  if (c.type === 'shipping') return 'Frete grátis'
  if (c.type === 'percent') return `${c.value}% OFF`
  return `${money(c.value)} OFF`
}
function couponRules(c) {
  if (Array.isArray(c.rules)) return c.rules
  const rules = []
  const min = Number(c.rules?.min ?? c.min ?? 0)
  if (min > 0) rules.push(`Pedido mínimo ${money(min)}`)
  if (c.storeId) rules.push('Válido em uma loja específica')
  if (c.personal) rules.push('Cupom pessoal, só para você')
  if (!rules.length) rules.push('Sem valor mínimo')
  return rules
}
function couponCard(c) {
  const owned = store.coupons.includes(c.code)
  const tone = c.tone || (c.type === 'shipping' ? 'dark' : 'orange')
  return `
  <div class="card coupon-card tone-${esc(tone)}">
    <div class="pair" style="justify-content:space-between">
      <b style="font-size:1.05rem">${esc(couponTitle(c))}</b>
      <span class="badge badge-brand">${c.type === 'shipping' ? 'FRETE' : c.type === 'percent' ? `${c.value}%` : 'R$ ' + c.value}</span>
    </div>
    <div class="muted text-sm">${esc(c.description || (c.personal ? 'Cupom liberado para a sua conta' : 'Use o código no checkout'))}</div>
    <span class="coupon-code">${esc(c.code)}</span>
    <ul class="coupon-rules">${couponRules(c).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    <button class="btn ${owned ? 'btn-ghost' : 'btn-primary'} btn-sm" data-coupon="${esc(c.code)}" style="margin-top:4px">${owned ? '✓ NA CARTEIRA' : 'RESGATAR'}</button>
  </div>`
}

function startCountdowns() {
  const nodes = document.querySelectorAll('[data-ends]')
  const ends = [...nodes].map(n => Date.now() + (+n.dataset.ends) * 60000)
  function tick() {
    nodes.forEach((n, i) => {
      const s = Math.max(0, Math.floor((ends[i] - Date.now()) / 1000))
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
      n.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    })
  }
  tick()
  clearInterval(window.__cdTimer)
  window.__cdTimer = setInterval(tick, 1000)
}
