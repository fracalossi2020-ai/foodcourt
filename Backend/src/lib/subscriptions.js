"use strict";

const DAY = 86400000;
// Período grátis para lojas novas e tolerância após o vencimento, em dias.
// Ambos vêm do ambiente para poderem ser ajustados sem alterar o código.
const clampDays = (value, fallback, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(max, Math.floor(number)) : fallback;
};
const TRIAL_DAYS = clampDays(process.env.PARTNER_TRIAL_DAYS, 30, 365);
const GRACE_DAYS = clampDays(process.env.PARTNER_GRACE_DAYS, 5, 60);
const DEFAULT_PRICE = 119.9;

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

const daysUntil = (iso, now) =>
  iso ? Math.max(0, Math.ceil((Date.parse(iso) - now) / DAY)) : null;

// Situação da assinatura e se ela libera o Portal do Parceiro e a vitrine:
// - TRIAL: loja nova dentro do período grátis (sem pagamento ainda);
// - PENDING: período grátis encerrado sem pagamento (bloqueada);
// - ACTIVE: paga e dentro do ciclo;
// - OVERDUE: ciclo vencido; libera só durante a tolerância (GRACE_DAYS);
// - CANCELED / BLOCKED: encerrada por decisão da loja ou da plataforma.
function summary(subscription, owner, now = Date.now()) {
  if (!subscription) return null;
  // Isenção vitalícia apenas para a conta administradora da plataforma
  // (PLATFORM_ADMIN_EMAIL) ou para registros de cortesia sem cobrança.
  const lifetime =
    require("./auth").isPlatformAdmin(owner) ||
    subscription.interval === "unlimited";
  const paidAt = subscription.paidAt || null;
  const nextBillingAt = lifetime ? null : paidAt ? nextMonth(paidAt) : null;
  // Registros sem data de criação válida não ganham período grátis.
  const createdAt = Date.parse(subscription.createdAt);
  const trialEndsAt =
    lifetime || paidAt || !Number.isFinite(createdAt)
      ? null
      : new Date(createdAt + TRIAL_DAYS * DAY).toISOString();
  const graceEndsAt =
    nextBillingAt && Date.parse(nextBillingAt) <= now
      ? new Date(Date.parse(nextBillingAt) + GRACE_DAYS * DAY).toISOString()
      : null;

  let status;
  if (lifetime) status = "ACTIVE";
  else if (["CANCELED", "BLOCKED"].includes(subscription.status)) status = subscription.status;
  else if (!paidAt) status = trialEndsAt && Date.parse(trialEndsAt) > now ? "TRIAL" : "PENDING";
  else status = Date.parse(nextBillingAt) <= now ? "OVERDUE" : "ACTIVE";

  const accessAllowed =
    status === "ACTIVE" ||
    status === "TRIAL" ||
    (status === "OVERDUE" && Date.parse(graceEndsAt) > now);
  const blockReason = accessAllowed
    ? null
    : status === "PENDING"
      ? "Seu período grátis terminou. Pague a primeira mensalidade para continuar vendendo."
      : status === "OVERDUE"
        ? "A mensalidade está vencida e a tolerância acabou. Regularize o pagamento para reabrir a loja."
        : status === "CANCELED"
          ? "A assinatura foi cancelada. Pague uma nova mensalidade para reativar a loja."
          : "A assinatura foi bloqueada pela plataforma. Fale com o suporte.";

  return {
    ...subscription,
    lifetime,
    complimentary: lifetime,
    price: lifetime
      ? 0
      : Number(subscription.price) > 0
        ? Number(subscription.price)
        : DEFAULT_PRICE,
    paidAt,
    nextBillingAt,
    trialDays: TRIAL_DAYS,
    trialEndsAt,
    trialDaysRemaining: status === "TRIAL" ? daysUntil(trialEndsAt, now) : null,
    graceDays: GRACE_DAYS,
    graceEndsAt,
    daysUsed:
      Math.max(
        0,
        Math.floor((now - Date.parse(paidAt || subscription.createdAt)) / DAY),
      ) || 0,
    daysRemaining: daysUntil(nextBillingAt, now),
    status,
    accessAllowed,
    blockReason,
  };
}

module.exports = { nextMonth, summary, TRIAL_DAYS, GRACE_DAYS, DEFAULT_PRICE };
