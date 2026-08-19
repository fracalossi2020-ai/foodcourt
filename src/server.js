require('./lib/env').loadEnv()

const http = require('http')
const fs = require('fs')
const path = require('path')
const data = require('./data/catalog')
const db = require('./lib/db')
const auth = require('./lib/auth')
const mailer = require('./lib/mailer')
const platform = require('./lib/platform')
const QRCode = require('qrcode')

const PORT = process.env.PORT || 3000
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

/* ============ BANCO + SEED DA CONTA DEMO ============ */

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

function ensureDemoUser(email, fullName, phone, password, role) {
  let user = db.findByEmail(email)
  if (!user) user = db.addUser({ id:db.uid('user'), fullName, email, phone, passwordHash:auth.hashPassword(password), status:'active', avatarEmoji:role==='merchant'?'👨‍🍳':'🛡️', memberSince:'2026', points:0, level:role==='merchant'?'Parceiro':'Administrador', cashback:0, role, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), lastLogin:null })
  else if (!user.role) { user.role = role; db.saveUser() }
  return user
}
const merchantDemo = ensureDemoUser('dono@foodcourt.com','Carlos Mendes','(11) 98888-1000','foodcourt123','merchant')
ensureDemoUser('admin@foodcourt.com','Admin FoodCourt','(11) 98888-2000','foodcourt123','admin')
platform.seed()
if (db.state.stores[0] && !db.state.stores[0].ownerId) { db.state.stores[0].ownerId = merchantDemo.id; db.saveNow() }

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
      if (size > 2 * 1024 * 1024) { reject(new Error('payload-too-large')); req.destroy(); return }
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
      role: 'customer',
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

const PIX_KEY = '3ddfdfec-13f0-4a48-8350-1f6d37ba892a'
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
    try{const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Serviço de CEP indisponível.');const payload=await response.json();if(payload.erro)return {status:404,body:{error:'CEP não encontrado.'}};const address={cep:payload.cep,street:payload.logradouro||'',neighborhood:payload.bairro||'',city:payload.localidade||'',state:payload.uf||'',ibge:payload.ibge||''};cepCache.set(cep,address);return {address}}catch(error){return {status:503,body:{error:'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.'}}}
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
    const store=platform.storeForUser(ctx.user); return { orders:db.state.platformOrders.filter(order=>order.storeId===store.id) }
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
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros'); const store=platform.storeForUser(ctx.user); return {storeId:store.id,products:store.products}
  },
  'POST /api/partner-product': (params,query,body,ctx) => {
    if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros'); const store=platform.storeForUser(ctx.user)
    let product=store.products.find(item=>item.id===body.id); if(product) Object.assign(product,{name:body.name,category:body.category,price:Number(body.price),stock:Number(body.stock),active:Boolean(body.active)}); else {product={id:db.uid('product'),name:String(body.name||'Novo produto'),category:String(body.category||'Geral'),price:Number(body.price||0),stock:Number(body.stock||0),active:true,sold:0};store.products.push(product)}
    platform.audit(ctx.user,body.id?'product.update':'product.create','product',product.id);return {product}
  },
  'POST /api/partner-store': (params,query,body,ctx) => {
    const store=platform.storeForUser(ctx.user);if(!store)return {status:404,body:{error:'Estabelecimento não encontrado.'}}
    if(typeof body.open==='boolean')store.open=body.open
    for(const field of ['name','description','phone','email','category'])if(body[field]!==undefined)store[field]=auth.sanitize(body[field]).slice(0,field==='description'?500:120)
    if(body.preparationMinutes!==undefined)store.preparationMinutes=Math.max(5,Math.min(180,Number(body.preparationMinutes)||30))
    if(body.minimumOrder!==undefined)store.minimumOrder=Math.max(0,Number(body.minimumOrder)||0)
    if(body.hours&&typeof body.hours==='object')store.hours=body.hours
    store.updatedAt=platform.now();platform.audit(ctx.user,'store.update','store',store.id);return {store}
  },
  'GET /api/partner-promotions': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user);return {promotions:db.state.promotions.filter(p=>p.storeId===store.id)} },
  'GET /api/partner-finance': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');return platform.finance(platform.storeForUser(ctx.user).id) },
  'GET /api/partner-team': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user);return {members:db.state.storeMembers.filter(m=>m.storeId===store.id)} },
  'GET /api/partner-reviews': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user);return {reviews:db.state.reviews.filter(r=>r.storeId===store.id)} },
  'GET /api/partner-support': (params,query,body,ctx) => { if (!['merchant','admin'].includes(ctx.user.role)) return forbidden('parceiros');const store=platform.storeForUser(ctx.user);return {tickets:db.state.supportTickets.filter(t=>t.storeId===store.id)} },
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

    if (clean.startsWith('/api/partner-')) {
      if (!['merchant','admin'].includes(ctxUser.role)) { sendJson(res,403,{error:'Acesso exclusivo para parceiros.',code:'PARTNER_ROLE_REQUIRED'});return }
      const ownedStore=platform.storeForUser(ctxUser)
      if (!ownedStore) { sendJson(res,403,{error:'Nenhum estabelecimento está vinculado a esta conta.',code:'STORE_REQUIRED'});return }
      const subscription=db.state.subscriptions.find(item=>item.storeId===ownedStore.id)
      const allowsPendingSubscription=clean==='/api/partner-subscription-pix'
      if (!allowsPendingSubscription && ctxUser.role!=='admin' && subscription?.status!=='ACTIVE') { sendJson(res,403,{error:'A assinatura do estabelecimento ainda não está ativa.',code:'SUBSCRIPTION_INACTIVE',subscription:subscription?{status:subscription.status,planName:subscription.planName,price:subscription.price}:null});return }
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
      if (req.method === 'POST') body = await readBody(req)
      const result = await handler({ id: sub }, url.searchParams, body, ctx)
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
