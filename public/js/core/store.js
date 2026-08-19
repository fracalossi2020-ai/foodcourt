const LS = 'foodcourt:v1'

const persisted = {
  cart: { restaurantId: null, items: [] },
  favorites: { restaurants: [], products: [] },
  coupons: [],
  orders: [],
  readNotifs: [],
  searchHistory: [],
  addressId: 'home',
  preferredPaymentId: 'pix',
  profileOverrides: {},
  customAddresses: [],
  preferences: { orderUpdates: true, promotions: true, darkMode: false, personalizedOffers: true }
}

function load() {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return
    const data = JSON.parse(raw)
    for (const k of Object.keys(persisted)) {
      if (data[k] !== undefined) persisted[k] = data[k]
    }
  } catch { }
}
load()

const listeners = new Set()

function commit() {
  try { localStorage.setItem(LS, JSON.stringify(persisted)) } catch { }
  listeners.forEach(fn => fn(persisted))
}

export const store = {
  ...persisted,

  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn) },

  get address() {
    return store.addresses.find(a => a.id === persisted.addressId) || store.addresses[0]
  },

  setAddress(id) { persisted.addressId = id; commit() },

  addAddress(address) {
    const item = { ...address, id: address.id || `address_${Date.now()}`, emoji: address.emoji || '📍', current: false, custom: true }
    persisted.customAddresses.push(item)
    store.addresses = [...store.addresses.filter(existing => existing.id !== item.id), item]
    persisted.addressId = item.id
    commit()
    return item
  },

  setPreferredPayment(id) { persisted.preferredPaymentId = id; commit() },

  get preferredPaymentId() { return persisted.preferredPaymentId },

  updateProfile(fields) {
    persisted.profileOverrides = { ...persisted.profileOverrides, ...fields }
    store.user = { ...store.user, ...persisted.profileOverrides }
    commit()
  },

  get preferences() { return persisted.preferences },

  setPreference(key, value) {
    persisted.preferences[key] = Boolean(value)
    commit()
  },

  cartCount() { return persisted.cart.items.reduce((n, i) => n + i.qty, 0) },

  cartAdd(restaurantId, restaurantName, item) {
    const key = `${restaurantId}|${item.uid}`
    const existing = persisted.cart.items.find(i => i.cartKey === key)
    if (existing) existing.qty += item.qty
    else persisted.cart.items.push({ ...item, cartKey:key, restaurantId, restaurantName })
    persisted.cart.restaurantId = persisted.cart.items[0]?.restaurantId || restaurantId
    commit()
    return 'ok'
  },

  cartUpdateQty(uid, delta) {
    const it = persisted.cart.items.find(i => (i.cartKey || i.uid) === uid)
    if (!it) return
    it.qty += delta
    if (it.qty <= 0) persisted.cart.items = persisted.cart.items.filter(i => (i.cartKey || i.uid) !== uid)
    if (!persisted.cart.items.length) persisted.cart.restaurantId = null
    else persisted.cart.restaurantId = persisted.cart.items[0].restaurantId
    commit()
  },

  cartClear() {
    persisted.cart.restaurantId = null
    persisted.cart.items = []
    commit()
  },

  cartTotals(baseFee = 0, freeMin = 0) {
    const items = persisted.cart.items
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
    let fee = baseFee
    if (freeMin && subtotal >= freeMin) fee = 0
    if (fee === 0) fee = 0
    const coupon = store.appliedCoupon(subtotal, fee)
    let discount = 0
    if (coupon) {
      if (coupon.type === 'fixed') discount = Math.min(coupon.value, subtotal)
      else if (coupon.type === 'percent') discount = Math.min(subtotal * coupon.value / 100, coupon.max || Infinity)
      if (coupon.type === 'shipping') fee = 0
    }
    const total = Math.max(0, subtotal + fee - discount)
    return { subtotal, fee: Math.max(0, fee), discount, total, coupon }
  },

  appliedCoupon(subtotal, fee) {
    const codes = persisted.coupons
    if (!codes.length) return null
    const code = codes[codes.length - 1]
    const c = store.couponDefs.find(x => x.code === code)
    if (!c) return null
    const min = c.rules.min || 0
    if (subtotal < min) return null
    return c
  },

  couponDefs: [],

  addCoupon(code) {
    if (!persisted.coupons.includes(code)) persisted.coupons.push(code)
    commit()
  },

  removeLastCoupon() { persisted.coupons.pop(); commit() },

  isFavoriteRestaurant(id) { return persisted.favorites.restaurants.includes(id) },
  toggleFavoriteRestaurant(id) {
    const arr = persisted.favorites.restaurants
    const i = arr.indexOf(id)
    if (i >= 0) arr.splice(i, 1)
    else arr.push(id)
    commit()
    return i < 0
  },
  isFavoriteProduct(id) { return persisted.favorites.products.includes(id) },
  toggleFavoriteProduct(id) {
    const arr = persisted.favorites.products
    const i = arr.indexOf(id)
    if (i >= 0) arr.splice(i, 1)
    else arr.push(id)
    commit()
    return i < 0
  },

  addOrder(order) {
    persisted.orders.unshift(order)
    commit()
    return order
  },
  getOrder(id) { return persisted.orders.find(o => o.id === id) },
  repeatOrder(order) {
    persisted.cart.restaurantId = order.restaurantId
    persisted.cart.items = order.items.map(i => ({ ...i }))
    commit()
  },

  unreadNotifs() { return store.notifications.filter(n => !persisted.readNotifs.includes(n.id)).length },
  isNotificationRead(id) { return persisted.readNotifs.includes(id) },
  markNotifsRead() {
    persisted.readNotifs = store.notifications.map(n => n.id)
    commit()
  },

  pushSearch(term) {
    const t = term.trim()
    if (!t) return
    persisted.searchHistory = [t, ...persisted.searchHistory.filter(x => x !== t)].slice(0, 8)
    commit()
  },
  removeSearch(term) {
    persisted.searchHistory = persisted.searchHistory.filter(x => x !== term)
    commit()
  },

  notifications: [],
  addresses: [],
  user: null
}

export function setAuthUser(user) {
  store.user = user
  commit()
}

export function hydrateBootstrap(boot) {
  if (boot.user) store.user = { ...boot.user, ...persisted.profileOverrides }
  store.addresses = [...boot.addresses, ...persisted.customAddresses]
  store.notifications = boot.notifications
  store.couponDefs = boot.coupons
  commit()
}
