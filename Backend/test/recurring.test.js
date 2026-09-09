const test = require("node:test");
const assert = require("node:assert/strict");
const { install } = require("../src/lib/recurring");

test("recurring authorization, paid invoices, duplicate delivery, ownership and cancellation", async () => {
  const previous = [
    process.env.MERCADO_PAGO_ACCESS_TOKEN,
    process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  ];
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "test";
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = "test";
  try {
    const api = {};
    const sub = { id: "sub", storeId: "shop", status: "PENDING", price: 119.9 };
    const db = {
      state: {
        subscriptions: [sub],
        stores: [{ id: "shop", ownerId: "user" }],
        paymentEvents: [],
      },
      uid: () => "reference",
      saveNow() {},
    };
    const user = { id: "user", email: "merchant@example.com" };
    let remote;
    let paid = false;
    let creates = 0;
    const service = install({
      api,
      db,
      headers: () => ({}),
      appUrl: () => "https://example.com",
      request: async (url, options) => {
        const path = new URL(url).pathname;
        if (path === "/preapproval/search")
          return { results: remote ? [remote] : [] };
        if (path === "/preapproval") {
          creates++;
          const body = JSON.parse(options.body);
          assert.equal(body.auto_recurring.frequency_type, "months");
          assert.equal(body.auto_recurring.transaction_amount, 119.9);
          assert.equal(body.status, "pending");
          remote = {
            ...body,
            id: "agreement",
            init_point:
              "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=agreement",
          };
          return remote;
        }
        if (path === "/preapproval/agreement") {
          if (options.method === "PUT")
            remote.status = JSON.parse(options.body).status;
          return remote;
        }
        if (path === "/authorized_payments/search")
          return {
            results: paid
              ? [{ preapproval_id: "agreement", payment: { id: 1 } }]
              : [],
          };
        if (path === "/v1/payments/1")
          return {
            id: 1,
            status: "approved",
            currency_id: "BRL",
            transaction_amount: 119.9,
            date_approved: "2026-09-10T15:00:00Z",
          };
        throw new Error("Unexpected URL " + path);
      },
    });
    const invoke = (action, body = {}, account = user) =>
      api["POST /api/partner-subscription-recurring" + action]({}, {}, body, {
        user: account,
      });
    assert.equal((await invoke("", {})).status, 400);
    assert.equal(
      (await invoke("", { consent: true }, { id: "other" })).status,
      404,
    );
    assert.equal(
      (
        await invoke(
          "",
          { consent: true },
          { ...user, email: "fracalossi2020@gmail.com" },
        )
      ).status,
      409,
    );
    await Promise.all([
      invoke("", { consent: true }),
      invoke("", { consent: true }),
    ]);
    assert.equal(creates, 1);
    assert.equal(sub.status, "PENDING");
    remote.status = "authorized";
    await invoke("-sync");
    assert.equal(
      sub.status,
      "PENDING",
      "authorization must not count as payment",
    );
    paid = true;
    await service.webhook("subscription_preapproval", "agreement");
    assert.equal(sub.status, "ACTIVE");
    assert.equal(sub.nextBillingAt, "2026-10-10T15:00:00.000Z");
    await service.webhook("subscription_preapproval", "agreement");
    assert.equal(sub.recurringPayments.length, 1);
    await invoke("-cancel");
    assert.equal(remote.status, "cancelled");
    assert.equal(sub.status, "ACTIVE", "cancellation keeps the paid period");
  } finally {
    for (const [index, key] of [
      "MERCADO_PAGO_ACCESS_TOKEN",
      "MERCADO_PAGO_WEBHOOK_SECRET",
    ].entries()) {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    }
  }
});
