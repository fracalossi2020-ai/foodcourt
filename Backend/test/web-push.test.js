const test = require("node:test");
const assert = require("node:assert/strict");
const webpush = require("web-push");
const push = require("../src/lib/web-push");
test("push subscriptions restrict destinations and expired subscriptions are removed", async () => {
  const subscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test",
    keys: { p256dh: "a".repeat(87), auth: "a".repeat(22) },
  };
  assert.equal(push.validate(subscription).endpoint, subscription.endpoint);
  for (const endpoint of [
    "http://fcm.googleapis.com/test",
    "https://127.0.0.1/test",
    "https://fcm.googleapis.com.attacker.example/test",
    "https://user:pass@fcm.googleapis.com/test",
  ])
    assert.throws(() => push.validate({ ...subscription, endpoint }));
  const originalSend = webpush.sendNotification;
  const originalEnv = [
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
    process.env.VAPID_SUBJECT,
  ];
  const db = {
    state: {
      pushSubscriptions: [
        { userId: "u", subscription },
        { userId: "other", subscription },
      ],
    },
    save() {},
  };
  try {
    process.env.VAPID_PUBLIC_KEY = "test";
    process.env.VAPID_PRIVATE_KEY = "test";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    let sent = 0;
    webpush.sendNotification = async (_subscription, payload) => {
      sent++;
      assert.ok(!payload.includes("orderId"));
      throw { statusCode: 410 };
    };
    await push.notify(db, "u");
    assert.equal(sent, 1);
    assert.equal(db.state.pushSubscriptions.length, 1);
    assert.equal(db.state.pushSubscriptions[0].userId, "other");
  } finally {
    webpush.sendNotification = originalSend;
    ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"].forEach(
      (key, index) => {
        if (originalEnv[index] === undefined) delete process.env[key];
        else process.env[key] = originalEnv[index];
      },
    );
  }
});
