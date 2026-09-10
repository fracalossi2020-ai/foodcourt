const test = require("node:test");
const assert = require("node:assert/strict");
const { available, normalize } = require("../src/lib/capacity");
test("capacity shares a half-hour bucket and cancellation releases the slot", () => {
  const store = { id: "shop", scheduledCapacity: 1 };
  const orders = [
    { storeId: "shop", scheduledAt: "2026-09-11T15:01:00Z", status: "pending" },
  ];
  assert.equal(available(store, orders, "2026-09-11T15:29:59Z"), false);
  assert.equal(available(store, orders, "2026-09-11T15:30:00Z"), true);
  assert.equal(
    available({ ...store, id: "other" }, orders, orders[0].scheduledAt),
    true,
  );
  orders[0].status = "cancelled";
  assert.equal(available(store, orders, orders[0].scheduledAt), true);
});
test("zero disables capacity and invalid limits are rejected", () => {
  assert.equal(available({ scheduledCapacity: 0 }, [], new Date()), true);
  for (const limit of [-1, 1.5, "abc", 501])
    assert.throws(() => normalize(limit));
  assert.equal(normalize("5"), 5);
});
