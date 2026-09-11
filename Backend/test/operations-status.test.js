const test = require("node:test");
const assert = require("node:assert/strict");
const { configuration } = require("../src/lib/operations-status");

test("integration readiness requires complete configuration without exposing secrets", () => {
  assert.ok(configuration({}).every((item) => !item.configured));
  const env = { SMTP_HOST: "host", MERCADO_PAGO_ACCESS_TOKEN: "secret" };
  assert.ok(configuration(env).every((item) => !item.configured));
  Object.assign(env, {
    MAIL_FROM: "sender",
    SMTP_USER: "user",
    SMTP_PASS: "private-password",
    MERCADO_PAGO_WEBHOOK_SECRET: "private-webhook",
    APP_URL: "https://example.com",
  });
  const result = configuration(env);
  assert.equal(result.find((item) => item.name === "E-mail").configured, true);
  assert.equal(result[0].configured, true);
  assert.equal(result[1].configured, true);
  assert.ok(!JSON.stringify(result).includes("private-password"));
  assert.ok(!JSON.stringify(result).includes("private-webhook"));
});
