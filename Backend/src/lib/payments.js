"use strict";

const crypto = require("node:crypto");
const QRCode = require("qrcode");
const subscriptions = require("./subscriptions");
const MP = "https://api.mercadopago.com";
const STRIPE = "https://api.stripe.com/v1";
const money = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const cents = (value) => Math.round(Number(value) * 100);
const error = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const resultError = (e) => ({
  status: e.status || 502,
  body: {
    error: e.status
      ? e.message
      : "O provedor não respondeu. Tente novamente para recuperar o mesmo pagamento.",
  },
});

function appUrl() {
  try {
    const url = new URL(process.env.APP_URL);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function methods() {
  const mp = Boolean(
    appUrl() &&
    process.env.MERCADO_PAGO_ACCESS_TOKEN &&
    process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  );
  const stripe = Boolean(
    appUrl() &&
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET,
  );
  return [
    {
      id: "pix",
      name: "Pix",
      emoji: "⚡",
      description: "QR Code e copia e cola",
      enabled: mp,
    },
    {
      id: "credit",
      name: "Cartão de crédito",
      emoji: "💳",
      description: "Pagamento na página segura do Mercado Pago",
      enabled: mp,
    },
    {
      id: "debit",
      name: "Cartão de débito",
      emoji: "💳",
      description: "Sujeito à disponibilidade do banco e do Mercado Pago",
      enabled: mp && process.env.MERCADO_PAGO_DEBIT_ENABLED === "1",
    },
    {
      id: "apple_pay",
      name: "Apple Pay",
      emoji: "💳",
      description:
        "Disponível no checkout seguro em dispositivos e cartões compatíveis",
      enabled: stripe,
    },
  ];
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw error(
      "Não foi possível concluir o pagamento no provedor. Tente novamente ou contate o suporte.",
      502,
    );
  return body;
}

function mpHeaders(id) {
  return {
    Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    ...(id ? { "X-Idempotency-Key": id } : {}),
  };
}

function stripeHeaders(id) {
  return {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
    ...(id ? { "Idempotency-Key": id } : {}),
  };
}

async function refundStripe(order, payment, db) {
  if (!process.env.STRIPE_SECRET_KEY || !payment.providerPaymentId)
    return false;
  try {
    const previous = (payment.refunds || []).find(
      (item) => item.orderId === order.id && item.providerRefundId,
    );
    const refund = previous
      ? await request(
          `${STRIPE}/refunds/${encodeURIComponent(previous.providerRefundId)}`,
          { headers: stripeHeaders() },
        )
      : await request(`${STRIPE}/refunds`, {
          method: "POST",
          headers: stripeHeaders(`refund-${order.id}`),
          body: new URLSearchParams({
            payment_intent: payment.providerPaymentId,
            amount: String(cents(order.total)),
          }).toString(),
        });
    payment.refunds ||= [];
    payment.refunds = payment.refunds.filter(
      (item) => item.orderId !== order.id,
    );
    payment.refunds.push({
      orderId: order.id,
      providerRefundId: refund.id,
      amount: money(refund.amount / 100),
      status: refund.status === "succeeded" ? "approved" : refund.status,
    });
    order.paymentStatus =
      refund.status === "succeeded" ? "refunded" : "refund_pending";
    if (order.paymentStatus === "refunded")
      payment.cancelledOrderIds = (payment.cancelledOrderIds || []).filter(
        (id) => id !== order.id,
      );
    db.saveNow();
    return order.paymentStatus === "refunded";
  } catch {
    payment.refundError = "Estorno pendente de nova tentativa no provedor.";
    db.saveNow();
    return false;
  }
}

function install({
  api,
  db,
  order,
  cancelOrderState,
  refundOrderPayment,
  pushNotification,
}) {
  const running = new Map();
  const recurring = require("./recurring").install({ api, db, request, headers: mpHeaders, appUrl });
  const syncing = new Map();
  const ordersFor = (payment) =>
    db.state.platformOrders.filter(
      (item) => item.paymentIntentId === payment.id,
    );
  const publicPayment = (payment) => ({
    id: payment.id,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    expiresAt: payment.expiresAt,
    url: payment.url || null,
    payload: payment.payload || null,
    qrCode: payment.qrCode || null,
    orders: ordersFor(payment).map((item) => ({
      id: item.id,
      total: item.total,
      status: item.status,
      paymentStatus: item.paymentStatus,
    })),
  });

  function quote(body, ctx) {
    if (
      !Array.isArray(body.groups) ||
      !body.groups.length ||
      body.groups.length > 10
    )
      throw error("Carrinho inválido.");
    const ids = new Set();
    const drafts = body.groups.map((group, index) => {
      if (
        !Array.isArray(group.items) ||
        !group.items.length ||
        group.items.length > 100
      )
        throw error("Itens inválidos.");
      const response = order(
        {
          ...group,
          addressId: body.addressId,
          delivery: body.delivery,
          scheduledAt: body.scheduledAt,
          couponCode: index === 0 ? body.couponCode : "",
          paymentMethod:
            methods().find((method) => method.id === body.method)?.name ||
            "Pix",
        },
        ctx,
        "quote",
      );
      if (response.status >= 400) throw error(response.body.error);
      const draft = response.order;
      if (ids.has(draft.storeId))
        throw error("Agrupe os itens do mesmo estabelecimento.");
      ids.add(draft.storeId);
      return draft;
    });
    const total = money(drafts.reduce((sum, item) => sum + item.total, 0));
    if (!Number.isFinite(total) || total <= 0 || total > 100000)
      throw error("Total inválido para pagamento.");
    return {
      orders: drafts,
      total,
      subtotal: money(drafts.reduce((s, o) => s + o.subtotal, 0)),
      deliveryFee: money(drafts.reduce((s, o) => s + o.deliveryFee, 0)),
      discount: money(drafts.reduce((s, o) => s + o.discount, 0)),
    };
  }

  async function apply(payment, status) {
    if (
      status === "paid" &&
      payment.paidAt &&
      ["refunded", "charged_back"].includes(payment.status)
    )
      return;
    // The provider remains the source of truth. Delayed pending events must not undo approval.
    if (
      payment.paidAt &&
      !["paid", "refunded", "charged_back"].includes(status)
    )
      return;
    const firstApproval = status === "paid" && !payment.paidAt;
    payment.status = status;
    payment.updatedAt = new Date().toISOString();
    if (status === "paid") payment.paidAt ||= payment.providerApprovedAt || payment.updatedAt;
    if (firstApproval && payment.subscriptionId) {
      const subscription = db.state.subscriptions.find(
        (item) => item.id === payment.subscriptionId,
      );
      if (
        subscription &&
        !["CANCELED", "BLOCKED"].includes(subscription.status)
      ) {
        subscription.status = "ACTIVE";
        subscription.paidAt = payment.paidAt;
        subscription.updatedAt = payment.updatedAt;
        subscription.paymentId = payment.id;
        subscription.provider = payment.provider;
        subscription.nextBillingAt = subscriptions.nextMonth(subscription.paidAt);
        pushNotification(
          payment.userId,
          "payment",
          "Assinatura paga",
          "O pagamento da assinatura foi confirmado. A publicação da loja continua sujeita à revisão.",
        );
      }
    }
    for (const item of ordersFor(payment)) {
      if (item.status === "cancelled") {
        if (status === "paid" && item.paymentStatus !== "refunded") {
          item.paymentStatus = "refund_pending";
          await refundOrderPayment(item, payment);
        }
        continue;
      }
      item.paymentStatus = status;
      if (
        ["cancelled", "expired", "refunded", "charged_back"].includes(status)
      ) {
        cancelOrderState(item, "Pagamento encerrado pelo provedor.");
        item.paymentStatus = status;
      }
      if (firstApproval) {
        pushNotification(
          item.customerId,
          "payment",
          "Pagamento aprovado",
          `Recebemos o pagamento do pedido ${item.id}.`,
          item.id,
        );
        const shop = db.state.stores.find((shop) => shop.id === item.storeId);
        if (shop?.ownerId)
          pushNotification(
            shop.ownerId,
            "payment",
            "Pagamento confirmado",
            `O pedido ${item.id} já pode ser aceito.`,
            item.id,
          );
      }
    }
    const allOrders = ordersFor(payment);
    payment.status =
      allOrders.length &&
      allOrders.every((item) => item.status === "cancelled") &&
      status === "paid"
        ? allOrders.every((item) => item.paymentStatus === "refunded")
          ? "refunded"
          : "refund_pending"
        : status;
    db.saveNow();
  }

  async function applyMercadoPago(payment, provider) {
    if (
      payment.provider !== "mercado-pago" ||
      provider.external_reference !== payment.id ||
      provider.currency_id !== "BRL" ||
      cents(provider.transaction_amount) !== cents(payment.amount)
    )
      throw error("O pagamento não corresponde ao pedido.", 409);
    if (
      payment.providerPaymentId &&
      payment.providerPaymentId !== String(provider.id)
    ) {
      // A hosted checkout may have several failed attempts. Never fulfill a second approval.
      if (provider.status === "approved" && payment.paidAt) {
        await request(
          `${MP}/v1/payments/${encodeURIComponent(provider.id)}/refunds`,
          {
            method: "POST",
            headers: mpHeaders(`duplicate-${provider.id}`),
            body: JSON.stringify({ amount: payment.amount }),
          },
        );
        return;
      }
      if (payment.paidAt || provider.status !== "approved") return;
    }
    payment.providerPaymentId = String(provider.id);
    if (provider.status === "approved" && Number.isFinite(Date.parse(provider.date_approved))) {
      payment.providerApprovedAt = new Date(provider.date_approved).toISOString();
    }
    const status =
      {
        approved: "paid",
        refunded: "refunded",
        charged_back: "charged_back",
        cancelled: "cancelled",
        rejected: "failed",
      }[provider.status] || "pending";
    await apply(payment, status);
  }

  async function synchronize(payment) {
    if (syncing.has(payment.id)) return syncing.get(payment.id);
    const task = (async () => {
      if (payment.provider === "stripe" && payment.providerSessionId) {
        const session = await request(
          `${STRIPE}/checkout/sessions/${encodeURIComponent(payment.providerSessionId)}`,
          { headers: stripeHeaders() },
        );
        if (
          session.client_reference_id !== payment.id ||
          session.currency !== "brl" ||
          session.amount_total !== cents(payment.amount)
        )
          throw error("Pagamento divergente.", 409);
        if (session.payment_intent)
          payment.providerPaymentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent.id;
        await apply(
          payment,
          session.payment_status === "paid"
            ? "paid"
            : session.status === "expired"
              ? "expired"
              : "pending",
        );
      } else if (payment.provider === "mercado-pago") {
        if (payment.providerPaymentId) {
          const provider = await request(
            `${MP}/v1/payments/${encodeURIComponent(payment.providerPaymentId)}`,
            { headers: mpHeaders() },
          );
          await applyMercadoPago(payment, provider);
        }
        if (payment.providerPreferenceId && !payment.paidAt) {
          const found = await request(
            `${MP}/v1/payments/search?external_reference=${encodeURIComponent(payment.id)}&sort=date_created&criteria=desc`,
            { headers: mpHeaders() },
          );
          const attempts = found.results || [];
          const paid = attempts.filter((item) => item.status === "approved");
          for (const provider of paid.length ? paid : attempts.slice(0, 1))
            await applyMercadoPago(payment, provider);
        }
        if (
          !payment.paidAt &&
          Date.parse(payment.expiresAt) <= Date.now() &&
          !["cancelled", "expired"].includes(payment.status)
        )
          await apply(payment, "expired");
      }
      return publicPayment(payment);
    })();
    syncing.set(payment.id, task);
    try {
      return await task;
    } finally {
      syncing.delete(payment.id);
    }
  }

  async function createProvider(payment) {
    if (payment.payload || payment.url || payment.paidAt) return;
    const returnUrl = `${appUrl()}/#/checkout?payment=${encodeURIComponent(payment.id)}`;
    if (payment.method === "pix") {
      payment.provider = "mercado-pago";
      const provider = await request(`${MP}/v1/payments`, {
        method: "POST",
        headers: mpHeaders(payment.id),
        body: JSON.stringify({
          transaction_amount: payment.amount,
          description: "Pedido FoodCourt",
          payment_method_id: "pix",
          external_reference: payment.id,
          date_of_expiration: payment.expiresAt,
          notification_url: `${appUrl()}/api/payments/mercadopago/webhook`,
          payer: { email: payment.email },
        }),
      });
      const qr = provider.point_of_interaction?.transaction_data;
      if (!provider.id || !qr?.qr_code)
        throw error("O provedor não retornou o código Pix.", 502);
      payment.providerPaymentId = String(provider.id);
      payment.payload = qr.qr_code;
      payment.qrCode = await QRCode.toDataURL(qr.qr_code, {
        width: 360,
        margin: 2,
      });
      payment.expiresAt = provider.date_of_expiration || payment.expiresAt;
      await applyMercadoPago(payment, provider);
    } else if (payment.method === "apple_pay") {
      payment.provider = "stripe";
      const fields = new URLSearchParams({
        mode: "payment",
        "payment_method_types[0]": "card",
        client_reference_id: payment.id,
        customer_email: payment.email,
        success_url: returnUrl,
        cancel_url: returnUrl,
        "metadata[foodcourt_payment_id]": payment.id,
        "payment_intent_data[metadata][foodcourt_payment_id]": payment.id,
        "line_items[0][price_data][currency]": "brl",
        "line_items[0][price_data][product_data][name]": "Pedido FoodCourt",
        "line_items[0][price_data][unit_amount]": String(cents(payment.amount)),
        "line_items[0][quantity]": "1",
        expires_at: String(Math.floor(Date.parse(payment.expiresAt) / 1000)),
      });
      const session = await request(`${STRIPE}/checkout/sessions`, {
        method: "POST",
        headers: stripeHeaders(payment.id),
        body: fields.toString(),
      });
      if (
        !session.id ||
        !session.url ||
        new URL(session.url).hostname !== "checkout.stripe.com"
      )
        throw error("Checkout indisponível.", 502);
      payment.providerSessionId = session.id;
      payment.url = session.url;
      payment.status = "pending";
    } else {
      payment.provider = "mercado-pago";
      const allowedType =
        payment.method === "credit" ? "credit_card" : "debit_card";
      const preference = await request(`${MP}/checkout/preferences`, {
        method: "POST",
        headers: mpHeaders(payment.id),
        body: JSON.stringify({
          items: [
            {
              id: payment.id,
              title: "Pedido FoodCourt",
              quantity: 1,
              currency_id: "BRL",
              unit_price: payment.amount,
            },
          ],
          payer: { email: payment.email },
          external_reference: payment.id,
          back_urls: {
            success: returnUrl,
            pending: returnUrl,
            failure: returnUrl,
          },
          auto_return: "approved",
          notification_url: `${appUrl()}/api/payments/mercadopago/webhook`,
          expires: true,
          expiration_date_to: payment.expiresAt,
          payment_methods: {
            installments: 1,
            excluded_payment_types: [
              "credit_card",
              "debit_card",
              "ticket",
              "atm",
              "bank_transfer",
              "prepaid_card",
            ]
              .filter((id) => id !== allowedType)
              .map((id) => ({ id })),
          },
        }),
      });
      const url =
        process.env.PAYMENTS_TEST_MODE === "1"
          ? preference.sandbox_init_point
          : preference.init_point;
      if (
        !preference.id ||
        !url ||
        !["www.mercadopago.com.br", "sandbox.mercadopago.com.br"].includes(
          new URL(url).hostname,
        )
      )
        throw error("Checkout indisponível.", 502);
      payment.providerPreferenceId = preference.id;
      payment.url = url;
      payment.status = "pending";
    }
    db.saveNow();
  }

  api["GET /api/payments/config"] = () => ({
    methods: methods(),
    testMode: process.env.PAYMENTS_TEST_MODE === "1",
  });
  api["POST /api/checkout/quote"] = (_p, _q, body, ctx) => {
    try {
      return quote(body, ctx);
    } catch (e) {
      return resultError(e);
    }
  };
  api["POST /api/checkout"] = async (_p, _q, body, ctx) => {
    try {
      if (!/^[a-zA-Z0-9_-]{16,80}$/.test(body.idempotencyKey || ""))
        throw error("Identificador de pagamento inválido.");
      const fingerprint = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            groups: body.groups,
            addressId: body.addressId,
            delivery: body.delivery,
            scheduledAt: body.scheduledAt,
            couponCode: body.couponCode,
            method: body.method,
          }),
        )
        .digest("hex");
      let payment = db.state.paymentEvents.find(
        (item) =>
          item.userId === ctx.user.id &&
          item.idempotencyKey === body.idempotencyKey,
      );
      if (payment && payment.fingerprint !== fingerprint)
        throw error(
          "Este pagamento pertence a outro carrinho. Revise o pedido.",
          409,
        );
      if (!payment) {
        if (!methods().find((item) => item.id === body.method)?.enabled)
          throw error(
            "Esta forma de pagamento está indisponível no momento.",
            503,
          );
        const priced = quote(body, ctx);
        if (cents(body.expectedTotal) !== cents(priced.total))
          throw error("O total mudou. Revise o pedido antes de pagar.", 409);
        payment = {
          id: db.uid("payment"),
          userId: ctx.user.id,
          email: ctx.user.email,
          method: body.method,
          provider: body.method === "apple_pay" ? "stripe" : "mercado-pago",
          idempotencyKey: body.idempotencyKey,
          fingerprint,
          status: "creating",
          amount: priced.total,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          orderIds: [],
        };
        // All groups were validated before synchronous inventory/coupon reservations.
        const created = [];
        for (let i = 0; i < body.groups.length; i++) {
          const response = order(
            {
              ...body.groups[i],
              addressId: body.addressId,
              delivery: body.delivery,
              scheduledAt: body.scheduledAt,
              couponCode: i === 0 ? body.couponCode : "",
              paymentMethod: methods().find(
                (method) => method.id === body.method,
              ).name,
            },
            ctx,
            "commit",
          );
          if (response.status >= 400) {
            for (const item of created)
              cancelOrderState(
                item,
                "Checkout interrompido antes da cobrança.",
              );
            db.saveNow();
            throw error(response.body.error);
          }
          const item = response.body.order;
          item.paymentIntentId = payment.id;
          created.push(item);
          payment.orderIds.push(item.id);
        }
        payment.reservedAmount = payment.amount;
        db.state.paymentEvents.unshift(payment);
        db.saveNow();
      }
      if (running.has(payment.id)) return await running.get(payment.id);
      const task = (async () => {
        if (["expired", "cancelled", "refunded"].includes(payment.status))
          throw error(
            "Este pagamento foi encerrado. Inicie um novo pedido.",
            409,
          );
        await createProvider(payment);
        return { payment: publicPayment(payment) };
      })();
      running.set(payment.id, task);
      try {
        return await task;
      } finally {
        running.delete(payment.id);
      }
    } catch (e) {
      return resultError(e);
    }
  };
  api["GET /api/payments/:id"] = async (params, _query, _body, ctx) => {
    const payment = db.state.paymentEvents.find(
      (item) => item.id === params.id && item.userId === ctx.user.id,
    );
    if (!payment)
      return { status: 404, body: { error: "Pagamento não encontrado." } };
    try {
      if (
        payment.status === "creating" &&
        Date.parse(payment.expiresAt) > Date.now() &&
        !running.has(payment.id)
      ) {
        const task = createProvider(payment);
        running.set(payment.id, task);
        try {
          await task;
        } finally {
          running.delete(payment.id);
        }
      }
      if (Date.now() - (payment.checkedAt || 0) >= 4000) {
        await synchronize(payment);
        payment.checkedAt = Date.now();
      }
      return { payment: publicPayment(payment) };
    } catch (e) {
      return resultError(e);
    }
  };
  api["POST /api/payments/:id/cancel"] = async (params, _query, _body, ctx) => {
    const payment = db.state.paymentEvents.find(
      (item) =>
        item.id === params.id &&
        item.userId === ctx.user.id &&
        !item.subscriptionId,
    );
    if (!payment)
      return { status: 404, body: { error: "Pagamento não encontrado." } };
    try {
      const orders = ordersFor(payment);
      if (
        orders.some(
          (item) => !["pending", "accepted", "cancelled"].includes(item.status),
        )
      )
        throw error("Um pedido já está em preparo. Fale com o suporte.", 409);
      // Cancel locally even if the provider is down; a late approval triggers refunds.
      for (const item of orders)
        if (item.status !== "cancelled")
          cancelOrderState(item, "Cancelado pelo cliente.");
      db.saveNow();
      for (const item of orders)
        if (item.paymentStatus === "refund_pending")
          await refundOrderPayment(item, payment);
      return { payment: publicPayment(payment) };
    } catch (e) {
      return resultError(e);
    }
  };
  api["POST /api/partner-subscription-pix"] = async (
    _params,
    _query,
    _body,
    ctx,
  ) => {
    try {
      const shop = db.state.stores.find((item) => item.ownerId === ctx.user.id);
      const subscription = db.state.subscriptions.find(
        (item) => item.storeId === shop?.id,
      );
      if (!subscription) throw error("Assinatura não encontrada.", 404);
      const billing = subscriptions.summary(subscription, ctx.user);
      if (subscription.recurring && subscription.recurring.status !== "cancelled")
        throw error("Cancele a recorrência antes de pagar por Pix avulso.", 409);
      if (billing.lifetime || ["ACTIVE", "CANCELED", "BLOCKED"].includes(billing.status))
        throw error("A assinatura não está disponível para pagamento.", 409);
      if (!methods().find((item) => item.id === "pix").enabled)
        throw error("Pagamento da assinatura indisponível no momento.", 503);
      let payment = db.state.paymentEvents.find(
        (item) =>
          item.subscriptionId === subscription.id &&
          !item.paidAt &&
          !["expired", "cancelled", "refunded"].includes(item.status),
      );
      if (payment) {
        await synchronize(payment);
        if (payment.paidAt) throw error("Esta assinatura já foi paga.", 409);
        if (payment.status === "expired" || payment.status === "cancelled")
          payment = null;
      }
      if (!payment) {
        payment = {
          id: db.uid("payment"),
          userId: ctx.user.id,
          subscriptionId: subscription.id,
          email: ctx.user.email,
          provider: "mercado-pago",
          method: "pix",
          amount: money(billing.price),
          status: "creating",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          orderIds: [],
        };
        if (!(payment.amount > 0)) throw error("Valor da assinatura inválido.");
        db.state.paymentEvents.unshift(payment);
        db.saveNow();
      }
      if (!running.has(payment.id))
        running.set(payment.id, createProvider(payment));
      try {
        await running.get(payment.id);
      } finally {
        running.delete(payment.id);
      }
      return {
        status: 200,
        body: {
          ...publicPayment(payment),
          expiresAt: Date.parse(payment.expiresAt),
          mode: process.env.PAYMENTS_TEST_MODE === "1" ? "test" : "provider",
        },
      };
    } catch (e) {
      return resultError(e);
    }
  };

  async function stripeWebhook(req) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !process.env.STRIPE_SECRET_KEY)
      return { status: 503, body: { error: "Webhook não configurado." } };
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024 * 1024)
        return { status: 413, body: { error: "Notificação muito grande." } };
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const parts = String(req.headers["stripe-signature"] || "")
      .split(",")
      .map((value) => value.trim().split("="));
    const timestamp = parts.find(([key]) => key === "t")?.[1];
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${raw}`)
      .digest("hex");
    const valid =
      Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300 &&
      parts.some(
        ([key, value]) =>
          key === "v1" &&
          /^[a-f0-9]{64}$/.test(value) &&
          crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected)),
      );
    if (!valid) return { status: 401, body: { error: "Assinatura inválida." } };
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      return { status: 400, body: { error: "JSON inválido." } };
    }
    const object = event.data?.object;
    if (event.type?.startsWith("checkout.session.")) {
      const payment = db.state.paymentEvents.find(
        (item) =>
          item.provider === "stripe" &&
          item.id === object?.client_reference_id &&
          (!item.providerSessionId || item.providerSessionId === object?.id),
      );
      if (payment) {
        payment.providerSessionId = object.id;
        await synchronize(payment);
      }
    } else if (
      event.type === "charge.refunded" ||
      event.type === "charge.dispute.created"
    ) {
      const chargeId =
        event.type === "charge.refunded" ? object?.id : object?.charge;
      if (typeof chargeId === "string") {
        const charge = await request(
          `${STRIPE}/charges/${encodeURIComponent(chargeId)}`,
          { headers: stripeHeaders() },
        );
        const payment = db.state.paymentEvents.find(
          (item) =>
            item.provider === "stripe" &&
            item.providerPaymentId === charge.payment_intent,
        );
        if (
          payment &&
          charge.currency === "brl" &&
          charge.amount === cents(payment.amount)
        ) {
          if (charge.refunded) await apply(payment, "refunded");
          else if (charge.disputed) await apply(payment, "charged_back");
        }
      }
    }
    return { status: 200, body: { received: true } };
  }

  let reconciling = false;
  async function reconcile() {
    if (reconciling) return;
    reconciling = true;
    try {
      const pending = db.state.paymentEvents
        .filter(
          (payment) =>
            ["mercado-pago", "stripe"].includes(payment.provider) &&
            ((!payment.paidAt &&
              !["expired", "refunded"].includes(payment.status)) ||
              ordersFor(payment).some(
                (item) => item.paymentStatus === "refund_pending",
              )),
        )
        .sort((a, b) => (a.reconciledAt || 0) - (b.reconciledAt || 0))
        .slice(0, 20);
      for (const payment of pending) {
        try {
          await synchronize(payment);
          for (const item of ordersFor(payment))
            if (item.paymentStatus === "refund_pending")
              await refundOrderPayment(item, payment);
        } catch {
          /* Keep the reservation until the provider can be consulted. */
        }
        payment.reconciledAt = Date.now();
      }
      await recurring.reconcile();
    } finally {
      reconciling = false;
    }
  }
  return { applyMercadoPago, stripeWebhook, synchronize, reconcile, recurringWebhook: recurring.webhook };
}

module.exports = { install, methods, money, refundStripe };
