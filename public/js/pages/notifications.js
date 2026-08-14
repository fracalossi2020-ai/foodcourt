import { store } from '../store.js'
import { esc, emptyState } from '../ui.js'

export async function render(view, boot) {
  store.markNotifsRead()
  const icons = { order: '🛵', coupon: '🎟️', promo: '🔥', benefits: '🏅' }

  view.innerHTML = `
  <div class="page" style="max-width:680px;margin:0 auto">
    <h1 class="h-lg" style="margin-bottom:16px">Notificações</h1>
    ${store.notifications.length === 0
      ? emptyState({ emoji: '🔔', title: 'Nenhuma notificação', sub: 'Fique de olho — promoções e avisos de pedidos aparecem aqui.' })
      : `<div class="card" style="overflow:hidden">
          ${store.notifications.map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}">
            <div class="notif-emoji">${icons[n.type] || '🔔'}</div>
            <div style="flex:1;min-width:0">
              <b class="text-sm">${esc(n.title)}</b>
              <div class="muted text-sm" style="margin-top:2px">${esc(n.text)}</div>
            </div>
            <span class="text-xs dim" style="white-space:nowrap">${esc(n.time)}</span>
          </div>`).join('')}
        </div>`}
  </div>`

  setTimeout(() => window.dispatchEvent(new Event('fc:notifs')), 50)
}
