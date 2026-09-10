import { api } from './api.js';
import { esc, toast } from './ui.js';

export function openReview(order, onSaved) {
  const previous = document.activeElement;
  const modal = document.createElement('div');
  modal.className = 'partner-modal';
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Avaliar pedido');
  modal.innerHTML = `<form class="order-detail-card"><h2>Como foi seu pedido?</h2><p>${esc(order.restaurantName)}</p><fieldset><legend>Sua nota (obrigatória)</legend><div style="display:flex;flex-wrap:wrap;gap:16px;margin:16px 0">${[1,2,3,4,5].map(rating => `<label><input type="radio" name="rating" value="${rating}" required> ${rating} ★</label>`).join('')}</div></fieldset><label style="display:block;margin-top:16px">Comentário (opcional)<textarea class="input" name="comment" maxlength="500" rows="4" placeholder="Conte o que gostou e o que pode melhorar."></textarea></label><p>Seu nome, nota e comentário poderão aparecer nas avaliações da loja.</p><footer><button type="button" class="btn btn-outline" data-close-review>Voltar</button><button type="submit" class="btn btn-primary">Enviar avaliação</button></footer></form>`;
  let saving = false;
  const close = () => { if (!saving) { modal.remove(); previous?.focus(); } };
  modal.querySelector('[data-close-review]').onclick = close;
  modal.onclick = event => { if (event.target === modal) close(); };
  modal.onkeydown = event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const controls = [...modal.querySelectorAll('input,textarea,button:not(:disabled)')];
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    }
  };
  modal.querySelector('form').onsubmit = async event => {
    event.preventDefault(); if (saving) return;
    const values = new FormData(event.currentTarget);
    const button = modal.querySelector('[type=submit]'); saving = true; button.disabled = true;
    try {
      const result = await api.createReview({ orderId: order.id, rating: Number(values.get('rating')), comment: values.get('comment') });
      saving = false; close(); onSaved(result.review); toast('Avaliação enviada. Você ganhou 10 pontos FC.', 'success');
    } catch (error) { saving = false; button.disabled = false; toast(error.message, 'error'); }
  };
  document.body.append(modal); modal.querySelector('input').focus();
}
