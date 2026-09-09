"use strict";
const { summary, nextMonth } = require("./subscriptions");

function install({ api, db, request, headers, appUrl }) {
  const base = "https://api.mercadopago.com";
  const locks = new Map();
  const fail = (message, status = 409) =>
    Object.assign(new Error(message), { status });
  const enabled = () =>
    Boolean(
      process.env.MERCADO_PAGO_ACCESS_TOKEN &&
      process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    );
  const call = (path, method = "GET", body, key) =>
    request(base + path, {
      method,
      headers: headers(key),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const locked = (id, action) => {
    if (locks.has(id)) return locks.get(id);
    const promise = action().finally(() => locks.delete(id));
    locks.set(id, promise);
    return promise;
  };
  function owned(user) {
    const store = db.state.stores.find((item) => item.ownerId === user.id);
    const sub = db.state.subscriptions.find(
      (item) => item.storeId === store?.id,
    );
    if (!sub) throw fail("Assinatura não encontrada.", 404);
    return sub;
  }
  async function sync(sub) {
    if (!sub.recurring?.id) return;
    const recurring = sub.recurring;
    const remote = await call(
      `/preapproval/${encodeURIComponent(recurring.id)}`,
    );
    if (
      remote.external_reference !== recurring.reference ||
      Number(remote.auto_recurring?.transaction_amount) !== recurring.amount ||
      remote.auto_recurring?.currency_id !== "BRL"
    )
      throw fail("Assinatura divergente no provedor.");
    recurring.status = remote.status;
    recurring.nextPaymentAt = remote.next_payment_date || null;
    recurring.checkedAt = new Date().toISOString();
    // Paginate invoices: authorization alone never grants a paid period.
    for (let offset = 0; ; offset += 100) {
      const invoices = await call(
        `/authorized_payments/search?preapproval_id=${encodeURIComponent(recurring.id)}&limit=100&offset=${offset}`,
      );
      for (const invoice of invoices.results || []) {
        if (invoice.preapproval_id !== recurring.id || !invoice.payment?.id)
          continue;
        const payment = await call(
          `/v1/payments/${encodeURIComponent(invoice.payment.id)}`,
        );
        if (
          payment.status !== "approved" ||
          payment.currency_id !== "BRL" ||
          Number(payment.transaction_amount) !== recurring.amount ||
          !Number.isFinite(Date.parse(payment.date_approved))
        )
          continue;
        sub.recurringPayments ||= [];
        if (
          !sub.recurringPayments.some((item) => item.id === String(payment.id))
        )
          sub.recurringPayments.push({
            id: String(payment.id),
            paidAt: payment.date_approved,
            amount: recurring.amount,
          });
        if (
          !sub.paidAt ||
          Date.parse(payment.date_approved) > Date.parse(sub.paidAt)
        ) {
          sub.paidAt = new Date(payment.date_approved).toISOString();
          sub.nextBillingAt = nextMonth(sub.paidAt);
          if (!["BLOCKED", "CANCELED"].includes(sub.status))
            sub.status = "ACTIVE";
          sub.provider = "mercado-pago";
        }
      }
      if (
        offset + (invoices.results?.length || 0) >=
          (invoices.paging?.total || 0) ||
        !invoices.results?.length
      )
        break;
    }
    db.saveNow();
  }
  function route(action) {
    return async (_params, _query, body, ctx) => {
      try {
        if (!enabled())
          throw fail(
            "Cobrança recorrente indisponível. Configure o Mercado Pago.",
            503,
          );
        const sub = owned(ctx.user);
        return await locked(sub.id, () => action(sub, body, ctx.user));
      } catch (e) {
        return { status: e.status || 502, body: { error: e.message } };
      }
    };
  }
  api["POST /api/partner-subscription-recurring"] = route(
    async (sub, body, user) => {
      const billing = summary(sub, user);
      if (billing.lifetime || ["BLOCKED", "CANCELED"].includes(billing.status))
        throw fail("Esta conta não pode contratar recorrência.");
      if (body.consent !== true)
        throw fail("Autorize a cobrança mensal para continuar.", 400);
      if (
        db.state.paymentEvents.some(
          (item) =>
            item.subscriptionId === sub.id &&
            !item.paidAt &&
            ["creating", "pending"].includes(item.status) &&
            Date.parse(item.expiresAt) > Date.now(),
        )
      )
        throw fail(
          "Há um Pix pendente. Aguarde o pagamento ou a expiração antes de contratar recorrência.",
        );
      if (sub.recurring?.id) {
        await sync(sub);
        if (sub.recurring.status !== "cancelled")
          return { url: sub.recurring.url, status: sub.recurring.status };
      }
      if (!sub.recurring || sub.recurring.status === "cancelled") {
        sub.recurring = {
          reference: db.uid("recurring"),
          amount: billing.price,
          status: "creating",
          consentAt: new Date().toISOString(),
          consentUserId: user.id,
        };
        db.saveNow();
      }
      const recurring = sub.recurring;
      // Recover a remotely created agreement if a previous response was lost.
      const found = await call(
        `/preapproval/search?external_reference=${encodeURIComponent(recurring.reference)}`,
      );
      let remote = (found.results || []).find(
        (item) =>
          item.external_reference === recurring.reference &&
          item.status !== "cancelled",
      );
      if (!remote)
        remote = await call(
          "/preapproval",
          "POST",
          {
            reason: "FoodCourt Parceiro mensal",
            external_reference: recurring.reference,
            payer_email: user.email,
            auto_recurring: {
              frequency: 1,
              frequency_type: "months",
              transaction_amount: recurring.amount,
              currency_id: "BRL",
              ...(billing.status === "ACTIVE"
                ? { start_date: billing.nextBillingAt }
                : {}),
            },
            back_url: `${appUrl()}/#/parceiro?secao=plano&recorrencia=retorno`,
            status: "pending",
          },
          recurring.reference,
        );
      if (
        !remote.id ||
        !remote.init_point ||
        remote.external_reference !== recurring.reference
      )
        throw fail("Resposta de assinatura inválida.", 502);
      const url = new URL(remote.init_point);
      if (
        url.protocol !== "https:" ||
        !/(^|\.)mercadopago\.com(\.br)?$/.test(url.hostname)
      )
        throw fail("Link de autorização inválido.", 502);
      Object.assign(recurring, {
        id: String(remote.id),
        url: url.href,
        status: remote.status,
      });
      db.saveNow();
      return { url: recurring.url, status: recurring.status };
    },
  );
  api["POST /api/partner-subscription-recurring-cancel"] = route(
    async (sub) => {
      if (!sub.recurring) throw fail("Não há recorrência para cancelar.");
      if (!sub.recurring.id) {
        const found = await call(
          `/preapproval/search?external_reference=${encodeURIComponent(sub.recurring.reference)}`,
        );
        const remote = (found.results || []).find(
          (item) =>
            item.external_reference === sub.recurring.reference &&
            item.status !== "cancelled",
        );
        if (remote) sub.recurring.id = String(remote.id);
      }
      if (sub.recurring.id)
        await call(
          `/preapproval/${encodeURIComponent(sub.recurring.id)}`,
          "PUT",
          { status: "cancelled" },
        );
      sub.recurring.status = "cancelled";
      db.saveNow();
      return { cancelled: true };
    },
  );
  api["POST /api/partner-subscription-recurring-sync"] = route(async (sub) => {
    await sync(sub);
    return { synchronized: true };
  });
  async function webhook(type, id) {
    if (
      !["subscription_preapproval", "subscription_authorized_payment"].includes(
        type,
      )
    )
      return false;
    let agreement = id;
    if (type === "subscription_authorized_payment")
      agreement = (await call(`/authorized_payments/${encodeURIComponent(id)}`))
        .preapproval_id;
    const sub = db.state.subscriptions.find(
      (item) => item.recurring?.id === String(agreement),
    );
    if (sub) await locked(sub.id, () => sync(sub));
    return true;
  }
  async function reconcile() {
    if (!enabled()) return;
    const items = db.state.subscriptions
      .filter((item) => item.recurring?.id)
      .sort(
        (a, b) =>
          Date.parse(a.recurring.checkedAt || 0) -
          Date.parse(b.recurring.checkedAt || 0),
      )
      .slice(0, 10);
    for (const sub of items) {
      try {
        await locked(sub.id, () => sync(sub));
      } catch {
        sub.recurring.checkedAt = new Date().toISOString();
      }
    }
  }
  return { webhook, reconcile };
}
module.exports = { install };
