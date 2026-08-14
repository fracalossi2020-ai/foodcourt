import { store } from '../store.js'
import { esc, money, emptyState } from '../ui.js'

const STAGES = [
  { emoji: '✓', title: 'Pedido recebido', sub: 'O Food Court recebeu seu pedido', at: 0 },
  { emoji: '✓', title: 'Restaurante confirmou', sub: 'Seu pedido foi aceito pela cozinha', at: 0.06 },
  { emoji: '🍳', title: 'Preparando pedido', sub: 'A cozinha está preparando tudo com capricho', at: 0.15 },
  { emoji: '🚴', title: 'Entregador a caminho', sub: 'Pedido saiu para entrega', at: 0.55 },
  { emoji: '📍', title: 'Pedido chegando', sub: 'O entregador está no seu bairro', at: 0.85 },
  { emoji: '✓', title: 'Entregue', sub: 'Bom apetite!', at: 1 }
]

const TOTAL_MS = 1000 * 60 * 30

export async function render(view, boot, params) {
  const order = store.getOrder(params.id)
  if (!order) {
    view.innerHTML = `<div class="page">${emptyState({ emoji: '📦', title: 'Pedido não encontrado', sub: 'Verifique seus pedidos em andamento.', action: '#/pedidos', actionLabel: 'Ver meus pedidos' })}</div>`
    return
  }

  view.innerHTML = `
  <div class="page" style="max-width:680px;margin:0 auto">
    <div id="trackRoot"></div>
  </div>`

  const root = document.getElementById('trackRoot')
  let timer

  function draw() {
    const elapsed = Date.now() - order.createdAt
    const progress = Math.min(1, elapsed / TOTAL_MS)
    let current = 0
    STAGES.forEach((s, i) => { if (progress >= s.at) current = i })
    const remaining = Math.max(0, Math.ceil((TOTAL_MS - elapsed) / 60000))
    const done = progress >= 1

    root.innerHTML = `
      <div class="tracking-status" style="margin-bottom:22px">
        <div class="pair" style="justify-content:space-between;margin-bottom:6px">
          <span class="badge ${done ? 'badge-green' : 'badge-brand'}">${done ? '✓ ENTREGUE' : 'PEDIDO CONFIRMADO ✓'}</span>
          <span class="badge badge-dark">#${esc(order.id)}</span>
        </div>
        <div class="tracking-eta">${done ? '🗑' : remaining} <small>${done ? 'esperando você de novo' : 'min restantes aprox.'}</small></div>
        <div class="muted text-sm" style="margin-top:4px">Pedido feito às ${new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div class="card" style="padding:20px 22px;margin-bottom:14px">
        <div class="order-head" style="margin-bottom:18px">
          <div class="order-logo">${order.emoji}</div>
          <div class="oh-main">
            <b>${esc(order.restaurantName)}</b>
            <div class="muted text-sm">${esc(order.address)}</div>
          </div>
          <a class="btn btn-dark btn-sm" href="#/restaurante/${order.restaurantId}">Ver loja</a>
        </div>
        <div class="timeline">
          ${STAGES.map((s, i) => `
          <div class="tl-item ${i < current ? 'done' : i === current && !done ? 'current' : done ? 'done' : ''}">
            <div class="tl-rail">
              <div class="tl-dot">${i <= current ? s.emoji : ''}</div>
              ${i < STAGES.length - 1 ? '<div class="tl-line"></div>' : ''}
            </div>
            <div class="tl-content">
              <div class="tl-title">${esc(s.title)}</div>
              <div class="tl-sub">${esc(s.sub)}</div>
            </div>
          </div>`).join('')}
        </div>
        ${current >= 3 && !done ? `
        <div class="card" style="padding:14px;display:flex;align-items:center;gap:12px;background:var(--surface-2)">
          <div class="order-logo" style="width:42px;height:42px;font-size:1.1rem">🛵</div>
          <div style="flex:1">
            <b class="text-sm">Carlos M.</b>
            <div class="text-xs dim">Entregador • Moto Honda Preta • FC-42</div>
          </div>
          <button class="icon-btn" aria-label="Ligar com entregador">📞</button>
        </div>` : ''}
      </div>

      <div class="card" style="padding:16px 18px;margin-bottom:14px;display:flex;flex-direction:column;gap:8px">
        <div class="pair text-sm"><span>💳</span><span class="muted">${esc(order.payment)}</span></div>
        <div class="pair text-sm"><span>📍</span><span class="muted">${esc(order.address)}</span></div>
        ${order.coupon ? `<div class="pair text-sm"><span>🎟️</span><span class="muted">Cupom ${esc(order.coupon)}</span></div>` : ''}
        <div class="pair text-sm" style="justify-content:space-between;border-top:1px solid var(--border);padding-top:10px;margin-top:4px">
          <b>Total</b><b class="brand-text">${money(order.total)}</b>
        </div>
      </div>

      <div class="pair">
        <a class="btn btn-ghost" href="#/pedidos" style="flex:1">Meus pedidos</a>
        <a class="btn btn-outline" href="#/" style="flex:1">Pedir mais algo 🍔</a>
      </div>
      <p class="text-xs dim" style="text-align:center;margin-top:18px">📍 Localização do entregador em tempo real em breve no Food Court</p>`

    if (!done) { clearTimeout(window.__trackTimer); window.__trackTimer = setTimeout(draw, 15000) }
  }

  draw()
}

export function cleanup() { clearTimeout(window.__trackTimer) }
