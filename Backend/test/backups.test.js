const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const backups = require("../src/lib/backups");
const scheduler = require("../src/lib/backup-scheduler");

test("automatic backup is opt-in and rejects public directories or invalid intervals", () => {
  assert.equal(typeof scheduler.start("unused", {}), "function");
  assert.throws(() =>
    scheduler.start("unused", {
      FC_BACKUP_DIR: path.join(__dirname, "../../frontend/backups"),
    }),
  );
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "fc-scheduler-test-"),
  );
  try {
    assert.throws(() =>
      scheduler.start("unused", {
        FC_BACKUP_DIR: directory,
        FC_BACKUP_MINUTES: 0,
      }),
    );
    const source = path.join(directory, "db.json");
    fs.writeFileSync(
      source,
      JSON.stringify({ users: [], stores: [], platformOrders: [] }),
    );
    const messages = [];
    const stop = scheduler.start(
      source,
      { FC_BACKUP_DIR: path.join(directory, "backups") },
      {
        log: (message) => messages.push(message),
        error: (message) => {
          throw new Error(message);
        },
      },
    );
    stop();
    assert.equal(messages.length, 1);
    assert.equal(fs.readdirSync(path.join(directory, "backups")).length, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("backup verifies integrity, restores to a new file and refuses overwrite", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fc-backup-test-"));
  try {
    const source = path.join(directory, "db.json");
    const raw = JSON.stringify({ users: [], stores: [], platformOrders: [] });
    fs.writeFileSync(source, raw);
    const file = backups.create(source, path.join(directory, "copies"));
    assert.equal(backups.verify(file), raw);
    const destination = path.join(directory, "restored.json");
    backups.restore(file, destination);
    assert.equal(fs.readFileSync(destination, "utf8"), raw);
    assert.throws(() => backups.restore(file, source));
    const envelope = JSON.parse(fs.readFileSync(file));
    envelope.data += " ";
    fs.writeFileSync(file, JSON.stringify(envelope));
    assert.throws(() => backups.verify(file));
    fs.writeFileSync(source, "invalid");
    assert.throws(() => backups.create(source, directory));
    const result = spawnSync(
      process.execPath,
      ["-e", "require('./src/lib/db').load()"],
      {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env, FC_DB_PATH: source },
      },
    );
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(source, "utf8"), "invalid");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
