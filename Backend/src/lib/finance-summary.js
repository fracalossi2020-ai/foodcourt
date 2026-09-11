'use strict';

// Calculate each order in cents. Payment confirmation is not a bank payout.
module.exports = function financeSummary(orders, storeId, rate = 12) {
  const cents = value => Math.round(Number(value) * 100);
  const result = { gross: 0, commission: 0, net: 0, orders: 0, nextPayout: null,
    paidInProgress: 0, refunded: 0, refundPending: 0, chargedBack: 0, issues: [] };
  for (const order of orders.filter(item => item.storeId === storeId)) {
    const amount = cents(order.total);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      result.issues.push({ id: order.id, reason: 'Valor inválido', total: null });
      continue;
    }
    const payment = order.paymentStatus;
    if (payment === 'refunded') result.refunded += amount;
    else if (payment === 'refund_pending') result.refundPending += amount;
    else if (payment === 'charged_back') result.chargedBack += amount;
    else if (payment === 'paid' && order.status === 'delivered') {
      result.gross += amount;
      result.commission += Math.round(amount * rate / 100);
      result.orders++;
    } else if (payment === 'paid' && order.status !== 'cancelled') result.paidInProgress += amount;

    let reason;
    if (payment === 'refund_pending') reason = 'Estorno pendente';
    else if (payment === 'charged_back') reason = 'Pagamento contestado';
    else if (payment === 'paid' && order.status === 'cancelled') reason = 'Cancelado com pagamento confirmado';
    else if (order.status === 'delivered' && payment !== 'paid') reason = 'Entregue sem pagamento confirmado';
    if (reason) result.issues.push({ id: order.id, reason, total: amount / 100 });
  }
  result.net = result.gross - result.commission;
  for (const key of ['gross', 'commission', 'net', 'paidInProgress', 'refunded', 'refundPending', 'chargedBack']) result[key] /= 100;
  return result;
};
