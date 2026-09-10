const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const planner = import(
  "data:text/javascript;base64," +
    fs
      .readFileSync(
        path.join(__dirname, "../../frontend/js/core/reorder-plan.js"),
      )
      .toString("base64")
);
test("reorder uses current prices, preserves notes and caps combined stock", async () => {
  const { planReorder } = await planner;
  const restaurant = {
    menu: [
      {
        items: [
          {
            id: "meal",
            name: "Meal",
            price: 30,
            stock: 3,
            options: [{ choices: [{ name: "Cheese", price: 5 }] }],
          },
        ],
      },
    ],
  };
  const old = {
    productId: "meal",
    quantity: 2,
    unitPrice: 20,
    options: ["Cheese"],
    note: "No onion",
  };
  const result = planReorder({ items: [old, old] }, restaurant);
  assert.deepEqual(
    result.items.map((item) => item.qty),
    [2, 1],
  );
  assert.equal(result.subtotal, 105);
  assert.equal(result.items[0].note, "No onion");
  assert.deepEqual(result.items[0].optionNames, ["Cheese"]);
  assert.ok(result.warnings.length);
});
test("reorder excludes missing, sold out and newly required option products", async () => {
  const { planReorder } = await planner;
  const restaurant = {
    menu: [
      {
        items: [
          { id: "sold", available: false },
          {
            id: "changed",
            options: [{ required: true, choices: [{ name: "Size" }] }],
          },
        ],
      },
    ],
  };
  const result = planReorder(
    {
      items: ["missing", "sold", "changed"].map((productId) => ({
        productId,
        quantity: 1,
      })),
    },
    restaurant,
  );
  assert.equal(result.items.length, 0);
  assert.equal(result.warnings.length, 3);
});
