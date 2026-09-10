const test = require("node:test");
const assert = require("node:assert/strict");
const mailer = require("../src/lib/mailer");
const invites = require("../src/lib/team-invites");
test("invitation grants no access until matching recipient accepts; token is single-use", async () => {
  const originals = [mailer.isConfigured, mailer.sendMail, process.env.APP_URL];
  const db = {
    state: {
      stores: [{ id: "s", ownerId: "owner" }],
      storeMembers: [],
      teamInvites: [],
    },
    uid: () => "id",
    saveNow() {},
  };
  let token;
  try {
    mailer.isConfigured = () => true;
    process.env.APP_URL = "https://foodcourt.example";
    mailer.sendMail = async (message) => {
      token = message.text.match(/token=([\w-]+)/)[1];
    };
    await invites.invite(
      db,
      { id: "s", name: "Shop" },
      { name: "Invitee", email: "new@example.com", role: "kitchen" },
    );
    assert.equal(db.state.storeMembers.length, 0);
    assert.ok(!JSON.stringify(db.state.teamInvites).includes(token));
    assert.throws(() =>
      invites.accept(db, { id: "bad", email: "other@example.com" }, token),
    );
    assert.equal(
      invites.accept(db, { id: "new", email: "new@example.com" }, token)
        .accepted,
      true,
    );
    assert.equal(db.state.storeMembers[0].userId, "new");
    assert.equal(db.state.storeMembers[0].role, "kitchen");
    assert.throws(() =>
      invites.accept(db, { id: "new", email: "new@example.com" }, token),
    );
  } finally {
    [mailer.isConfigured, mailer.sendMail] = originals;
    if (originals[2] === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originals[2];
  }
});
