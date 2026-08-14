import { api } from '../api.js'
import { store } from '../store.js'
import { restaurantCard, skeletonCards, errorState, bindGotos, greeting, money } from '../ui.js'

export async function render(view, boot) {
  view.innerHTML = `
    <div class="page">
      <div class="greeting">
        <h1>${greeting()}, ${esc(boot.user.name)} 👋</h1>
        <p>Seu jantar a poucos cliques. Selecionamos opções para você.</p>
      </div>
      <div class="skel" style="height:220px;border-radius:28px;margin-bottom:12px"></div>
      <div class="skel" style="height:84px;border-radius:20px;margin-bottom:26px"></div>
      ${skeletonCards(3)}
    </div>`
  let data
  try {
    data = await api.home()
  } catch {
    view.innerHTML = `<div class="page">${errorState(() => render(view, boot))}</div>`
    return
  }

  const sectionsHtml = data.sections.map((s, i) => `
    <section class="section" id="sec-${s.id}">
      <div class="section-head">
        <div>
          <h2>${esc(s.title)}</h2>
          ${s.subtitle ? `<div class="sub">${esc(s.subtitle)}</div>` : ''}
        </div>
      </div>
      <div class="hscroll no-scrollbar">${s.restaurants.map(r => restaurantCard(r)).join('')}</div>
    </section>`).join('')

  const recent = store.orders[0]
  const recentBlock = recent ? `
    <section class="section">
      <div class="section-head">
        <div><h2>Que tal repetir seu pedido?</h2><div class="sub">Você pediu isso recentemente</div></div>
      </div>
      <div class="card" style="padding:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div class="order-logo">${recent.emoji || '🍔'}</div>
        <div style="flex:1;min-width:180px">
          <b>${esc(recent.restaurantName)}</b>
          <div class="muted text-sm" style="margin-top:2px">${esc(recent.summary)}</div>
          <div class="text-xs dim" style="margin-top:2px">${money(recent.total)} • ${esc(recent.dateLabel)}</div>
        </div>
        <button class="btn btn-outline" data-repeat="${recent.id}">↻ Pedir novamente</button>
      </div>
    </section>` : ''

  view.innerHTML = `
  <div class="page">
    <div class="greeting">
      <h1>${greeting()}, ${esc(boot.user.name)} 👋</h1>
      <p>Entrega em <b class="brand-text">${esc(store.address.label)}</b> • Baseado nos seus pedidos, separamos opções para você.</p>
    </div>

    ${heroCarousel(boot.banners)}

    <section class="section">
      <div class="section-head"><div><h2>Categorias</h2></div></div>
      <div class="cat-scroll no-scrollbar">
        ${boot.categories.map(c => `
          <div class="cat-tile" data-cat="${esc(c.query)}" role="button" tabindex="0">
            <div class="cat-bubble">${c.emoji}</div>
            <span>${esc(c.name)}</span>
          </div>`).join('')}
      </div>
    </section>

    ${recentBlock}

    ${sectionsHtml}

    <section class="section">
      <div class="card dark-panel" style="padding:22px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="font-size:2.2rem">🏅</div>
        <div style="flex:1;min-width:200px">
          <b>Programa de benefícios Food Court</b>
          <div class="muted text-sm" style="margin-top:3px">Você tem <b class="brand-text">${store.user.points} pontos</b> e <b class="brand-text">${store.user.cashback}% de cashback</b> no nível ${store.user.level}.</div>
        </div>
        <a href="#/perfil" class="btn btn-outline btn-sm">Ver benefícios</a>
      </div>
    </section>
  </div>`

  bindGotos(view)
  bindCarousel(view)
  view.querySelectorAll('[data-cat]').forEach(t => {
    const go = () => { location.hash = `#/buscar?q=${encodeURIComponent(t.dataset.cat)}` }
    t.addEventListener('click', go)
    t.addEventListener('keydown', e => { if (e.key === 'Enter') go() })
  })
  view.querySelectorAll('[data-repeat]').forEach(b => b.addEventListener('click', () => {
    const order = store.getOrder(b.dataset.repeat)
    if (!order) return
    store.repeatOrder(order)
    location.hash = `#/restaurante/${order.restaurantId}`
    setTimeout(() => import('../cart.js').then(m => m.renderCartUI()), 100)
    import('../ui.js').then(({ toast }) => toast('Pedido reconstruído no carrinho', 'success', '↻'))
  }))
}

function heroCarousel(banners) {
  let idx = 0
  let timer
  const id = 'hero' + Date.now()
  setTimeout(() => {
    const root = document.getElementById(id)
    if (!root) return
    const track = root.querySelector('.hero-track')
    const dots = [...root.querySelectorAll('.hero-dot')]
    const go = (i) => {
      idx = (i + banners.length) % banners.length
      track.style.transform = `translateX(-${idx * 100}%)`
      dots.forEach((d, j) => d.classList.toggle('active', j === idx))
    }
    dots.forEach((d, i) => d.addEventListener('click', () => { go(i); restart() }))
    const restart = () => { clearInterval(timer); timer = setInterval(() => go(idx + 1), 5000) }
    restart()
  })
  return `
  <section class="section hero" id="${id}" aria-roledescription="carrossel">
    <div class="hero-track">
      ${banners.map(b => `
        <div class="hero-slide tone-${b.tone}">
          <div class="hero-content">
            <span class="hero-tag">${esc(b.tag)}</span>
            <h2 class="hero-title">${esc(b.title)}</h2>
            <p class="hero-sub">${esc(b.subtitle)}</p>
            <a class="btn btn-primary btn-sm" href="${b.href}">${esc(b.cta)}</a>
          </div>
          <div class="hero-emoji">${b.emoji}</div>
        </div>`).join('')}
    </div>
    <div class="hero-dots">${banners.map((_, i) => `<button class="hero-dot ${i === 0 ? 'active' : ''}" aria-label="Banner ${i + 1}"></button>`).join('')}</div>
  </section>`
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
