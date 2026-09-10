const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dateKey,
  normalizeClosures,
  isClosedDate,
} = require("../src/lib/closures");

test("closure dates follow Brazil midnight instead of UTC midnight", () => {
  const store = { closures: [{ date: "2026-12-25" }] };
  assert.equal(dateKey(new Date("2026-12-25T02:59:00Z")), "2026-12-24");
  assert.equal(isClosedDate(store, new Date("2026-12-25T02:59:00Z")), false);
  assert.equal(isClosedDate(store, new Date("2026-12-25T03:00:00Z")), true);
  assert.equal(isClosedDate(store, new Date("2026-12-26T02:59:00Z")), true);
  assert.equal(isClosedDate(store, new Date("2026-12-26T03:00:00Z")), false);
});

test("closure validation rejects impossible dates, duplicates and excessive lists", () => {
  for (const value of [
    null,
    {},
    [{ date: "2026-02-30" }],
    [{ date: "bad" }],
    [{ date: "2026-12-25" }, { date: "2026-12-25" }],
    Array(61).fill({ date: "2026-12-25" }),
  ]) {
    assert.throws(() => normalizeClosures(value));
  }
  assert.deepEqual(
    normalizeClosures([{ date: "2028-02-29", reason: "  Feriado  " }]),
    [{ date: "2028-02-29", reason: "Feriado" }],
  );
  assert.deepEqual(normalizeClosures([]), []);
});
