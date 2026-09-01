import { api } from '../core/api.js'
import { esc, toast } from '../core/ui.js'

/* ============================================================
   FOOD COURT — PORTA DE ENTRADA DO CLIENTE
   Layout de referência: foto gastronômica escurecida à esquerda,
   formulário limpo à direita. preto + laranja neon.
   login | cadastro | esqueci a senha | redefinir senha
   ============================================================ */

let mode = 'login'
let redirectAfter = '/inicio'
let turnstileConfig = { enabled: false, siteKey: '' }
let turnstileToken = ''
let turnstileWidgetId = null
let turnstileScriptPromise = null

export async function render(view, boot, params, query) {
  mode = params.mode || 'login'
  redirectAfter = query.get('redirect') || '/inicio'
  turnstileConfig = mode === 'login'
    ? await api.turnstileConfig().catch(() => ({ enabled: false, siteKey: '' }))
    : { enabled: false, siteKey: '' }
  draw(view, query)
}

function draw(view, query = new URLSearchParams()) {
  turnstileToken = ''
  turnstileWidgetId = null
  view.innerHTML = layout(mode, query)
  bind(view, query)
  if (mode === 'login' && turnstileConfig.enabled) renderTurnstile(view)
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (turnstileScriptPromise) return turnstileScriptPromise
  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => reject(new Error('Não foi possível carregar a verificação de segurança.'))
    document.head.appendChild(script)
  })
  return turnstileScriptPromise
}

async function renderTurnstile(view) {
  const container = view.querySelector('#turnstileWidget')
  if (!container) return
  try {
    const widget = await loadTurnstileScript()
    if (!container.isConnected || !widget) return
    turnstileWidgetId = widget.render(container, {
      sitekey: turnstileConfig.siteKey,
      action: 'login',
      theme: 'light',
      callback: (token) => { turnstileToken = token; setFormError(view, '') },
      'expired-callback': () => { turnstileToken = '' },
      'error-callback': () => { turnstileToken = ''; setFormError(view, 'Não foi possível concluir a verificação de segurança.') }
    })
  } catch (error) {
    setFormError(view, error.message)
  }
}

/* ============ LAYOUT ============ */

function layout(m, query) {
  if (m === 'register') return registerLayout()
  const isReset = m === 'reset'
  return `
  <div class="auth-page ${isReset ? 'no-visual' : ''}">
    <aside class="auth-visual" aria-hidden="true">
      <div class="auth-visual-inner">
        <div class="logo auth-logo">
          <img class="brand-logo-image" src="/assets/images/foodcourt-logo.png" alt="Food Court">
        </div>
        <div class="auth-hero">
          <h2 class="auth-headline">Seu próximo<br><em>pedido</em> está a<br>poucos cliques.</h2>
          <p class="auth-tagline">Mais rápido, mais fácil, mais você.</p>
        </div>
        <ul class="auth-benefits">
          <li><span class="ic">${ICONS.bolt}</span><span>Entrega<small>rápida</small></span></li>
          <li><span class="ic">${ICONS.tag}</span><span>Ofertas<small>exclusivas</small></span></li>
          <li><span class="ic">${ICONS.shield}</span><span>Pagamento<small>seguro</small></span></li>
        </ul>
      </div>
    </aside>
    <main class="auth-panel">
      <div class="auth-panel-inner">
        <div class="mobile-brand logo">
          <img class="brand-logo-image" src="/assets/images/foodcourt-logo.png" alt="Food Court">
        </div>
        ${m === 'login' ? loginForm() : ''}
        ${m === 'register' ? registerForm() : ''}
        ${m === 'forgot' ? forgotForm() : ''}
        ${m === 'reset' ? resetForm(query) : ''}
        ${m === 'forgot-success' ? forgotSuccess() : ''}
        ${m === 'reset-success' ? resetSuccess() : ''}
      </div>
    </main>
  </div>`
}

function registerLayout() {
  return `
  <div class="signup-page">
    <header class="signup-nav">
      <a class="signup-logo" href="#/" aria-label="Food Court - início"><img class="brand-logo-image" src="/assets/images/foodcourt-logo.png" alt="Food Court"></a>
      <nav aria-label="Navegação principal">
        <a href="#/">Início</a><a href="#/">Como funciona</a><a href="#/">Vantagens</a><a href="#/">Para estabelecimentos</a><a href="#/">Contato</a>
      </nav>
      <a class="signup-nav-cta" href="#/cadastro">Criar conta</a>
    </header>
    <main class="signup-content">
      <section class="signup-copy">
        <span class="signup-pill">● Sua próxima refeição está aqui!</span>
        <h1>Seu pedido<br>favorito,<br><em>do seu jeito.</em></h1>
        <p>É rápido, fácil e grátis.<br>Em poucos passos você já pode<br>pedir suas comidas favoritas.</p>
        <div class="signup-benefits">
          <article>${ICONS.bag}<b>Conta gratuita</b><span>Sem mensalidades</span></article>
          <article>${ICONS.shield}<b>Pedidos rápidos</b><span>Onde você estiver</span></article>
          <article>${ICONS.tag}<b>Ofertas exclusivas</b><span>Todos os dias</span></article>
        </div>
        <small>Já tem uma conta? <a href="#/login">Entrar</a></small>
      </section>
      <section class="signup-card">${registerForm()}</section>
    </main>
  </div>`
}

/* ============ FORMS ============ */

function loginForm() {
  return `
  <div class="auth-body">
    <div class="auth-lang" aria-label="Idioma">
      <button type="button" class="auth-lang-btn" id="langBtn">
        <span class="auth-lang-icon">${ICONS.globe}</span>
        <span>Português</span>
        <span class="auth-lang-chev">${ICONS.chevronDown}</span>
      </button>
    </div>
    <h1>Bem-<em>vindo</em> de volta!</h1>
    <p class="auth-sub">Faça login para continuar</p>
    <form id="authForm" novalidate>
      ${field({ id: 'email', label: 'E-mail', type: 'email', placeholder: 'Digite seu e-mail', icon: 'mail', autocomplete: 'email' })}
      ${field({ id: 'password', label: 'Senha', type: 'password', placeholder: 'Digite sua senha', icon: 'lock', autocomplete: 'current-password', eye: true })}
      <div class="auth-row">
        <label class="auth-check"><input type="checkbox" id="remember" checked> Manter conectado</label>
        <a href="#/esqueci-senha" class="auth-link">Esqueceu sua senha?</a>
      </div>
      ${turnstileConfig.enabled ? '<div class="auth-turnstile" id="turnstileWidget" aria-label="Verificação de segurança"></div>' : ''}
      ${formError()}
      <button type="submit" class="btn btn-primary btn-lg btn-block auth-submit" data-loading="Entrando...">
        <span>Entrar</span>
        <span class="btn-arrow">${ICONS.arrowRight}</span>
      </button>
      <div class="auth-divider"><span>ou</span></div>
      <button type="button" class="btn btn-ghost btn-lg btn-block auth-alt-btn signup-social" data-social="google">${ICONS.google}<span>Continuar com Google</span></button>
      <a href="#/cadastro" class="btn btn-ghost btn-lg btn-block auth-alt-btn">
        <span class="btn-icon">${ICONS.user}</span>
        <span>Cadastrar-se <em>grátis</em></span>
        <span class="btn-arrow">${ICONS.arrowRight}</span>
      </a>
    </form>
    ${termsFooter()}
  </div>`
}

function registerForm() {
  return `
  <div class="auth-body">
    <h1>Crie sua <em>conta</em></h1>
    <p class="auth-sub">Preencha seus dados para começar.</p>
    <form id="authForm" novalidate>
      ${field({ id: 'fullName', label: 'Nome completo', type: 'text', placeholder: 'Digite seu nome completo', icon: 'user', autocomplete: 'name' })}
      ${field({ id: 'email', label: 'E-mail', type: 'email', placeholder: 'Digite seu e-mail', icon: 'mail', autocomplete: 'email' })}
      ${field({ id: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00', icon: 'card', autocomplete: 'off', mask: 'cpf' })}
      ${field({ id: 'phone', label: 'Número de telefone', type: 'tel', placeholder: '(00) 00000-0000', icon: 'phone', autocomplete: 'tel-national', mask: 'phone' })}
      ${field({ id: 'password', label: 'Senha', type: 'password', placeholder: 'Crie uma senha', icon: 'lock', autocomplete: 'new-password', eye: true, strength: true })}
      ${field({ id: 'confirmPassword', label: 'Confirmar senha', type: 'password', placeholder: 'Digite sua senha novamente', icon: 'lock', autocomplete: 'new-password', eye: true })}
      ${formError()}
      <button type="submit" class="btn btn-primary btn-lg btn-block auth-submit" data-loading="Criando conta...">Criar conta grátis</button>
      <div class="auth-divider"><span>ou</span></div>
      <button type="button" class="btn btn-ghost btn-lg btn-block auth-alt-btn signup-social" data-social="google">${ICONS.google}<span>Continuar com Google</span></button>
      <p class="signup-login">Já tem uma conta? <a href="#/login">Entrar</a></p>
    </form>
  </div>`
}

function forgotForm() {
  return `
  <div class="auth-body">
    <h1>Esqueceu sua <em>senha</em>?</h1>
    <p class="auth-sub">Digite seu e-mail e enviaremos as instruções para redefinir sua senha.</p>
    <form id="authForm" novalidate>
      ${field({ id: 'email', label: 'Seu e-mail', type: 'email', placeholder: 'Seu e-mail', icon: 'mail', autocomplete: 'email' })}
      ${formError()}
      <button type="submit" class="btn btn-primary btn-lg btn-block auth-submit" data-loading="Enviando...">Enviar instruções →</button>
      <div class="auth-divider"><span>ou</span></div>
      <a href="#/login" class="btn btn-ghost btn-lg btn-block auth-alt-btn">← Voltar ao <em>login</em></a>
    </form>
  </div>`
}

function resetForm(query) {
  const hasToken = !!query.get('token')
  return `
  <div class="auth-body">
    <h1>Redefinir <em>senha</em></h1>
    <p class="auth-sub">Crie uma nova senha para acessar sua conta.</p>
    ${hasToken ? `
    <form id="authForm" novalidate>
      ${field({ id: 'password', label: 'Nova senha', type: 'password', placeholder: 'Crie uma senha', icon: 'lock', autocomplete: 'new-password', eye: true, strength: true })}
      ${field({ id: 'confirmPassword', label: 'Confirmar nova senha', type: 'password', placeholder: 'Digite sua senha novamente', icon: 'lock', autocomplete: 'new-password', eye: true })}
      <ul class="auth-rules" id="pwRules">
        <li data-rule="len">Mínimo de 8 caracteres</li>
        <li data-rule="letter">Pelo menos uma letra</li>
        <li data-rule="num">Pelo menos um número</li>
      </ul>
      ${formError()}
      <button type="submit" class="btn btn-primary btn-lg btn-block auth-submit" data-loading="Redefinindo...">Redefinir senha →</button>
    </form>` : `
    <div class="state-box" style="padding:24px 12px">
      <div class="state-emoji">🔗</div>
      <h3>Link inválido</h3>
      <p>Este link de redefinição está incompleto ou expirou.</p>
      <a class="btn btn-primary" href="#/esqueci-senha">Solicitar novo link</a>
    </div>`}
  </div>`
}

function forgotSuccess() {
  return `
  <div class="auth-body auth-success">
    <div class="auth-success-emoji">📬</div>
    <h1>Confira seu <em>e-mail</em></h1>
    <p class="auth-sub">Se existir uma conta associada a este e-mail, enviaremos as instruções para redefinir sua senha.</p>
    <div id="devLink" class="auth-devlink" hidden></div>
    <a class="btn btn-primary btn-lg btn-block auth-submit" href="#/login">Voltar ao login</a>
  </div>`
}

function resetSuccess() {
  return `
  <div class="auth-body auth-success">
    <div class="auth-success-emoji">🔓</div>
    <h1>Senha <em>redefinida</em> com sucesso.</h1>
    <p class="auth-sub">Use sua nova senha para entrar.</p>
    <a class="btn btn-primary btn-lg btn-block auth-submit" href="#/login">Entrar no Food Court →</a>
  </div>`
}

/* ============ COMPONENTES ============ */

const ICONS = {
  brand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 17h16M6 14a6 6 0 0 1 12 0H6Zm6-6V5M10 5h4M13 3c2-2 4-1 5-3-3 0-5 1-5 3Z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 6 10-6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M6 16c.4-1.4 1-2 2-2s1.6.6 2 2M14 10h4M14 14h4"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>`,
  google: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.7h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.2Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z"/><path fill="#ea4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.8-2.8A9.5 9.5 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.7 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.5-3-1.5-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1 8.6.7 1 1.6 2.1 2.7 2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1 2.7-2 1-1.2 1.3-2.4 1.3-2.5-.1 0-2.8-1.1-2.8-3.7ZM14.6 6.6c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.7 1.3-.6.7-1.1 1.7-1 2.7 1 .1 2.1-.5 2.8-1.2Z"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9 9 10-10-9-9z"/><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
}

function field({ id, label, type, placeholder, icon, autocomplete, eye, strength, mask }) {
  return `
  <div class="field" id="field-${id}">
    <label for="f-${id}">${label}</label>
    <div class="input-wrap">
      <span class="iw-icon" aria-hidden="true">${ICONS[icon] || ''}</span>
      <input id="f-${id}" name="${id}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" ${mask ? `inputmode="${mask === 'phone' ? 'tel' : 'text'}" data-mask="${mask}"` : ''}>
      ${eye ? `<button type="button" class="iw-eye" data-eye="f-${id}" aria-label="Mostrar ou ocultar senha">👁</button>` : ''}
    </div>
    ${strength ? `
    <div class="strength" id="strength-${id}" hidden>
      <div class="s-bars"><i></i><i></i><i></i></div>
      <span class="s-label"></span>
    </div>` : ''}
    <p class="field-error" id="err-${id}" role="alert" hidden></p>
  </div>`
}

function formError() {
  return `<div class="form-error" id="formError" role="alert" hidden></div>`
}

function termsFooter() {
  return `
  <p class="auth-terms">
    <span class="auth-terms-icon">${ICONS.shield}</span>
    <span>Ao continuar, você concorda com nossos
      <a href="#/login" onclick="return false" tabindex="-1">Termos de Uso</a> e
      <a href="#/login" onclick="return false" tabindex="-1">Política de Privacidade</a>.
    </span>
  </p>`
}

/* ============ VALIDAÇÃO CLIENTE ============ */

const V = {
  email: (v) => !v ? 'Informe seu e-mail.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Digite um e-mail válido.' : '',
  required: (v, label) => !v ? `Informe ${label}.` : '',
  name: (v) => {
    const words = (v || '').trim().split(/\s+/).filter(Boolean)
    if (!v?.trim()) return 'Informe seu nome completo.'
    if (words.length < 2) return 'Informe seu nome e sobrenome.'
    if (words.some(w => w.length < 2)) return 'Cada parte do nome precisa ter pelo menos 2 letras.'
    return ''
  },
  phone: (v) => {
    const d = (v || '').replace(/\D/g, '')
    if (!d) return 'Informe seu telefone.'
    if (d.length !== 10 && d.length !== 11) return 'Digite um telefone válido com DDD.'
    return ''
  },
  password: (v) => {
    if (!v) return 'Informe sua senha.'
    if (v.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
    if (!/[a-zA-Z]/.test(v)) return 'A senha precisa ter pelo menos uma letra.'
    if (!/\d/.test(v)) return 'A senha precisa ter pelo menos um número.'
    return ''
  }
}

function setFieldError(view, id, msg) {
  const field = view.querySelector(`#field-${id}`)
  const err = view.querySelector(`#err-${id}`)
  if (!field) return true
  if (msg) {
    field.classList.add('invalid')
    if (err) { err.textContent = msg; err.hidden = false }
  } else {
    field.classList.remove('invalid')
    if (err) { err.hidden = true }
  }
  return !msg
}

function setFormError(view, msg) {
  const box = view.querySelector('#formError')
  if (!box) return
  if (msg) { box.textContent = msg; box.hidden = false; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake') }
  else box.hidden = true
}

function pwStrength(v) {
  let score = 0
  if (v.length >= 8) score++
  if (v.length >= 12) score++
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++
  if (/\d/.test(v)) score++
  if (/[^a-zA-Z0-9]/.test(v)) score++
  if (!v) return { score: 0, label: '' }
  if (score <= 2) return { score: 1, label: 'Senha fraca' }
  if (score <= 3) return { score: 2, label: 'Senha média' }
  return { score: 3, label: 'Senha forte' }
}

function updateStrength(view, id) {
  const input = view.querySelector(`#f-${id}`)
  const box = view.querySelector(`#strength-${id}`)
  if (!input || !box) return
  const { score, label } = pwStrength(input.value)
  box.hidden = !input.value
  box.dataset.level = String(score)
  box.querySelector('.s-label').textContent = label
  const rules = view.querySelector('#pwRules')
  if (rules) {
    rules.querySelector('[data-rule="len"]').classList.toggle('ok', input.value.length >= 8)
    rules.querySelector('[data-rule="letter"]').classList.toggle('ok', /[a-zA-Z]/.test(input.value))
    rules.querySelector('[data-rule="num"]').classList.toggle('ok', /\d/.test(input.value))
  }
}

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCpf(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/* ============ SUBMISSÃO ============ */

function loadingBtn(view, on) {
  const btn = view.querySelector('.auth-submit')
  if (!btn) return
  const labelSpan = btn.querySelector('span:first-of-type') || btn
  const arrow = btn.querySelector('.btn-arrow')
  if (on) {
    if (!btn.dataset.label) btn.dataset.label = labelSpan.textContent
    labelSpan.textContent = btn.dataset.loading || 'Aguarde...'
    if (arrow) arrow.style.display = 'none'
    btn.classList.add('loading')
    btn.disabled = true
  } else {
    if (btn.dataset.label) labelSpan.textContent = btn.dataset.label
    if (arrow) arrow.style.display = ''
    btn.classList.remove('loading')
    btn.disabled = false
  }
}

function completeAuth(user) {
  window.dispatchEvent(new CustomEvent('fc:auth', { detail: user }))
}

function goAfterLogin(user) {
  const roleTarget = user?.role === 'merchant' ? '/parceiro' : user?.role === 'admin' ? '/admin' : '/inicio'
  const target = redirectAfter && redirectAfter !== '/' ? redirectAfter : roleTarget
  location.hash = '#' + target
}

/* ============ BIND ============ */

function bind(view, query) {
  const langBtn = view.querySelector('#langBtn')
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      toast('Português (Brasil) selecionado.', 'info', '🌐')
    })
  }

  view.querySelectorAll('[data-eye]').forEach(btn => btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.eye)
    const show = input.type === 'password'
    input.type = show ? 'text' : 'password'
    btn.textContent = show ? '🙈' : '👁'
    input.focus()
  }))

  view.querySelectorAll('[data-mask="phone"]').forEach(input => input.addEventListener('input', () => {
    const pos = input.value.length
    input.value = maskPhone(input.value)
    if (pos <= input.value.length) input.setSelectionRange(input.value.length, input.value.length)
  }))

  view.querySelectorAll('[data-mask="cpf"]').forEach(input => input.addEventListener('input', () => {
    input.value = maskCpf(input.value)
  }))

  view.querySelectorAll('[data-social]').forEach(button => button.addEventListener('click', () => {
    const redirect = encodeURIComponent(redirectAfter || '/inicio')
    window.location.assign(`/api/auth/oauth/${button.dataset.social}?redirect=${redirect}`)
  }))

  const oauthError = query.get('oauth_error')
  if (oauthError) setFormError(view, oauthError)

  view.querySelectorAll('input[id^="f-password"]').forEach(input => input.addEventListener('input', () => {
    updateStrength(view, input.id.replace('f-', ''))
  }))

  const goApp = view.querySelector('#goApp')
  if (goApp) goApp.addEventListener('click', goAfterLogin)

  const form = view.querySelector('#authForm')
  if (!form) return
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    setFormError(view, '')
    if (loadingBtn) loadingBtn(view, true)
    try {
      if (mode === 'login') await submitLogin(view)
      else if (mode === 'register') await submitRegister(view)
      else if (mode === 'forgot') await submitForgot(view)
      else if (mode === 'reset') await submitReset(view, query)
    } finally {
      loadingBtn(view, false)
    }
  })
}

async function submitLogin(view) {
  const email = document.getElementById('f-email').value.trim()
  const password = document.getElementById('f-password').value
  const okEmail = setFieldError(view, 'email', V.email(email))
  const okPw = setFieldError(view, 'password', V.required(password, 'sua senha'))
  if (!okEmail || !okPw) return
  if (turnstileConfig.enabled && !turnstileToken) {
    setFormError(view, 'Confirme que você não é um robô para continuar.')
    return
  }

  try {
    const res = await api.login({ email, password, turnstileToken })
    completeAuth(res.user)
    goAfterLogin(res.user)
  } catch (e) {
    setFormError(view, e.message)
    if (turnstileConfig.enabled && window.turnstile && turnstileWidgetId !== null) {
      turnstileToken = ''
      window.turnstile.reset(turnstileWidgetId)
    }
  }
}

async function submitRegister(view) {
  const fullName = document.getElementById('f-fullName').value
  const email = document.getElementById('f-email').value.trim()
  const cpf = document.getElementById('f-cpf').value.replace(/\D/g, '')
  const phone = document.getElementById('f-phone').value
  const password = document.getElementById('f-password').value
  const confirmPassword = document.getElementById('f-confirmPassword').value

  let ok = true
  ok = setFieldError(view, 'fullName', V.name(fullName)) && ok
  ok = setFieldError(view, 'email', V.email(email)) && ok
  ok = setFieldError(view, 'cpf', cpf.length === 11 ? '' : 'Digite um CPF válido.') && ok
  ok = setFieldError(view, 'phone', V.phone(phone)) && ok
  ok = setFieldError(view, 'password', V.password(password)) && ok
  ok = setFieldError(view, 'confirmPassword', password !== confirmPassword ? 'As senhas não coincidem.' : '') && ok
  if (!ok) return

  try {
    const res = await api.register({ fullName, email, phone, password, confirmPassword })
    completeAuth(res.user)
    location.hash = '#/inicio'
  } catch (e) {
    if (e.fields) {
      const map = { fullName: 'fullName', email: 'email', phone: 'phone', password: 'password', confirmPassword: 'confirmPassword' }
      Object.entries(e.fields).forEach(([k, msg]) => setFieldError(view, map[k] || k, msg))
    }
    setFormError(view, e.message)
    if (e.code === 'EMAIL_EXISTS') {
      const box = view.querySelector('#formError')
      if (box) box.innerHTML = `${esc(e.message)} <a href="#/login" class="auth-link">Entrar na minha conta</a> · <a href="#/esqueci-senha" class="auth-link">Esqueci minha senha</a>`
    }
  }
}

async function submitForgot(view) {
  const email = document.getElementById('f-email').value.trim()
  if (!setFieldError(view, 'email', V.email(email))) return

  try {
    const res = await api.forgotPassword(email)
    mode = 'forgot-success'
    draw(view)
    if (res.devResetLink) {
      const box = document.getElementById('devLink')
      if (box) {
        box.hidden = false
        box.innerHTML = `🧪 <b>Ambiente de teste</b> (SMTP não configurado): <a href="${res.devResetLink}" class="auth-link">abrir link de redefinição</a>`
      }
    }
  } catch (e) {
    setFormError(view, e.message)
  }
}

async function submitReset(view, query) {
  const token = query.get('token')
  const password = document.getElementById('f-password').value
  const confirmPassword = document.getElementById('f-confirmPassword').value

  let ok = true
  ok = setFieldError(view, 'password', V.password(password)) && ok
  ok = setFieldError(view, 'confirmPassword', password !== confirmPassword ? 'As senhas não coincidem.' : '') && ok
  if (!ok) return

  try {
    await api.resetPassword({ token, password, confirmPassword })
    mode = 'reset-success'
    draw(view)
  } catch (e) {
    if (e.code === 'INVALID_TOKEN') {
      mode = 'reset'
      draw(view, new URLSearchParams())
      setFormError(view, e.message)
    } else {
      setFormError(view, e.message)
    }
  }
}
