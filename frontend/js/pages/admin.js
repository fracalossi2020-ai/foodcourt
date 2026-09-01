import { api } from '../core/api.js'
import { esc, money } from '../core/ui.js'

export async function render(view) {
  view.innerHTML = '<div class="partner-loading">Carregando administração...</div>'
  try {
    const data = await api.adminDashboard()
    view.innerHTML = `<div class="admin-page">
      <header class="admin-head"><div><span>FOODCOURT CONTROL</span><h1>Administração da plataforma</h1><p>Operação, parceiros, usuários e auditoria em uma visão consolidada.</p></div><a class="btn btn-dark" href="#/perfil">Minha conta</a></header>
      <section class="partner-metrics">
        <article class="partner-metric"><i>👥</i><span>Usuários</span><b>${data.metrics.users}</b><small>contas cadastradas</small></article>
        <article class="partner-metric"><i>🏪</i><span>Lojas</span><b>${data.metrics.stores}</b><small>parceiros na base</small></article>
        <article class="partner-metric"><i>📦</i><span>Pedidos</span><b>${data.metrics.orders}</b><small>processados</small></article>
        <article class="partner-metric"><i>💰</i><span>Volume bruto</span><b>${money(data.metrics.gross)}</b><small>base local</small></article>
      </section>
      <div class="partner-columns">
        <section class="partner-panel"><header><h2>Estabelecimentos</h2><button data-new-partner>+ Novo parceiro</button></header>${data.stores.map(store => `<div class="admin-row"><span>🏪</span><div><b>${esc(store.name)}</b><small>${esc(store.category)} · ${store.commissionRate}% comissão</small></div><em>${store.status}</em></div>`).join('')}</section>
        <section class="partner-panel"><header><h2>Auditoria recente</h2></header>${data.audit.map(item => `<div class="audit-row"><i>${item.role === 'admin' ? '🛡️' : '•'}</i><div><b>${esc(item.action)}</b><small>${esc(item.entityType)} · ${new Date(item.at).toLocaleString('pt-BR')}</small></div></div>`).join('') || '<p class="partner-empty">As ações operacionais aparecerão aqui.</p>'}</section>
      </div>
    </div>`
    view.querySelector('[data-new-partner]').addEventListener('click', () => { location.hash = '#/cadastro-parceiro' })
  } catch (error) {
    view.innerHTML = `<div class="state-box"><div class="state-emoji">🛡️</div><h3>Acesso administrativo</h3><p>${esc(error.message)}</p><a class="btn btn-primary" href="#/login">Entrar como administrador</a></div>`
  }
}
