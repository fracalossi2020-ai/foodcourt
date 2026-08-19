import { store } from '../core/store.js'
import { api } from '../core/api.js'
import { esc, toast } from '../core/ui.js'

const sections = {
  conta: { icon: '👤', title: 'Minha conta', subtitle: 'Nome, e-mail e telefone' },
  enderecos: { icon: '📍', title: 'Endereços', subtitle: 'Escolha onde deseja receber seus pedidos' },
  pagamentos: { icon: '💳', title: 'Pagamentos', subtitle: 'Defina sua forma de pagamento preferida' },
  beneficios: { icon: '🏅', title: 'Programa de benefícios', subtitle: 'Acompanhe seus pontos e vantagens' },
  configuracoes: { icon: '⚙️', title: 'Configurações', subtitle: 'Privacidade, aparência e preferências' }
}

export async function render(view, boot, params = {}, query = new URLSearchParams()) {
  const sectionId = query.get('secao')
  if (sections[sectionId]) {
    renderSection(view, boot, sectionId)
    return
  }
  renderOverview(view)
}

function renderOverview(view) {
  const u = store.user
  const orderCount = store.orders.length
  const couponCount = store.coupons.length

  view.innerHTML = `<div class="page profile-page">
    <header class="account-page-heading"><div><span class="account-kicker">CENTRAL DO CLIENTE</span><h1>Olá, ${esc(u.fullName.split(' ')[0])}</h1><p>Gerencie sua conta e deixe o FoodCourt com a sua cara.</p></div><span class="account-security">✓ Conta protegida</span></header>
    <div class="profile-head">
      <div class="profile-avatar">${u.avatarEmoji}</div>
      <div class="profile-user-copy"><h2>${esc(u.fullName)}</h2><div class="muted text-sm">${esc(u.email)}</div><div class="muted text-sm">${esc(u.phone)}</div><div class="pair profile-badges"><span class="badge badge-brand">🏅 Nível ${esc(u.level)}</span><span class="badge badge-dark">Membro desde ${esc(u.memberSince)}</span></div></div>
    </div>
    <div class="profile-stats"><div class="stat-box"><b>${orderCount}</b><span>PEDIDOS</span></div><div class="stat-box"><b>${u.points}</b><span>PONTOS FC</span></div><div class="stat-box"><b>${couponCount}</b><span>CUPONS</span></div></div>
    <section class="section account-menu-section"><div class="section-head"><div><h2>Sua conta</h2><div class="sub">Acesse rapidamente tudo que você precisa</div></div></div><div class="profile-menu-card"><div class="plist">
      ${item('👤','Minha conta','Nome, e-mail e telefone','#/perfil?secao=conta')}
      ${item('📦','Meus pedidos','Em andamento e anteriores','#/pedidos')}
      ${item('❤️','Favoritos','Restaurantes e produtos','#/favoritos')}
      ${item('📍','Endereços',`${store.addresses.length} salvos`,'#/perfil?secao=enderecos')}
      ${item('💳','Pagamentos','Cartões, Pix e carteira','#/perfil?secao=pagamentos')}
      ${item('🎟️','Cupons',`${couponCount} na carteira`,'#/ofertas')}
      ${item('🏅','Programa de benefícios',`${u.cashback}% cashback ativo`,'#/fidelidade')}
      ${item('🔔','Notificações','Alertas e novidades','#/notificacoes')}
      ${item('💬','Ajuda e suporte','Pedidos, pagamentos e atendimento','#/suporte')}
      ${u.role === 'merchant' || u.role === 'admin' ? item('▦','Portal do Parceiro','Administrar estabelecimento','#/parceiro') : item('↗','Venda no FoodCourt','Tem um estabelecimento? Seja parceiro.','#/para-estabelecimentos')}
      ${item('⚙️','Configurações','Privacidade e preferências','#/perfil?secao=configuracoes')}
    </div></div></section>
    <button class="btn btn-dark btn-block" id="logoutBtn">Sair da conta</button>
  </div>`

  view.querySelector('#logoutBtn')?.addEventListener('click', logout)
}

function renderSection(view, boot, sectionId) {
  const section = sections[sectionId]
  view.innerHTML = `<div class="page profile-page profile-detail-page">
    <a class="profile-back" href="#/perfil" aria-label="Voltar ao perfil">← <span>Voltar ao perfil</span></a>
    <header class="profile-detail-head"><span class="profile-detail-icon">${section.icon}</span><div><span class="account-kicker">MINHA CONTA</span><h1>${esc(section.title)}</h1><p>${esc(section.subtitle)}</p></div></header>
    ${accountSubnav(sectionId)}
    ${sectionContent(sectionId, boot)}
  </div>`
  bindSection(view, sectionId)
}

function sectionContent(sectionId, boot) {
  const u = store.user
  if (sectionId === 'conta') return `<div class="account-completion"><span><b>Perfil completo</b><small>Seus dados ajudam a tornar as entregas mais seguras.</small></span><strong>100%</strong></div><form class="card profile-detail-card profile-form" id="accountForm">
    <label>Nome completo<input class="input" name="fullName" value="${esc(u.fullName)}" required minlength="3"></label>
    <label>E-mail<input class="input" name="email" type="email" value="${esc(u.email)}" required></label>
    <label>Telefone<input class="input" name="phone" type="tel" value="${esc(u.phone)}" required></label>
    <button class="btn btn-primary" type="submit">Salvar alterações</button>
  </form>`

  if (sectionId === 'enderecos') return `<div class="detail-info-banner"><span>🚴</span><div><b>Destino da próxima entrega</b><small>Toque em um endereço para torná-lo o principal.</small></div></div><div class="profile-option-list">${store.addresses.map(address => optionCard({
    id: address.id, group: 'address', selected: store.address?.id === address.id, icon: address.emoji,
    title: address.label, description: `${address.street} · ${address.city}`
  })).join('')}</div>`

  if (sectionId === 'pagamentos') return `<div class="detail-info-banner"><span>🔒</span><div><b>Pagamento seguro</b><small>Seus dados sensíveis não ficam expostos no FoodCourt.</small></div></div><div class="profile-option-list">${boot.paymentMethods.map(payment => optionCard({
    id: payment.id, group: 'payment', selected: store.preferredPaymentId === payment.id, icon: payment.emoji,
    title: payment.name, description: payment.description
  })).join('')}</div>`

  if (sectionId === 'beneficios') {
    const nextPoints = Math.max(0, 1500 - u.points)
    return `<div class="card dark-panel profile-benefits-card"><div class="benefit-medal">🏅</div><h2>Nível ${esc(u.level)}</h2><p>${nextPoints ? `Faltam ${nextPoints} pontos para o nível Ouro.` : 'Você alcançou a meta do nível Ouro!'}</p><div class="freeship-bar"><div class="freeship-track"><div class="freeship-fill" style="width:${Math.min(100,u.points/1500*100)}%"></div></div></div><ul class="coupon-rules"><li>${u.cashback}% de cashback em cada pedido</li><li>Ofertas exclusivas de terça</li><li>Suporte prioritário 24/7</li></ul></div>`
  }

  const preferences = store.preferences
  return `<div class="card profile-settings-card">
    ${toggle('orderUpdates','Atualizações dos pedidos','Receber alertas sobre o andamento dos pedidos',preferences.orderUpdates)}
    ${toggle('promotions','Promoções e cupons','Receber ofertas e novidades do FoodCourt',preferences.promotions)}
    ${toggle('personalizedOffers','Ofertas personalizadas','Usar seu histórico para melhorar recomendações',preferences.personalizedOffers)}
    ${toggle('darkMode','Modo escuro','Alterar a aparência do aplicativo',document.documentElement.dataset.theme === 'dark')}
  </div>`
}

function bindSection(view, sectionId) {
  if (sectionId === 'conta') view.querySelector('#accountForm')?.addEventListener('submit', event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    store.updateProfile({ fullName: form.get('fullName').trim(), email: form.get('email').trim(), phone: form.get('phone').trim() })
    toast('Dados da conta atualizados.', 'success')
  })

  view.querySelectorAll('[data-address]').forEach(button => button.addEventListener('click', () => {
    store.setAddress(button.dataset.address)
    selectOnly(view, '[data-address]', button)
    toast('Endereço de entrega atualizado.', 'success')
  }))

  view.querySelectorAll('[data-payment]').forEach(button => button.addEventListener('click', () => {
    store.setPreferredPayment(button.dataset.payment)
    selectOnly(view, '[data-payment]', button)
    toast('Pagamento preferido atualizado.', 'success')
  }))

  view.querySelectorAll('[data-preference]').forEach(input => input.addEventListener('change', () => {
    store.setPreference(input.dataset.preference, input.checked)
    if (input.dataset.preference === 'darkMode') document.getElementById('themeBtn')?.click()
    toast('Preferência salva.', 'success')
  }))
}

function selectOnly(view, selector, selected) {
  view.querySelectorAll(selector).forEach(button => {
    const active = button === selected
    button.classList.toggle('selected', active)
    button.setAttribute('aria-pressed', String(active))
    button.querySelector('.profile-option-check').textContent = active ? '✓' : ''
  })
}

function optionCard({ id, group, selected, icon, title, description }) {
  return `<button class="card profile-option ${selected ? 'selected' : ''}" data-${group}="${esc(id)}" aria-pressed="${selected}"><span class="profile-option-icon">${icon}</span><span><b>${esc(title)}</b><small>${esc(description)}</small></span><i class="profile-option-check">${selected ? '✓' : ''}</i></button>`
}

function toggle(id, title, description, checked) {
  return `<label class="profile-toggle"><span><b>${title}</b><small>${description}</small></span><input type="checkbox" data-preference="${id}" ${checked ? 'checked' : ''}><i aria-hidden="true"></i></label>`
}

function accountSubnav(active) {
  return `<nav class="account-subnav no-scrollbar" aria-label="Áreas da conta">
    ${Object.entries(sections).map(([id, section]) => `<a class="${id === active ? 'active' : ''}" href="#/perfil?secao=${id}"><span>${section.icon}</span>${section.title}</a>`).join('')}
  </nav>`
}

function item(emoji, label, sub, href) {
  const opensPartnerTab = href === '#/parceiro' || href.startsWith('#/para-estabelecimentos')
  const externalTab = opensPartnerTab ? ' target="_blank" rel="noopener noreferrer"' : ''
  return `<a class="plist-item" href="${href}"${externalTab}><span class="plist-emoji">${emoji}</span><span class="pl-label">${label}<span class="pl-sub">${sub}</span></span><span class="chev">→</span></a>`
}

async function logout(event) {
  const button = event.currentTarget
  button.disabled = true
  button.textContent = 'Saindo...'
  try { await api.logout() } catch { }
  window.dispatchEvent(new Event('fc:logout'))
}
