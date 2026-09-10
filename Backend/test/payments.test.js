"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "foodcourt-payments-"));
process.env.FC_DB_PATH = path.join(temporary, "db.json");
process.env.SEED_DEMO_DATA = "0";
process.env.SESSION_SECRET = "payment-test-secret-at-least-32-chars";
process.env.APP_URL = "https://foodcourt.example";
process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-fixture";
process.env.MERCADO_PAGO_WEBHOOK_SECRET = "mp-webhook-test";
process.env.MERCADO_PAGO_DEBIT_ENABLED = "1";
process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_fixture";
process.env.PAYMENTS_TEST_MODE = "0";
const { server, start } = require("../src/server");
const db = require("../src/lib/db");
const auth = require("../src/lib/auth");
const originalFetch = global.fetch;
let base,
  cookie,
  merchantCookie,
  otherCookie,
  shop,
  providerCalls,
  providerRecords,
  sessions,
  refunds,
  failNext;

test.before(async () => {
  start(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  global.fetch = async (input, options = {}) => {
    const url = String(input);
    if (url.startsWith(base)) return originalFetch(input, options);
    providerCalls.push({ url, options });
    if (failNext) {
      failNext = false;
      throw new Error("provider timeout");
    }
    const response = (body) =>
      new Response(JSON.stringify(body), { status: 200 });
    if (url.endsWith("/v1/payments") && options.method === "POST") {
      const body = JSON.parse(options.body);
      const id = options.headers["X-Idempotency-Key"];
      const record = (providerRecords[id] ||= {
        id,
        external_reference: body.external_reference,
        transaction_amount: body.transaction_amount,
        currency_id: "BRL",
        status: "pending",
        point_of_interaction: {
          transaction_data: { qr_code: "000201-TEST-ONLY" },
        },
        date_of_expiration: body.date_of_expiration,
      });
      return response(record);
    }
    if (url.includes("/v1/payments/search")) {
      const reference = new URL(url).searchParams.get("external_reference");
      return response({
        results: Object.values(providerRecords).filter(
          (record) => record.external_reference === reference,
        ),
      });
    }
    if (url.includes("/refunds")) {
      refunds++;
      const stripe = url.includes("stripe.com");
      return response({
        id: "refund-fixture",
        amount: stripe
          ? Number(new URLSearchParams(options.body).get("amount"))
          : JSON.parse(options.body).amount,
        status: stripe ? "succeeded" : "approved",
      });
    }
    if (url.includes("/v1/payments/"))
      return response(
        providerRecords[decodeURIComponent(url.split("/").pop())],
      );
    if (url.endsWith("/checkout/preferences"))
      return response({
        id: "pref-fixture",
        init_point:
          "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=fixture",
        sandbox_init_point:
          "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=fixture",
      });
    if (url.endsWith("/checkout/sessions") && options.method === "POST") {
      const body = new URLSearchParams(options.body);
      const id = "cs_" + body.get("client_reference_id");
      sessions[id] = {
        id,
        client_reference_id: body.get("client_reference_id"),
        amount_total: Number(
          body.get("line_items[0][price_data][unit_amount]"),
        ),
        currency: "brl",
        status: "open",
        payment_status: "unpaid",
        url: "https://checkout.stripe.com/c/pay/fixture",
        payment_intent: "pi_fixture",
      };
      return response(sessions[id]);
    }
    if (url.includes("/checkout/sessions/"))
      return response(sessions[url.split("/").pop()]);
    throw new Error("Unexpected external request: " + url);
  };
});

test.beforeEach(() => {
  providerCalls = [];
  providerRecords = {};
  sessions = {};
  refunds = 0;
  failNext = false;
  db.state.paymentEvents = [];
  db.state.platformOrders = [];
  db.state.promotions = [];
  db.state.userCoupons = [];
  db.state.userNotifications = [];
  for (const [id, role] of [
    ["buyer", "customer"],
    ["merchant", "merchant"],
    ["other", "customer"],
  ]) {
    if (!db.state.users.some((user) => user.id === id))
      db.addUser({
        id,
        role,
        fullName: id,
        email: `${id}@example.com`,
        status: "active",
      });
  }
  cookie = `fc_session=${auth.createSession("buyer")}`;
  merchantCookie = `fc_session=${auth.createSession("merchant")}`;
  otherCookie = `fc_session=${auth.createSession("other")}`;
  shop = {
    id: "test-shop",
    slug: "test-shop",
    name: "Test shop",
    status: "active",
    open: true,
    ownerId: "merchant",
    deliveryFee: 7,
    freeShippingMin: 100,
    products: [
      {
        id: "meal",
        name: "Meal",
        price: 25,
        stock: 20,
        active: true,
        options: [
          {
            name: "Extras",
            type: "multi",
            choices: [{ name: "Cheese", price: 3 }],
          },
        ],
      },
    ],
  };
  db.state.stores = [shop];
  db.state.customerAddresses = [
    {
      id: "address",
      userId: "buyer",
      label: "Home",
      street: "Test street",
      number: "1",
      city: "Test",
    },
  ];
  db.state.subscriptions = [];
});

test.after(async () => {
  global.fetch = originalFetch;
  await new Promise((resolve) => server.close(resolve));
  // Only the test-created temporary directory is removed.
  fs.rmSync(temporary, { recursive: true, force: true });
});

async function api(route, body, session = cookie) {
  const response = await fetch(base + route, {
    method: body === undefined ? "GET" : "POST",
    headers: { Cookie: session, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}
function cart(extra = {}) {
  return {
    groups: [
      {
        storeId: shop.id,
        items: [{ productId: "meal", quantity: 2, options: ["Cheese"] }],
      },
    ],
    addressId: "address",
    delivery: "priority",
    scheduledAt: null,
    couponCode: "",
    method: "pix",
    expectedTotal: 67.9,
    idempotencyKey: crypto.randomUUID(),
    ...extra,
  };
}
async function create(body = cart()) {
  const result = await api("/api/checkout", body);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.payment;
}
async function mpWebhook(record, signatureValid = true) {
  const requestId = "request-fixture";
  const ts = String(Date.now());
  const manifest = `id:${record.id.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const hash = crypto
    .createHmac("sha256", process.env.MERCADO_PAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");
  return fetch(
    `${base}/api/payments/mercadopago/webhook?data.id=${record.id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
        "x-signature": `ts=${ts},v1=${signatureValid ? hash : "0".repeat(64)}`,
      },
      body: JSON.stringify({ type: "payment", data: { id: record.id } }),
    },
  );
}
async function stripeWebhook(session, age = 0) {
  const raw = JSON.stringify({
    type: "checkout.session.completed",
    data: { object: session },
  });
  const ts = Math.floor(Date.now() / 1000) - age;
  const hash = crypto
    .createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${ts}.${raw}`)
    .digest("hex");
  return fetch(`${base}/api/payments/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": `t=${ts},v1=${hash}`,
    },
    body: raw,
  });
}

test("checkout methods fail closed without provider configuration; legacy bypasses are retired", async () => {
  delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
  try {
    const config = await api("/api/payments/config");
    assert.equal(
      config.body.methods.find((item) => item.id === "pix").enabled,
      false,
    );
    assert.equal((await api("/api/checkout", cart())).status, 503);
    assert.equal(db.state.platformOrders.length, 0);
  } finally {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-fixture";
  }
  assert.equal(
    (await api("/api/orders", { paymentMethod: "paid" })).status,
    410,
  );
  assert.equal((await api("/api/pix-charge", { amount: 0.01 })).status, 410);
});

test("pickup has no freight or customer address and finishes without a courier", async () => {
  shop.deliveryModes = ["delivery", "pickup"];
  shop.address = { street: "Store street", number: "10", city: "Test" };
  const body = cart({ delivery: "pickup", addressId: null, expectedTotal: 56 });
  const quote = await api("/api/checkout/quote", body);
  assert.equal(quote.status, 200);
  assert.equal(quote.body.deliveryFee, 0);
  assert.equal(quote.body.total, 56);
  const payment = await create(body);
  providerRecords[payment.id].status = "approved";
  await mpWebhook(providerRecords[payment.id]);
  const orderId = payment.orders[0].id;
  assert.equal(
    (
      await api(
        "/api/partner-order-status",
        { orderId, status: "delivered" },
        merchantCookie,
      )
    ).status,
    409,
  );
  for (const status of ["accepted", "preparing", "ready", "delivered"]) {
    const result = await api(
      "/api/partner-order-status",
      { orderId, status },
      merchantCookie,
    );
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.order.fulfillment, "pickup");
    assert.match(result.body.order.address, /Store street/);
  }
  assert.equal(
    db.state.deliveries.some((delivery) => delivery.orderId === orderId),
    false,
  );
});

test("pickup requires store opt-in and an address; pickup-only stores reject delivery", async () => {
  const body = cart({ delivery: "pickup", addressId: null, expectedTotal: 56 });
  assert.equal((await api("/api/checkout/quote", body)).status, 400);
  shop.deliveryModes = ["pickup"];
  assert.equal((await api("/api/checkout/quote", body)).status, 400);
  shop.address = { street: "Store street", number: "10" };
  assert.equal((await api("/api/checkout/quote", cart())).status, 400);
  assert.equal(providerCalls.length, 0);
});

test("closures reject immediate and scheduled checkout and can be removed by the merchant", async () => {
  const { dateKey } = require("../src/lib/closures");
  shop.autoSchedule = true;
  shop.hours = Object.fromEntries(
    ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((day) => [
      day,
      ["00:00", "00:00"],
    ]),
  );
  const future = new Date(Date.now() + 86400000);
  const closures = [...new Set([dateKey(new Date()), dateKey(future)])].map(
    (date) => ({ date }),
  );
  assert.equal(
    (await api("/api/partner-store", { closures }, merchantCookie)).status,
    200,
  );
  assert.equal((await api("/api/checkout/quote", cart())).status, 400);
  assert.equal(
    (
      await api(
        "/api/checkout/quote",
        cart({ scheduledAt: future.toISOString() }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        "/api/partner-store",
        { closures: [{ date: "2026-02-30" }] },
        merchantCookie,
      )
    ).status,
    400,
  );
  assert.deepEqual(
    shop.closures.map((entry) => entry.date),
    closures.map((entry) => entry.date),
  );
  assert.equal(
    (await api("/api/partner-store", { closures: [] }, merchantCookie)).status,
    200,
  );
  assert.equal(
    (
      await api(
        "/api/checkout/quote",
        cart({ scheduledAt: future.toISOString() }),
      )
    ).status,
    200,
  );
});

test("concurrent scheduled checkouts cannot overbook the store capacity", async () => {
  shop.autoSchedule = true;
  shop.hours = Object.fromEntries(
    ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((day) => [
      day,
      ["00:00", "00:00"],
    ]),
  );
  assert.equal(
    (await api("/api/partner-store", { scheduledCapacity: 1 }, merchantCookie))
      .status,
    200,
  );
  assert.equal(
    (await api("/api/partner-store", { scheduledCapacity: -1 }, merchantCookie))
      .status,
    400,
  );
  const scheduledAt = new Date(
    Math.ceil((Date.now() + 86400000) / 1800000) * 1800000,
  ).toISOString();
  const results = await Promise.all([
    api("/api/checkout", cart({ scheduledAt })),
    api("/api/checkout", cart({ scheduledAt })),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 400]);
  assert.equal(db.state.platformOrders.length, 1);
  assert.match(
    results.find((result) => result.status === 400).body.error,
    /lotado/,
  );
  assert.equal(
    (await api("/api/checkout/quote", cart({ scheduledAt }))).status,
    400,
  );
  assert.equal((await api("/api/checkout/quote", cart())).status, 200);
});

test("reviews require a completed owned order and a valid score, awarding points once", async () => {
  const orderId = crypto.randomUUID();
  db.state.platformOrders.push({
    id: orderId,
    customerId: "buyer",
    storeId: shop.id,
    status: "cancelled",
  });
  const user = db.state.users.find((item) => item.id === "buyer");
  const points = user.points || 0;
  assert.equal(
    (await api("/api/customer-reviews", { orderId, rating: 2 })).status,
    400,
  );
  db.state.platformOrders[0].status = "delivered";
  assert.equal(
    (await api("/api/customer-reviews", { orderId, rating: 2 }, otherCookie))
      .status,
    400,
  );
  for (const rating of [0, 6, 1.5, null, "invalid"]) {
    assert.equal(
      (await api("/api/customer-reviews", { orderId, rating })).status,
      400,
    );
  }
  const result = await api("/api/customer-reviews", {
    orderId,
    rating: 2,
    comment: "Could improve",
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.review.rating, 2);
  const reply = {
    reviewId: result.body.review.id,
    reply: "Obrigado pelo retorno.",
  };
  assert.equal(
    (await api("/api/partner-review-reply", reply, otherCookie)).status,
    403,
  );
  assert.equal(
    (await api("/api/partner-review-reply", reply, merchantCookie)).status,
    200,
  );
  assert.equal(
    db.state.userNotifications.filter(
      (item) => item.userId === "buyer" && item.orderId === orderId,
    ).length,
    1,
  );
  assert.equal(
    (await api("/api/partner-review-reply", reply, merchantCookie)).status,
    200,
  );
  assert.equal(
    db.state.userNotifications.filter(
      (item) => item.userId === "buyer" && item.orderId === orderId,
    ).length,
    1,
  );
  assert.equal(
    (await api("/api/customer-reviews")).body.reviews.find(
      (item) => item.id === reply.reviewId,
    ).reply,
    reply.reply,
  );
  assert.equal(result.body.points, points + 10);
  assert.equal(
    (await api("/api/customer-reviews", { orderId, rating: 5 })).status,
    409,
  );
  assert.equal(user.points, points + 10);
  assert.ok(
    (await api("/api/customer-reviews")).body.reviews.some(
      (review) => review.orderId === orderId,
    ),
  );
});

test("server prices extras, quantity, delivery and priority instead of client totals", async () => {
  const body = cart({ amount: 0.01, expectedTotal: 0.01 });
  const quote = await api("/api/checkout/quote", body);
  assert.equal(quote.body.total, 67.9);
  assert.equal(quote.body.subtotal, 56);
  assert.equal(quote.body.deliveryFee, 11.9);
  assert.equal((await api("/api/checkout", body)).status, 409);
  assert.equal(shop.products[0].stock, 20);
  assert.equal(providerCalls.length, 0);
});

test("invalid options, fractional quantities, duplicate stock requests and foreign address are rejected", async () => {
  for (const items of [
    [{ productId: "meal", quantity: 1.5 }],
    [{ productId: "meal", quantity: 1, options: ["fake"] }],
    [{ productId: "meal", quantity: 1, options: ["Cheese", "Cheese"] }],
    [
      { productId: "meal", quantity: 15 },
      { productId: "meal", quantity: 15 },
    ],
  ]) {
    assert.equal(
      (
        await api(
          "/api/checkout/quote",
          cart({ groups: [{ storeId: shop.id, items }] }),
        )
      ).status,
      400,
    );
  }
  assert.equal(
    (await api("/api/checkout/quote", cart(), otherCookie)).status,
    400,
  );
  assert.equal(shop.products[0].stock, 20);
});

test("multi-store checkout charges each delivery and reserves all groups once", async () => {
  const second = {
    ...structuredClone(shop),
    id: "second",
    slug: "second",
    deliveryFee: 5,
  };
  db.state.stores.push(second);
  const body = cart();
  body.groups.push({
    storeId: second.id,
    items: [{ productId: "meal", quantity: 1 }],
  });
  body.expectedTotal = 102.8;
  const payment = await create(body);
  assert.equal(payment.orders.length, 2);
  assert.equal(payment.amount, 102.8);
  assert.equal(shop.products[0].stock, 18);
  assert.equal(second.products[0].stock, 19);
  assert.equal(
    JSON.parse(providerCalls[0].options.body).transaction_amount,
    102.8,
  );
});

test("a bad second group cannot leave a partially reserved checkout", async () => {
  const body = cart();
  body.groups.push({
    storeId: "missing",
    items: [{ productId: "meal", quantity: 1 }],
  });
  assert.equal((await api("/api/checkout", body)).status, 400);
  assert.equal(shop.products[0].stock, 20);
  assert.equal(db.state.platformOrders.length, 0);
});

test("concurrent retries create one charge and one order; modified retries are rejected", async () => {
  const body = cart();
  const [first, second] = await Promise.all([create(body), create(body)]);
  assert.equal(first.id, second.id);
  assert.equal(db.state.platformOrders.length, 1);
  assert.equal(
    providerCalls.filter((call) => call.options.method === "POST").length,
    1,
  );
  assert.equal(shop.products[0].stock, 18);
  assert.equal(
    (await api("/api/checkout", { ...body, delivery: "standard" })).status,
    409,
  );
});

test("a provider timeout can be retried without reserving twice", async () => {
  const body = cart();
  failNext = true;
  assert.equal((await api("/api/checkout", body)).status, 502);
  assert.equal(shop.products[0].stock, 18);
  const payment = await create(body);
  assert.equal(payment.status, "pending");
  assert.equal(db.state.platformOrders.length, 1);
  assert.equal(
    providerCalls[0].options.headers["X-Idempotency-Key"],
    providerCalls[1].options.headers["X-Idempotency-Key"],
  );
});

test("unpaid and rejected orders cannot be accepted; signed approval is idempotent", async () => {
  const payment = await create();
  const body = { orderId: payment.orders[0].id, status: "accepted" };
  assert.equal(
    (await api("/api/partner-order-status", body, merchantCookie)).status,
    409,
  );
  const record = providerRecords[payment.id];
  record.status = "rejected";
  assert.equal((await mpWebhook(record)).status, 200);
  assert.equal(
    (await api("/api/partner-order-status", body, merchantCookie)).status,
    409,
  );
  record.status = "approved";
  assert.equal((await mpWebhook(record, false)).status, 401);
  assert.equal(db.state.platformOrders[0].paymentStatus, "failed");
  assert.equal((await mpWebhook(record)).status, 200);
  const count = db.state.userNotifications.length;
  assert.equal((await mpWebhook(record)).status, 200);
  assert.equal(db.state.userNotifications.length, count);
  assert.equal(
    (await api("/api/partner-order-status", body, merchantCookie)).status,
    200,
  );
});

test("signed notifications with the wrong amount or currency never approve an order", async () => {
  const payment = await create();
  const record = providerRecords[payment.id];
  record.status = "approved";
  record.transaction_amount = 1;
  assert.notEqual((await mpWebhook(record)).status, 200);
  assert.equal(db.state.platformOrders[0].paymentStatus, "pending");
  record.transaction_amount = payment.amount;
  record.currency_id = "USD";
  assert.notEqual((await mpWebhook(record)).status, 200);
  assert.equal(db.state.platformOrders[0].paymentStatus, "pending");
});

test("payment lookup and cancellation are isolated by customer", async () => {
  const payment = await create();
  assert.equal(
    (await api(`/api/payments/${payment.id}`, undefined, otherCookie)).status,
    404,
  );
  assert.equal(
    (await api(`/api/payments/${payment.id}/cancel`, {}, otherCookie)).status,
    404,
  );
  assert.equal(db.state.platformOrders[0].status, "pending");
});

test("late Pix approval after cancellation refunds once and never reopens the order", async () => {
  const payment = await create();
  assert.equal(
    (await api(`/api/payments/${payment.id}/cancel`, {})).status,
    200,
  );
  assert.equal(shop.products[0].stock, 20);
  providerRecords[payment.id].status = "approved";
  assert.equal((await mpWebhook(providerRecords[payment.id])).status, 200);
  assert.equal(db.state.platformOrders[0].status, "cancelled");
  assert.equal(db.state.platformOrders[0].paymentStatus, "refunded");
  assert.equal(refunds, 1);
  await mpWebhook(providerRecords[payment.id]);
  assert.equal(refunds, 1);
});

test("expired unpaid Pix restores reserved inventory without creating another QR", async () => {
  const payment = await create();
  db.state.paymentEvents[0].expiresAt = new Date(Date.now() - 1).toISOString();
  const result = await api(`/api/payments/${payment.id}`);
  assert.equal(result.body.payment.status, "expired");
  assert.equal(shop.products[0].stock, 20);
  assert.equal(
    providerCalls.filter((call) => call.options.method === "POST").length,
    1,
  );
});

test("credit and debit use hosted checkout with the requested payment type", async () => {
  for (const method of ["credit", "debit"]) {
    const payment = await create(cart({ method }));
    assert.match(payment.url, /^https:\/\/www\.mercadopago\.com\.br\//);
    const preference = JSON.parse(providerCalls.at(-1).options.body);
    assert.equal(preference.external_reference, payment.id);
    assert.ok(
      !preference.payment_methods.excluded_payment_types.some(
        (type) =>
          type.id === (method === "credit" ? "credit_card" : "debit_card"),
      ),
    );
    assert.equal(payment.orders[0].paymentStatus, "pending");
  }
});

test("Apple Pay uses hosted Stripe Checkout and verifies session payment status on return", async () => {
  const payment = await create(cart({ method: "apple_pay" }));
  const session = Object.values(sessions)[0];
  assert.match(payment.url, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal(session.amount_total, 6790);
  assert.equal(
    (await api(`/api/payments/${payment.id}`)).body.payment.status,
    "pending",
  );
  session.payment_status = "paid";
  session.status = "complete";
  assert.equal((await stripeWebhook(session, 600)).status, 401);
  assert.equal((await stripeWebhook(session)).status, 200);
  assert.equal(db.state.platformOrders[0].paymentStatus, "paid");
  assert.equal(
    (await api(`/api/payments/${payment.id}/cancel`, {})).status,
    200,
  );
  assert.equal(db.state.platformOrders[0].paymentStatus, "refunded");
  assert.equal(refunds, 1);
});

test("subscription Pix is provider-backed and signed approval activates the subscription only", async () => {
  db.state.subscriptions.push({
    id: "subscription",
    storeId: shop.id,
    status: "PENDING",
    price: 119.9,
  });
  const first = await api("/api/partner-subscription-pix", {}, merchantCookie);
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const second = await api("/api/partner-subscription-pix", {}, merchantCookie);
  assert.equal(second.body.id, first.body.id);
  assert.equal(db.state.subscriptions[0].status, "PENDING");
  providerRecords[first.body.id].status = "approved";
  assert.equal((await mpWebhook(providerRecords[first.body.id])).status, 200);
  assert.equal(db.state.subscriptions[0].status, "ACTIVE");
  assert.equal(db.state.platformOrders.length, 0);
  assert.equal(
    (await api("/api/partner-subscription-pix", {}, merchantCookie)).status,
    409,
  );
  db.state.subscriptions[0].paidAt = "2020-01-10T15:00:00Z";
  const renewal = await api(
    "/api/partner-subscription-pix",
    {},
    merchantCookie,
  );
  assert.equal(renewal.status, 200);
  assert.notEqual(renewal.body.id, first.body.id);
  providerRecords[renewal.body.id].status = "approved";
  await mpWebhook(providerRecords[renewal.body.id]);
  const billing = db.state.subscriptions[0];
  assert.equal(
    billing.nextBillingAt,
    require("../src/lib/subscriptions").nextMonth(billing.paidAt),
  );
  const due = billing.nextBillingAt;
  await mpWebhook(providerRecords[renewal.body.id]);
  assert.equal(billing.nextBillingAt, due);
});

test("observations survive checkout and scheduling respects opening hours", async () => {
  const body = cart();
  body.groups[0].items[0].note = "Sem cebola";
  await create(body);
  assert.equal(db.state.platformOrders[0].items[0].note, "Sem cebola");
  shop.autoSchedule = true;
  shop.hours = Object.fromEntries(
    ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => [
      day,
      ["", ""],
    ]),
  );
  const scheduled = cart({
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
  });
  assert.equal((await api("/api/checkout/quote", scheduled)).status, 400);
  shop.hours = Object.fromEntries(
    ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => [
      day,
      ["00:00", "00:00"],
    ]),
  );
  assert.equal((await api("/api/checkout/quote", scheduled)).status, 200);
});

test("merchant options are persisted and delivery coverage rejects an outside address", async () => {
  const product = shop.products.find((item) => item.id === "meal");
  const options = [
    {
      name: "Tamanho",
      type: "single",
      required: true,
      choices: [{ name: "Grande", price: 5 }],
    },
  ];
  const result = await api(
    "/api/partner-product",
    { ...product, options },
    merchantCookie,
  );
  assert.equal(result.status, 200);
  assert.deepEqual(product.options, options);
  assert.equal(
    (
      await api(
        "/api/partner-product",
        { ...product, stock: -1 },
        merchantCookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        "/api/partner-product",
        {
          ...product,
          options: [
            { ...options[0], choices: [{ name: "Grande", price: -1 }] },
          ],
        },
        merchantCookie,
      )
    ).status,
    400,
  );
  const body = cart();
  body.groups[0].items[0].options = ["Grande"];
  assert.equal((await api("/api/checkout/quote", body)).status, 200);
  shop.deliveryCepPrefixes = ["99999"];
  assert.equal((await api("/api/checkout/quote", body)).status, 400);
});

test("free shipping coupon does not waive the separately requested priority service", async () => {
  db.state.promotions.push({
    id: "shipping",
    storeId: shop.id,
    code: "FRETE",
    type: "shipping",
    active: true,
  });
  const priced = await api(
    "/api/checkout/quote",
    cart({ couponCode: "FRETE" }),
  );
  assert.equal(priced.status, 200);
  assert.equal(priced.body.discount, 7);
  assert.equal(priced.body.total, 60.9);
});

test("an interrupted charge can be recovered from the order payment link", async () => {
  failNext = true;
  assert.equal((await api("/api/checkout", cart())).status, 502);
  const payment = db.state.paymentEvents[0];
  const recovered = await api(`/api/payments/${payment.id}`);
  assert.equal(recovered.status, 200);
  assert.equal(recovered.body.payment.status, "pending");
  assert.ok(recovered.body.payment.qrCode);
  assert.equal(db.state.platformOrders.length, 1);
});

test("asynchronous Stripe refund is retrieved instead of submitting a second refund", async () => {
  const payment = await create(cart({ method: "apple_pay" }));
  const session = Object.values(sessions)[0];
  session.payment_status = "paid";
  await stripeWebhook(session);
  const previousFetch = global.fetch;
  const refundMethods = [];
  global.fetch = async (input, options = {}) => {
    if (String(input).startsWith("https://api.stripe.com/v1/refunds")) {
      refundMethods.push(options.method || "GET");
      return new Response(
        JSON.stringify({
          id: "re_pending",
          amount: 6790,
          status: options.method === "POST" ? "pending" : "succeeded",
        }),
        { status: 200 },
      );
    }
    return previousFetch(input, options);
  };
  try {
    assert.equal(
      (await api(`/api/payments/${payment.id}/cancel`, {})).status,
      200,
    );
    assert.equal(db.state.platformOrders[0].paymentStatus, "refund_pending");
    assert.equal((await stripeWebhook(session)).status, 200);
    assert.equal(db.state.platformOrders[0].paymentStatus, "refunded");
    assert.deepEqual(refundMethods, ["POST", "GET"]);
  } finally {
    global.fetch = previousFetch;
  }
});
