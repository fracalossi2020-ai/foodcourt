import { api } from '../core/api.js';
import { esc } from '../core/ui.js';
export async function render(view, _boot, _params, query) {
  const token = query.get('token');
  view.innerHTML = '<div class="page"><p>Consultando convite…</p></div>';
  try {
    const { invitation } = await api.teamInvitation(token);
    view.innerHTML = `<div class="page" style="max-width:600px"><section class="card" style="padding:24px"><h1>Convite para ${esc(invitation.storeName)}</h1><p>Função: ${invitation.role === 'manager' ? 'Gerente' : 'Cozinha'}.</p><p>Ao aceitar, sua conta receberá acesso ao painel desta loja.</p><button class="btn btn-primary">Aceitar convite</button><p role="status"></p></section></div>`;
    view.querySelector('button').onclick = async event => {
      const button = event.currentTarget; button.disabled = true;
      try { await api.teamInvitation(token, true); location.replace('#/parceiro'); }
      catch (error) { view.querySelector('[role=status]').textContent = error.message; button.disabled = false; }
    };
  } catch (error) { view.innerHTML = `<div class="page"><h1>Convite indisponível</h1><p>${esc(error.message)}</p><a class="btn btn-outline" href="#/perfil">Ver minha conta</a></div>`; }
}
