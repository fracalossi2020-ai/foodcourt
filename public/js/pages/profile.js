import { store } from '../store.js'
import { api } from '../api.js'
import { esc } from '../ui.js'

export async function render(view, boot) {
  const u = store.user
  const orderCount = store.orders.length
  const couponCount = store.coupons.length

  view.innerHTML = `
  <div class="page" style="max-width:680px;margin:0 auto">
    <h1 class="h-lg" style="margin-bottom:16px">Perfil</h1>

    <div class="profile-head">
      <div class="profile-avatar">${u.avatarEmoji}</div>
      <div style="flex:1;min-width:0">
        <h2 style="font-size:1.2rem">${esc(u.fullName)}</h2>
        <div class="muted text-sm">${esc(u.email)}</div>
        <div class="muted text-sm">${esc(u.phone)}</div>
        <div class="pair" style="margin-top:8px">
          <span class="badge badge-brand">🏅 Nível ${esc(u.level)}</span>
          <span class="badge badge-dark">Membro desde ${esc(u.memberSince)}</span>
        </div>
      </div>
    </div>

    <div class="profile-stats">
      <div class="stat-box"><b>${orderCount}</b><span>PEDIDOS</span></div>
      <div class="stat-box"><b>${u.points}</b><span>PONTOS FC</span></div>
      <div class="stat-box"><b>${couponCount}</b><span>CUPONS</span></div>
    </div>

    <section class="section">
      <div class="card" style="overflow:hidden">
        <div class="plist">
          ${item('👤', 'Minha conta', 'Nome, email, telefone', '#/perfil')}
          ${item('📦', 'Meus pedidos', 'Em andamento e anteriores', '#/pedidos')}
          ${item('❤️', 'Favoritos', 'Restaurantes e produtos', '#/favoritos')}
          ${item('📍', 'Endereços', `${store.addresses.length} salvos`, '#/perfil')}
          ${item('💳', 'Pagamentos', 'Cartões, Pix e carteira', '#/perfil')}
          ${item('🎟️', 'Cupons', `${couponCount} na carteira`, '#/ofertas')}
          ${item('🏅', 'Programa de benefícios', `${u.cashback}% cashback ativo`, '#/perfil')}
          ${item('🔔', 'Notificações', 'Preferências de alerta', '#/notificacoes')}
          ${item('⚙️', 'Configurações', 'Privacidade e preferências', '#/perfil')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="card dark-panel" style="padding:20px">
        <div class="pair" style="margin-bottom:10px">
          <span style="font-size:1.6rem">🏅</span>
          <div>
            <b>Benefícios do nível ${esc(u.level)}</b>
            <div class="muted text-sm">Faltam ${1500 - u.points} pontos para o nível Ouro 👑</div>
          </div>
        </div>
        <div class="freeship-bar">
          <div class="freeship-track"><div class="freeship-fill" style="width:${Math.min(100, u.points / 1500 * 100)}%"></div></div>
        </div>
        <ul class="coupon-rules" style="margin-top:12px">
          <li>${u.cashback}% de cashback em cada pedido</li>
          <li>Ofertas exclusivas de terça</li>
          <li>Suporte prioritário 24/7</li>
        </ul>
      </div>
    </section>

    <button class="btn btn-dark btn-block" id="logoutBtn">Sair da conta</button>
  </div>`

  view.querySelectorAll('[data-goto]').forEach(n => n.addEventListener('click', () => { location.hash = n.dataset.goto }))
  const logoutBtn = document.getElementById('logoutBtn')
  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true
    logoutBtn.textContent = 'Saindo...'
    try {
      await api.logout()
    } catch { }
    window.dispatchEvent(new Event('fc:logout'))
  })
}

function item(emoji, label, sub, href) {
  return `
  <a class="plist-item" data-goto="${href}" href="${href}">
    <span class="plist-emoji">${emoji}</span>
    <span class="pl-label">${label}<span class="pl-sub">${sub}</span></span>
    <span class="chev">→</span>
  </a>`
}
