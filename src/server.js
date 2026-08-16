require('./lib/env').loadEnv()

const http = require('http')
const fs = require('fs')
const path = require('path')
const data = require('./data/catalog')
const db = require('./lib/db')
const auth = require('./lib/auth')
const mailer = require('./lib/mailer')

const PORT = process.env.PORT || 3000
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

/* ============ BANCO + SEED DA CONTA DEMO ============ */

db.load()

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
    cashback: 5,
    createdAt: new Date('2024-05-10T12:00:00Z').toISOString(),
    updatedAt: new Date('2024-05-10T12:00:00Z').toISOString(),
    lastLogin: null
  })
  console.log('[db] Conta demo criada: joao@foodcourt.com / foodcourt123')
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 100 * 1024) { reject(new Error('payload-too-large')); req.destroy(); return }
      raw += c
    })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch { resolve({}) }
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

/* ============ HELPERS DE CONTEÚDO ============ */

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function restaurantCard(r) {
  return {
    id: r.id, name: r.name, category: r.category, tags: r.tags,
    rating: r.rating, reviews: r.reviews,
    deliveryTime: r.deliveryTime, deliveryFee: r.deliveryFee,
    freeShippingMin: r.freeShippingMin, distance: r.distance,
    priceRange: r.priceRange, open: r.open, opensAt: r.opensAt || null,
    promo: r.promo || null, badge: r.badge || null,
    logo: r.logo, cover: r.cover, benefits: r.benefits || []
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

const clientIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

/* ============ API DE AUTENTICAÇÃO ============ */

const authApi = {
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
      createdAt: now,
      updatedAt: now,
      lastLogin: now
    })
    const token = auth.createSession(user.id)
    sessionCookie(ctx.req, ctx.res, token, auth.SESSION_TTL / 1000)
    return { status: 201, body: { user: auth.publicUser(user) } }
  },

  'POST /api/auth/login': (params, query, body, ctx) => {
    const fields = {}
    const email = auth.validEmail(body.email)
    if (!email.ok) fields.email = email.error
    if (!body.password) fields.password = 'Informe sua senha.'
    if (Object.keys(fields).length) {
      return { status: 400, body: { error: 'Verifique os campos informados.', fields } }
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

  'POST /api/auth/forgot-password': (params, query, body, ctx) => {
    const generic = { message: 'Se existir uma conta associada a este e-mail, enviaremos as instruções para redefinir sua senha.' }
    const email = auth.validEmail(body.email)
    if (!email.ok) return { status: 400, body: { error: email.error, fields: { email: email.error } } }

    const rl = auth.rateLimit(`forgot:${clientIp(ctx.req)}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) return { status: 429, body: { error: 'Muitas solicitações. Aguarde alguns minutos.' } }

    const user = db.findByEmail(email.value)
    if (user) {
      const token = auth.createResetToken(user.id)
      const base = process.env.APP_URL || `http://${ctx.req.headers.host || 'localhost:' + PORT}`
      const link = `${base}/#/redefinir-senha?token=${token}`
      mailer.sendMail({
        to: user.email,
        subject: 'Food Court — Redefinição de senha',
        text: `Olá, ${user.fullName}!\n\nRecebemos uma solicitação para redefinir sua senha.\nUse o link abaixo (válido por 1 hora, uso único):\n\n${link}\n\nSe não foi você, ignore este e-mail.`
      })
      if (process.env.DEV_EXPOSE_RESET_LINK === '1') {
        console.log(`[auth:dev] Link de redefinição para ${user.email}: ${link}`)
        return { ...generic, devResetLink: link }
      }
    }
    return generic
  },

  'POST /api/auth/reset-password': (params, query, body, ctx) => {
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
    return {
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
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600'
    })
    res.end(fileData)
  })
}

/* ============ SERVIDOR ============ */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)

  if (pathname.startsWith('/api/')) {
    await new Promise(r => setTimeout(r, 250 + Math.random() * 350))

    const cookies = parseCookies(req)
    const sess = auth.resolveSession(cookies.fc_session)
    const ctxUser = sess ? db.state.users.find(u => u.id === sess.userId) || null : null
    if (sess && !ctxUser) auth.destroySession(cookies.fc_session)
    const ctx = { req, res, cookies, user: ctxUser }

    const isAuthEndpoint = pathname.startsWith('/api/auth/')
    const clean = pathname.replace(/\/+$/, '')
    const requiresAuth = !isAuthEndpoint || clean === '/api/auth/me'
    if (requiresAuth && !ctxUser) {
      sendJson(res, 401, { error: 'Não autenticado.' })
      return
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

    const table = isAuthEndpoint ? authApi : api
    const handler = table[key]
    if (!handler) { sendJson(res, 404, { error: 'Endpoint não encontrado' }); return }

    try {
      let body = {}
      if (req.method === 'POST') body = await readBody(req)
      const result = handler({ id: sub }, url.searchParams, body, ctx)
      if (result && result.status) sendJson(res, result.status, result.body)
      else sendJson(res, 200, result)
    } catch (e) {
      if (e.message === 'payload-too-large') { sendJson(res, 413, { error: 'Requisição muito grande.' }); return }
      console.error('[api]', e)
      sendJson(res, 500, { error: 'Não conseguimos concluir sua solicitação agora. Tente novamente.' })
    }
    return
  }

  if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
  serveStatic(req, res, pathname)
})

server.listen(PORT, () => {
  console.log('')
  console.log('  ███████╗ ██████╗ ██████╗  ██████╗    ██████╗ ██████╗ ███████╗')
  console.log('  ██╔════╝██╔═══██╗██╔══██╗██╔═══██╗   ██╔══██╗██╔══██╗██╔════╝')
  console.log('  █████╗  ██║   ██║██████╔╝██║   ██║   ██║  ██║██████╔╝█████╗  ')
  console.log('  ██╔══╝  ██║   ██║██╔══██╗██║   ██║   ██║  ██║██╔═══╝ ██╔══╝  ')
  console.log('  ██║     ╚██████╔╝██║  ██║╚██████╔╝██╗██████╔╝██║     ███████╗')
  console.log('  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝╚═════╝ ╚═╝     ╚══════╝')
  console.log('')
  console.log(`  Food Court rodando em http://localhost:${PORT}`)
  console.log(`  Conta demo: joao@foodcourt.com / foodcourt123`)
  console.log('')
})
