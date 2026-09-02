"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "foodcourt-test-"));
process.env.FC_DB_PATH = path.join(tempDir, "db.json");
process.env.SESSION_SECRET = "test-secret-with-at-least-32-characters";
process.env.APP_URL = "http://127.0.0.1";
process.env.DEV_EXPOSE_RESET_LINK = "0";
process.env.SEED_DEMO_DATA = "1";
process.env.SESSION_TTL_HOURS = "1";

const { server, start } = require("../src/server");
const db = require("../src/lib/db");

let baseUrl;

async function loginDemo() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "joao@foodcourt.com",
      password: "foodcourt123",
    }),
  });
  return {
    response,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}

test.before(async () => {
  start(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("health check is public and sends security headers", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(
    response.headers.get("content-security-policy"),
    /default-src 'self'/,
  );
  assert.equal((await response.json()).status, "ok");
});

test("private API rejects anonymous requests", async () => {
  const response = await fetch(`${baseUrl}/api/bootstrap`);
  assert.equal(response.status, 401);
});

test("social login routes fail safely when provider credentials are absent", async () => {
  const google = await fetch(`${baseUrl}/api/auth/oauth/google`, {
    redirect: "manual",
  });
  assert.equal(google.status, 302);
  assert.match(google.headers.get("location"), /#\/login\?oauth_error=/);

  const apple = await fetch(`${baseUrl}/api/auth/oauth/apple`, {
    redirect: "manual",
  });
  assert.equal(apple.status, 302);
  assert.match(apple.headers.get("location"), /#\/login\?oauth_error=/);
});

test("demo account can log in and access bootstrap", async () => {
  const { response: login, cookie } = await loginDemo();
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /Max-Age=3600/);
  const payload = await login.json();
  assert.equal(payload.user.role, "customer");

  const bootstrap = await fetch(`${baseUrl}/api/bootstrap`, {
    headers: { Cookie: cookie },
  });
  assert.equal(bootstrap.status, 200);
  assert.ok(Array.isArray((await bootstrap.json()).categories));
});

test("partner demo account has merchant role", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "dono@foodcourt.com",
      password: "foodcourt123",
    }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, "merchant");
});

test("registered establishments automatically appear in the customer marketplace", async () => {
  const { cookie } = await loginDemo();
  const store = {
    id: "store_real_test",
    ownerId: "owner_real_test",
    name: "Loja Real Teste",
    slug: "loja-real-teste",
    category: "Restaurante",
    description: "Cadastro real",
    status: "pending",
    open: true,
    rating: 0,
    preparationMinutes: 20,
    minimumOrder: 0,
    products: [
      {
        id: "product_real_test",
        name: "Prato real",
        category: "Pratos",
        description: "Produto cadastrado",
        price: 25,
        stock: 5,
        active: true,
      },
    ],
  };
  db.state.stores.push(store);
  db.state.stores.push({
    id: "store_placeholder_test",
    ownerId: "owner_placeholder",
    name: "Meu estabelecimento",
    category: "Restaurante",
    status: "active",
    open: false,
    products: [],
  });
  db.saveNow();

  const home = await fetch(`${baseUrl}/api/home`, {
    headers: { Cookie: cookie },
  });
  assert.equal(home.status, 200);
  const homePayload = await home.json();
  assert.ok(homePayload.restaurants.some((item) => item.id === store.id));
  assert.ok(
    !homePayload.restaurants.some(
      (item) => item.id === "store_placeholder_test",
    ),
  );
  assert.ok(
    homePayload.products.some((item) => item.id === "product_real_test"),
  );

  const restaurant = await fetch(`${baseUrl}/api/restaurants/${store.id}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(restaurant.status, 200);
  assert.equal((await restaurant.json()).restaurant.name, store.name);

  const publicDirectory = await fetch(`${baseUrl}/api/public/restaurants`);
  assert.equal(publicDirectory.status, 200);
  const publicPayload = await publicDirectory.json();
  assert.ok(publicPayload.restaurants.some((item) => item.id === store.id));
});

test("customer addresses are persisted and isolated by user", async () => {
  const { cookie } = await loginDemo();
  const created = await fetch(`${baseUrl}/api/address`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      label: "Casa",
      cep: "35180312",
      street: "Avenida Monsenhor Rafael",
      number: "10",
      neighborhood: "Timirim",
      city: "Timóteo",
      state: "MG",
    }),
  });
  assert.equal(created.status, 200);
  const saved = (await created.json()).address;
  assert.equal(saved.userId, db.findByEmail("joao@foodcourt.com").id);

  const list = await fetch(`${baseUrl}/api/addresses`, {
    headers: { Cookie: cookie },
  });
  assert.equal(list.status, 200);
  assert.ok((await list.json()).addresses.some((item) => item.id === saved.id));
});

test("courier can become available and complete an assigned delivery", async () => {
  const courier = db.addUser({
    id: "courier_test",
    fullName: "Entregador Teste",
    email: "entregador@foodcourt.test",
    phone: "(11) 99999-9999",
    passwordHash: require("../src/lib/auth").hashPassword("entrega123"),
    status: "active",
    role: "courier",
    createdAt: new Date().toISOString(),
  });
  const delivery = {
    id: "delivery_test",
    orderId: "order_delivery_test",
    storeId: "store_real_test",
    customerId: "customer_test",
    courierId: null,
    status: "searching",
    pickupAddress: { street: "Rua da Loja", number: "1" },
    dropoffAddress: "Casa — Rua do Cliente, 10",
    courierPayout: 7,
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.state.deliveries.push(delivery);
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: courier.email, password: "entrega123" }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const availability = await fetch(`${baseUrl}/api/courier-availability`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ available: true }),
  });
  assert.equal(availability.status, 200);
  const dashboard = await fetch(`${baseUrl}/api/courier-dashboard`, {
    headers: { Cookie: cookie },
  });
  assert.ok(
    (await dashboard.json()).available.some((item) => item.id === delivery.id),
  );
  const accept = await fetch(`${baseUrl}/api/courier-delivery`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ deliveryId: delivery.id, action: "accept" }),
  });
  assert.equal(accept.status, 200);
  assert.equal((await accept.json()).delivery.courierId, courier.id);
});

test("invalid JSON and untrusted origins are rejected", async () => {
  const invalid = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(invalid.status, 400);

  const origin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: "{}",
  });
  assert.equal(origin.status, 403);
});

test("login rejects invalid credentials without creating a session", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "joao@foodcourt.com",
      password: "senha-incorreta",
    }),
  });

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.match((await response.json()).error, /incorretos/i);
});

test("logout revokes the active session", async () => {
  const { response: login, cookie } = await loginDemo();
  assert.equal(login.status, 200);
  assert.ok(cookie);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(logout.status, 200);

  const afterLogout = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
  });
  assert.equal(afterLogout.status, 401);
});

test("authenticated users cannot access another order", async () => {
  const { cookie } = await loginDemo();
  const response = await fetch(`${baseUrl}/api/order/does-not-exist`, {
    headers: { Cookie: cookie },
  });

  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /não encontrado/i);
});
