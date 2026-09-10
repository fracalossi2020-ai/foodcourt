const test = require("node:test");
const assert = require("node:assert/strict");
const location = require("../src/lib/delivery-location");
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
