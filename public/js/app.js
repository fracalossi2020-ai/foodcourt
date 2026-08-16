import { api } from './core/api.js'
import { store, hydrateBootstrap, setAuthUser } from './core/store.js'
import { el, esc, toast } from './core/ui.js'
import { openCart, closeAllDrawers, hide, renderCartUI } from './core/cart.js'

window.FC = { store }

const routes = [
  { pattern: /^\/$/, page: 'landing', public: true, landing: true },
  { pattern: /^\/login$/, page: 'auth', public: true, mode: 'login' },
  { pattern: /^\/cadastro$/, page: 'auth', public: true, mode: 'register' },
  { pattern: /^\/esqueci-senha$/, page: 'auth', public: true, mode: 'forgot' },
  { pattern: /^\/redefinir-senha$/, page: 'auth', public: true, mode: 'reset' },
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
]

let currentPage = null
let authUser = null

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

async function navigate() {
  if (navigating) return
  navigating = true
  try {
    const view = document.getElementById('view')
    const raw = location.hash.replace(/^#/, '') || '/'
    const [path, qs] = raw.split('?')
    const query = new URLSearchParams(qs || '')

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
      if (route.mode !== 'reset' && await ensureAuth()) {
        location.hash = '#/inicio'
        return
      }
    } else {
      document.body.classList.remove('auth-mode')
      document.body.classList.remove('landing-mode')
      document.body.classList.add('app-mode')
      const target = path + (qs ? `?${qs}` : '')
      if (!(await ensureAuth())) {
        location.hash = `#/login?redirect=${encodeURIComponent(target)}`
        return
      }
    }

    const mod = await import(`./pages/${route.page}.js`)
    currentPage = mod
    window.scrollTo(0, 0)

    if (route.public) {
      await mod.render(view, null, { mode: route.mode }, query)
    } else {
      const boot = await getBoot()
      await mod.render(view, boot, params ? { id: params[1] } : {}, query)
    }
    updateNav(path)
  } finally {
    navigating = false
  }
}

let bootPromise = null
function getBoot() {
  if (!bootPromise) {
    bootPromise = api.bootstrap().then(b => { hydrateBootstrap(b); syncHeader(); return b })
  }
  return bootPromise
}

function updateNav(path) {
  document.querySelectorAll('.bottomnav a').forEach(a => {
    const target = a.dataset.nav
    a.classList.toggle('active', target === '/inicio' ? path === '/inicio' : path.startsWith(target))
  })
  const logo = document.querySelector('.header .logo')
  if (logo) logo.href = document.body.classList.contains('app-mode') ? '#/inicio' : '#/'
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
  drawer.innerHTML = `
    <div class="drawer-head">
      <h3>Endereço de entrega</h3>
      <button class="icon-btn" data-close aria-label="Fechar">✕</button>
    </div>
    <div class="drawer-body">
      ${store.addresses.map(a => `
        <button class="select-card ${a.id === store.address.id ? 'selected' : ''}" data-addr="${a.id}">
          <span class="sc-emoji">${a.emoji}</span>
          <span class="sc-main">
            <span class="sc-title">${esc(a.label)}</span>
            <span class="sc-sub">${esc(a.street)} • ${esc(a.city)}</span>
          </span>
          <span class="radio-big"></span>
        </button>`).join('')}
      <button class="select-card" style="border-style:dashed" data-newaddr>
        <span class="sc-emoji">➕</span>
        <span class="sc-main"><span class="sc-title">Adicionar endereço</span><span class="sc-sub">Buscar por CEP ou rua</span></span>
      </button>
      <div class="card" style="padding:16px;margin-top:10px">
        <b class="text-sm">📍 Descoberta por localização</b>
        <p class="muted text-sm" style="margin-top:4px">Em breve o Food Court sugere ofertas automaticamente conforme você se move pela cidade.</p>
      </div>
    </div>`
  drawer.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => hide('locDrawer')))
  drawer.querySelectorAll('[data-addr]').forEach(b => b.addEventListener('click', () => {
    store.setAddress(b.dataset.addr)
    syncHeader()
    hide('locDrawer')
    toast(`Entrega alterada para ${store.address.label}`, 'success', '📍')
  }))
  drawer.querySelector('[data-newaddr]')?.addEventListener('click', () => toast('Cadastro de endereço disponível em breve', 'info', '🚧'))
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
  document.getElementById('cartBtn').addEventListener('click', openCart)
  document.getElementById('locBtn').addEventListener('click', () => { renderLocDrawer(); show('locDrawer') })
  document.getElementById('searchTrigger').addEventListener('click', () => { location.hash = '#/buscar' })
  document.getElementById('notifBtn').addEventListener('click', () => { location.hash = '#/notificacoes' })
  document.getElementById('overlay').addEventListener('click', closeAllDrawers)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllDrawers() })
  window.addEventListener('fc:notifs', updateNotifBadge)
  store.onChange(() => updateNotifBadge())
}

function wireAuthEvents() {
  window.addEventListener('fc:auth', (e) => {
    authUser = e.detail
    setAuthUser(e.detail)
    bootPromise = null
  })

  window.addEventListener('fc:unauthorized', () => {
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
wireAuthEvents()
window.addEventListener('hashchange', navigate)
navigate()
