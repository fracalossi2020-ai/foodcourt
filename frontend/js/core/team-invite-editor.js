import { api } from './api.js';
import { esc, toast } from './ui.js';
export function mountInvites(view, invitations = []) {
  const target = view.querySelector('.team-directory');
  if (!target) return;
  const section = document.createElement('section'); section.className = 'partner-panel';
  section.innerHTML = `<h2>Convidar por e-mail</h2><p>Para pessoas com ou sem conta. O acesso só é liberado após o aceite. Convites expiram em 48 horas.</p><form style="display:grid;gap:12px"><label>Nome<input class="input" name="name" required minlength="2" maxlength="80"></label><label>E-mail<input class="input" name="email" type="email" required maxlength="254"></label><label>Função<select class="input" name="role"><option value="kitchen">Cozinha</option><option value="manager">Gerente</option></select></label><button class="btn btn-primary">Enviar convite</button></form><h3>Convites pendentes</h3>${invitations.map(item => `<div style="margin:12px 0;overflow-wrap:anywhere"><b>${esc(item.name)}</b><p>${esc(item.email)}</p><small>Expira em ${new Date(item.expiresAt).toLocaleString('pt-BR')}</small><button class="btn btn-outline" data-cancel-invite="${esc(item.id)}">Cancelar convite</button></div>`).join('') || '<p>Nenhum convite pendente.</p>'}`;
  target.after(section);
  section.querySelector('form').onsubmit = async event => {
    event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'); button.disabled = true;
    try { await api.invitePartnerMember(Object.fromEntries(new FormData(form))); toast('Convite enviado. Aguardando aceite.', 'success'); location.hash = '#/parceiro?secao=equipe&at=' + Date.now(); }
    catch (error) { toast(error.message, 'error'); button.disabled = false; }
  };
  section.querySelectorAll('[data-cancel-invite]').forEach(button => { button.onclick = async () => {
    button.disabled = true;
    try { await api.invitePartnerMember({ cancelId: button.dataset.cancelInvite }); button.parentElement.remove(); toast('Convite cancelado.', 'success'); }
    catch (error) { toast(error.message, 'error'); button.disabled = false; }
  }; });
}
