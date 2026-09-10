import { esc, money } from './ui.js';

export function openOrderDetails(view, order) {
  const modal = document.createElement('div');
  modal.className = 'partner-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Comanda do pedido');
  const content = `<h2>Pedido ${esc(order.id)}</h2><p><b>${esc(order.customerName)}</b></p><p>${esc(order.address || '')}</p>${order.scheduledAt ? '<p><b>Agendado: ' + new Date(order.scheduledAt).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo'}) + '</b></p>' : ''}<hr>${order.items.map(item => `<section><h3>${item.quantity} × ${esc(item.name)}</h3>${item.options?.length ? '<p>Opções: ' + item.options.map(esc).join(', ') + '</p>' : ''}${item.note ? '<p><strong>Observação: ' + esc(item.note) + '</strong></p>' : ''}<p>${money(item.unitPrice * item.quantity)}</p></section>`).join('')}<hr><p>Entrega: ${money(order.deliveryFee || 0)}</p><p>Desconto: ${money(order.discount || 0)}</p><h3>Total: ${money(order.total)}</h3><p>Pagamento: ${esc(order.paymentStatus || 'pending')}</p>`;
  modal.innerHTML = `<section class="order-detail-card"><div data-comanda>${content}</div><footer><button class="btn btn-outline" data-print-order>Imprimir comanda</button><button class="btn btn-primary" data-close-order>Fechar</button></footer></section>`;
  const previous = document.activeElement;
  const close = () => { modal.remove(); previous?.focus(); };
  modal.querySelector('[data-close-order]').onclick = close;
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const buttons = [...modal.querySelectorAll('button')];
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
    }
  });
  modal.querySelector('[data-print-order]').onclick = () => {
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.title = 'Impressão da comanda';
    frame.srcdoc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comanda</title><style>body{font:14px sans-serif;padding:16px}section{break-inside:avoid}h3{margin-bottom:4px}</style></head><body>${content}</body></html>`;
    frame.onload = () => { frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(() => frame.remove(), 60000); };
    document.body.append(frame);
  };
  view.append(modal);
  modal.querySelector('[data-close-order]').focus();
}
