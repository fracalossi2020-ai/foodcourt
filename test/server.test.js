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

const { server, start } = require("../src/server");

let baseUrl;

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

test("demo account can log in and access bootstrap", async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "joao@foodcourt.com",
      password: "foodcourt123",
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const payload = await login.json();
  assert.equal(payload.user.role, "merchant");

  const bootstrap = await fetch(`${baseUrl}/api/bootstrap`, {
    headers: { Cookie: cookie },
  });
  assert.equal(bootstrap.status, 200);
  assert.ok(Array.isArray((await bootstrap.json()).categories));
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
