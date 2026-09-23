const test = require("node:test");
process.env.PLATFORM_ADMIN_EMAIL = "admin@foodcourt.test";
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
    { email: process.env.PLATFORM_ADMIN_EMAIL },
    now,
  );
  assert.equal(owner.lifetime, true);
  assert.equal(owner.nextBillingAt, null);
  assert.equal(owner.price, 0);
});

test("new stores get a trial, then are blocked until paid; grace applies after due date", () => {
  const created = "2026-09-01T12:00:00Z";
  const subscription = { createdAt: created, status: "PENDING", price: 119.9 };
  const owner = { email: "merchant@example.com" };
  const day = 86400000;
  const inTrial = summary(subscription, owner, Date.parse(created) + 10 * day);
  assert.equal(inTrial.status, "TRIAL");
  assert.equal(inTrial.accessAllowed, true);
  assert.equal(inTrial.trialDaysRemaining, 20);
  const expired = summary(subscription, owner, Date.parse(created) + 31 * day);
  assert.equal(expired.status, "PENDING");
  assert.equal(expired.accessAllowed, false);
  assert.match(expired.blockReason, /período grátis terminou/);
  const paid = { ...subscription, paidAt: "2026-10-01T12:00:00Z" };
  assert.equal(summary(paid, owner, Date.parse("2026-10-20T12:00:00Z")).status, "ACTIVE");
  const overdueInGrace = summary(paid, owner, Date.parse("2026-11-03T12:00:00Z"));
  assert.equal(overdueInGrace.status, "OVERDUE");
  assert.equal(overdueInGrace.accessAllowed, true);
  const overdueBlocked = summary(paid, owner, Date.parse("2026-11-10T12:00:00Z"));
  assert.equal(overdueBlocked.status, "OVERDUE");
  assert.equal(overdueBlocked.accessAllowed, false);
  assert.equal(summary({ ...subscription, interval: "unlimited" }, owner).status, "ACTIVE");
});
