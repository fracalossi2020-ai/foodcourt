import { icon } from './icons.js'

export function el(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export const money = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',')

export const freeFee = (fee) => fee === 0

const activeToasts = new Map()

export function toast(msg, type = 'info', symbol = '') {
  const box = document.getElementById('toasts')
  if (!box) return
  const key = `${type}:${String(msg).trim().toLowerCase()}`
  const duplicate = activeToasts.get(key)
  if (duplicate?.isConnected) {
    duplicate.classList.remove('toast-repeat')
    requestAnimationFrame(() => duplicate.classList.add('toast-repeat'))
    return
  }
  const toastIcon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i'
  const t = el(`<div class="toast ${type}" role="status"><span class="t-emoji">${symbol || toastIcon}</span><span>${esc(msg)}</span></div>`)
  t.dataset.toastKey = key
  while (box.children.length >= 3) {
    const oldest = box.firstElementChild
    activeToasts.delete(oldest?.dataset.toastKey)
    oldest?.remove()
  }
  activeToasts.set(key, t)
  box.appendChild(t)
  setTimeout(() => {
    t.classList.add('leaving')
    const remove = () => { activeToasts.delete(key); t.remove() }
    t.addEventListener('animationend', remove, { once: true })
    setTimeout(remove, 400)
  }, 2600)
}

export function ratingPill(r) {
  return `<span class="rating-pill"><span class="star">★</span>${r.rating.toFixed(1)} <span style="color:var(--text-3);font-weight:500">(${abbr(r.reviews)})</span></span>`
}

export function abbr(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

export function restaurantCard(r, { horizontal = true } = {}) {
  const free = r.deliveryFee === 0
  const disc = r.promo ? `<span class="badge badge-brand">${icon('tag')} ${esc(r.promo)}</span>` : ''
  const badge = r.badge ? `<span class="badge badge-green">${esc(r.badge)}</span>` : ''
  return `
  <article class="card clickable rcard ${r.open ? '' : 'closed'}" data-goto="#/restaurante/${r.id}" role="link" tabindex="0" aria-label="${esc(r.name)}, ${r.category}">
    <div class="rcard-cover restaurant-photo rest-${esc(r.id)}">
      <div class="rcard-badges">${badge}${disc}</div>
      <button class="fav-btn ${isFav(r.id) ? 'on' : ''}" data-fav="${r.id}" aria-label="Favoritar ${esc(r.name)}">${icon('heart')}</button>
    </div>
    <div class="rcard-body">
      <div class="rcard-head">
        <div class="rcard-logo">${icon('store')}</div>
        <div style="min-width:0">
          <div class="rcard-title">${esc(r.name)}</div>
          <div class="rcard-cat">${esc(r.category)} • ${r.priceRange} • ${r.distance.toFixed(1)} km</div>
        </div>
      </div>
      <div class="rcard-meta">
        ${ratingPill(r)}
        <span>${icon('clock')} ${r.deliveryTime[0]}–${r.deliveryTime[1]} min</span>
        <span class="${free ? 'free' : ''}">${icon('bike')} ${free ? 'Grátis' : money(r.deliveryFee)}</span>
        ${!r.open ? `<span class="badge badge-red">Fechado${r.opensAt ? ` • abre ${r.opensAt}` : ''}</span>` : ''}
      </div>
    </div>
  </article>`
}

function isFav(id) { return window.FC?.store?.isFavoriteRestaurant?.(id) || false }

export function productCard(p, restaurantId, restaurantName) {
  return `
  <article class="card clickable pcard" data-goto="#/restaurante/${restaurantId}" role="link" tabindex="0">
    <div class="pcard-img product-photo product-${esc(p.id)}">
      ${p.discount ? `<span class="pcard-disc">-${p.discount}%</span>` : ''}
    </div>
    <div class="pcard-body">
      <div class="pcard-name">${esc(p.name)}</div>
      <div class="pcard-desc">${esc(p.description)}</div>
      <div class="muted text-xs">${esc(restaurantName)}</div>
      <div class="pcard-foot">
        <div class="pcard-price">
          <span class="now">${money(p.promoPrice ?? p.price)}</span>
          ${p.promoPrice ? `<span class="old">${money(p.price)}</span>` : ''}
        </div>
        <button class="add-btn" data-open-product="${restaurantId}|${p.id}" aria-label="Adicionar ${esc(p.name)}">${icon('plus')}</button>
      </div>
    </div>
  </article>`
}

export function skeletonCards(n = 4, horizontal = true) {
  let out = ''
  for (let i = 0; i < n; i++) {
    out += `
    <div class="skel-card" ${horizontal ? '' : 'style="width:100%"'}>
      <div class="skel skel-cover"></div>
      <div class="skel-lines">
        <div class="skel skel-line" style="width:60%"></div>
        <div class="skel skel-line" style="width:85%"></div>
        <div class="skel skel-line" style="width:40%"></div>
      </div>
    </div>`
  }
  return `<div class="hscroll">${out}</div>`
}

export function emptyState({ emoji = '🍽️', title, sub, action = '', actionLabel = '' }) {
  return `
  <div class="state-box">
    <div class="state-emoji">${emoji}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(sub)}</p>
    ${action ? `<button class="btn btn-primary" data-goto="${action}">${esc(actionLabel)}</button>` : ''}
  </div>`
}

export function errorState(retryFn) {
  const id = 'retry' + Math.random().toString(36).slice(2, 7)
  setTimeout(() => {
    const b = document.getElementById(id)
    if (b) b.addEventListener('click', retryFn)
  })
  return `
  <div class="state-box">
    <div class="state-emoji">📡</div>
    <h3>Não conseguimos carregar agora</h3>
    <p>Verifique sua conexão e tente novamente em instantes.</p>
    <button class="btn btn-primary" id="${id}">Tentar novamente</button>
  </div>`
}

export function bindGotos(root) {
  root.querySelectorAll('[data-goto]').forEach(n => {
    const go = () => { location.hash = n.dataset.goto }
    n.addEventListener('click', e => {
      if (e.target.closest('[data-fav]') || e.target.closest('[data-open-product]') || e.target.closest('button:not([data-goto])')) return
      go()
    })
    n.addEventListener('keydown', e => { if (e.key === 'Enter') go() })
  })
  root.querySelectorAll('[data-open-product]').forEach(n => {
    n.addEventListener('click', e => {
      e.stopPropagation()
      const [restId] = n.dataset.openProduct.split('|')
      location.hash = `#/restaurante/${restId}`
    })
  })
  root.querySelectorAll('[data-fav]').forEach(n => {
    n.addEventListener('click', e => {
      e.stopPropagation()
      const id = n.dataset.fav
      const on = window.FC.store.toggleFavoriteRestaurant(id)
      n.classList.toggle('on', true)
      n.innerHTML = icon('heart')
      toast(on ? 'Favorito salvo.' : 'Removido dos favoritos.', 'success')
    })
  })
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function qtyStepperValue(container) {
  return parseInt(container.querySelector('.qty-val').textContent, 10)
}
