import { api } from '../api.js'
import { esc, toast } from '../ui.js'

/* ============================================================
   FOOD COURT — PORTA DE ENTRADA DO CLIENTE
   Layout de referência: foto gastronômica escurecida à esquerda,
   formulário limpo à direita. preto + laranja neon.
   login | cadastro | esqueci a senha | redefinir senha
   ============================================================ */

let mode = 'login'
let redirectAfter = '/'
let registerSuccessUser = null

export async function render(view, boot, params, query) {
  mode = params.mode || 'login'
  redirectAfter = query.get('redirect') || '/'
  registerSuccessUser = null
  draw(view, query)
}

function draw(view, query = new URLSearchParams()) {
  view.innerHTML = layout(mode, query)
  bind(view, query)
}

/* ============ LAYOUT ============ */

function layout(m, query) {
  const isReset = m === 'reset'
  return `
  <div class="auth-page ${isReset ? 'no-visual' : ''}">
    <aside class="auth-visual" aria-hidden="true">
      <div class="auth-visual-inner">
        <div class="logo auth-logo">
          <span class="logo-mark">🍔</span>
          <span>FOOD<b>COURT</b></span>
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
          <span class="logo-mark">🍔</span>
          <span>FOOD<b>COURT</b></span>
        </div>
        ${m === 'login' ? loginForm() : ''}
        ${m === 'register' ? registerForm() : ''}
        ${m === 'forgot' ? forgotForm() : ''}
        ${m === 'reset' ? resetForm(query) : ''}
        ${m === 'register-success' ? registerSuccess() : ''}
        ${m === 'forgot-success' ? forgotSuccess() : ''}
        ${m === 'reset-success' ? resetSuccess() : ''}
      </div>
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
      ${formError()}
      <button type="submit" class="btn btn-primary btn-lg btn-block auth-submit" data-loading="Entrando...">
        <span>Entrar</span>
        <span class="btn-arrow">${ICONS.arrowRight}</span>
      </button>
      <div class="auth-divider"><span>ou</span></div>
      <a href="#/cadastro" class="btn btn-ghost btn-lg btn-block auth-alt-btn">
        <span class="btn-icon">${ICONS.user}</span>
        <span>Cadastrar-se <em>grátis</em></span>
        <span class="btn-arrow">${ICONS.arrowRight}</span>
      </a>
    </form>
    <button class="auth-demo" id="demoFill" type="button">🧪 Usar conta demo (joao@foodcourt.com)</button>
    ${termsFooter()}
  </div>`
}

function registerForm() {
  return `
  <div class="auth-body">
    <h1>Crie sua <em>conta</em></h1>
    <p class="auth-sub">Cadastre-se grátis e aproveite o Food Court</p>
    <form id="authForm" novalidate>
      ${field({ id: 'fullName', label: 'Nome completo', type: 'text', placeholder: 'Digite seu nome completo', icon: 'user', autocomplete: 'name' })}
      ${field({ id: 'email', label: 'E-mail', type: 'email', placeholder: 'Digite seu e-mail', icon: 'mail', autocomplete: 'email' })}
      ${field({ id: 'phone', label: 'Número de telefone', type: 'tel', placeholder: '(00) 00000-0000', icon: 'phone', autocomplete: 'tel-national', mask: 'phone' })}
      ${field({ id: 'password', label: 'Senha', type: 'password', placeholder: 'Crie uma senha', icon: 'lock', autocomplete: 'new-password', eye: true, strength: true })}
      ${field({ id: 'confirmPassword', label: 'Confirmar senha', type: 'password', placeholder: 'Digite sua senha novamente', icon: 'lock', autocomplete: 'new-password', eye: true })}
      ${formError()}
      <button type="submit" class="btn btn-primary btn-lg btn-block auth-submit" data-loading="Criando conta...">Criar conta →</button>
      <div class="auth-divider"><span>ou</span></div>
      <a href="#/login" class="btn btn-ghost btn-lg btn-block auth-alt-btn">Já tenho conta · <em>Entrar</em> →</a>
    </form>
    ${termsFooter()}
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

function registerSuccess() {
  return `
  <div class="auth-body auth-success">
    <div class="auth-success-emoji">🎉</div>
    <h1>Conta criada com <em>sucesso</em>!</h1>
    <p class="auth-sub">Bem-vindo ao Food Court, ${esc(registerSuccessUser || '')}.</p>
    <button class="btn btn-primary btn-lg btn-block auth-submit" id="goApp">Ir para o Food Court →</button>
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
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 6 10-6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>`,
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

function goAfterLogin() {
  const target = redirectAfter && redirectAfter !== '/' ? redirectAfter : '/'
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

  view.querySelectorAll('input[id^="f-password"]').forEach(input => input.addEventListener('input', () => {
    updateStrength(view, input.id.replace('f-', ''))
  }))

  const demoFill = view.querySelector('#demoFill')
  if (demoFill) demoFill.addEventListener('click', () => {
    document.getElementById('f-email').value = 'joao@foodcourt.com'
    document.getElementById('f-password').value = 'foodcourt123'
    setFormError(view, '')
    view.querySelector('#f-email').focus()
  })

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

  try {
    const res = await api.login({ email, password })
    completeAuth(res.user)
    goAfterLogin()
  } catch (e) {
    setFormError(view, e.message)
  }
}

async function submitRegister(view) {
  const fullName = document.getElementById('f-fullName').value
  const email = document.getElementById('f-email').value.trim()
  const phone = document.getElementById('f-phone').value
  const password = document.getElementById('f-password').value
  const confirmPassword = document.getElementById('f-confirmPassword').value

  let ok = true
  ok = setFieldError(view, 'fullName', V.name(fullName)) && ok
  ok = setFieldError(view, 'email', V.email(email)) && ok
  ok = setFieldError(view, 'phone', V.phone(phone)) && ok
  ok = setFieldError(view, 'password', V.password(password)) && ok
  ok = setFieldError(view, 'confirmPassword', password !== confirmPassword ? 'As senhas não coincidem.' : '') && ok
  if (!ok) return

  try {
    const res = await api.register({ fullName, email, phone, password, confirmPassword })
    completeAuth(res.user)
    registerSuccessUser = res.user.name
    mode = 'register-success'
    draw(view)
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
