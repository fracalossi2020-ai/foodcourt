'use strict'
const db = require('./db')

const now = () => new Date().toISOString()
const uid = prefix => db.uid(prefix)

function seed() {
  const state = db.state
  if (!state.stores.length) state.stores.push({
    id: 'store_burger_neon', ownerId: null, name: 'Burger Neon', slug: 'burger-neon', category: 'Hambúrguer',
    status: 'active', open: true, rating: 4.8, commissionRate: 12, preparationMinutes: 28, description:'Hambúrgueres artesanais e combos.',
    categories:['Hambúrguer','Combos','Porções'], deliveryModes:['delivery'], minimumOrder:20,
    hours:{mon:['08:00','22:00'],tue:['08:00','22:00'],wed:['08:00','22:00'],thu:['08:00','22:00'],fri:['08:00','23:00'],sat:['10:00','23:00'],sun:['10:00','21:00']}, onboardingProgress:100,
    address: 'Av. Central, 100', phone: '(11) 4000-2026', createdAt: now(),
    products: [
      { id:'prod_neon_duplo', name:'Neon Duplo', category:'Hambúrguer', price:42.9, promoPrice:34.9, stock:42, active:true, sold:186 },
      { id:'prod_combo_neon', name:'Combo Neon', category:'Combos', price:58.9, promoPrice:46.9, stock:28, active:true, sold:143 },
      { id:'prod_smash', name:'Smash Trufado', category:'Hambúrguer', price:38.9, stock:18, active:true, sold:97 },
      { id:'prod_fritas', name:'Fritas Cheddar Bacon', category:'Porções', price:26.9, stock:8, active:true, sold:82 }
    ]
  })
  if (!state.promotions.length) state.promotions.push(
    { id:'promo_neon20', storeId:'store_burger_neon', name:'Neon 20%', type:'percent', value:20, active:true, uses:64, startsAt:now(), endsAt:'2027-12-31T23:59:59.000Z' },
    { id:'promo_combo', storeId:'store_burger_neon', name:'Combo do almoço', type:'combo', value:12, active:true, uses:31, startsAt:now(), endsAt:'2027-12-31T23:59:59.000Z' }
  )
  if (!state.platformOrders.length) {
    const statuses = ['pending','accepted','preparing','ready','delivered','delivered']
    state.platformOrders.push(...statuses.map((status,index) => ({
      id:`FC-DEMO-${1001+index}`, customerId:null, storeId:'store_burger_neon', status,
      customerName:['Ana Martins','Rafael Lima','Camila Souza','João Silva','Marina Alves','Lucas Costa'][index],
      items:[{ productId:index%2?'prod_combo_neon':'prod_neon_duplo', name:index%2?'Combo Neon':'Neon Duplo', quantity:index%3+1, unitPrice:index%2?46.9:34.9 }],
      subtotal:Number(((index%3+1)*(index%2?46.9:34.9)).toFixed(2)), deliveryFee:index%2?4.99:0,
      discount:index%2?5:0, total:Number((((index%3+1)*(index%2?46.9:34.9))+(index%2?-.01:0)).toFixed(2)),
      paymentMethod:index%2?'Pix':'Cartão', address:'Rua Demonstração, '+(120+index), createdAt:new Date(Date.now()-index*86400000).toISOString(), updatedAt:now()
    })))
  }
  if (!state.storeMembers.length) state.storeMembers.push(
    { id:'member_1', storeId:'store_burger_neon', name:'Marcos Oliveira', email:'marcos@burgerneon.com', role:'manager', active:true },
    { id:'member_2', storeId:'store_burger_neon', name:'Paula Santos', email:'paula@burgerneon.com', role:'kitchen', active:true }
  )
  if (!state.reviews.length) state.reviews.push(
    { id:'review_1', storeId:'store_burger_neon', customerName:'Ana Martins', rating:5, comment:'Pedido muito bem preparado.', replied:false, createdAt:now() },
    { id:'review_2', storeId:'store_burger_neon', customerName:'Rafael Lima', rating:4, comment:'Gostei, mas poderia chegar mais quente.', replied:false, createdAt:now() }
  )
  if (!state.supportTickets.length) state.supportTickets.push({ id:'ticket_1', customerId:null, storeId:'store_burger_neon', subject:'Dúvida sobre item', status:'open', priority:'normal', messages:[{ from:'customer', text:'O lanche pode ser preparado sem cebola?', at:now() }], createdAt:now() })
  if (!state.subscriptions.some(item=>item.storeId==='store_burger_neon')) state.subscriptions.push({id:'sub_demo',storeId:'store_burger_neon',planId:'foodcourt_partner',planName:'FoodCourt Parceiro',price:119.90,currency:'BRL',interval:'month',status:'ACTIVE',provider:null,nextBillingAt:null,createdAt:now(),updatedAt:now()})
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
