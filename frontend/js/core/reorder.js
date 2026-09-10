import { api } from './api.js';
import { store } from './store.js';
import { esc, money, toast } from './ui.js';
import { renderCartUI } from './cart.js';
import { planReorder } from './reorder-plan.js';

export async function repeatOrder(order, button) {
  if (button) button.disabled = true;
  try {
    const { restaurant } = await api.restaurant(order.storeId || order.restaurantId);
    const plan = planReorder(order, restaurant);
    const modal = document.createElement('div');
    modal.className = 'partner-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Revisar recompra');
    modal.innerHTML = `<section class="order-detail-card"><h2>Revise antes de pedir novamente</h2><p>${esc(restaurant.name)}</p>${!restaurant.open ? '<p>A loja está fechada agora. Confira os horários disponíveis no checkout.</p>' : ''}${plan.items.map(item => `<p><b>${item.qty} × ${esc(item.name)}</b> — ${money(item.qty * item.unitPrice)}${item.optionNames.length ? '<br>' + item.optionNames.map(esc).join(', ') : ''}${item.note ? '<br>Observação: ' + esc(item.note) : ''}</p>`).join('')}<ul>${plan.warnings.map(warning => '<li>' + esc(warning) + '</li>').join('')}</ul><p><b>Subtotal: ${money(plan.subtotal)}</b></p><p>Frete, cupom e horário serão definidos no checkout.</p>${store.cart.items.length ? '<p>Ao continuar, os itens atuais do carrinho serão substituídos.</p>' : ''}<footer><button class="btn btn-outline" data-close-repeat>Voltar</button><a class="btn btn-outline" href="#/restaurante/${encodeURIComponent(restaurant.id)}" data-menu-repeat>Ver cardápio</a><button class="btn btn-primary" data-confirm-repeat ${plan.items.length ? '' : 'disabled'}>Usar estes itens</button></footer></section>`;
    const previous = document.activeElement;
    const close = () => { modal.remove(); previous?.focus(); };
    modal.querySelector('[data-close-repeat]').onclick = close;
    modal.querySelector('[data-menu-repeat]').onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
    modal.onkeydown = event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const controls = [...modal.querySelectorAll('button:not(:disabled),a')];
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
      }
    };
    modal.querySelector('[data-confirm-repeat]').onclick = () => {
      store.cartClear();
      for (const item of plan.items) store.cartAdd(restaurant.id, restaurant.name, item);
      renderCartUI(); close(); location.hash = '#/checkout';
    };
    document.body.append(modal); modal.querySelector('[data-close-repeat]').focus();
  } catch (error) { toast(error.message || 'Não foi possível consultar o cardápio atual.', 'error'); }
  finally { if (button) button.disabled = false; }
}
