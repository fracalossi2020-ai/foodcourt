import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { esc, money, emptyState, toast } from '../core/ui.js'

const stages=[['pending','Pedido recebido','A loja recebeu seu pedido.'],['accepted','Pedido aceito','A cozinha confirmou o pedido.'],['preparing','Em preparação','Seu pedido está sendo preparado.'],['ready','Pedido pronto','Tudo pronto para a próxima etapa.'],['delivered','Entregue','Bom apetite!']]
export async function render(view,boot,params){
  let order
  try{order=(await api.order(params.id)).order}catch{order=store.getOrder(params.id)}
  if(!order){view.innerHTML=`<div class="page">${emptyState({emoji:'📦',title:'Pedido não encontrado',sub:'Consulte seu histórico de pedidos.',action:'#/pedidos',actionLabel:'Ver pedidos'})}</div>`;return}
  const createdAt=typeof order.createdAt==='number'?order.createdAt:new Date(order.createdAt).getTime()
  view.innerHTML='<div class="page" style="max-width:720px;margin:0 auto"><div id="trackRoot"></div></div>'
  const root=view.querySelector('#trackRoot')
  function draw(){
    const current=Math.max(0,stages.findIndex(stage=>stage[0]===order.status));const finished=['delivered','cancelled'].includes(order.status)
    root.innerHTML=`<a class="profile-back" href="#/pedidos">← Voltar aos pedidos</a><section class="tracking-status"><div class="pair" style="justify-content:space-between"><span class="badge ${order.status==='cancelled'?'badge-red':finished?'badge-green':'badge-brand'}">${order.status==='cancelled'?'CANCELADO':finished?'ENTREGUE':'ACOMPANHAMENTO AO VIVO'}</span><span class="badge badge-dark">#${esc(order.id)}</span></div><h1>${order.status==='cancelled'?'Pedido cancelado':stages[current][1]}</h1><p>${order.status==='cancelled'?esc(order.cancelReason||'Cancelado pelo cliente.'):stages[current][2]}</p><small>Atualizado em ${new Date(order.updatedAt||createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></section><section class="card" style="padding:22px;margin-top:16px"><div class="order-head"><div class="order-logo">🍔</div><div class="oh-main"><b>${esc(order.restaurantName||'Estabelecimento')}</b><div class="muted text-sm">${esc(order.address||'Endereço selecionado')}</div></div><b>${money(order.total)}</b></div><div class="timeline" style="margin-top:24px">${stages.map((stage,index)=>`<div class="tl-item ${index<current||finished&&order.status==='delivered'?'done':index===current&&!finished?'current':''}"><div class="tl-rail"><div class="tl-dot">${index<=current&&order.status!=='cancelled'?'✓':''}</div>${index<stages.length-1?'<div class="tl-line"></div>':''}</div><div class="tl-content"><div class="tl-title">${stage[1]}</div><div class="tl-sub">${stage[2]}</div></div></div>`).join('')}</div>${['pending','accepted'].includes(order.status)?'<button class="btn btn-ghost btn-block" data-cancel>Cancelar pedido</button>':''}</section><div class="pair" style="margin-top:14px"><a class="btn btn-outline" href="#/pedidos" style="flex:1">Meus pedidos</a><a class="btn btn-primary" href="#/inicio" style="flex:1">Continuar explorando</a></div>`
    root.querySelector('[data-cancel]')?.addEventListener('click',async()=>{const reason=window.prompt('Por que deseja cancelar?','Mudei de ideia');if(reason===null)return;try{order=(await api.cancelOrder(order.id,reason)).order;toast('Pedido cancelado.','success');draw()}catch(error){toast(error.message,'error')}})
  }
  draw()
  if(!['delivered','cancelled'].includes(order.status))window.__trackTimer=setInterval(async()=>{try{order=(await api.order(order.id)).order;draw()}catch{}},10000)
}
export function cleanup(){clearInterval(window.__trackTimer)}
