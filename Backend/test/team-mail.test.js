const test = require("node:test");
const assert = require("node:assert/strict");
const mailer = require("../src/lib/mailer");
const teamMail = require("../src/lib/team-mail");
test("team email fails without configuration, sends the linked address and limits retries", async () => {
  const original = {
    configured: mailer.isConfigured,
    send: mailer.sendMail,
    url: process.env.APP_URL,
  };
  const member = {
    id: "m",
    email: "member@example.com",
    name: "Member",
    role: "kitchen",
  };
  try {
    mailer.isConfigured = () => false;
    await assert.rejects(teamMail.send(member, { name: "Loja" }), {
      status: 503,
    });
    assert.equal(member.accessEmailSentAt, undefined);
    mailer.isConfigured = () => true;
    process.env.APP_URL = "https://foodcourt.example";
    let calls = 0;
    mailer.sendMail = async (body) => {
      calls++;
      assert.equal(body.to, member.email);
      assert.match(body.text, /#\/parceiro-login/);
    };
    assert.equal((await teamMail.send(member, { name: "Loja" })).sent, true);
    await assert.rejects(teamMail.send(member, { name: "Loja" }), {
      status: 429,
    });
    assert.equal(calls, 1);
    delete member.accessEmailSentAt;
    mailer.sendMail = async () => {
      throw new Error("Provider unavailable");
    };
    await assert.rejects(teamMail.send(member, { name: "Loja" }));
    assert.equal(member.accessEmailSentAt, undefined);
  } finally {
    mailer.isConfigured = original.configured;
    mailer.sendMail = original.send;
    if (original.url === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original.url;
  }
});
