import { api } from './core/api.js'
import { store, hydrateBootstrap, setAuthUser } from './core/store.js'
import { el, esc, toast } from './core/ui.js'
import { openCart, closeAllDrawers, hide, renderCartUI } from './core/cart.js'

window.FC = { store }

const routes = [
  { pattern: /^\/$/, page: 'landing', public: true, landing: true },
  { pattern: /^\/login$/, page: 'landing', public: true, landing: true },
  { pattern: /^\/login-parceiro$/, page: 'partner-login', public: true, mode: 'partner-login' },
  { pattern: /^\/cadastro$/, page: 'auth', public: true, mode: 'register' },
  { pattern: /^\/esqueci-senha$/, page: 'auth', public: true, mode: 'forgot' },
  { pattern: /^\/redefinir-senha$/, page: 'auth', public: true, mode: 'reset' },
  { pattern: /^\/para-estabelecimentos$/, page: 'partner-marketing', public: true, mode: 'marketing' },
  { pattern: /^\/cadastro-parceiro$/, page: 'partner-marketing', public: true, mode: 'register' },
  { pattern: /^\/inicio$/, page: 'home' },
  { pattern: /^\/buscar$/, page: 'search' },
  { pattern: /^\/restaurante\/([\w-]+)$/, page: 'restaurant' },
  { pattern: /^\/checkout$/, page: 'checkout' },
  { pattern: /^\/pedido\/([\w-]+)$/, page: 'tracking' },
  { pattern: /^\/pedidos$/, page: 'orders' },
  { pattern: /^\/favoritos$/, page: 'favorites' },
  { pattern: /^\/ofertas$/, page: 'offers' },
  { pattern: /^\/notificacoes$/, page: 'notifications' },
  { pattern: /^\/perfil$/, page: 'profile' }
  ,{ pattern: /^\/parceiro$/, page: 'partner' }
  ,{ pattern: /^\/admin$/, page: 'admin' }
  ,{ pattern: /^\/fidelidade$/, page: 'loyalty' }
  ,{ pattern: /^\/suporte$/, page: 'support' }
]

let currentPage = null
let authUser = null
let handlingUnauthorized = false

function isAuthPath(path) {
  return path.startsWith('/login') || path.startsWith('/cadastro') || path.startsWith('/esqueci-senha') || path.startsWith('/redefinir-senha')
}

async function ensureAuth() {
  if (authUser) return true
  try {
    const res = await api.me()
    authUser = res.user
    setAuthUser(res.user)
    return true
  } catch {
    return false
  }
}

let navigating = false
let navigationQueued = false

async function navigate() {
  if (navigating) {
    navigationQueued = true
    return
  }
  navigating = true
  const view = document.getElementById('view')
  if (!view.innerHTML.trim()) {
    view.innerHTML = `<div class="page route-loading" role="status"><i></i><b>Carregando FoodCourt</b><span>Preparando sua experiência...</span></div>`
  }
  try {
    const raw = location.hash.replace(/^#/, '') || '/'
    const [path, qs] = raw.split('?')
    const query = new URLSearchParams(qs || '')

    if (path === '/login' && query.get('portal') === 'parceiro') {
      location.hash = '#/login-parceiro'
      return
    }

    if (currentPage?.cleanup) currentPage.cleanup()
    closeAllDrawers()

    const route = routes.find(r => r.pattern.test(path))
    if (!route) { location.hash = '#/'; return }
    const params = path.match(route.pattern)

    if (route.landing) {
      document.body.classList.add('landing-mode')
      document.body.classList.remove('auth-mode', 'app-mode')
      document.getElementById('cartbar')?.remove()
    } else if (route.public) {
      document.body.classList.add('auth-mode')
      document.body.classList.remove('landing-mode', 'app-mode')
      document.getElementById('cartbar')?.remove()
    } else {
      document.body.classList.remove('auth-mode')
      document.body.classList.remove('landing-mode')
      document.body.classList.add('app-mode')
      if (path === '/checkout' || path.startsWith('/pedido/')) {
        document.getElementById('cartbar')?.remove()
      }
      const target = path + (qs ? `?${qs}` : '')
      if (!(await ensureAuth())) {
        location.hash = `#/login?redirect=${encodeURIComponent(target)}`
        return
      }
    }

    const mod = await import(`./pages/${route.page}.js?v=20260820-39`)
    currentPage = mod
    window.scrollTo(0, 0)

    if (route.public) {
      await mod.render(view, null, { mode: route.mode }, query)
    } else {
      const boot = await getBoot()
      await mod.render(view, boot, params ? { id: params[1] } : {}, query)
      enhanceInternalView(view)
    }
    updateNav(path, query)
  } catch (error) {
    console.error('[navigation]', error)
    const target = location.hash.replace(/^#/, '') || '/'
    const isSessionError = error?.status === 401 || /autentic|sessão|sessao/i.test(error?.message || '')
    if (isSessionError && !isAuthPath(target)) {
      navigationQueued = true
      location.hash = `#/login?redirect=${encodeURIComponent(target)}`
    } else {
      view.innerHTML = `<div class="page route-error"><span>⚠️</span><h1>Não foi possível carregar esta página</h1><p>${esc(error?.message || 'Ocorreu um erro inesperado.')}</p><div><button class="btn btn-primary" data-route-retry>Tentar novamente</button><a class="btn btn-ghost" href="#/inicio">Ir para o início</a></div></div>`
      view.querySelector('[data-route-retry]')?.addEventListener('click', () => navigate())
    }
  } finally {
    navigating = false
    if (navigationQueued) {
      navigationQueued = false
      queueMicrotask(navigate)
    }
  }
}

let bootPromise = null
function getBoot() {
  if (!bootPromise) {
    bootPromise = api.bootstrap().then(b => { hydrateBootstrap(b); syncHeader(); return b })
  }
  return bootPromise
}

function updateNav(path, query = new URLSearchParams()) {
  document.querySelectorAll('.bottomnav a, .desktop-links a[data-nav]').forEach(a => {
    const target = a.dataset.nav
    const categories = target === '/categorias' && path === '/inicio' && query.get('focus') === 'categorias'
    const home = target === '/inicio' && path === '/inicio' && query.get('focus') !== 'categorias'
    a.classList.toggle('active', target === '/inicio' ? home : target === '/categorias' ? categories : path.startsWith(target))
  })
  const logo = document.querySelector('.header .logo')
  if (logo) logo.href = document.body.classList.contains('app-mode') ? '#/inicio' : '#/'
}

function enhanceInternalView(view) {
  const targets = view.querySelectorAll('.consumer-section-head, .section-head, .restaurant-row, .product-row, .offer-strip, .nearby-list, .grid-rest, .card:not(.rcard):not(.pcard)')
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    targets.forEach(node => node.classList.add('reveal-visible'))
    return
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return
    entry.target.classList.add('reveal-visible')
    observer.unobserve(entry.target)
  }), { threshold: .06, rootMargin: '0px 0px -24px' })
  targets.forEach((node, index) => {
    node.classList.add('premium-reveal')
    node.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 55}ms`)
    observer.observe(node)
  })
}

function syncHeader() {
  const addr = store.address
  document.getElementById('locEmoji').textContent = addr.emoji
  document.getElementById('locLabel').textContent = addr.label
  if (store.user) document.getElementById('avatarBtn').textContent = store.user.avatarEmoji
  updateNotifBadge()
  renderCartUI()
}

function updateNotifBadge() {
  const dot = document.getElementById('notifDot')
  const n = store.unreadNotifs()
  dot.hidden = n === 0
  dot.textContent = n > 9 ? '9+' : n
}

function renderLocDrawer() {
  const drawer = document.getElementById('locDrawer')
  drawer.classList.add('location-popover')
  drawer.innerHTML = `
    <div class="drawer-head location-popover-head">
      <h3><span>⌖</span> Entregar em</h3>
      <button class="icon-btn" data-close aria-label="Fechar">✕</button>
    </div>
    <div class="drawer-body location-popover-body">
      ${store.addresses.map(a => `
        <button class="location-option ${a.id === store.address.id ? 'selected' : ''}" data-addr="${a.id}">
          <span class="location-option-icon">${a.id==='home'?'⌂':a.id==='work'?'▣':'⌖'}</span>
          <span class="sc-main">
            <span class="sc-title">${esc(a.label)}</span>
          </span>
          <span class="location-check">✓</span>
        </button>`).join('')}
      <button class="location-option" data-newaddr>
        <span class="location-option-icon">●</span>
        <span class="sc-main"><span class="sc-title">Outro endereço</span></span>
      </button>
    </div>
    <a class="location-manage" href="#/perfil?secao=enderecos">Gerenciar endereços <span>›</span></a>`
  drawer.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => hide('locDrawer')))
  drawer.querySelectorAll('[data-addr]').forEach(b => b.addEventListener('click', () => {
    store.setAddress(b.dataset.addr)
    syncHeader()
    hide('locDrawer')
    toast(`Entrega alterada para ${store.address.label}`, 'success', '📍')
  }))
  drawer.querySelector('[data-newaddr]')?.addEventListener('click', () => { hide('locDrawer'); location.hash='#/perfil?secao=enderecos' })
  drawer.querySelector('.location-manage')?.addEventListener('click', () => hide('locDrawer'))
}

function wireTheme() {
  const btn = document.getElementById('themeBtn')
  const sun = document.getElementById('iconSun')
  const moon = document.getElementById('iconMoon')
  const meta = document.querySelector('meta[name="theme-color"]')

  function apply(theme, animate) {
    if (animate) {
      document.documentElement.classList.add('theming')
      setTimeout(() => document.documentElement.classList.remove('theming'), 350)
    }
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('fc:theme', theme) } catch { }
    sun.hidden = theme === 'light'
    moon.hidden = theme !== 'light'
    meta?.setAttribute('content', theme === 'dark' ? '#0a0a0b' : '#ffffff')
  }

  const saved = document.documentElement.dataset.theme || 'light'
  apply(saved, false)

  btn.addEventListener('click', () => {
    apply(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true)
  })
}

function wireHeader() {
  const menuBtn = document.getElementById('mobileMenuBtn')
  menuBtn?.addEventListener('click', () => {
    const header = document.querySelector('.header')
    const open = header.classList.toggle('mobile-open')
    menuBtn.setAttribute('aria-expanded', String(open))
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu')
  })
  document.querySelector('.desktop-links')?.addEventListener('click', () => {
    document.querySelector('.header')?.classList.remove('mobile-open')
    menuBtn?.setAttribute('aria-expanded', 'false')
  })
  document.querySelector('.desktop-links')?.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#/"]')
    if (!link || link.target === '_blank') return
    event.preventDefault()
    const destination = link.getAttribute('href')
    if (location.hash === destination) navigate()
    else location.hash = destination
  })
  document.getElementById('cartBtn').addEventListener('click', openCart)
  document.getElementById('locBtn').addEventListener('click', event => {
    renderLocDrawer()
    const rect=event.currentTarget.getBoundingClientRect(),drawer=document.getElementById('locDrawer')
    drawer.style.setProperty('--location-left',`${Math.max(12,rect.left)}px`)
    drawer.style.setProperty('--location-top',`${rect.bottom+8}px`)
    show('locDrawer')
  })
  document.getElementById('searchTrigger').addEventListener('click', () => { location.hash = '#/buscar' })
  document.getElementById('notifBtn').addEventListener('click', () => { location.hash = '#/notificacoes' })
  document.getElementById('overlay').addEventListener('click', closeAllDrawers)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllDrawers() })
  window.addEventListener('fc:notifs', updateNotifBadge)
  store.onChange(() => updateNotifBadge())

  // Fallback global: o checkout continua navegável mesmo se o carrinho tiver
  // sido redesenhado durante o toque ou se a rota atual já for /checkout.
  document.addEventListener('click', event => {
    const checkout = event.target.closest('[data-checkout]')
    if (!checkout) return
    event.preventDefault()
    closeAllDrawers()
    const destination = `#/checkout?origem=carrinho&at=${Date.now()}`
    if (location.hash === destination) navigate()
    else location.hash = destination
  }, true)
}

function wireGlobalHelp() {
  const root=document.querySelector('.app-global-help'),button=root?.querySelector('.fcv2-help-button'),panel=root?.querySelector('.fcv2-help-panel'),close=root?.querySelector('.fcv2-help-close')
  if(!root||!button||!panel||!close)return
  const setOpen=open=>{panel.hidden=!open;button.setAttribute('aria-expanded',String(open));root.classList.toggle('open',open);if(open)close.focus()}
  button.addEventListener('click',()=>setOpen(panel.hidden))
  close.addEventListener('click',()=>{setOpen(false);button.focus()})
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){setOpen(false);button.focus()}})
  window.addEventListener('hashchange',()=>setOpen(false))
}

function wireVisualFeedback() {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return
  const interactive = '.rcard,.pcard,.mitem,.profile-option,.plist-item,.order-card,.notif-item,.support-ticket,.mission-card,.partner-metric,.partner-product,.partner-feature-card'
  document.addEventListener('pointermove', event => {
    const card = event.target.closest(interactive)
    if (!card) return
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    card.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }, { passive:true })
}

function wireAuthEvents() {
  window.addEventListener('fc:auth', (e) => {
    authUser = e.detail
    handlingUnauthorized = false
    setAuthUser(e.detail)
    bootPromise = null
  })

  window.addEventListener('fc:unauthorized', () => {
    if (handlingUnauthorized) return
    handlingUnauthorized = true
    authUser = null
    bootPromise = null
    if (!isAuthPath(location.hash.replace(/^#/, '') || '/')) {
      toast('Sessão expirada. Entre novamente.', 'info', '🔒')
      location.hash = '#/login'
    }
  })

  window.addEventListener('fc:logout', () => {
    authUser = null
    bootPromise = null
    handlingUnauthorized = false
    location.hash = '#/login'
  })
}

function show(id) {
  document.getElementById(id).classList.add('open')
  document.getElementById(id).setAttribute('aria-hidden', 'false')
  document.getElementById('overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}

wireTheme()
wireHeader()
wireGlobalHelp()
wireVisualFeedback()
wireAuthEvents()
window.addEventListener('hashchange', navigate)
navigate()

// Nunca mantém a aplicação em branco caso uma extensão, cache antigo ou falha
// de rede interrompa o primeiro carregamento.
setTimeout(() => {
  const view = document.getElementById('view')
  if (!view || !view.querySelector('.route-loading')) return
  view.innerHTML = `<div class="page route-error"><span>↻</span><h1>Vamos carregar novamente</h1><p>A página inicial não terminou de abrir.</p><div><button class="btn btn-primary" onclick="location.hash='#/inicio';location.reload()">Abrir página inicial</button><a class="btn btn-ghost" href="#/login">Entrar novamente</a></div></div>`
}, 6000)
