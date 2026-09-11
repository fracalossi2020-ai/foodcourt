const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("failed persistence preserves the last file and fails closed until restart", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "foodcourt-persistence-"),
  );
  const database = path.join(directory, "db.json");
  const script = `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const db = require('./src/lib/db');
    db.load(); db.saveNow();
    assert.ok(db.health().lastSavedAt);
    const original = fs.readFileSync(db.path, 'utf8');
    fs.mkdirSync(db.path + '.tmp');
    db.state.users.push({id:'unsaved'});
    assert.throws(() => db.saveNow(), /DB_PERSISTENCE_FAILED/);
    assert.equal(db.health().status, 'error');
    assert.equal(fs.readFileSync(db.path, 'utf8'), original);
    assert.throws(() => db.saveNow(), /DB_PERSISTENCE_FAILED/);
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, FC_DB_PATH: database },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
});
