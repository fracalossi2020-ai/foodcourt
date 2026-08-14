import { api } from '../api.js'
import { store } from '../store.js'
import { el, esc, money, toast, bindGotos, skeletonCards, errorState, ratingPill } from '../ui.js'
import { openProduct } from '../product.js'
import { setFeeContext, renderCartUI } from '../cart.js'

export async function render(view, boot, params) {
  view.innerHTML = `<div class="page">${skeletonCards(2, false)}</div>`
  let data
  try {
    data = await api.restaurant(params.id)
  } catch {
    view.innerHTML = `<div class="page">${errorState(() => render(view, boot, params))}</div>`
    return
  }

  const r = data.restaurant
  setFeeContext(r.deliveryFee, r.freeShippingMin)
  renderCartUI()

  const isFav = store.isFavoriteRestaurant(r.id)
  const free = r.deliveryFee === 0

  const sectionsHtml = r.menu.map((section, si) => `
    <section class="section" id="menu-${si}" data-menu-section>
      <div class="section-head"><h2 style="font-size:1.15rem">${esc(section.name)}</h2></div>
      <div class="card" style="overflow:hidden">
        ${section.items.map(p => `
          <div class="mitem" data-product="${p.id}" role="button" tabindex="0" aria-label="${esc(p.name)}, ${money(p.promoPrice ?? p.price)}">
            <div class="mitem-info">
              <div class="mitem-name">
                ${esc(p.name)}
                ${p.popular ? '<span class="badge badge-brand">🔥 Mais pedido</span>' : ''}
                ${p.discount ? `<span class="badge badge-green">-${p.discount}%</span>` : ''}
              </div>
              <div class="mitem-desc">${esc(p.description)}</div>
              <div class="mitem-price">
                <span class="now">${money(p.promoPrice ?? p.price)}</span>
                ${p.promoPrice ? `<span class="old">${money(p.price)}</span>` : ''}
              </div>
            </div>
            <div class="mitem-thumb">${p.emoji}</div>
          </div>`).join('')}
      </div>
    </section>`).join('')

  view.innerHTML = `
  <div class="page">
    <div class="rest-hero" style="background:${r.cover}">
      <div class="rest-hero-actions">
        <button class="fav-btn" id="restFav" aria-label="Favoritar">${isFav ? '❤️' : '🤍'}</button>
        <button class="fav-btn" id="restShare" aria-label="Compartilhar">↗</button>
      </div>
      ${r.logo}
    </div>

    <div class="rest-summary">
      <div class="rest-logo">${r.logo}</div>
      <div class="rest-info">
        <div class="pair">
          <h1>${esc(r.name)}</h1>
          ${r.open ? '<span class="badge badge-green">● Aberto agora</span>' : `<span class="badge badge-red">● Fechado${r.opensAt ? ` — abre ${r.opensAt}` : ''}</span>`}
        </div>
        <div class="rest-meta-row">
          ${ratingPill(r)}
          <span>${esc(r.category)} • ${r.priceRange}</span>
          <span>🕐 ${r.deliveryTime[0]}–${r.deliveryTime[1]} min</span>
          <span class="${free ? 'brand-text' : ''}">${free ? '🚴 Frete grátis' : `🚴 ${money(r.deliveryFee)}`}</span>
          ${!free && r.freeShippingMin ? `<span>Grátis acima de ${money(r.freeShippingMin)}</span>` : ''}
          <span>📍 ${r.distance.toFixed(1)} km</span>
        </div>
        ${r.promo ? `<div style="margin-top:10px"><span class="badge badge-brand">🏷️ ${esc(r.promo)}</span></div>` : ''}
      </div>
    </div>

    ${!r.open ? `
    <div class="closed-banner">
      <span class="emoji">🌙</span>
      <div style="flex:1">
        <b>Restaurante fechado agora</b>
        <div class="muted text-sm">${r.opensAt ? `Abre às ${r.opensAt}. ` : ''}Você pode ver o cardápio e agendar seu pedido para a abertura.</div>
      </div>
    </div>` : ''}

    <nav class="menu-tabs no-scrollbar" id="menuTabs">
      ${r.menu.map((s, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-tab="${i}">${esc(s.name)}</button>`).join('')}
    </nav>

    ${sectionsHtml}
    <div style="height:30px"></div>
  </div>`

  const productIndex = new Map()
  r.menu.forEach(s => s.items.forEach(p => productIndex.set(p.id, p)))

  view.querySelectorAll('[data-product]').forEach(node => {
    const open = () => {
      if (!r.open) { toast('Restaurante fechado — agende na abertura', 'error', '🌙'); return }
      openProduct(r, productIndex.get(node.dataset.product))
    }
    node.addEventListener('click', open)
    node.addEventListener('keydown', e => { if (e.key === 'Enter') open() })
  })

  document.getElementById('restFav').addEventListener('click', (e) => {
    const btn = e.currentTarget
    const on = store.toggleFavoriteRestaurant(r.id)
    btn.textContent = on ? '❤️' : '🤍'
    btn.classList.add('on')
    setTimeout(() => btn.classList.remove('on'), 400)
    toast(on ? 'Restaurante favoritado ❤️' : 'Removido dos favoritos', 'info', on ? '❤️' : '🤍')
  })

  document.getElementById('restShare').addEventListener('click', async () => {
    const url = location.href
    try {
      if (navigator.share) await navigator.share({ title: r.name, url })
      else { await navigator.clipboard.writeText(url); toast('Link copiado!', 'success', '🔗') }
    } catch { }
  })

  const tabs = [...document.querySelectorAll('#menuTabs .chip')]
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'))
    t.classList.add('active')
    document.getElementById(`menu-${t.dataset.tab}`).scrollIntoView({ behavior: 'smooth', block: 'start' })
  }))

  const sectionEls = [...view.querySelectorAll('[data-menu-section]')]
  const onScroll = () => {
    const y = scrollY + 180
    let active = 0
    sectionEls.forEach((s, i) => { if (s.offsetTop <= y) active = i })
    if (!tabs[active].classList.contains('active')) {
      tabs.forEach(x => x.classList.remove('active'))
      tabs[active].classList.add('active')
      tabs[active].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
  }
  window.__menuScrollHandler = onScroll
  window.addEventListener('scroll', onScroll, { passive: true })
}

export function cleanup() {
  if (window.__menuScrollHandler) {
    window.removeEventListener('scroll', window.__menuScrollHandler)
    window.__menuScrollHandler = null
  }
}
