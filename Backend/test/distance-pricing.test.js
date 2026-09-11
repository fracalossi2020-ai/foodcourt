const test = require("node:test");
const assert = require("node:assert/strict");
const pricing = require("../src/lib/distance-pricing");
test("route quotes use server addresses, cache requests and bind fees to the user and settings", async () => {
  const old = process.env.GOOGLE_ROUTES_API_KEY;
  process.env.GOOGLE_ROUTES_API_KEY = "fixture";
  const address = {
    id: "address",
    street: "Destination",
    number: "2",
    city: "Test",
    state: "MG",
  };
  const store = {
    id: "route-store",
    address: { ...address, street: "Origin" },
    distancePricing: { enabled: true, baseFee: 3, perKm: 2, maxKm: 10 },
  };
  let calls = 0;
  const request = async (url, options) => {
    calls++;
    assert.equal(
      url,
      "https://routes.googleapis.com/directions/v2:computeRoutes",
    );
    const body = JSON.parse(options.body);
    assert.match(body.origin.address, /Origin/);
    assert.match(body.destination.address, /Destination/);
    return {
      ok: true,
      json: async () => ({ routes: [{ distanceMeters: 2500 }] }),
    };
  };
  try {
    const [first, second] = await Promise.all([
      pricing.create(store, address, "u", request),
      pricing.create(store, address, "u", request),
    ]);
    assert.equal(first.id, second.id);
    assert.equal(calls, 1);
    assert.equal(first.fee, 8);
    assert.equal(first.distanceKm, 2.5);
    assert.equal(pricing.validate(first.id, store, address, "u").fee, 8);
    const now = Date.now;
    try {
      Date.now = () => now() + 11 * 60000;
      assert.throws(() => pricing.validate(first.id, store, address, "u"));
    } finally {
      Date.now = now;
    }
    assert.throws(() => pricing.validate(first.id, store, address, "other"));
    assert.throws(() =>
      pricing.validate(first.id, store, { ...address, number: "9" }, "u"),
    );
    store.distancePricing.perKm = 4;
    assert.throws(() => pricing.validate(first.id, store, address, "u"));
    store.distancePricing.maxKm = 1;
    await assert.rejects(
      pricing.create(store, address, "u", request),
      /alcance/,
    );
    assert.throws(() =>
      pricing.normalize({ enabled: true, baseFee: -1, perKm: 2, maxKm: 10 }),
    );
    delete process.env.GOOGLE_ROUTES_API_KEY;
    await assert.rejects(
      pricing.create(store, address, "u", request),
      /indisponível/,
    );
  } finally {
    if (old === undefined) delete process.env.GOOGLE_ROUTES_API_KEY;
    else process.env.GOOGLE_ROUTES_API_KEY = old;
  }
});
