const test = require("node:test");
const assert = require("node:assert/strict");
const summary = require("../src/lib/finance-summary");

test("finance includes only delivered paid orders and isolates stores", () => {
  const orders = [
    {
      id: "paid",
      storeId: "a",
      status: "delivered",
      paymentStatus: "paid",
      total: 10.01,
    },
    { id: "missing", storeId: "a", status: "delivered", total: 50 },
    {
      id: "other",
      storeId: "b",
      status: "delivered",
      paymentStatus: "paid",
      total: 100,
    },
    {
      id: "ongoing",
      storeId: "a",
      status: "preparing",
      paymentStatus: "paid",
      total: 20,
    },
  ];
  const value = summary(orders, "a");
  assert.equal(value.gross, 10.01);
  assert.equal(value.commission, 1.2);
  assert.equal(value.net, 8.81);
  assert.equal(value.orders, 1);
  assert.equal(value.paidInProgress, 20);
  assert.deepEqual(
    value.issues.map((item) => item.id),
    ["missing"],
  );
  assert.equal(value.nextPayout, null);
});

test("finance separates refunds, disputes and cancelled paid orders", () => {
  const orders = ["refunded", "refund_pending", "charged_back", "paid"].map(
    (paymentStatus, i) => ({
      id: String(i),
      storeId: "a",
      status: "cancelled",
      paymentStatus,
      total: 30,
    }),
  );
  const value = summary(orders, "a");
  assert.equal(value.gross, 0);
  assert.equal(value.refunded, 30);
  assert.equal(value.refundPending, 30);
  assert.equal(value.chargedBack, 30);
  assert.equal(value.issues.length, 3);
  assert.equal(value.paidInProgress, 0);
});
