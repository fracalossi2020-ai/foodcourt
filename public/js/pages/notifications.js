import { store } from '../core/store.js'
import { esc, emptyState } from '../core/ui.js'

export async function render(view) {
  let filter = 'all'
  const icons = { order: '🛵', coupon: '🎟️', promo: '🔥', benefits: '🏅' }

  function draw() {
    const notifications = filter === 'all' ? store.notifications : store.notifications.filter(notification => filter === 'orders' ? notification.type === 'order' : ['coupon','promo','benefits'].includes(notification.type))
    view.innerHTML = `<div class="page account-destination-page notifications-page">
      <a class="profile-back" href="#/perfil">← <span>Voltar ao perfil</span></a>
      <header class="destination-heading"><span class="destination-icon">🔔</span><div><span class="account-kicker">MINHA CONTA</span><h1>Notificações</h1><p>Atualizações importantes sem perder o que interessa.</p></div><a class="notification-settings-link" href="#/perfil?secao=configuracoes">Preferências ⚙️</a></header>
      <div class="destination-summary"><div><b>${store.notifications.length}</b><span>Recebidas</span></div><div><b>${store.unreadNotifs()}</b><span>Novas</span></div><a href="#/ofertas">Ver ofertas</a></div>
      <div class="tabs modern-tabs"><button class="chip ${filter === 'all' ? 'active' : ''}" data-filter="all">Todas</button><button class="chip ${filter === 'orders' ? 'active' : ''}" data-filter="orders">Pedidos</button><button class="chip ${filter === 'offers' ? 'active' : ''}" data-filter="offers">Ofertas</button></div>
      ${notifications.length === 0 ? emptyState({ emoji:'🔔', title:'Nada por aqui', sub:'Novas atualizações aparecerão nesta área.' }) : `<div class="notification-feed">${notifications.map(notification => { const read = notification.read || store.isNotificationRead(notification.id); return `<article class="notif-item ${read ? '' : 'unread'}"><div class="notif-emoji">${icons[notification.type] || '🔔'}</div><div class="notification-copy"><b>${esc(notification.title)}</b><p>${esc(notification.text)}</p><span>${esc(notification.time)}</span></div><i class="notification-dot" aria-label="${read ? 'Lida' : 'Nova'}"></i></article>` }).join('')}</div>`}
    </div>`
    view.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; draw() }))
  }

  draw()
  store.markNotifsRead()
  setTimeout(() => window.dispatchEvent(new Event('fc:notifs')), 50)
}
