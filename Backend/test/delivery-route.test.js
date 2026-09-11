const test = require("node:test");
const assert = require("node:assert/strict");
const { calculate } = require("../src/lib/delivery-route");

test("route uses active position, traffic estimate and only exposes the browser key", async (t) => {
  const previous = [
    process.env.GOOGLE_ROUTES_API_KEY,
    process.env.GOOGLE_MAPS_EMBED_KEY,
  ];
  process.env.GOOGLE_ROUTES_API_KEY = "private-route-key";
  process.env.GOOGLE_MAPS_EMBED_KEY = "public-embed-key";
  t.after(() =>
    ["GOOGLE_ROUTES_API_KEY", "GOOGLE_MAPS_EMBED_KEY"].forEach((name, i) => {
      if (previous[i] === undefined) delete process.env[name];
      else process.env[name] = previous[i];
    }),
  );
  const position = {
    latitude: -20,
    longitude: -40,
    accuracy: 10,
    updatedAt: new Date().toISOString(),
  };
  let calls = 0;
  const request = async (url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.routingPreference, "TRAFFIC_AWARE");
    assert.equal(body.destination.address, "Rua Exemplo, 10");
    assert.equal(options.headers["X-Goog-Api-Key"], "private-route-key");
    return { ok: true, json: async () => ({ routes: [{ duration: "601s" }] }) };
  };
  const order = { id: "o", address: "Casa — Rua Exemplo, 10" };
  const delivery = { id: "d", courierId: "c" };
  const values = await Promise.all([
    calculate(order, delivery, position, request),
    calculate(order, delivery, position, request),
  ]);
  assert.equal(calls, 1);
  assert.equal(values[0].minutes, 11);
  assert.ok(!JSON.stringify(values).includes("private-route-key"));
  assert.equal(
    new URL(values[0].embedUrl).searchParams.get("key"),
    "public-embed-key",
  );
  await assert.rejects(
    calculate(order, delivery, { ...position, accuracy: 500 }, request),
  );
  await assert.rejects(
    calculate(
      order,
      delivery,
      { ...position, updatedAt: "2020-01-01" },
      request,
    ),
  );
  await calculate(order, { ...delivery, courierId: "new" }, position, request);
  assert.equal(calls, 2);
});
