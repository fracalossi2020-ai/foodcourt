"use strict";

const DAY = 86400000;
// Billing dates use Brasilia time, independently of the server timezone.
function nextMonth(value) {
  const local = new Date(Date.parse(value) - 3 * 3600000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth() + 1;
  const day = Math.min(
    local.getUTCDate(),
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  );
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      local.getUTCHours() + 3,
      local.getUTCMinutes(),
      local.getUTCSeconds(),
    ),
  ).toISOString();
}

function summary(subscription, owner, now = Date.now()) {
  if (!subscription) return null;
  const ownerEmail = "fracalossi2020@gmail.com";
  const lifetime = Boolean(
    ownerEmail && owner?.email?.toLowerCase() === ownerEmail,
  );
  const paidAt = subscription.paidAt || null;
  const nextBillingAt = lifetime ? null : paidAt ? nextMonth(paidAt) : null;
  const remaining = nextBillingAt
    ? Math.max(0, Math.ceil((Date.parse(nextBillingAt) - now) / DAY))
    : null;
  return {
    ...subscription,
    lifetime,
    complimentary: lifetime,
    price: lifetime
      ? 0
      : Number(subscription.price) > 0
        ? Number(subscription.price)
        : 119.9,
    paidAt,
    nextBillingAt,
    daysUsed:
      Math.max(
        0,
        Math.floor((now - Date.parse(paidAt || subscription.createdAt)) / DAY),
      ) || 0,
    daysRemaining: remaining,
    status: lifetime
      ? "ACTIVE"
      : ["CANCELED", "BLOCKED"].includes(subscription.status)
        ? subscription.status
        : !paidAt
          ? "PENDING"
          : Date.parse(nextBillingAt) <= now
            ? "OVERDUE"
            : "ACTIVE",
  };
}

module.exports = { nextMonth, summary };
