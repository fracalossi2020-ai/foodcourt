require('./lib/env').loadEnv()

const http = require('http')
const fs = require('fs')
const path = require('path')
const data = require('./data/catalog')
const db = require('./lib/db')
const auth = require('./lib/auth')
const oauth = require('./lib/oauth')
const turnstile = require('./lib/turnstile')
const mailer = require('./lib/mailer')
const platform = require('./lib/platform')
const QRCode = require('qrcode')

const PORT = process.env.PORT || 3000
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'frontend')

/* ============ BANCO + CONTAS INICIAIS ============ */

db.load()
console.log(`[db] Persistência: ${db.path}${process.env.RAILWAY_VOLUME_MOUNT_PATH ? ' (Railway Volume)' : ''}`)

if (db.state.users.length === 0) {
  db.addUser({
    id: db.uid('user'),
    fullName: 'João Silva',
    email: 'joao@foodcourt.com',
    phone: '(11) 98765-4321',
    passwordHash: auth.hashPassword('foodcourt123'),
    status: 'active',
    avatarEmoji: '🧑‍💻',
    memberSince: '2024',
    points: 1250,
    level: 'Prata',
    cashback: 5, role: 'customer',
    createdAt: new Date('2024-05-10T12:00:00Z').toISOString(),
    updatedAt: new Date('2024-05-10T12:00:00Z').toISOString(),
    lastLogin: null
  })
  console.log('[db] Conta demo criada: joao@foodcourt.com / foodcourt123')
}

function ensureSystemUser(email, fullName, phone, password, role) {
  let user = db.findByEmail(email)
  if (!user) user = db.addUser({ id:db.uid('user'), fullName, email, phone, passwordHash:auth.hashPassword(password), status:'active', avatarEmoji:role==='merchant'?'👨‍🍳':'🛡️', memberSince:'2026', points:0, level:role==='merchant'?'Parceiro':'Administrador', cashback:0, role, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), lastLogin:null })
  else if (!user.role) { user.role = role; db.saveUser() }
  return user
}
const sellerAccount = ensureSystemUser('dono@foodcourt.com','Carlos Mendes','(11) 98888-1000','foodcourt123','merchant')
ensureSystemUser('admin@foodcourt.com','Admin FoodCourt','(11) 98888-2000','foodcourt123','admin')
platform.seed()
if (db.state.stores[0] && !db.state.stores[0].ownerId) { db.state.stores[0].ownerId = sellerAccount.id; db.saveNow() }

// A conta principal informada pelo proprietario assume a loja existente.
// O vendedor padrao continua vinculado como gerente da mesma operacao.
const ownerEmail = String(process.env.OWNER_EMAIL || 'fracalossi2020@gmail.com').trim().toLowerCase()
const ownerAccount = db.findByEmail(ownerEmail)
if (ownerAccount && db.state.stores[0]) {
  const store = db.state.stores[0]
  ownerAccount.role = 'merchant'
  ownerAccount.level = 'Proprietario'
  ownerAccount.status = 'active'
  ownerAccount.updatedAt = platform.now()
  store.ownerId = ownerAccount.id

  let sellerMember = db.state.storeMembers.find(member => member.storeId === store.id && member.email.toLowerCase() === sellerAccount.email.toLowerCase())
  if (!sellerMember) {
    sellerMember = { id:db.uid('member'), storeId:store.id, name:sellerAccount.fullName, email:sellerAccount.email, role:'manager', active:true }
    db.state.storeMembers.push(sellerMember)
  } else {
    Object.assign(sellerMember, { role:'manager', active:true })
  }

  let ownerSubscription = db.state.subscriptions.find(subscription => subscription.storeId === store.id)
  if (!ownerSubscription) {
    ownerSubscription = { id:db.uid('subscription'), storeId:store.id, planId:'owner_access', planName:'FoodCourt Proprietario', currency:'BRL', interval:'unlimited', createdAt:platform.now() }
    db.state.subscriptions.push(ownerSubscription)
  }
  Object.assign(ownerSubscription, { status:'ACTIVE', price:0, provider:'OWNER_ACCESS', nextBillingAt:null, complimentary:true, complimentaryReason:'Conta proprietaria', updatedAt:platform.now() })
  delete ownerSubscription.pendingCharge
  db.saveNow()
}
// A conta demo do cliente deve permanecer cliente; o parceiro demo é separado.
const joaoDemo = null
if (joaoDemo) {
  joaoDemo.role = 'merchant'
  joaoDemo.level = 'Parceiro'
  db.state.storeMembers = db.state.storeMembers.filter(member => member.email.toLowerCase() !== joaoDemo.email.toLowerCase())
  let joaoStore = db.state.stores.find(store => store.ownerId === joaoDemo.id)
  if (!joaoStore) {
    joaoStore = {id:db.uid('store'),ownerId:joaoDemo.id,name:'Meu estabelecimento',legalName:'',document:'',slug:`meu-estabelecimento-${Date.now().toString(36)}`,category:'Restaurante',description:'',status:'active',open:false,rating:0,commissionRate:12,preparationMinutes:30,minimumOrder:0,phone:joaoDemo.phone||'',email:joaoDemo.email,address:{street:'',number:'',complement:'',neighborhood:'',city:'',state:'',cep:''},deliveryModes:['delivery','pickup'],hours:{},logo:'',cover:'',categories:[],products:[],onboardingProgress:10,orderNotifications:true,createdAt:platform.now(),updatedAt:platform.now()}
    db.state.stores.push(joaoStore)
  }
  joaoStore.status = 'active'
  let joaoSubscription = db.state.subscriptions.find(subscription => subscription.storeId === joaoStore.id)
  if (!joaoSubscription) {
    joaoSubscription={id:db.uid('subscription'),storeId:joaoStore.id,planId:'owner_access',planName:'FoodCourt Proprietário',price:0,currency:'BRL',interval:'unlimited',createdAt:platform.now()}
    db.state.subscriptions.push(joaoSubscription)
  }
  Object.assign(joaoSubscription,{status:'ACTIVE',price:0,provider:'OWNER_ACCESS',nextBillingAt:null,complimentary:true,complimentaryReason:'Conta proprietária',updatedAt:platform.now()})
  delete joaoSubscription.pendingCharge
  db.saveNow()
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  })
  res.end(body)
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; media-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://viacep.com.br https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 2 * 1024 * 1024) { reject(new Error('payload-too-large')); req.destroy(); return }
      raw += c
    })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch { reject(new Error('invalid-json')) }
    })
  })
}

/* ============ COOKIES ============ */

function parseCookies(req) {
  const out = {}
  const raw = req.headers.cookie
  if (!raw) return out
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function sessionCookie(req, res, token, maxAgeSec) {
  const parts = [`fc_session=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`]
  const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')
  if (proto === 'https') parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'fc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' })
  res.end()
}

function oauthFailure(res, message) {
  redirect(res, `/#/login?oauth_error=${encodeURIComponent(message)}`)
  return { handled: true }
}

function socialUser(profile, provider) {
  let user = db.findByEmail(profile.email)
  const now = new Date().toISOString()
  if (!user) {
    const fullName = String(profile.fullName || profile.email.split('@')[0]).trim()
    user = db.addUser({
      id: db.uid('user'), fullName, email: profile.email, phone: '', passwordHash: '', status: 'active',
      avatarEmoji: '👤', memberSince: String(new Date().getFullYear()), points: 100, level: 'Bronze',
      cashback: 2, role: 'customer', createdAt: now, updatedAt: now, lastLogin: now,
      oauthProviders: { [provider]: profile.subject }
    })
  } else {
    if (user.status !== 'active') return null
    user.oauthProviders = { ...(user.oauthProviders || {}), [provider]: profile.subject }
    user.lastLogin = now
    user.updatedAt = now
    db.saveUser()
  }
  return user
}

/* ============ HELPERS DE CONTEÚDO ============ */

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function restaurantCard(r) {
  return {
    id: r.id, name: r.name, category: r.category, categoryId: r.categoryId, tags: r.tags,
    rating: r.rating, reviews: r.reviews,
    deliveryTime: r.deliveryTime, deliveryFee: r.deliveryFee,
    freeShippingMin: r.freeShippingMin, distance: r.distance,
    priceRange: r.priceRange, open: r.open, opensAt: r.opensAt || null,
    promo: r.promo || null, badge: r.badge || null,
    logo: r.logo, cover: r.cover, benefits: r.benefits || [], demo: Boolean(r.demo)
  }
}

function searchProducts(q) {
  const nq = normalize(q)
  const out = []
  for (const r of data.restaurants) {
    for (const section of r.menu) {
      for (const item of section.items) {
        const hay = normalize(item.name + ' ' + item.description + ' ' + r.category)
        if (nq && hay.includes(nq)) {
          out.push({
            restaurantId: r.id, restaurantName: r.name, restaurantOpen: r.open,
            section: section.name, ...item
          })
        }
      }
    }
  }
  return out.slice(0, 20)
}

const clientIp = (req) => (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.socket.remoteAddress || 'unknown'

function isTrustedOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    const protocol=String(req.headers['x-forwarded-proto']||'http').split(',')[0].trim(),host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim()
    const allowed=new Set([`${protocol}://${host}`])
    if(process.env.APP_URL)allowed.add(new URL(process.env.APP_URL).origin)
    for(const item of String(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean))allowed.add(new URL(item.trim()).origin)
    return allowed.has(new URL(origin).origin)
  } catch {
    return false
  }
}

/* ============ API DE AUTENTICAÇÃO ============ */

const authApi = {
  'GET /api/auth/turnstile-config': () => turnstile.publicConfig(),
  'GET /api/auth/oauth/google': (_params, query, _body, ctx) => {
    if (!oauth.isConfigured('google')) return oauthFailure(ctx.res, 'Login com Google ainda não foi configurado neste ambiente.')
    redirect(ctx.res, oauth.authorizationUrl('google', ctx.req, query.get('redirect')))
    return { handled: true }
  },

  'GET /api/auth/oauth/apple': (_params, query, _body, ctx) => {
    if (!oauth.isConfigured('apple')) return oauthFailure(ctx.res, 'Login com Apple ainda não foi configurado neste ambiente.')
    redirect(ctx.res, oauth.authorizationUrl('apple', ctx.req, query.get('redirect')))
    return { handled: true }
  },

  'GET /api/auth/oauth/google/callback': async (_params, query, _body, ctx) => {
    if (query.get('error')) return oauthFailure(ctx.res, 'O acesso com Google foi cancelado.')
    try {
      const state = oauth.readState(query.get('state'), 'google')
      const profile = await oauth.googleProfile(query.get('code'), ctx.req)
      const user = socialUser(profile, 'google')
      if (!user) return oauthFailure(ctx.res, 'Sua conta está inativa. Fale com o suporte.')
      const token = auth.createSession(user.id)
      sessionCookie(ctx.req, ctx.res, token, auth.SESSION_TTL / 1000)
      redirect(ctx.res, `/#${oauth.safeRedirect(state.redirect)}`)
      return { handled: true }
    } catch (error) {
      console.error('[oauth:google]', error.message)
      return oauthFailure(ctx.res, 'Não foi possível entrar com Google. Tente novamente.')
    }
  },

  'POST /api/auth/oauth/apple/callback': async (_params, _query, body, ctx) => {
    if (body.error) return oauthFailure(ctx.res, 'O acesso com Apple foi cancelado.')
    try {
      const state = oauth.readState(body.state, 'apple')
      const profile = await oauth.appleProfile(body.code, ctx.req, body.user)
      const user = socialUser(profile, 'apple')
      if (!user) return oauthFailure(ctx.res, 'Sua conta está inativa. Fale com o suporte.')
      const token = auth.createSession(user.id)
      sessionCookie(ctx.req, ctx.res, token, auth.SESSION_TTL / 1000)
      redirect(ctx.res, `/#${oauth.safeRedirect(state.redirect)}`)
      return { handled: true }
    } catch (error) {
      console.error('[oauth:apple]', error.message)
      return oauthFailure(ctx.res, 'Não foi possível entrar com Apple. Tente novamente.')
    }
  },

  'POST /api/auth/register': (params, query, body, ctx) => {
    const fields = {}
    const name = auth.validName(body.fullName)
    if (!name.ok) fields.fullName = name.error
    const email = auth.validEmail(body.email)
    if (!email.ok) fields.email = email.error
    const phone = auth.validPhone(body.phone)
    if (!phone.ok) fields.phone = phone.error
    const pw = auth.validPassword(body.password)
    if (!pw.ok) fields.password = pw.error
    if (body.password !== body.confirmPassword) fields.confirmPassword = 'As senhas não coincidem.'
    if (Object.keys(fields).length) {
      return { status: 400, body: { error: 'Verifique os campos informados.', fields } }
    }
    if (db.findByEmail(email.value)) {
      return { status: 409, body: { code: 'EMAIL_EXISTS', error: 'Este e-mail já possui uma conta.' } }
    }
    if (db.findByPhone(phone.value)) {
      return { status: 409, body: { code: 'PHONE_EXISTS', error: 'Este telefone já está cadastrado.' } }
    }
    const now = new Date().toISOString()
    const user = db.addUser({
      id: db.uid('user'),
      fullName: name.value,
      email: email.value,
      phone: phone.value,
      passwordHash: auth.hashPassword(pw.value),
      status: 'active',
      avatarEmoji: '🧑‍💻',
      memberSince: String(new Date().getFullYear()),
      points: 100,
      level: 'Bronze',
      cashback: 2,
      role: 'customer',
      createdAt: now,
      updatedAt: now,
      lastLogin: now
    })
    const token = auth.createSession(user.id)
    sessionCookie(ctx.req, ctx.res, token, auth.SESSION_TTL / 1000)
    return { status: 201, body: { user: auth.publicUser(user) } }
  },

  'POST /api/auth/login': async (params, query, body, ctx) => {
    const fields = {}
    const email = auth.validEmail(body.email)
    if (!email.ok) fields.email = email.error
    if (!body.password) fields.password = 'Informe sua senha.'
    if (Object.keys(fields).length) {
      return { status: 400, body: { error: 'Verifique os campos informados.', fields } }
    }

    const challenge = await turnstile.verify(body.turnstileToken, clientIp(ctx.req))
    if (!challenge.success) {
      return { status: 400, body: { code: 'TURNSTILE_FAILED', error: 'Confirme que você não é um robô e tente novamente.' } }
    }

    const rlKey = `login:${clientIp(ctx.req)}:${email.value}`
    const rl = auth.rateLimit(rlKey, 8, 15 * 60 * 1000)
    if (!rl.allowed) {
      return { status: 429, body: { error: `Muitas tentativas. Aguarde ${Math.ceil(rl.retryInSec / 60)} minuto(s) e tente novamente.` } }
    }

    const user = db.findByEmail(email.value)
    const ok = user ? auth.verifyPassword(body.password, user.passwordHash) : (auth.dummyVerify(), false)
    if (!ok) {
      return { status: 401, body: { error: 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.' } }
    }
    if (user.status !== 'active') {
      return { status: 403, body: { error: 'Sua conta está inativa. Fale com o suporte.' } }
    }

    auth.clearRate(rlKey)
    user.lastLogin = new Date().toISOString()
    user.updatedAt = user.lastLogin
    db.saveUser()

    const token = auth.createSession(user.id)
    sessionCookie(ctx.req, ctx.res, token, auth.SESSION_TTL / 1000)
    return { user: auth.publicUser(user) }
  },

  'POST /api/auth/logout': (params, query, body, ctx) => {
    auth.destroySession(ctx.cookies.fc_session)
    clearSessionCookie(ctx.res)
    return { ok: true }
  },

  'POST /api/auth/forgot-password': async (params, query, body, ctx) => {
    const generic = { message: 'Se existir uma conta associada a este e-mail, enviaremos as instruções para redefinir sua senha.' }
    const email = auth.validEmail(body.email)
    if (!email.ok) return { status: 400, body: { error: email.error, fields: { email: email.error } } }

    const rl = auth.rateLimit(`forgot:${clientIp(ctx.req)}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) return { status: 429, body: { error: 'Muitas solicitações. Aguarde alguns minutos.' } }
    if (!mailer.isConfigured()) {
      return { status: 503, body: { error: 'A recuperação por e-mail está temporariamente indisponível. Fale com o suporte.' } }
    }

    const user = db.findByEmail(email.value)
    if (user) {
      const token = auth.createResetToken(user.id)
      const base = process.env.APP_URL || `http://${ctx.req.headers.host || 'localhost:' + PORT}`
      const link = `${base}/#/redefinir-senha?token=${token}`
      try {
        await mailer.sendMail({
        to: user.email,
        subject: 'Food Court — Redefinição de senha',
        text: `Olá, ${user.fullName}!\n\nRecebemos uma solicitação para redefinir sua senha.\nUse o link abaixo (válido por 1 hora, uso único):\n\n${link}\n\nSe não foi você, ignore este e-mail.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17211b"><h1 style="color:#087a3e">Redefinir sua senha</h1><p>Olá, ${user.fullName}!</p><p>Recebemos uma solicitação para redefinir sua senha no FoodCourt.</p><p><a href="${link}" style="display:inline-block;padding:14px 22px;background:#087a3e;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Criar nova senha</a></p><p>Este link é válido por 1 hora e pode ser usado uma única vez.</p><p>Se não foi você, ignore este e-mail.</p></div>`
        })
      } catch (error) {
        console.error('[mail] Falha no envio de recuperação:', error.message)
        return { status: 503, body: { error: 'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.' } }
      }
      if (process.env.DEV_EXPOSE_RESET_LINK === '1') {
        console.log(`[auth:dev] Link de redefinição para ${user.email}: ${link}`)
        return { ...generic, devResetLink: link }
      }
    }
    return generic
  },

  'POST /api/auth/reset-password': (params, query, body, _ctx) => {
    if (!body.token) return { status: 400, body: { error: 'Link de redefinição inválido.' } }
    const pw = auth.validPassword(body.password)
    if (!pw.ok) return { status: 400, body: { error: pw.error, fields: { password: pw.error } } }
    if (body.password !== body.confirmPassword) {
      return { status: 400, body: { error: 'As senhas não coincidem.', fields: { confirmPassword: 'As senhas não coincidem.' } } }
    }

    const rec = auth.consumeResetToken(body.token)
    if (!rec) {
      return { status: 400, body: { code: 'INVALID_TOKEN', error: 'Este link de redefinição é inválido ou já expirou. Solicite um novo.' } }
    }
    const user = db.state.users.find(u => u.id === rec.userId)
    if (!user) {
      return { status: 400, body: { code: 'INVALID_TOKEN', error: 'Link de redefinição inválido.' } }
    }

    user.passwordHash = auth.hashPassword(pw.value)
    user.updatedAt = new Date().toISOString()
    db.saveUser()

    db.deleteResetTokensByUser(user.id)
    auth.revokeUserSessions(user.id)

    return { message: 'Sua senha foi redefinida com sucesso.' }
  },

  'GET /api/auth/me': (params, query, body, ctx) => {
    return { user: auth.publicUser(ctx.user) }
  }
}

/* ============ API DE CONTEÚDO (PROTEGIDA) ============ */

const api = {
  'GET /api/bootstrap': (params, query, body, ctx) => ({
    user: auth.publicUser(ctx.user),
    addresses: data.addresses,
    categories: data.categories,
    banners: data.banners,
    coupons: data.coupons,
    notifications: data.notifications,
    flashDeals: data.flashDeals,
    paymentMethods: data.paymentMethods
  }),

  'GET /api/home': () => {
    const all = data.restaurants
    const products = all.flatMap(restaurant => restaurant.menu.flatMap(section => section.items.map(item => ({
      ...item,
      categoryId: item.categoryId || restaurant.categoryId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name
    }))))
    return {
      restaurants: all.map(restaurantCard),
      products,
      offers: data.categoryOffers,
      sections: [
        { id: 'recommended', title: 'Recomendados para você', subtitle: 'Baseado nos seus pedidos', restaurants: all.filter(r => r.rating >= 4.6).map(restaurantCard) },
        { id: 'free', title: 'Frete grátis', subtitle: 'Entrega por conta da casa', restaurants: all.filter(r => r.deliveryFee === 0 || r.freeShippingMin > 0).map(restaurantCard) },
        { id: 'offers', title: 'Ofertas de hoje', subtitle: 'Descontos ativos agora', restaurants: all.filter(r => r.promo).map(restaurantCard) },
        { id: 'top', title: 'Melhores avaliados', subtitle: 'Nota acima de 4.5', restaurants: [...all].sort((a, b) => b.rating - a.rating).map(restaurantCard) },
        { id: 'near', title: 'Perto de você', subtitle: 'A menos de 2 km', restaurants: all.filter(r => r.distance <= 2.1).sort((a, b) => a.distance - b.distance).map(restaurantCard) },
        { id: 'new', title: 'Novidades no Food Court', restaurants: all.filter(r => ['taco-loco', 'market-express'].includes(r.id)).map(restaurantCard) }
      ]
    }
  },

  'GET /api/restaurants/:id': (params) => {
    const r = data.restaurants.find(x => x.id === params.id)
    if (!r) return { status: 404, body: { error: 'Restaurante não encontrado' } }
    const menu = r.menu.map(section => ({
      name: section.name,
      items: section.items.map(item => ({ ...item, options: item.options ? data.optionGroups[item.options] || [] : [] }))
    }))
    return { restaurant: { ...restaurantCard(r), menu, benefits: r.benefits || [] } }
  },

  'GET /api/search': (params, query) => {
    const q = (query.get('q') || '').trim()
    const nq = normalize(q)
    const restaurants = data.restaurants
      .filter(r => !nq || normalize(r.name + ' ' + r.category + ' ' + r.tags.join(' ')).includes(nq))
      .map(restaurantCard)
    const products = q ? searchProducts(q) : []
    const suggestions = data.categories
      .filter(c => !nq || normalize(c.name).includes(nq))
    return { query: q, restaurants, products, categories: suggestions }
  },

  'GET /api/coupons': () => data.coupons,

  'GET /api/flash-deals': () => data.flashDeals
}

function safeUploadedImage(value) {
  if (!value) return null
  const image=String(value)
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return null
  if (Buffer.byteLength(image,'utf8') > 850 * 1024) return null
  return image
}

function pdfText(value) {
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ').replace(/([\\()])/g,'\\$1')
}

function createSimplePdf(title,subtitle,sections) {
  const pages=[];let commands=[],y=700,pageNumber=0
  const text=(value,x,at,size=9,bold=false,color='0.12 0.16 0.14')=>commands.push(`${color} rg BT /F${bold?2:1} ${size} Tf ${x} ${at} Td (${pdfText(value).slice(0,120)}) Tj ET`)
  const rect=(x,at,width,height,color)=>commands.push(`${color} rg ${x} ${at} ${width} ${height} re f`)
  const newPage=()=>{if(commands.length)pages.push(commands.join('\n'));commands=[];pageNumber++;rect(0,770,595,72,'0.02 0.45 0.22');text('FOODCOURT',34,808,18,true,'1 1 1');text('PORTAL DO PARCEIRO',34,789,8,true,'0.76 0.94 0.83');text(`RELATORIO  ${String(pageNumber).padStart(2,'0')}`,480,799,8,true,'1 1 1');text(title,34,738,22,true);text(subtitle,34,716,9,false,'0.38 0.44 0.40');rect(34,696,527,1,'0.87 0.91 0.88');y=670}
  const ensure=height=>{if(y-height<62)newPage()}
  const sectionTitle=value=>{ensure(34);rect(34,y-5,5,24,'0.05 0.55 0.28');text(String(value).toUpperCase(),49,y+1,10,true,'0.05 0.42 0.21');y-=38}
  const summaryCards=rows=>{for(let index=0;index<rows.length;index+=2){ensure(70);for(let column=0;column<2;column++){const row=rows[index+column];if(!row)continue;const split=String(row).indexOf(':'),label=split>=0?row.slice(0,split):row,value=split>=0?row.slice(split+1).trim():'';const x=34+column*267;rect(x,y-55,251,58,'0.95 0.98 0.96');commands.push(`0.83 0.90 0.85 RG ${x} ${y-55} 251 58 re S`);text(label,x+14,y-20,8,true,'0.36 0.43 0.38');text(value,x+14,y-43,15,true,'0.04 0.38 0.19')}y-=70}}
  const tableRows=rows=>{if(!rows.length)return;for(let index=0;index<rows.length;index++){let row=String(rows[index]),header=row.startsWith('#');if(header)row=row.slice(1);const empty=/^Nenhum/i.test(row);ensure(empty?100:42);if(empty){rect(34,y-80,527,86,'0.97 0.98 0.97');commands.push(`0.72 0.79 0.74 RG [4 3] 0 d 34 ${y-80} 527 86 re S [] 0 d`);text('SEM DADOS NESTE PERIODO',205,y-36,10,true,'0.40 0.47 0.42');text(row,190,y-55,8,false,'0.46 0.52 0.48');y-=100;continue}const cells=row.split('|').map(cell=>cell.trim()),height=34;rect(34,y-height+4,527,height,header?'0.89 0.96 0.91':index%2?'0.97 0.98 0.97':'1 1 1');commands.push(`0.83 0.89 0.85 RG 34 ${y-height+4} 527 ${height} re S`);const usable=505,width=usable/Math.max(1,cells.length);cells.forEach((cell,column)=>text(cell,45+column*width,y-18,7.5,header||column===0,header?'0.05 0.42 0.21':'0.18 0.23 0.20'));y-=height}}
  newPage();for(const section of sections){sectionTitle(section.title);if(/resumo|indicadores/i.test(section.title))summaryCards(section.rows);else tableRows(section.rows);y-=10}pages.push(commands.join('\n'))
  const generated=new Date().toLocaleString('pt-BR');for(let index=0;index<pages.length;index++){const footer=['0.91 0.94 0.92 rg','34 43 527 1 re f',`0.40 0.46 0.42 rg BT /F1 7 Tf 34 27 Td (Documento gerado em ${pdfText(generated)} | Dados exclusivos do estabelecimento) Tj ET`,`0.05 0.42 0.21 rg BT /F2 8 Tf 522 27 Td (${index+1} / ${pages.length}) Tj ET`].join('\n');pages[index]+='\n'+footer}
  const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];const pageIds=[],contentIds=[]
  for(const stream of pages){const pageId=objects.length,contentId=pageId+1;pageIds.push(pageId);contentIds.push(contentId);objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);objects.push(`<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}\nendstream`)}objects[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  let pdf='%PDF-1.4\n',offsets=[0];for(let id=1;id<objects.length;id++){offsets[id]=Buffer.byteLength(pdf,'latin1');pdf+=`${id} 0 obj\n${objects[id]}\nendobj\n`}const xref=Buffer.byteLength(pdf,'latin1');pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let id=1;id<objects.length;id++)pdf+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(pdf,'latin1')
}

function partnerReport(store,type) {
  const orders=db.state.platformOrders.filter(order=>order.storeId===store.id),promotions=db.state.promotions.filter(item=>item.storeId===store.id),finance=platform.finance(store.id),date=new Date().toLocaleDateString('pt-BR')
  if(type==='financeiro')return createSimplePdf('Relatorio financeiro',`${store.name} | Posicao em ${date}`,[{title:'Resumo',rows:[`Vendas brutas: R$ ${finance.gross.toFixed(2)}`,`Comissao: R$ ${finance.commission.toFixed(2)}`,`Valor liquido: R$ ${finance.net.toFixed(2)}`,`Pedidos concluidos: ${finance.orders}`,`Proximo repasse: ${new Date(finance.nextPayout).toLocaleDateString('pt-BR')}`]},{title:'Pedidos entregues',rows:['#Pedido | Cliente | Valor | Data',...orders.filter(o=>o.status==='delivered').map(o=>`${o.id} | ${o.customerName} | R$ ${Number(o.total).toFixed(2)} | ${new Date(o.createdAt).toLocaleDateString('pt-BR')}`).slice(0,250),...(!orders.some(o=>o.status==='delivered')?['Nenhum pedido entregue no periodo.']:[])]}])
  if(type==='pedidos')return createSimplePdf('Relatorio de pedidos',`${store.name} | ${orders.length} registros`,[{title:'Pedidos',rows:['#Pedido | Cliente | Status | Valor | Data e hora',...orders.map(o=>`${o.id} | ${o.customerName} | ${o.status} | R$ ${Number(o.total).toFixed(2)} | ${new Date(o.createdAt).toLocaleString('pt-BR')}`).slice(0,300),...(orders.length?[]:['Nenhum pedido registrado.'])]}])
  if(type==='promocoes')return createSimplePdf('Relatorio de promocoes',`${store.name} | ${promotions.length} campanhas`,[{title:'Campanhas',rows:['#Campanha | Beneficio | Status | Utilizacoes',...promotions.map(p=>`${p.name} | ${p.type==='fixed'?'R$ '+Number(p.value).toFixed(2):p.value+'%'} | ${p.active?'Ativa':'Pausada'} | ${p.uses||0} usos`),...(promotions.length?[]:['Nenhuma promocao cadastrada.'])]}])
  return createSimplePdf('Visao geral da operacao',`${store.name} | ${date}`,[{title:'Indicadores',rows:[`Loja: ${store.open?'Aberta':'Pausada'}`,`Pedidos totais: ${orders.length}`,`Pedidos pendentes: ${orders.filter(o=>o.status==='pending').length}`,`Receita entregue: R$ ${finance.gross.toFixed(2)}`,`Produtos cadastrados: ${store.products.length}`,`Promocoes ativas: ${promotions.filter(p=>p.active).length}`]}])
}

const MENU_PROFILES = {
  hamburgueria:{label:'Hamburgueria',categories:[['Hambúrgueres',['Hambúrguer da casa','Hambúrguer especial']],['Combos',['Combo individual','Combo para compartilhar']],['Porções',['Porção da casa']],['Bebidas',['Refrigerante','Suco']]]},
  pizzaria:{label:'Pizzaria',categories:[['Pizzas tradicionais',['Pizza tradicional']],['Pizzas especiais',['Pizza especial da casa']],['Bebidas',['Refrigerante']],['Sobremesas',['Sobremesa da casa']]]},
  japonesa:{label:'Culinária japonesa',categories:[['Combinados',['Combinado da casa']],['Sushis',['Seleção de sushis']],['Pratos quentes',['Prato quente da casa']],['Bebidas',['Bebida']]]},
  acai:{label:'Açaí e sobremesas',categories:[['Açaí',['Açaí tradicional','Açaí especial']],['Complementos',['Complementos']],['Bebidas',['Suco natural']]]},
  cafeteria:{label:'Cafeteria e padaria',categories:[['Cafés',['Café tradicional','Café especial']],['Salgados',['Salgado da casa']],['Doces',['Doce da casa']],['Bebidas geladas',['Bebida gelada']]]},
  restaurante:{label:'Restaurante',categories:[['Pratos principais',['Prato da casa','Prato executivo']],['Combos',['Combo completo']],['Acompanhamentos',['Acompanhamento']],['Bebidas',['Bebida']]]}
}

function menuProfileForStore(store) {
  const text=normalize(`${store.category||''} ${store.name||''} ${store.description||''}`)
  const key=/hamburg|burger|lanche/.test(text)?'hamburgueria':/pizza/.test(text)?'pizzaria':/sushi|japones|temaki/.test(text)?'japonesa':/acai|sorvet|doceria|confeitaria/.test(text)?'acai':/cafe|padaria|coffee/.test(text)?'cafeteria':'restaurante'
  const profile=MENU_PROFILES[key]
  return {key,label:profile.label,source:store.category||'Cadastro da loja',categories:profile.categories.map(([name,items])=>({name,items:items.map(item=>({name:item,description:'Personalize nome, descrição e preço antes de publicar.',price:null}))}))}
}

function cleanMenuProduct(item) {
  const name=auth.sanitize(item?.name).slice(0,100),category=auth.sanitize(item?.category||'Geral').slice(0,60),description=auth.sanitize(item?.description||'').slice(0,500)
  const rawPrice=item?.price===null||item?.price===''?0:Number(item?.price)
  if(name.length<2||!Number.isFinite(rawPrice)||rawPrice<0||rawPrice>100000)return null
  return {name,category:category||'Geral',description,price:+rawPrice.toFixed(2),stock:Math.max(0,Math.min(99999,Number(item?.stock)||0))}
}

async function analyzeMenuImage(store,image) {
  if(!process.env.OPENAI_API_KEY){const error=new Error('A leitura por IA ainda não foi ativada neste ambiente. Configure OPENAI_API_KEY no Railway.');error.code='AI_NOT_CONFIGURED';throw error}
  if(!safeUploadedImage(image)){const error=new Error('Envie uma foto JPG, PNG ou WebP com até 850 KB.');error.code='INVALID_IMAGE';throw error}
  const schema={type:'object',additionalProperties:false,required:['establishmentType','products','warnings'],properties:{establishmentType:{type:'string'},products:{type:'array',maxItems:100,items:{type:'object',additionalProperties:false,required:['name','description','category','price'],properties:{name:{type:'string'},description:{type:'string'},category:{type:'string'},price:{type:['number','null']}}}},warnings:{type:'array',items:{type:'string'}}}}
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_VISION_MODEL||'gpt-4o-mini',store:false,input:[{role:'user',content:[{type:'input_text',text:`Leia este cardápio físico da loja ${store.name}, cadastrada como ${store.category||'restaurante'}. Extraia somente produtos visíveis. Preserve nomes, descrições, categorias e preços em reais. Não invente itens nem preços; use null quando o preço não estiver legível. Responda em português.`},{type:'input_image',image_url:image,detail:'high'}]}],text:{format:{type:'json_schema',name:'menu_extraction',strict:true,schema}}})})
  const payload=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(payload.error?.message||'A IA não conseguiu analisar esta foto agora.')
  const outputText=payload.output?.flatMap(item=>item.content||[]).find(item=>item.type==='output_text')?.text
  if(!outputText)throw new Error('A foto foi processada, mas nenhum produto legível foi encontrado.')
  return JSON.parse(outputText)
}

const PIX_KEY = process.env.PIX_KEY || '3ddfdfec-13f0-4a48-8350-1f6d37ba892a'
function pixField(id, value) {
  const text = String(value)
  return `${id}${String(Buffer.byteLength(text, 'utf8')).padStart(2, '0')}${text}`
}
function pixCrc(payload) {
  let crc = 0xffff
  for (const byte of Buffer.from(payload, 'utf8')) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
function createPixPayload(amount, txid) {
  const merchantAccount = pixField('00', 'br.gov.bcb.pix') + pixField('01', PIX_KEY) + pixField('02', 'Pedido FoodCourt')
  const additional = pixField('05', txid)
  const base = pixField('00', '01') + pixField('26', merchantAccount) + pixField('52', '0000') + pixField('53', '986') + pixField('54', amount.toFixed(2)) + pixField('58', 'BR') + pixField('59', 'FOODCOURT') + pixField('60', 'SAO PAULO') + pixField('62', additional) + '6304'
  return base + pixCrc(base)
}
api['POST /api/pix-charge'] = async (params, query, body) => {
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return { status:400, body:{ error:'Valor do Pix inválido.' } }
  const txid = `FC${Date.now().toString(36).toUpperCase()}`.slice(0, 25)
  const payload = createPixPayload(amount, txid)
  const qrCode = await QRCode.toDataURL(payload, { width:360, margin:2, errorCorrectionLevel:'M', color:{ dark:'#10251A', light:'#FFFFFFFF' } })
  return { payload, qrCode, amount:+amount.toFixed(2), key:PIX_KEY, txid, expiresIn:420, expiresAt:Date.now() + 420000, mode:'test' }
}

api['POST /api/partner-subscription-pix'] = async (params, query, body, ctx) => {
  if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros')
  const store=platform.storeForUser(ctx.user)
  if(!store)return {status:404,body:{error:'Estabelecimento não encontrado.'}}
  const subscription=db.state.subscriptions.find(item=>item.storeId===store.id)
  if(!subscription)return {status:404,body:{error:'Assinatura não encontrada.'}}
  if(subscription.status==='ACTIVE')return {status:409,body:{error:'Esta assinatura já está ativa.'}}
  if(['CANCELED','BLOCKED'].includes(subscription.status))return {status:409,body:{error:'Esta assinatura não pode receber pagamento no status atual.'}}
  const amount=119.90,txid=`FCP${Date.now().toString(36).toUpperCase()}`.slice(0,25),payload=createPixPayload(amount,txid)
  const qrCode=await QRCode.toDataURL(payload,{width:360,margin:2,errorCorrectionLevel:'M',color:{dark:'#10251A',light:'#FFFFFFFF'}})
  subscription.status='PENDING';subscription.pendingCharge={method:'PIX',txid,amount,expiresAt:Date.now()+420000,createdAt:platform.now()};subscription.updatedAt=platform.now();platform.audit(ctx.user,'subscription.pix.create','subscription',subscription.id,txid);db.saveNow()
  return {payload,qrCode,amount,key:PIX_KEY,txid,expiresIn:420,expiresAt:subscription.pendingCharge.expiresAt,mode:'test',subscriptionStatus:subscription.status}
}

function forbidden(role) { return { status:403, body:{ error:`Acesso exclusivo para ${role}.` } } }
const cepCache = new Map([
  ['35180312', { cep:'35180-312', street:'Avenida Monsenhor Rafael', neighborhood:'Timirim', city:'Timóteo', state:'MG', ibge:'3168705' }]
])
Object.assign(api, {
  'GET /api/cep/:id': async (params) => {
    const cep=String(params.id||'').replace(/\D/g,'')
    if(!/^\d{8}$/.test(cep))return {status:400,body:{error:'Informe um CEP com 8 dígitos.'}}
    if(cepCache.has(cep))return {address:cepCache.get(cep)}
    try{const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Serviço de CEP indisponível.');const payload=await response.json();if(payload.erro)return {status:404,body:{error:'CEP não encontrado.'}};const address={cep:payload.cep,street:payload.logradouro||'',neighborhood:payload.bairro||'',city:payload.localidade||'',state:payload.uf||'',ibge:payload.ibge||''};cepCache.set(cep,address);return {address}}catch{return {status:503,body:{error:'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.'}}}
  },

  'POST /api/auth/partner-register': (params, query, body, ctx) => {
    const name=auth.validName(body.fullName),email=auth.validEmail(body.email),phone=auth.validPhone(body.phone),pw=auth.validPassword(body.password)
    const document=String(body.document||'').replace(/\D/g,''),companyDocument=String(body.companyDocument||'').replace(/\D/g,'')
    const required={fullName:name,email,phone,password:pw};const fields={}
    for(const [key,value] of Object.entries(required))if(!value.ok)fields[key]=value.error
    if(![11].includes(document.length))fields.document='Informe um CPF válido.'
    if(![11,14].includes(companyDocument.length))fields.companyDocument='Informe CPF ou CNPJ do estabelecimento.'
    if(!String(body.storeName||'').trim())fields.storeName='Informe o nome fantasia.'
    if(!String(body.category||'').trim())fields.category='Escolha uma categoria.'
    if(!String(body.cep||'').replace(/\D/g,'').match(/^\d{8}$/))fields.cep='Informe um CEP válido.'
    if(Object.keys(fields).length)return {status:400,body:{error:'Revise os dados do cadastro.',fields}}
    const existing=db.findByEmail(email.value),phoneOwner=db.findByPhone(phone.value)
    if(phoneOwner&&phoneOwner.id!==existing?.id)return {status:409,body:{error:'Este telefone já está cadastrado em outra conta.',code:'PHONE_EXISTS'}}
    if(existing&&platform.storeForUser(existing))return {status:409,body:{error:'Esta conta já possui um estabelecimento. Entre pelo Portal do Parceiro.',code:'STORE_EXISTS'}}
    if(existing&&!auth.verifyPassword(pw.value,existing.passwordHash))return {status:401,body:{error:'Para vincular sua conta existente, informe a mesma senha usada no FoodCourt.',code:'PASSWORD_MISMATCH'}}
    const createdAt=platform.now();const user=existing||db.addUser({id:db.uid('user'),fullName:name.value,email:email.value,phone:phone.value,passwordHash:auth.hashPassword(pw.value),document,status:'active',avatarEmoji:'👤',memberSince:String(new Date().getFullYear()),points:0,level:'Parceiro',cashback:0,role:'merchant',createdAt,updatedAt:createdAt,lastLogin:createdAt})
    if(existing)Object.assign(user,{fullName:name.value,phone:phone.value,document,role:'merchant',level:'Parceiro',updatedAt:createdAt,lastLogin:createdAt})
    const store={id:db.uid('store'),ownerId:user.id,name:auth.sanitize(body.storeName).slice(0,100),legalName:auth.sanitize(body.legalName).slice(0,140),document:companyDocument,slug:`${auth.sanitize(body.storeName).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${Date.now().toString(36)}`,category:auth.sanitize(body.category),description:auth.sanitize(body.description).slice(0,500),status:'pending',open:false,rating:0,commissionRate:0,preparationMinutes:Math.max(5,Math.min(180,Number(body.preparationMinutes)||30)),minimumOrder:Math.max(0,Number(body.minimumOrder)||0),phone:auth.sanitize(body.commercialPhone||phone.value),email:auth.sanitize(body.commercialEmail||email.value),address:{street:auth.sanitize(body.street),number:auth.sanitize(body.number),complement:auth.sanitize(body.complement),neighborhood:auth.sanitize(body.neighborhood),city:auth.sanitize(body.city),state:auth.sanitize(body.state).toUpperCase().slice(0,2),cep:String(body.cep).replace(/\D/g,'')},deliveryModes:Array.isArray(body.deliveryModes)?body.deliveryModes.filter(item=>['delivery','pickup'].includes(item)):['delivery'],hours:body.hours&&typeof body.hours==='object'?body.hours:{},logo:safeUploadedImage(body.logo),cover:safeUploadedImage(body.cover),categories:[],products:[],onboardingProgress:body.logo||body.cover?35:25,createdAt,updatedAt:createdAt}
    db.state.stores.push(store);const subscription={id:db.uid('subscription'),storeId:store.id,planId:'foodcourt_partner',planName:'FoodCourt Parceiro',price:119.90,currency:'BRL',interval:'month',status:'PENDING',provider:null,nextBillingAt:null,createdAt,updatedAt:createdAt};db.state.subscriptions.push(subscription);db.saveNow()
    const token=auth.createSession(user.id);sessionCookie(ctx.req,ctx.res,token,auth.SESSION_TTL/1000)
    return {status:201,body:{user:auth.publicUser(user),store:{id:store.id,name:store.name,status:store.status,onboardingProgress:store.onboardingProgress},subscription}}
  },
  'GET /api/partner-dashboard': (params,query,body,ctx) => {
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros')
    const store=platform.storeForUser(ctx.user); const subscription=db.state.subscriptions.find(item=>item.storeId===store.id);return { store,subscription, ...platform.dashboard(store.id) }
  },
  'GET /api/partner-orders': (params,query,body,ctx) => {
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros')
    const store=platform.storeForUser(ctx.user)
    const status=String(query.get('status')||'').trim()
    const page=Math.max(1,Number.parseInt(query.get('page')||'1',10)||1)
    const limit=Math.min(100,Math.max(1,Number.parseInt(query.get('limit')||'50',10)||50))
    const all=db.state.platformOrders.filter(order=>order.storeId===store.id&&(!status||order.status===status))
    const start=(page-1)*limit
    return { orders:all.slice(start,start+limit), pagination:{page,limit,total:all.length,pages:Math.max(1,Math.ceil(all.length/limit))} }
  },
  'POST /api/partner-order-status': (params,query,body,ctx) => {
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros')
    const store=platform.storeForUser(ctx.user); const order=db.state.platformOrders.find(item=>item.id===body.orderId&&item.storeId===store.id)
    const allowed=['pending','accepted','preparing','ready','delivered','cancelled']; if(!order||!allowed.includes(body.status)) return {status:400,body:{error:'Pedido ou status inválido.'}}
    order.status=body.status;order.statusHistory=order.statusHistory||[];order.statusHistory.push({status:body.status,at:platform.now()});order.updatedAt=platform.now();
    if(body.status==='delivered'&&order.customerId&&!order.loyaltyGranted){const customer=db.state.users.find(user=>user.id===order.customerId);if(customer){const points=Math.max(10,Math.floor(order.total));customer.points=(customer.points||0)+points;db.state.loyaltyEvents.unshift({id:db.uid('loyalty'),userId:customer.id,type:'order',points,label:`Pedido ${order.id}`,at:platform.now()});order.loyaltyGranted=true}}
    platform.audit(ctx.user,'order.status','order',order.id,body.status);return {order}
  },
  'GET /api/partner-catalog': (params,query,body,ctx) => {
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros'); const store=platform.storeForUser(ctx.user); return {store:{id:store.id,name:store.name,category:store.category,logo:store.logo,cover:store.cover},profile:menuProfileForStore(store),products:store.products}
  },
  'POST /api/partner-product': (params,query,body,ctx) => {
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros'); const store=platform.storeForUser(ctx.user)
    let product=store.products.find(item=>item.id===body.id); if(product) Object.assign(product,{name:body.name,category:body.category,price:Number(body.price),stock:Number(body.stock),active:Boolean(body.active)}); else {product={id:db.uid('product'),name:String(body.name||'Novo produto'),category:String(body.category||'Geral'),price:Number(body.price||0),stock:Number(body.stock||0),active:true,sold:0};store.products.push(product)}
    platform.audit(ctx.user,body.id?'product.update':'product.create','product',product.id);return {product}
  },
  'POST /api/partner-menu-analyze': async (params,query,body,ctx) => {
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user)
    try{const analysis=await analyzeMenuImage(store,body.image);const products=analysis.products.map(cleanMenuProduct).filter(Boolean);if(!products.length)return {status:422,body:{error:'Não encontramos produtos legíveis. Tente uma foto mais nítida e bem iluminada.'}};return {analysis:{establishmentType:auth.sanitize(analysis.establishmentType).slice(0,80),warnings:(analysis.warnings||[]).map(item=>auth.sanitize(item).slice(0,180)).slice(0,10),products}}}
    catch(error){return {status:error.code==='AI_NOT_CONFIGURED'?503:400,body:{error:error.message,code:error.code||'MENU_ANALYSIS_FAILED'}}}
  },
  'POST /api/partner-menu-import': (params,query,body,ctx) => {
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user),items=Array.isArray(body.products)?body.products.slice(0,100):[]
    const cleaned=items.map(cleanMenuProduct).filter(Boolean);if(!cleaned.length)return {status:400,body:{error:'Revise e selecione ao menos um produto para importar.'}}
    const existing=new Set(store.products.map(item=>normalize(`${item.category}|${item.name}`))),imported=[]
    for(const item of cleaned){const signature=normalize(`${item.category}|${item.name}`);if(existing.has(signature))continue;const product={id:db.uid('product'),...item,active:false,sold:0,createdAt:platform.now(),updatedAt:platform.now()};store.products.push(product);existing.add(signature);imported.push(product)}
    if(!imported.length)return {status:409,body:{error:'Todos os produtos selecionados já existem no cardápio.'}}
    platform.audit(ctx.user,'menu.import','store',store.id,`${imported.length} produtos em rascunho`);return {products:imported,count:imported.length}
  },
  'POST /api/partner-store': (params,query,body,ctx) => {
    const store=platform.storeForUser(ctx.user);if(!store)return {status:404,body:{error:'Estabelecimento não encontrado.'}}
    if(typeof body.open==='boolean'){store.open=body.open;store.autoSchedule=false}
    for(const field of ['name','description','phone','email','category'])if(body[field]!==undefined)store[field]=auth.sanitize(body[field]).slice(0,field==='description'?500:120)
    if(body.preparationMinutes!==undefined)store.preparationMinutes=Math.max(5,Math.min(180,Number(body.preparationMinutes)||30))
    if(body.minimumOrder!==undefined)store.minimumOrder=Math.max(0,Number(body.minimumOrder)||0)
    if(body.hours&&typeof body.hours==='object')store.hours=body.hours
    if(typeof body.autoSchedule==='boolean')store.autoSchedule=body.autoSchedule
    platform.applyStoreSchedule(store)
    if(typeof body.orderNotifications==='boolean')store.orderNotifications=body.orderNotifications
    store.updatedAt=platform.now();platform.audit(ctx.user,'store.update','store',store.id);return {store}
  },
  'GET /api/partner-promotions': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user);return {promotions:db.state.promotions.filter(p=>p.storeId===store.id)} },
  'POST /api/partner-promotion': (params,query,body,ctx) => {const store=platform.storeForUser(ctx.user),name=auth.sanitize(body.name).slice(0,80),code=auth.sanitize(body.code).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,20),type=body.type==='fixed'?'fixed':'percent',limit=type==='percent'?90:10000,value=Math.max(1,Math.min(limit,Number(body.value)||0)),minimumOrder=Math.max(0,Math.min(100000,Number(body.minimumOrder)||0)),startsAt=body.startsAt&&Number.isFinite(Date.parse(body.startsAt))?new Date(body.startsAt+'T00:00:00').toISOString():platform.now(),endsAt=body.endsAt&&Number.isFinite(Date.parse(body.endsAt))?new Date(body.endsAt+'T23:59:59').toISOString():null;if(!name||!value)return {status:400,body:{error:type==='percent'?'Informe o nome e um desconto entre 1% e 90%.':'Informe o nome e um desconto em reais válido.'}};if(endsAt&&Date.parse(endsAt)<Date.parse(startsAt))return {status:400,body:{error:'A data final deve ser igual ou posterior à data inicial.'}};if(code&&db.state.promotions.some(p=>p.storeId===store.id&&p.id!==body.id&&p.code===code))return {status:409,body:{error:'Este código já está sendo usado em outra promoção.'}};let promotion=db.state.promotions.find(p=>p.id===body.id&&p.storeId===store.id);const changes={name,code,type,value,minimumOrder,startsAt,endsAt,active:body.active!==false,updatedAt:platform.now()};if(promotion)Object.assign(promotion,changes);else{promotion={id:db.uid('promo'),storeId:store.id,...changes,uses:0,createdAt:platform.now()};db.state.promotions.unshift(promotion)}platform.audit(ctx.user,body.id?'promotion.update':'promotion.create','promotion',promotion.id);return {promotion}},
  'GET /api/partner-finance': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');return platform.finance(platform.storeForUser(ctx.user).id) },
  'GET /api/partner-team': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user);return {members:db.state.storeMembers.filter(m=>m.storeId===store.id)} },
  'POST /api/partner-team-member': (params,query,body,ctx) => {const store=platform.storeForUser(ctx.user);let member=db.state.storeMembers.find(m=>m.id===body.id&&m.storeId===store.id);if(body.action==='remove'){if(!member)return {status:404,body:{error:'Pessoa não encontrada.'}};db.state.storeMembers=db.state.storeMembers.filter(m=>m.id!==member.id);platform.audit(ctx.user,'team.remove','member',member.id);return {removed:true}}const name=auth.sanitize(body.name).slice(0,80),email=String(body.email||'').trim().toLowerCase(),role=['manager','kitchen'].includes(body.role)?body.role:'kitchen';if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {status:400,body:{error:'Informe um nome e e-mail válidos.'}};if(!member){if(db.state.storeMembers.some(m=>m.storeId===store.id&&m.email.toLowerCase()===email))return {status:409,body:{error:'Este e-mail já faz parte da equipe.'}};member={id:db.uid('member'),storeId:store.id,name,email,role,active:true};db.state.storeMembers.push(member)}else Object.assign(member,{name,email,role,active:body.active!==false});platform.audit(ctx.user,body.id?'team.update':'team.invite','member',member.id);return {member}},
  'GET /api/partner-reviews': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user);return {reviews:db.state.reviews.filter(r=>r.storeId===store.id)} },
  'POST /api/partner-review-reply': (params,query,body,ctx) => {const store=platform.storeForUser(ctx.user),review=db.state.reviews.find(r=>r.id===body.reviewId&&r.storeId===store.id),reply=auth.sanitize(body.reply).slice(0,500);if(!review)return {status:404,body:{error:'Avaliação não encontrada.'}};if(reply.length<2)return {status:400,body:{error:'Escreva uma resposta antes de enviar.'}};review.reply=reply;review.replied=true;review.repliedAt=platform.now();platform.audit(ctx.user,'review.reply','review',review.id);return {review}},
  'GET /api/partner-support': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user);return {tickets:db.state.supportTickets.filter(t=>t.storeId===store.id)} },
  'GET /api/partner-report/:id': (params,query,body,ctx) => {const store=platform.storeForUser(ctx.user),type=['geral','pedidos','promocoes','financeiro'].includes(params.id)?params.id:'geral',pdf=partnerReport(store,type),storeSlug=normalize(store.name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'loja',filename=`foodcourt-${storeSlug}-${type}-${new Date().toISOString().slice(0,10)}.pdf`;ctx.res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${filename}"`,'Content-Length':pdf.length,'Cache-Control':'no-store'});ctx.res.end(pdf);return {handled:true}},
  'POST /api/partner-support-ticket': (params,query,body,ctx) => {const store=platform.storeForUser(ctx.user);let ticket=db.state.supportTickets.find(t=>t.id===body.id&&t.storeId===store.id);if(ticket){if(body.action==='resolve'){ticket.status='resolved'}else{const text=auth.sanitize(body.message).slice(0,1000);if(!text)return {status:400,body:{error:'Escreva uma mensagem.'}};ticket.messages.push({from:'partner',text,at:platform.now()});ticket.status='open'}ticket.updatedAt=platform.now();platform.audit(ctx.user,'support.update','ticket',ticket.id);return {ticket}}const subject=auth.sanitize(body.subject).slice(0,100),message=auth.sanitize(body.message).slice(0,1000);if(!subject||!message)return {status:400,body:{error:'Informe o assunto e descreva o problema.'}};ticket={id:db.uid('ticket'),customerId:null,storeId:store.id,subject,status:'open',priority:'normal',messages:[{from:'partner',text:message,at:platform.now()}],createdAt:platform.now(),updatedAt:platform.now()};db.state.supportTickets.unshift(ticket);platform.audit(ctx.user,'support.create','ticket',ticket.id);return {ticket}},
  'GET /api/admin-dashboard': (params,query,body,ctx) => { if(ctx.user.role!=='admin') return forbidden('administradores');return {metrics:{users:db.state.users.length,stores:db.state.stores.length,orders:db.state.platformOrders.length,gross:db.state.platformOrders.reduce((sum,o)=>sum+o.total,0),openTickets:db.state.supportTickets.filter(t=>t.status==='open').length},stores:db.state.stores,users:db.state.users.map(auth.publicUser),audit:db.state.auditLog.slice(0,30)} },
  'GET /api/orders': (params,query,body,ctx) => ({orders:db.state.platformOrders.filter(order=>order.customerId===ctx.user.id)}),
  'GET /api/order/:id': (params,query,body,ctx) => {
    const order=db.state.platformOrders.find(item=>item.id===params.id&&item.customerId===ctx.user.id);return order?{order}:{status:404,body:{error:'Pedido não encontrado.'}}
  },
  'POST /api/orders': (params,query,body,ctx) => {
    const catalogRestaurant=data.restaurants.find(item=>item.id===body.storeId);const partnerStore=platform.storeForId(body.storeId)||db.state.stores.find(item=>item.slug===body.storeId)
    if((!catalogRestaurant&&!partnerStore)||!Array.isArray(body.items)||!body.items.length)return {status:400,body:{error:'Pedido inválido.'}}
    const catalogItems=catalogRestaurant?catalogRestaurant.menu.flatMap(section=>section.items):partnerStore.products
    try{const items=body.items.map(line=>{const product=catalogItems.find(item=>item.id===line.productId);const quantity=Math.max(1,Math.min(20,Number(line.quantity)||1));if(!product)throw new Error('Produto indisponível.');return {productId:product.id,name:product.name,quantity,unitPrice:Number(product.promoPrice??product.price),options:Array.isArray(line.options)?line.options:[]}})
      const subtotal=items.reduce((sum,item)=>sum+item.quantity*item.unitPrice,0);const deliveryFee=Number(catalogRestaurant?.deliveryFee??0);const order={id:'FC-'+Date.now(),customerId:ctx.user.id,storeId:partnerStore?.id||catalogRestaurant.id,restaurantId:catalogRestaurant?.id||partnerStore.slug,restaurantName:catalogRestaurant?.name||partnerStore.name,status:'pending',statusHistory:[{status:'pending',at:platform.now()}],customerName:ctx.user.fullName,items,subtotal,deliveryFee,discount:0,total:Number((subtotal+deliveryFee).toFixed(2)),paymentMethod:body.paymentMethod||'Simulado',address:body.address||'',createdAt:platform.now(),updatedAt:platform.now(),cancelReason:null};db.state.platformOrders.unshift(order);platform.audit(ctx.user,'order.create','order',order.id);return {status:201,body:{order}}
    }catch(error){return {status:400,body:{error:error.message}}}
  },
  'POST /api/order-cancel': (params,query,body,ctx) => {const order=db.state.platformOrders.find(item=>item.id===body.orderId&&item.customerId===ctx.user.id);if(!order)return {status:404,body:{error:'Pedido não encontrado.'}};if(!['pending','accepted'].includes(order.status))return {status:409,body:{error:'Este pedido já está em preparação e não pode ser cancelado automaticamente.'}};order.status='cancelled';order.cancelReason=String(body.reason||'Cancelado pelo cliente');order.statusHistory.push({status:'cancelled',at:platform.now()});order.updatedAt=platform.now();platform.audit(ctx.user,'order.cancel','order',order.id,order.cancelReason);return {order}},
  'GET /api/customer-reviews': (params,query,body,ctx) => ({reviews:db.state.reviews.filter(review=>review.customerId===ctx.user.id)}),
  'POST /api/customer-reviews': (params,query,body,ctx) => {const order=db.state.platformOrders.find(item=>item.id===body.orderId&&item.customerId===ctx.user.id&&item.status==='delivered');if(!order)return {status:400,body:{error:'Apenas pedidos entregues podem ser avaliados.'}};if(db.state.reviews.some(review=>review.orderId===order.id))return {status:409,body:{error:'Este pedido já foi avaliado.'}};const rating=Math.max(1,Math.min(5,Number(body.rating)||5));const review={id:db.uid('review'),orderId:order.id,customerId:ctx.user.id,storeId:order.storeId,customerName:ctx.user.fullName,rating,comment:String(body.comment||'').slice(0,500),replied:false,createdAt:platform.now()};db.state.reviews.unshift(review);ctx.user.points=(ctx.user.points||0)+10;db.state.loyaltyEvents.unshift({id:db.uid('loyalty'),userId:ctx.user.id,type:'review',points:10,label:'Avaliação de pedido',at:platform.now()});db.saveNow();return {status:201,body:{review,points:ctx.user.points}}},
  'GET /api/loyalty': (params,query,body,ctx) => {const points=ctx.user.points||0;const levels=[{name:'Bronze',min:0},{name:'Prata',min:500},{name:'Ouro',min:1500},{name:'Diamante',min:3000}];const level=[...levels].reverse().find(item=>points>=item.min);const next=levels[levels.findIndex(item=>item.name===level.name)+1]||null;return {points,level:level.name,next,events:db.state.loyaltyEvents.filter(event=>event.userId===ctx.user.id).slice(0,30),missions:[{id:'mission_categories',title:'Explore 3 categorias',progress:1,target:3,reward:80},{id:'mission_orders',title:'Faça 5 pedidos',progress:db.state.platformOrders.filter(o=>o.customerId===ctx.user.id).length,target:5,reward:150},{id:'mission_review',title:'Avalie um pedido',progress:db.state.reviews.some(r=>r.customerId===ctx.user.id)?1:0,target:1,reward:10}]}},
  'GET /api/customer-support': (params,query,body,ctx) => ({tickets:db.state.supportTickets.filter(ticket=>ticket.customerId===ctx.user.id)}),
  'POST /api/customer-support': (params,query,body,ctx) => {const ticket={id:db.uid('ticket'),customerId:ctx.user.id,storeId:body.storeId||null,orderId:body.orderId||null,subject:String(body.subject||'Atendimento').slice(0,120),status:'open',priority:'normal',messages:[{from:'customer',text:String(body.message||'').slice(0,1000),at:platform.now()}],createdAt:platform.now()};db.state.supportTickets.unshift(ticket);platform.audit(ctx.user,'support.create','ticket',ticket.id);return {status:201,body:{ticket}}}
})

/* ============ ESTÁTICOS ============ */

function serveStatic(req, res, pathname) {
  let filePath = path.normalize(path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname))
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return
  }
  fs.readFile(filePath, (err, fileData) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, index) => {
        if (err2) { res.writeHead(500); res.end('Internal Server Error'); return }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(index)
      })
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    })
    res.end(fileData)
  })
}

/* ============ SERVIDOR ============ */

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res)
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)

  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        persistentStorage: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH),
        timestamp: new Date().toISOString()
      })
      return
    }

    const generalLimit = auth.rateLimit(`api:${clientIp(req)}`, 240, 60 * 1000)
    if (!generalLimit.allowed) {
      sendJson(res, 429, { error: 'Muitas requisições. Tente novamente em instantes.' }, { 'Retry-After': generalLimit.retryInSec })
      return
    }
    const isAppleCallback = pathname === '/api/auth/oauth/apple/callback'
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isAppleCallback && !isTrustedOrigin(req)) {
      sendJson(res, 403, { error: 'Origem da requisição não autorizada.' })
      return
    }

    const cookies = parseCookies(req)
    const sess = auth.resolveSession(cookies.fc_session)
    const ctxUser = sess ? db.state.users.find(u => u.id === sess.userId) || null : null
    if (sess && !ctxUser) auth.destroySession(cookies.fc_session)
    const ctx = { req, res, cookies, user: ctxUser }

    // Mantém a sessão ativa por mais 2 horas a cada uso autenticado.
    // Sem atividade, o cookie e a sessão no servidor expiram normalmente.
    if (ctxUser && cookies.fc_session) sessionCookie(req, res, cookies.fc_session, auth.SESSION_TTL / 1000)

    const isAuthEndpoint = pathname.startsWith('/api/auth/')
    const clean = pathname.replace(/\/+$/, '')
    const requiresAuth = !isAuthEndpoint || clean === '/api/auth/me'
    if (requiresAuth && !ctxUser) {
      sendJson(res, 401, { error: 'Não autenticado.' })
      return
    }

    if (clean.startsWith('/api/partner-')) {
      if (!['merchant','admin'].includes(ctxUser.role)) { sendJson(res,403,{error:'Acesso exclusivo para parceiros.',code:'PARTNER_ROLE_REQUIRED'});return }
      const ownedStore=platform.storeForUser(ctxUser)
      if (!ownedStore) { sendJson(res,403,{error:'Nenhum estabelecimento está vinculado a esta conta.',code:'STORE_REQUIRED'});return }
      // O pagamento ainda e simulado. Enquanto nao houver confirmacao por
      // webhook, parceiros cadastrados podem acessar o portal normalmente.
    }

    let key
    let sub = null
    if (isAuthEndpoint) {
      key = `${req.method} ${clean}`
    } else {
      const match = clean.match(/^\/api\/([^/]+)(?:\/([^/]+))?/)
      const section = match ? match[1] : ''
      sub = match ? match[2] : null
      key = `${req.method} /api/${section}${sub ? '/:id' : ''}`
    }

    const table = isAuthEndpoint ? (clean === '/api/auth/partner-register' ? api : authApi) : api
    const handler = table[key]
    if (!handler) { sendJson(res, 404, { error: 'Endpoint não encontrado' }); return }

    try {
      let body = {}
      if (req.method === 'POST') {
        if (isAppleCallback) {
          const chunks = []
          let size = 0
          for await (const chunk of req) {
            size += chunk.length
            if (size > 64 * 1024) throw new Error('payload-too-large')
            chunks.push(chunk)
          }
          body = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')))
        } else body = await readBody(req)
      }
      const result = await handler({ id: sub }, url.searchParams, body, ctx)
      if (result?.handled) return
      if (result && result.status) sendJson(res, result.status, result.body)
      else sendJson(res, 200, result)
    } catch (e) {
      if (e.message === 'payload-too-large') { sendJson(res, 413, { error: 'Requisição muito grande.' }); return }
      if (e.message === 'invalid-json') { sendJson(res, 400, { error: 'JSON inválido.' }); return }
      console.error('[api]', e)
      sendJson(res, 500, { error: 'Não conseguimos concluir sua solicitação agora. Tente novamente.' })
    }
    return
  }

  if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
  serveStatic(req, res, pathname)
})

function start(port = PORT) {
server.listen(port, () => {
  console.log('')
  console.log('  ███████╗ ██████╗ ██████╗  ██████╗    ██████╗ ██████╗ ███████╗')
  console.log('  ██╔════╝██╔═══██╗██╔══██╗██╔═══██╗   ██╔══██╗██╔══██╗██╔════╝')
  console.log('  █████╗  ██║   ██║██████╔╝██║   ██║   ██║  ██║██████╔╝█████╗  ')
  console.log('  ██╔══╝  ██║   ██║██╔══██╗██║   ██║   ██║  ██║██╔═══╝ ██╔══╝  ')
  console.log('  ██║     ╚██████╔╝██║  ██║╚██████╔╝██╗██████╔╝██║     ███████╗')
  console.log('  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝╚═════╝ ╚═╝     ╚══════╝')
  console.log('')
  console.log(`  Food Court rodando em http://localhost:${server.address().port}`)
  console.log(`  Conta demo: joao@foodcourt.com / foodcourt123`)
  console.log('')
})
  return server
}

if (require.main === module) start()

module.exports = { server, start, applySecurityHeaders, isTrustedOrigin }
