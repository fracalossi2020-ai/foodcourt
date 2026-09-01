const cache = new Map()

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.status = status
    this.code = payload?.code
    this.fields = payload?.fields
    this.payload = payload
  }
}

function unauthorized() {
  window.dispatchEvent(new Event('fc:unauthorized'))
}

async function get(path, { ttl = 0 } = {}) {
  if (ttl && cache.has(path)) {
    const { at, data } = cache.get(path)
    if (Date.now() - at < ttl) return data
  }
  const res = await fetch(path)
  if (res.status === 401) { unauthorized(); throw new ApiError('Não autenticado.', 401) }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.error || `Falha ao carregar (${res.status})`, res.status, body)
  if (ttl) cache.set(path, { at: Date.now(), data: body })
  return body
}

async function post(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {})
  })
  const body = await res.json().catch(() => ({}))
  if (res.status === 401) { unauthorized(); throw new ApiError(body.error || 'Não autenticado.', 401, body) }
  if (!res.ok) throw new ApiError(body.error || 'Não conseguimos concluir sua solicitação agora. Tente novamente.', res.status, body)
  cache.clear()
  return body
}

export const api = {
  bootstrap: () => get('/api/bootstrap', { ttl: 60000 }),
  home: () => get('/api/home', { ttl: 30000 }),
  restaurant: (id) => get(`/api/restaurants/${id}`),
  search: (q) => get(`/api/search?q=${encodeURIComponent(q)}`),
  flashDeals: () => get('/api/flash-deals'),
  partnerDashboard: () => get('/api/partner-dashboard'),
  partnerOrders: () => get('/api/partner-orders'),
  partnerCatalog: () => get('/api/partner-catalog'),
  partnerPromotions: () => get('/api/partner-promotions'),
  partnerFinance: () => get('/api/partner-finance'),
  partnerTeam: () => get('/api/partner-team'),
  partnerReviews: () => get('/api/partner-reviews'),
  partnerSupport: () => get('/api/partner-support'),
  updatePartnerOrder: (orderId, status) => post('/api/partner-order-status', { orderId, status }),
  savePartnerProduct: (product) => post('/api/partner-product', product),
  analyzePartnerMenu: (image) => post('/api/partner-menu-analyze', { image }),
  importPartnerMenu: (products) => post('/api/partner-menu-import', { products }),
  updatePartnerStore: (changes) => post('/api/partner-store', changes),
  savePartnerPromotion: (promotion) => post('/api/partner-promotion', promotion),
  savePartnerTeamMember: (member) => post('/api/partner-team-member', member),
  replyPartnerReview: (reviewId, reply) => post('/api/partner-review-reply', { reviewId, reply }),
  savePartnerSupport: (ticket) => post('/api/partner-support-ticket', ticket),
  createPartnerSubscriptionPix: () => post('/api/partner-subscription-pix'),
  adminDashboard: () => get('/api/admin-dashboard'),
  orders: () => get('/api/orders'),
  createOrder: (order) => post('/api/orders', order),
  createPixCharge: (amount) => post('/api/pix-charge', { amount }),
  order: (id) => get(`/api/order/${id}`),
  cancelOrder: (orderId, reason) => post('/api/order-cancel', { orderId, reason }),
  customerReviews: () => get('/api/customer-reviews'),
  createReview: (review) => post('/api/customer-reviews', review),
  loyalty: () => get('/api/loyalty'),
  customerSupport: () => get('/api/customer-support'),
  createSupportTicket: (ticket) => post('/api/customer-support', ticket),
  cep: (cep) => get(`/api/cep/${String(cep).replace(/\D/g, '')}`),

  me: () => get('/api/auth/me'),
  turnstileConfig: () => get('/api/auth/turnstile-config', { ttl: 300000 }),
  login: (credentials) => post('/api/auth/login', credentials),
  register: (data) => post('/api/auth/register', data),
  registerPartner: (data) => post('/api/auth/partner-register', data),
  logout: () => post('/api/auth/logout'),
  forgotPassword: (email) => post('/api/auth/forgot-password', { email }),
  resetPassword: (payload) => post('/api/auth/reset-password', payload)
}
