import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { esc, toast } from '../core/ui.js'

let timer
export async function render(view, boot, params) {
  const draw = async () => {
    try {
      const data=await api.orderChat(params.id)
      view.innerHTML=`<div class="page" style="max-width:720px;margin:auto"><a class="profile-back" href="javascript:history.back()">← Voltar</a><header class="destination-heading"><span class="destination-icon">💬</span><div><span class="account-kicker">PEDIDO ${esc(params.id)}</span><h1>Conversa do pedido</h1><p>Cliente, loja e entregador no mesmo canal protegido.</p></div></header><section class="card" style="padding:20px"><div style="display:grid;gap:10px;min-height:240px;max-height:55vh;overflow:auto">${data.messages.map(message=>`<article style="padding:12px;border-radius:12px;background:${message.userId===store.user?.id?'var(--brand-soft)':'var(--surface-2)'}"><b>${esc(message.senderName)}</b><p>${esc(message.text)}</p><small>${new Date(message.at).toLocaleString('pt-BR')}</small></article>`).join('')||'<p class="muted">Nenhuma mensagem ainda.</p>'}</div><form class="pair" data-chat-form style="margin-top:16px"><input class="input" name="text" maxlength="600" placeholder="Escreva uma mensagem" required><button class="btn btn-primary">Enviar</button></form></section></div>`
      view.querySelector('[data-chat-form]')?.addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button'),text=event.currentTarget.elements.text.value;button.disabled=true;try{await api.sendOrderMessage(params.id,text);await draw()}catch(error){toast(error.message,'error');button.disabled=false}})
    } catch(error){view.innerHTML=`<div class="state-box"><div class="state-emoji">💬</div><h3>Conversa indisponível</h3><p>${esc(error.message)}</p></div>`}
  }
  await draw();timer=setInterval(draw,10000)
}
export function cleanup(){clearInterval(timer)}
