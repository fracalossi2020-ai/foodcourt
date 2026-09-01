'use strict'
const db = require('./db')

const now = () => new Date().toISOString()
const uid = prefix => db.uid(prefix)

function seed() {
  const state = db.state
  const demoProductIds = new Set(['prod_neon_duplo','prod_combo_neon','prod_smash','prod_fritas'])
  state.platformOrders = state.platformOrders.filter(order => !String(order.id).startsWith('FC-DEMO-'))
  state.promotions = state.promotions.filter(item => !['promo_neon20','promo_combo'].includes(item.id))
  state.storeMembers = state.storeMembers.filter(item => !['member_1','member_2'].includes(item.id))
  state.reviews = state.reviews.filter(item => !['review_1','review_2'].includes(item.id))
  state.supportTickets = state.supportTickets.filter(item => item.id !== 'ticket_1')
  state.subscriptions = state.subscriptions.filter(item => item.id !== 'sub_demo')

  const legacyStore = state.stores.find(store => store.id === 'store_burger_neon')
  if (legacyStore) {
    legacyStore.products = (legacyStore.products || []).filter(product => !demoProductIds.has(product.id))
    if (legacyStore.name === 'Burger Neon') {
      Object.assign(legacyStore, {
        name: 'Meu estabelecimento', slug: 'meu-estabelecimento', category: 'Restaurante',
        description: '', status: 'active', open: false, rating: 0, commissionRate: 0,
        preparationMinutes: 30, minimumOrder: 0, categories: [], hours: {},
        address: { street:'', number:'', complement:'', neighborhood:'', city:'', state:'', cep:'' },
        phone: '', onboardingProgress: 10, updatedAt: now()
      })
    }
  }
  db.saveNow()
}

function storeForUser(user) {
  if (user.role === 'admin') return applyStoreSchedule(db.state.stores[0] || null)
  const ownedStore = db.state.stores.find(store => store.ownerId === user.id)
  if (ownedStore) return applyStoreSchedule(ownedStore)
  const membership = db.state.storeMembers.find(member => member.active && member.email.toLowerCase() === user.email.toLowerCase())
  return membership ? applyStoreSchedule(db.state.stores.find(store => store.id === membership.storeId) || null) : null
}

function brazilClock(date=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]))
  return {day:{Sun:'sun',Mon:'mon',Tue:'tue',Wed:'wed',Thu:'thu',Fri:'fri',Sat:'sat'}[parts.weekday],minutes:Number(parts.hour)*60+Number(parts.minute)}
}
function applyStoreSchedule(store,date=new Date()) {
  if(!store||!store.autoSchedule)return store
  const clock=brazilClock(date),days=['sun','mon','tue','wed','thu','fri','sat'],range=store.hours?.[clock.day],toMinutes=value=>{const [hour,minute]=String(value).split(':').map(Number);return hour*60+minute}
  let open=false
  if(Array.isArray(range)&&range[0]&&range[1]){const start=toMinutes(range[0]),end=toMinutes(range[1]);open=start===end?true:end>start?clock.minutes>=start&&clock.minutes<end:clock.minutes>=start}
  if(!open){const previousDay=days[(days.indexOf(clock.day)+6)%7],previous=store.hours?.[previousDay];if(Array.isArray(previous)&&previous[0]&&previous[1]){const start=toMinutes(previous[0]),end=toMinutes(previous[1]);if(end<start&&clock.minutes<end)open=true}}
  store.open=open
  return store
}
function audit(user, action, entityType, entityId, detail='') { db.state.auditLog.unshift({ id:uid('audit'), userId:user.id, role:user.role, action, entityType, entityId, detail, at:now() }); db.save() }
function dashboard(storeId) {
  const orders=db.state.platformOrders.filter(order=>order.storeId===storeId)
  const today=new Date().toISOString().slice(0,10)
  const todayOrders=orders.filter(order=>order.createdAt.slice(0,10)===today)
  const delivered=orders.filter(order=>order.status==='delivered')
  const daily=Array.from({length:7},(_,index)=>{const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-(6-index));const key=date.toISOString().slice(0,10),items=orders.filter(order=>new Date(order.createdAt).toISOString().slice(0,10)===key);return {date:key,label:date.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''),orders:items.length,revenue:items.filter(order=>order.status!=='cancelled').reduce((sum,order)=>sum+order.total,0)}})
  const status=['pending','accepted','preparing','ready','delivered','cancelled'].map(name=>({name,count:orders.filter(order=>order.status===name).length})).filter(item=>item.count)
  return { metrics:{ pending:orders.filter(o=>['pending','accepted','preparing','ready'].includes(o.status)).length, todayOrders:todayOrders.length, revenue:delivered.reduce((sum,o)=>sum+o.total,0), averageTicket:delivered.length?delivered.reduce((sum,o)=>sum+o.total,0)/delivered.length:0, rating:storeForId(storeId)?.rating||0 }, analytics:{daily,status}, recentOrders:orders.slice(0,8), lowStock:(storeForId(storeId)?.products||[]).filter(p=>p.stock<=10) }
}
function storeForId(id){return applyStoreSchedule(db.state.stores.find(store=>store.id===id))}
function finance(storeId){const orders=db.state.platformOrders.filter(o=>o.storeId===storeId&&o.status==='delivered');const gross=orders.reduce((s,o)=>s+o.total,0);const rate=storeForId(storeId)?.commissionRate||12;return { gross,commission:gross*rate/100,net:gross*(1-rate/100),orders:orders.length,nextPayout:new Date(Date.now()+7*86400000).toISOString() }}

module.exports={ seed, storeForUser, storeForId, dashboard, finance, audit, now, applyStoreSchedule }
