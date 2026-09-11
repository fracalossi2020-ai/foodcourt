import { esc, money } from './ui.js';

export function reconciliation(data) {
  return `<section class="partner-panel"><h2>Conferência de pagamentos</h2>
    <p>Pagamentos confirmados não significam repasse bancário. Confira os recebimentos no provedor de pagamentos.</p>
    <dl><dt>Pagos, em andamento</dt><dd>${money(data.paidInProgress || 0)}</dd>
    <dt>Estornos confirmados</dt><dd>${money(data.refunded || 0)}</dd>
    <dt>Estornos pendentes</dt><dd>${money(data.refundPending || 0)}</dd>
    <dt>Pagamentos contestados</dt><dd>${money(data.chargedBack || 0)}</dd></dl>
    <h3>Pedidos para conferir (${(data.issues || []).length})</h3>
    ${(data.issues || []).length ? `<ul>${data.issues.map(item => `<li><strong>${esc(item.id)}</strong>: ${esc(item.reason)}${item.total == null ? '' : ` · ${money(item.total)}`}</li>`).join('')}</ul>` : '<p>Nenhuma divergência identificada nos registros de pagamento.</p>'}
    <a class="btn btn-outline" href="#/parceiro?secao=pedidos">Consultar pedidos</a></section>`;
}
