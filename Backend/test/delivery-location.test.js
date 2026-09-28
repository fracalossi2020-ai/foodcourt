const test = require("node:test");
const assert = require("node:assert/strict");
const location = require("../src/lib/delivery-location");

test("GPS rejects invalid coordinates, isolates deliveries and expires exactly after TTL", () => {
  const delivery = {
    id: "gps-boundaries",
    courierId: "courier",
    status: "out_for_delivery",
  };
  const user = { id: "courier" };
  const valid = { latitude: 0, longitude: 0, accuracy: 0 };
  for (const patch of [
    { latitude: NaN },
    { longitude: Infinity },
    { latitude: "0" },
    { longitude: 181 },
    { accuracy: -1 },
    { accuracy: 10001 },
  ]) {
    assert.throws(() =>
      location.update(delivery, user, { ...valid, ...patch }, 1000000),
    );
  }
  location.update(delivery, user, valid, 1000000);
  assert.equal(location.read(delivery, 1120000).latitude, 0);
  assert.equal(location.read(delivery, 1120001), null);
  location.update(delivery, user, valid, 2000000);
  assert.equal(location.read({ ...delivery, id: "other" }, 2000001), null);
  assert.equal(
    location.read({ ...delivery, courierId: "replacement" }, 2000001),
    null,
  );
  assert.equal(location.read(delivery, 2000001), null);
});

test("stopping GPS cannot affect another courier or resurrect a completed delivery", () => {
  const delivery = {
    id: "gps-stop",
    courierId: "courier",
    status: "out_for_delivery",
  };
  const user = { id: "courier" };
  location.update(
    delivery,
    user,
    { latitude: -23.5, longitude: -46.6, accuracy: 12 },
    1000000,
  );
  assert.throws(() =>
    location.update(delivery, { id: "intruder" }, { stop: true }, 1000001),
  );
  assert.ok(location.read(delivery, 1000001));
  assert.equal(
    location.read({ ...delivery, status: "cancelled" }, 1000001),
    null,
  );
  assert.equal(location.read(delivery, 1000001), null);
});
test("location is limited to the assigned active courier, expires and can be stopped", () => {
  const delivery = { id: "d", courierId: "c", status: "out_for_delivery" };
  const user = { id: "c" };
  const point = { latitude: -20, longitude: -40, accuracy: 10 };
  assert.throws(() => location.update(delivery, { id: "other" }, point));
  assert.throws(() =>
    location.update(delivery, user, { ...point, latitude: 100 }),
  );
  location.update(delivery, user, point, 1000000);
  assert.equal(location.read(delivery, 1000001).latitude, -20);
  assert.equal(location.read(delivery, 1120001), null);
  location.update(delivery, user, point);
  location.update(delivery, user, { stop: true });
  assert.equal(location.read(delivery), null);
  location.update(delivery, user, point);
  assert.equal(location.read({ ...delivery, status: "delivered" }), null);
  assert.throws(() =>
    location.update({ ...delivery, status: "delivered" }, user, point),
  );
});
