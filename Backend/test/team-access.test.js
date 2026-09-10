const test = require("node:test");
const assert = require("node:assert/strict");
const { roleFor, allowed } = require("../src/lib/team-access");
test("team permissions isolate kitchen, manager, owner and inactive accounts", () => {
  const store = { id: "shop", ownerId: "owner" };
  const user = { id: "cook", email: "cook@example.com", role: "customer" };
  const state = {
    storeMembers: [
      {
        storeId: "shop",
        userId: "cook",
        email: user.email,
        role: "kitchen",
        active: true,
      },
    ],
  };
  assert.equal(roleFor(state, user, store), "kitchen");
  assert.equal(
    allowed("kitchen", "POST", "/api/partner-order-status", {
      status: "preparing",
    }),
    true,
  );
  assert.equal(
    allowed("kitchen", "POST", "/api/partner-order-status", {
      status: "cancelled",
    }),
    false,
  );
  assert.equal(allowed("kitchen", "GET", "/api/partner-finance"), false);
  assert.equal(allowed("manager", "POST", "/api/partner-team-member"), false);
  assert.equal(allowed("manager", "POST", "/api/partner-product"), true);
  assert.equal(allowed("owner", "POST", "/api/partner-team-member"), true);
  assert.equal(roleFor(state, { ...user, id: "imposter" }, store), null);
  state.storeMembers[0].active = false;
  assert.equal(roleFor(state, user, store), null);
});
