import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { esc, toast } from '../core/ui.js'

export async function render(view) {
  view.innerHTML = '<div class="partner-loading">Carregando seus benefícios...</div>'
  try {
    const data = await api.loyalty()
    const next = data.next
    const start = data.level === 'Bronze' ? 0 : data.level === 'Prata' ? 500 : data.level === 'Ouro' ? 1500 : 3000
    const progress = next ? Math.min(100, (data.points - start) / (next.min - start) * 100) : 100
    view.innerHTML = `<div class="page customer-feature-page"><a class="profile-back" href="#/perfil">← Voltar ao perfil</a><header class="loyalty-hero"><div><span>FOODCOURT CLUB</span><h1>Nível ${esc(data.level)}</h1><p>Você tem <b>${data.points} pontos</b>${next ? ` e faltam ${Math.max(0, next.min - data.points)} para ${next.name}` : ' e chegou ao nível máximo'}.</p><div class="loyalty-progress"><i style="width:${progress}%"></i></div></div><strong>🎅</strong></header>
      <section class="section"><div class="section-head"><div><h2>Troque seus pontos</h2><div class="sub">Benefícios pessoais, de uso único e válidos por 30 dias.</div></div></div><div class="mission-grid">${data.rewards.map(reward => `<article class="mission-card"><span>${reward.cost} pontos</span><h3>${esc(reward.title)}</h3><p>Pedido mínimo de R$ ${Number(reward.minimumOrder).toFixed(2).replace('.', ',')}</p><button class="btn ${reward.available ? 'btn-primary' : 'btn-outline'} btn-block" data-redeem="${reward.id}" ${reward.available ? '' : 'disabled'}>${reward.available ? 'Resgatar benefício' : 'Pontos insuficientes'}</button></article>`).join('')}</div></section>
      ${data.coupons.length ? `<section class="section"><div class="section-head"><h2>Meus cupons do clube</h2></div><div class="card loyalty-history">${data.coupons.map(coupon => `<div><span>🎟️</span><p><b>${esc(coupon.code)}</b><small>Válido até ${new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}</small></p><button class="btn btn-outline btn-sm" data-use-coupon="${esc(coupon.code)}">Usar</button></div>`).join('')}</div></section>` : ''}
      <section class="section"><div class="section-head"><div><h2>Missões</h2><div class="sub">Complete desafios e ganhe pontos.</div></div></div><div class="mission-grid">${data.missions.map(mission => `<article class="mission-card"><span>+${mission.reward} pontos</span><h3>${esc(mission.title)}</h3><p>${Math.min(mission.progress, mission.target)} de ${mission.target} concluídos</p><div><i style="width:${Math.min(100, mission.progress / mission.target * 100)}%"></i></div></article>`).join('')}</div></section>
      <section class="section"><div class="section-head"><h2>Histórico de pontos</h2></div><div class="card loyalty-history">${data.events.length ? data.events.map(event => `<div><span>${event.points < 0 ? '🎁' : '✨'}</span><p><b>${esc(event.label)}</b><small>${new Date(event.at).toLocaleDateString('pt-BR')}</small></p><strong>${event.points > 0 ? '+' : ''}${event.points}</strong></div>`).join('') : '<p class="partner-empty">Faça pedidos e avaliações para começar a pontuar.</p>'}</div></section></div>`
    view.querySelectorAll('[data-redeem]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Deseja trocar seus pontos por este benefício?')) return
      button.disabled = true
      try {
        const result = await api.redeemLoyalty(button.dataset.redeem, crypto.randomUUID())
        store.addCoupon(result.coupon.code)
        toast(`Cupom ${result.coupon.code} resgatado e aplicado.`, 'success')
        location.hash = `#/fidelidade?at=${Date.now()}`
      } catch (error) { toast(error.message, 'error'); button.disabled = false }
    }))
    view.querySelectorAll('[data-use-coupon]').forEach(button => button.addEventListener('click', () => {
      store.addCoupon(button.dataset.useCoupon)
      toast('Cupom aplicado ao seu próximo pedido.', 'success')
      location.hash = '#/inicio'
    }))
  } catch (error) {
    view.innerHTML = `<div class="state-box"><h3>Não foi possível carregar</h3><p>${esc(error.message)}</p></div>`
  }
}
