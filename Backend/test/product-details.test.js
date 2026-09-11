const test = require("node:test");
const assert = require("node:assert/strict");
const { normalize, paused } = require("../src/lib/product-details");
test("product pauses expire exactly and metadata is preserved on partial edits", () => {
  const now = Date.parse("2026-09-11T12:00:00Z");
  const product = normalize(
    {
      pausedUntil: "2026-09-11T13:00:00Z",
      dietary: [" Vegano ", "Vegano"],
      allergens: ["Soja"],
    },
    {},
    now,
  );
  assert.equal(paused(product, now), true);
  assert.equal(paused(product, now + 3600000), false);
  assert.deepEqual(product.dietary, ["Vegano"]);
  assert.deepEqual(normalize({}, product, now), product);
  assert.equal(
    normalize({ pausedUntil: null }, product, now).pausedUntil,
    null,
  );
  assert.throws(() => normalize({ pausedUntil: "invalid" }, {}, now));
  assert.throws(() =>
    normalize({ pausedUntil: "2026-09-11T11:00:00Z" }, {}, now),
  );
  assert.throws(() => normalize({ allergens: "Leite" }, {}, now));
});
