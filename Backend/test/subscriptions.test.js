const test = require("node:test");
const assert = require("node:assert/strict");
const { nextMonth, summary } = require("../src/lib/subscriptions");

test("monthly billing preserves local day and clamps short months", () => {
  assert.equal(nextMonth("2026-09-10T15:00:00Z"), "2026-10-10T15:00:00.000Z");
  assert.equal(nextMonth("2026-01-31T15:00:00Z"), "2026-02-28T15:00:00.000Z");
  assert.equal(nextMonth("2028-01-31T15:00:00Z"), "2028-02-29T15:00:00.000Z");
  assert.equal(nextMonth("2026-12-11T01:00:00Z"), "2027-01-11T01:00:00.000Z");
});

test("only the designated owner has lifetime access; others expire", () => {
  const subscription = {
    paidAt: "2026-09-10T15:00:00Z",
    createdAt: "2026-09-10T15:00:00Z",
    status: "ACTIVE",
    complimentary: true,
    provider: "OWNER_ACCESS",
    price: 0,
  };
  const now = Date.parse("2026-09-20T15:00:00Z");
  const monthly = summary(subscription, { email: "merchant@example.com" }, now);
  assert.equal(monthly.lifetime, false);
  assert.equal(monthly.daysUsed, 10);
  assert.equal(monthly.daysRemaining, 20);
  assert.equal(monthly.price, 119.9);
  assert.equal(
    summary(
      subscription,
      { email: "merchant@example.com" },
      Date.parse("2026-10-10T15:00:00Z"),
    ).status,
    "OVERDUE",
  );
  const owner = summary(
    subscription,
    { email: "fracalossi2020@gmail.com" },
    now,
  );
  assert.equal(owner.lifetime, true);
  assert.equal(owner.nextBillingAt, null);
  assert.equal(owner.price, 0);
});
